import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

import { createWebCall } from "./retell";
import { saveCallTranscript, formatTranscriptText, extractPhones } from "./call-history";
import { useI18n } from "@/i18n";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceError = "not-configured" | "mic" | "failed" | null;
export type TranscriptEntry = { role: string; content: string };

/** The Retell "update" event carries the transcript so far. */
function parseTranscript(payload: unknown): TranscriptEntry[] | null {
  const list = (payload as { transcript?: unknown } | null)?.transcript;
  if (!Array.isArray(list)) return null;
  return list
    .map((m) => ({
      role: String((m as { role?: unknown })?.role ?? ""),
      content: String((m as { content?: unknown })?.content ?? ""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

/** Completeness of a transcript = total characters of speech. Used to keep the
 * fullest version we ever receive instead of overwriting it with a later (often
 * shorter) "update", which was dropping the start of the conversation. */
function transcriptChars(entries: TranscriptEntry[]): number {
  let total = 0;
  for (const e of entries) total += e.content.length;
  return total;
}

// Silence watchdog: if neither the customer nor the agent makes a sound, warn at
// 5s and end the call at 10s so the call never bills while nobody is talking.
const SILENCE_WARN_MS = 5_000;
const SILENCE_HANGUP_MS = 10_000;

/**
 * Drives a Retell web voice call (agent "Cimo").
 *
 * start(): mints a token via the server fn, then opens the WebRTC call with
 * the Retell web SDK (loaded lazily so it never runs during SSR).
 * stop():  ends the call.
 *
 * A silence watchdog resets on any activity (customer speech -> "update";
 * agent speech -> "agent_start_talking"/"agent_stop_talking") and hangs up after
 * 20s of total silence, showing a gentle warning at 12s.
 */
export function useVoiceAgent() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<VoiceError>(null);
  // raw reason (e.g. "RETELL_CALL_FAILED:401") for on-screen diagnostics
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hangupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // refs used when persisting the call on call_ended (closures see latest values)
  const { t } = useI18n();
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const callStartRef = useRef<number | null>(null);
  const callIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  const silenceEndedRef = useRef(false);
  // true while the agent is mid-utterance — the silence watchdog must NOT run
  // then, otherwise a single long reply (e.g. dictating an order number) is
  // mistaken for silence and the call is cut off while the agent is speaking.
  const agentTalkingRef = useRef(false);
  // Has the SDK delivered ANY server event on this call? The watchdog infers
  // "silence" from the ABSENCE of server events, so it can only do that safely
  // when the event channel is known to work. On the v3 "gateway" transport the
  // data channel can stay silent (its JSON parse errors are swallowed by the
  // SDK) while audio still flows — then every call looks silent and gets killed
  // seconds after the greeting. Fail open: no events seen => never auto-hang-up.
  const sawServerEventRef = useRef(false);
  // stable self-reference so the hangup timer can re-arm itself
  const bumpRef = useRef<() => void>(() => {});
  const labelsRef = useRef({ agent: "Operator", user: "You" });
  labelsRef.current = { agent: t("transcript.roleAgent"), user: t("transcript.roleUser") };

  // Persist the finished call once. status: "completed" normally, "missed" when
  // the silence watchdog ended it. Only saves a non-empty transcript.
  const saveCall = useCallback((status: "completed" | "missed") => {
    if (savedRef.current) return;
    const entries = transcriptRef.current;
    if (!entries || entries.length === 0) return;
    savedRef.current = true;
    const text = formatTranscriptText(entries, labelsRef.current.agent, labelsRef.current.user);
    const phone = extractPhones(text);
    const durationSec = callStartRef.current
      ? Math.max(1, Math.round((Date.now() - callStartRef.current) / 1000))
      : null;
    void saveCallTranscript({
      data: {
        phone,
        transcript: text,
        durationSec,
        status,
        agentName: "Cimo",
        callId: callIdRef.current,
      },
    }).catch((e) => console.error("save transcript failed:", e));
  }, []);

  const clearSilenceTimers = useCallback(() => {
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (hangupTimerRef.current) {
      clearTimeout(hangupTimerRef.current);
      hangupTimerRef.current = null;
    }
  }, []);

  // (Re)start the silence timers — called on call start and on any activity.
  const bumpSilenceTimers = useCallback(() => {
    clearSilenceTimers();
    setSilenceWarning(false);
    // While the agent is speaking, the call is clearly alive — do not arm the
    // watchdog (a stray "update" during a long reply must not restart it).
    if (agentTalkingRef.current) return;
    warnTimerRef.current = setTimeout(() => {
      // don't raise a silence alarm we would never act on (see hangup guard)
      if (!sawServerEventRef.current) return;
      setSilenceWarning(true);
    }, SILENCE_WARN_MS);
    hangupTimerRef.current = setTimeout(() => {
      // Belt and braces before ending a live call:
      // 1) the agent may have started talking between the last bump and now —
      //    ask the SDK directly, not just our own flag;
      // 2) if no server event EVER arrived we cannot tell real silence from a
      //    dead event channel, so we must not hang up (fail open).
      if (agentTalkingRef.current || clientRef.current?.isAgentTalking) {
        bumpRef.current();
        return;
      }
      if (!sawServerEventRef.current) {
        console.warn(
          "Silence watchdog: no server events received on this call — not hanging up (event channel may be unavailable).",
        );
        clearSilenceTimers();
        setSilenceWarning(false);
        return;
      }
      clearSilenceTimers();
      setSilenceWarning(false);
      silenceEndedRef.current = true; // mark this end as "missed" for call_ended
      try {
        clientRef.current?.stopCall();
      } catch {
        /* ignore */
      }
      setStatus("idle");
    }, SILENCE_HANGUP_MS);
  }, [clearSilenceTimers]);
  bumpRef.current = bumpSilenceTimers;

  const ensureClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const { RetellWebClient } = await import("retell-client-js-sdk");
    const client = new RetellWebClient();
    client.on("call_started", () => {
      callStartRef.current = Date.now();
      setStatus("live");
      bumpSilenceTimers();
    });
    client.on("call_ended", () => {
      clearSilenceTimers();
      setSilenceWarning(false);
      saveCall(silenceEndedRef.current ? "missed" : "completed");
      silenceEndedRef.current = false;
      setStatus("idle");
    });
    client.on("error", (e: unknown) => {
      console.error("Retell call error:", e);
      clearSilenceTimers();
      setSilenceWarning(false);
      setError("failed");
      setStatus("error");
      try {
        client.stopCall();
      } catch {
        /* ignore */
      }
    });
    // Any server event proves the event channel is alive AND that the call is
    // active, so it both unlocks the watchdog and resets it.
    const onServerActivity = () => {
      sawServerEventRef.current = true;
      bumpSilenceTimers();
    };
    client.on("metadata", onServerActivity);
    client.on("node_transition", onServerActivity);
    // live transcript + activity reset (the "update" event carries the transcript)
    client.on("update", (payload: unknown) => {
      onServerActivity();
      const entries = parseTranscript(payload);
      if (!entries) return;
      // Keep the MOST COMPLETE transcript we've seen. Retell sometimes sends a
      // shorter/partial "update"; overwriting with it lost the start of the call.
      // Only adopt an incoming transcript when it has at least as much speech as
      // what we already hold, so the stored conversation never shrinks.
      if (transcriptChars(entries) >= transcriptChars(transcriptRef.current)) {
        transcriptRef.current = entries;
        setTranscript(entries);
      }
    });
    // Pause the watchdog for the WHOLE duration of the agent's speech, not just
    // at its start: stop the countdown when the agent begins talking and only
    // resume it once the agent has finished. This is what prevents the call from
    // being cut off mid-reply (e.g. while dictating the order number).
    client.on("agent_start_talking", () => {
      sawServerEventRef.current = true;
      agentTalkingRef.current = true;
      clearSilenceTimers();
      setSilenceWarning(false);
    });
    client.on("agent_stop_talking", () => {
      sawServerEventRef.current = true;
      agentTalkingRef.current = false;
      bumpSilenceTimers();
    });
    clientRef.current = client;
    return client;
  }, [bumpSilenceTimers, clearSilenceTimers, saveCall]);

  const start = useCallback(async () => {
    setError(null);
    setErrorDetail(null);
    setSilenceWarning(false);
    setTranscript([]);
    transcriptRef.current = [];
    callStartRef.current = null;
    callIdRef.current = null;
    savedRef.current = false;
    silenceEndedRef.current = false;
    agentTalkingRef.current = false;
    sawServerEventRef.current = false;
    setStatus("connecting");
    try {
      const client = await ensureClient();
      const call = await createWebCall();
      callIdRef.current = call.callId ?? null;
      // Which transport v3 handed us decides whether the server-event channel
      // works; log it so a broken call can be diagnosed from the console.
      console.info("Retell web call:", {
        transport: call.transport ?? "(default: livekit)",
        hasUrl: Boolean(call.url),
        iceServers: call.iceServers?.length ?? 0,
      });
      // Forward the full v3 connection info. For the "gateway" transport the SDK
      // needs transport/url/iceServers to reach the call; for "livekit" they are
      // absent and the SDK uses its defaults. Passing undefined is fine.
      await client.startCall({
        accessToken: call.accessToken,
        callId: call.callId ?? undefined,
        transport: call.transport,
        url: call.url,
        iceServers: call.iceServers,
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      setErrorDetail(message);
      if (message.includes("RETELL_NOT_CONFIGURED")) setError("not-configured");
      else if (
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("microphone")
      )
        setError("mic");
      else setError("failed");
      setStatus("error");
    }
  }, [ensureClient]);

  const stop = useCallback(() => {
    clearSilenceTimers();
    setSilenceWarning(false);
    try {
      clientRef.current?.stopCall();
    } catch {
      /* ignore */
    }
    setStatus("idle");
  }, [clearSilenceTimers]);

  useEffect(
    () => () => {
      clearSilenceTimers();
      try {
        clientRef.current?.stopCall();
      } catch {
        /* ignore */
      }
    },
    [clearSilenceTimers],
  );

  return {
    status,
    error,
    errorDetail,
    silenceWarning,
    transcript,
    start,
    stop,
    isLive: status === "live",
    isConnecting: status === "connecting",
  };
}
