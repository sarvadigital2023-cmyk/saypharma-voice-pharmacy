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
async function fetchRetellTranscript(
  callId: string,
  agentLabel: string,
  userLabel: string,
): Promise<string | null> {
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
      const call = (await res.json()) as {
        transcript?: unknown;
        transcript_object?: Array<{ role?: unknown; content?: unknown }>;
      };
      const list = call.transcript_object;
      if (Array.isArray(list) && list.length > 0) {
        // v3 mixes tool calls / node transitions into the transcript — keep speech
        const text = list
          .filter((u) => u?.role === "agent" || u?.role === "user")
          .map((u) => `${u.role === "agent" ? agentLabel : userLabel}: ${String(u.content ?? "")}`)
          .filter((line) => line.split(": ").slice(1).join(": ").trim().length > 0)
          .join("\n");
        if (text.trim().length > 0) return text;
      }
      if (typeof call.transcript === "string" && call.transcript.trim().length > 0) {
        return call.transcript;
      }
    } catch {
      /* try the next version / give up */
    }
  }
  return null;
}

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

    // The browser may have captured nothing (see fetchRetellTranscript) — in that
    // case get the real transcript from Retell before writing the row.
    let transcript = data.transcript;
    if (transcript.trim().length === 0 && data.callId) {
      transcript =
        (await fetchRetellTranscript(data.callId, data.agentLabel, data.userLabel)) ?? "";
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
