import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { TranscriptEntry } from "./use-voice-agent";

/**
 * Persists a finished call to the call_transcripts table.
 *
 * Runs on the server with the SERVICE ROLE key (never exposed to the browser),
 * same pattern as the other server functions. Called once per call from the
 * client when the call ends (see useVoiceAgent).
 *
 * Required server env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

/** Build the exact text shown by the red "copy" button — shared so the saved
 * transcript is identical to what the user copies. */
export function formatTranscriptText(
  entries: TranscriptEntry[],
  agentLabel: string,
  userLabel: string,
): string {
  return entries
    .map((m) => `${m.role === "agent" ? agentLabel : userLabel}: ${m.content}`)
    .join("\n");
}

/** Pull every phone number out of the conversation text, comma-separated.
 * Falls back to "unknown" so the NOT NULL phone column is never violated. */
export function extractPhones(text: string): string {
  const matches = text.match(/\+?\d[\d\s().-]{5,}\d/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.trim().replace(/\s+/g, " ");
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length < 7) continue; // too short to be a phone number
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push(cleaned);
  }
  return out.length > 0 ? out.join(", ") : "unknown";
}

export type SaveCallInput = {
  phone: string;
  transcript: string;
  durationSec: number | null;
  status: string;
  agentName?: string | null;
  callId?: string | null;
  /** localized speaker labels, so a server-side fallback transcript reads the
   * same as the one built in the browser */
  agentLabel?: string | null;
  userLabel?: string | null;
};

/**
 * Authoritative transcript straight from Retell, by call id.
 *
 * The browser data channel is NOT a reliable source: on the v3 "gateway"
 * transport the SDK can deliver no transcript events at all (audio rides a
 * separate WebRTC track), which left us saving nothing. Retell always has the
 * real transcript, so when the client has none we ask the API directly with the
 * server-side key. Best effort — returns null on any failure.
 */
async function retellCall(
  callId: string,
): Promise<{ transcript?: unknown; transcript_object?: unknown } | null> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) return null;
  // try v3 first, fall back to v2 (only create-web-call was deprecated)
  for (const version of ["v3", "v2"]) {
    try {
      const res = await fetch(`https://api.retellai.com/${version}/get-call/${callId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      return (await res.json()) as { transcript?: unknown; transcript_object?: unknown };
    } catch {
      /* try the next version / give up */
    }
  }
  return null;
}

/** Speech utterances only. v3 mixes tool_call_invocation / tool_call_result /
 * node_transition / dtmf entries into the same array — those must never show up
 * as something the customer or the agent said. */
function toEntries(transcriptObject: unknown): TranscriptEntry[] {
  if (!Array.isArray(transcriptObject)) return [];
  return transcriptObject
    .map((u) => ({
      role: String((u as { role?: unknown })?.role ?? ""),
      content: String((u as { content?: unknown })?.content ?? ""),
    }))
    .filter((u) => (u.role === "agent" || u.role === "user") && u.content.trim().length > 0);
}

/** Structured transcript for a call, straight from Retell. */
async function fetchRetellEntries(callId: string): Promise<TranscriptEntry[]> {
  const call = await retellCall(callId);
  return call ? toEntries(call.transcript_object) : [];
}

async function fetchRetellTranscript(
  callId: string,
  agentLabel: string,
  userLabel: string,
): Promise<string | null> {
  const call = await retellCall(callId);
  if (!call) return null;
  const entries = toEntries(call.transcript_object);
  if (entries.length > 0) return formatTranscriptText(entries, agentLabel, userLabel);
  if (typeof call.transcript === "string" && call.transcript.trim().length > 0) {
    return call.transcript;
  }
  return null;
}

/**
 * Live transcript for an in-progress call, polled by the browser.
 *
 * The in-app transcript panel used to rely purely on the SDK's "update" events.
 * Those are unreliable (see above) and only ever carry a window of the
 * conversation, so the panel was empty on v3 and truncated before it. Retell
 * itself always has the full, authoritative transcript, so we read it from the
 * server with the secret key and hand the browser just the text.
 */
export const getCallTranscript = createServerFn({ method: "POST" })
  .inputValidator((data: { callId: string }) => ({ callId: String(data?.callId ?? "") }))
  .handler(async ({ data }): Promise<TranscriptEntry[]> => {
    if (!data.callId) return [];
    return fetchRetellEntries(data.callId);
  });

export const saveCallTranscript = createServerFn({ method: "POST" })
  .inputValidator((data: SaveCallInput) => ({
    phone: String(data?.phone ?? "unknown") || "unknown",
    transcript: String(data?.transcript ?? ""),
    durationSec:
      data?.durationSec == null || !Number.isFinite(Number(data.durationSec))
        ? null
        : Math.max(0, Math.round(Number(data.durationSec))),
    status: String(data?.status ?? "completed") || "completed",
    agentName: data?.agentName ?? "Cimo",
    callId: data?.callId ?? null,
    agentLabel: data?.agentLabel ?? "Operator",
    userLabel: data?.userLabel ?? "You",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: string }> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { ok: false, reason: "not_configured" };

    // Always compare against Retell's own copy and keep the fuller one. The
    // browser only ever sees a window of the conversation (and on v3 sometimes
    // nothing at all), so trusting it is what produced truncated — or empty —
    // transcripts. Retell has the whole call.
    let transcript = data.transcript;
    if (data.callId) {
      const authoritative = await fetchRetellTranscript(
        data.callId,
        data.agentLabel,
        data.userLabel,
      );
      if (authoritative && authoritative.trim().length > transcript.trim().length) {
        transcript = authoritative;
      }
    }
    const phone = data.phone !== "unknown" ? data.phone : extractPhones(transcript);

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("call_transcripts").insert({
      phone,
      transcript: transcript || null,
      duration_sec: data.durationSec,
      status: data.status,
      agent_name: data.agentName,
      call_id: data.callId,
      // order_id and summary intentionally left null for now
    });
    if (error) {
      console.error("saveCallTranscript failed:", error.message);
      return { ok: false, reason: "db_error" };
    }
    return { ok: true };
  });
