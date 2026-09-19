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
 * real transcript, so we ask the API directly with the server-side key.
 *
 * NOTE (verified against Retell's official Node SDK): "get-call" only exists as
 * /v2/get-call/{call_id} — there is no v3 of it, only create-web-call moved to
 * v3. And both `transcript` and `transcript_object` are documented as "Available
 * after call ends", which is why polling during the call always came back empty.
 */
async function retellCall(
  callId: string,
): Promise<{ transcript?: unknown; transcript_object?: unknown } | null> {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.error("get-call skipped: RETELL_API_KEY is not set");
    return null;
  }
  try {
    const res = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`get-call ${callId} failed: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as { transcript?: unknown; transcript_object?: unknown };
  } catch (e) {
    console.error("get-call request error:", e);
    return null;
  }
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retell finalises the transcript a moment AFTER the call disconnects, so asking
 * once at call_ended reliably came back empty and we stored NULL. Retry a few
 * times with a short backoff until it materialises (bounded so the serverless
 * function always returns).
 */
async function fetchRetellEntries(callId: string): Promise<TranscriptEntry[]> {
  // kept short so the whole handler stays well inside the serverless time limit
  const delays = [0, 1_500, 3_000];
  for (const delay of delays) {
    if (delay) await sleep(delay);
    const call = await retellCall(callId);
    if (!call) continue;
    const entries = toEntries(call.transcript_object);
    if (entries.length > 0) return entries;
  }
  console.warn(`get-call ${callId}: transcript still not available after retries`);
  return [];
}

/** Retell's own single-string transcript — last resort when the structured list
 * is still unavailable. One extra attempt only; the retries already happened. */
async function fetchRetellTranscriptText(callId: string): Promise<string | null> {
  const call = await retellCall(callId);
  if (call && typeof call.transcript === "string" && call.transcript.trim().length > 0) {
    return call.transcript;
  }
  return null;
}

// Labels the Retell webhook writes while the call is in progress (see
// agent-api.ts). Parsing them back gives the panel proper speaker roles.
const LIVE_AGENT_LABEL = "Оператор";

/**
 * Live transcript for the in-call panel.
 *
 * Retell pushes "transcript_updated" webhooks to /api/agent/retell-webhook while
 * the call is running and that keeps one row per call up to date, so the browser
 * only has to read our own table. No held connections, no secrets in the client
 * — which is what makes this work on a serverless host at all.
 */
export const getLiveTranscript = createServerFn({ method: "POST" })
  .inputValidator((data: { callId: string }) => ({ callId: String(data?.callId ?? "") }))
  .handler(async ({ data }): Promise<TranscriptEntry[]> => {
    if (!data.callId) return [];
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return [];
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data: row } = await supabase
      .from("call_transcripts")
      .select("transcript")
      .eq("call_id", data.callId)
      .limit(1)
      .maybeSingle();
    const text = typeof row?.transcript === "string" ? row.transcript : "";
    if (!text.trim()) return [];
    return text
      .split("\n")
      .map((line) => {
        const at = line.indexOf(": ");
        if (at < 0) return { role: "user", content: line.trim() };
        const label = line.slice(0, at);
        return {
          role: label === LIVE_AGENT_LABEL ? "agent" : "user",
          content: line.slice(at + 2).trim(),
        };
      })
      .filter((e) => e.content.length > 0);
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
  .handler(
    async ({ data }): Promise<{ ok: boolean; reason?: string; entries?: TranscriptEntry[] }> => {
      // Always compare against Retell's own copy and keep the fuller one. The
      // browser only ever sees a window of the conversation (and on v3 sometimes
      // nothing at all), so trusting it is what produced truncated — or empty —
      // transcripts. Retell has the whole call. Done before the env check so the
      // caller still gets the transcript for the on-screen panel.
      let transcript = data.transcript;
      let entries: TranscriptEntry[] = [];
      if (data.callId) {
        entries = await fetchRetellEntries(data.callId);
        const authoritative =
          entries.length > 0
            ? formatTranscriptText(entries, data.agentLabel, data.userLabel)
            : await fetchRetellTranscriptText(data.callId);
        if (authoritative && authoritative.trim().length > transcript.trim().length) {
          transcript = authoritative;
        }
      }

      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return { ok: false, reason: "not_configured", entries };
      const phone = data.phone !== "unknown" ? data.phone : extractPhones(transcript);

      const supabase = createClient(url, key, { auth: { persistSession: false } });
      // The Retell webhook keeps this call's row up to date while the
      // conversation runs, so update it rather than inserting a duplicate. Update
      // first and insert only when nothing matched — both writers can land in the
      // same millisecond, and call_id is unique, so this is the race-safe order.
      if (data.callId) {
        const fields = {
          phone,
          transcript: transcript || null,
          duration_sec: data.durationSec,
          status: data.status,
          agent_name: data.agentName,
        };
        const updated = await supabase
          .from("call_transcripts")
          .update(fields)
          .eq("call_id", data.callId)
          .select("id");
        if (updated.error) {
          console.error("saveCallTranscript update failed:", updated.error.message);
          return { ok: false, reason: "db_error", entries };
        }
        if ((updated.data?.length ?? 0) > 0) return { ok: true, entries };
      }
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
        if (error.code === "23505" && data.callId) {
          // the webhook created the row between our update and our insert
          const retry = await supabase
            .from("call_transcripts")
            .update({
              phone,
              transcript: transcript || null,
              duration_sec: data.durationSec,
              status: data.status,
              agent_name: data.agentName,
            })
            .eq("call_id", data.callId);
          if (!retry.error) return { ok: true, entries };
          console.error("saveCallTranscript retry failed:", retry.error.message);
          return { ok: false, reason: "db_error", entries };
        }
        console.error(`saveCallTranscript failed (${error.code ?? "?"}):`, error.message);
        return { ok: false, reason: "db_error", entries };
      }
      return { ok: true, entries };
    },
  );
