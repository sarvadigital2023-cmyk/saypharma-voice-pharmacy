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
};

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
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: string }> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { ok: false, reason: "not_configured" };

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("call_transcripts").insert({
      phone: data.phone,
      transcript: data.transcript || null,
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
