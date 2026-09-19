import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

import { createWebCall } from "./retell";
import { saveCallTranscript, formatTranscriptText, extractPhones } from "./call-history";
import { useI18n } from "@/i18n";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceError = "not-configured" | "mic" | "failed" | null;
export type TranscriptEntry = { role: string; content: string };

type Utterance = TranscriptEntry & { id: string; time: number };

/**
 * Utterances carried by a Retell "update" event.
 *
 * IMPORTANT: this array is a WINDOW of the conversation, not a full snapshot.
 * Retell's own SDK keeps a TranscriptStore that merges each batch by utterance
 * id and re-sorts by time. Replacing our copy with the latest batch (what we did
 * before) silently dropped everything outside that window — which is why the
 * transcript was always truncated, long before v3.
 *
 * Only speech is kept: v3 also mixes tool_call_invocation / tool_call_result /
 * node_transition / dtmf entries into the same array, and those must never be
 * shown or stored as something a person said.
 */
function parseUtterances(payload: unknown): Utterance[] | null {
  const p = payload as Record<string, unknown> | null;
  const list = p?.transcript ?? p?.transcript_object ?? p?.transcripts;
  if (!Array.isArray(list)) return null;
  const out: Utterance[] = [];
  list.forEach((m, i) => {
    const u = m as Record<string, unknown>;
    const role = String(u?.role ?? "");
    const content = String(u?.content ?? "");
    if ((role !== "agent" && role !== "user") || content.trim().length === 0) return;
    const parsedTime = Number(u?.time_sec);
    const time = Number.isFinite(parsedTime) ? parsedTime : i;
    out.push({ id: String(u?.id ?? `${role}@${time}#${i}`), time, role, content });
  });
  return out;
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
 * agent speech -> "agent_start_talking"/"agent_stop_talking"), warns after
 * SILENCE_WARN_MS and hangs up after SILENCE_HANGUP_MS. It is paused while the
 * agent speaks and stays disabled entirely on calls where no "update" event ever
 * arrives, because customer speech cannot be observed on such a call.
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
  // Have we received an "update" event on this call? That event carries the
  // transcript and is the ONLY signal by which we can tell that the CUSTOMER is
  // speaking. If it never arrives we are blind to the customer, and the absence
  // of activity means "no telemetry", not "silence" — so the watchdog must not
  // end the call. (v3 can negotiate the new "gateway" transport, whose data
  // channel the SDK parses inside an empty catch; audio still flows on its own
  // WebRTC track, so the greeting is audible while no events arrive at all.)
  const sawUserSignalRef = useRef(false);
  // stable self-reference so the hangup timer can re-arm itself
  const bumpRef = useRef<() => void>(() => {});
  // Accumulated utterances keyed by id — merged, never replaced (see
  // parseUtterances). `seq` preserves arrival order for equal timestamps.
  const utterancesRef = useRef(new Map<string, Utterance & { seq: number }>());
  const seqRef = useRef(0);
  const labelsRef = useRef({ agent: "Operator", user: "You" });
  labelsRef.current = { agent: t("transcript.roleAgent"), user: t("transcript.roleUser") };

  /** Adopt a transcript only when it is at least as complete as what we hold, so
   * the conversation on screen and in the database never shrinks. */
  const applyTranscript = useCallback((entries: TranscriptEntry[]) => {
    if (transcriptChars(entries) < transcriptChars(transcriptRef.current)) return;
    transcriptRef.current = entries;
    setTranscript(entries);
  }, []);

  // Persist the finished call once. status: "completed" normally, "missed" when
  // the silence watchdog ended it. Always saves a record for a connected call —
  // the server fills in the transcript from Retell when the browser has none.
  const saveCall = useCallback(
    (status: "completed" | "missed") => {
      if (savedRef.current) return;
      // Only skip calls that never actually connected. An EMPTY transcript is not a
      // reason to skip: the browser may simply have received no transcript events
      // (v3 "gateway" transport), and the server then recovers the real transcript
      // from Retell by call_id. Bailing out here is what left the admin with no
      // record of the call at all.
      if (callStartRef.current == null) return;
      const entries = transcriptRef.current ?? [];
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
          agentLabel: labelsRef.current.agent,
          userLabel: labelsRef.current.user,
        },
      })
        .then((res) => {
          // The server fetches the authoritative transcript from Retell (which is
          // only available once the call has ended) — show it in the panel too.
          if (res?.entries && res.entries.length > 0) applyTranscript(res.entries);
        })
        .catch((e) => console.error("save transcript failed:", e));
    },
    [applyTranscript],
  );

  /** Merge a batch of utterances by id (same semantics as the SDK's own
   * TranscriptStore) and rebuild the conversation in time order. */
  const mergeUtterances = useCallback(
    (list: Utterance[]) => {
      const map = utterancesRef.current;
      for (const u of list) {
        const prev = map.get(u.id);
        map.set(u.id, { ...u, seq: prev?.seq ?? seqRef.current++ });
      }
      applyTranscript(
        Array.from(map.values())
          .sort((a, b) => a.time - b.time || a.seq - b.seq)
          .map(({ role, content }) => ({ role, content })),
      );
    },
    [applyTranscript],
  );

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
      // don't raise an alarm we would never act on (see the hangup guard below)
      if (!sawUserSignalRef.current) return;
      setSilenceWarning(true);
    }, SILENCE_WARN_MS);
    hangupTimerRef.current = setTimeout(() => {
      // Two guards before ending a live call:
      // 1) the agent may have started talking since the last reset — ask the SDK
      //    itself, not only our own flag, and re-arm instead of hanging up;
      if (agentTalkingRef.current || clientRef.current?.isAgentTalking) {
        bumpRef.current();
        return;
      }
      // 2) without a single "update" we cannot observe the customer at all, so
      //    "no activity" proves nothing. Fail open and leave the call alone.
      if (!sawUserSignalRef.current) {
        console.warn(
          "Silence watchdog disabled for this call: no transcript ('update') events received, " +
            "so customer speech cannot be detected. Not hanging up.",
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
    // other server events also prove the call is alive and reset the watchdog,
    // but they say nothing about the customer, so they do NOT unlock the hangup
    client.on("metadata", () => bumpSilenceTimers());
    client.on("node_transition", () => bumpSilenceTimers());
    // live transcript + activity reset (the "update" event carries the transcript)
    client.on("update", (payload: unknown) => {
      // the only proof that customer speech is observable on this call
      sawUserSignalRef.current = true;
      bumpSilenceTimers();
      const batch = parseUtterances(payload);
      if (!batch) return;
      // MERGE by utterance id — this batch is a window, not the whole call.
      mergeUtterances(batch);
    });
    // Pause the watchdog for the WHOLE duration of the agent's speech, not just
    // at its start: stop the countdown when the agent begins talking and only
    // resume it once the agent has finished. This is what prevents the call from
    // being cut off mid-reply (e.g. while dictating the order number).
    client.on("agent_start_talking", () => {
      agentTalkingRef.current = true;
      clearSilenceTimers();
      setSilenceWarning(false);
    });
    client.on("agent_stop_talking", () => {
      agentTalkingRef.current = false;
      bumpSilenceTimers();
    });
    clientRef.current = client;
    return client;
  }, [bumpSilenceTimers, clearSilenceTimers, saveCall, mergeUtterances]);

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
    sawUserSignalRef.current = false;
    utterancesRef.current = new Map();
    seqRef.current = 0;
    setStatus("connecting");
    try {
      const client = await ensureClient();
      const call = await createWebCall();
      callIdRef.current = call.callId ?? null;
      // The negotiated transport decides whether the server-event channel works,
      // so log it — one call is then enough to diagnose a broken connection.
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
