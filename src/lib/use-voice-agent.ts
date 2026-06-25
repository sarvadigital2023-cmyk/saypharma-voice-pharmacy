import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

import { createWebCall } from "./retell";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceError = "not-configured" | "mic" | "failed" | null;

// Silence watchdog: if neither the customer nor the agent makes a sound, warn at
// 12s and end the call at 20s so the call never bills while nobody is talking.
const SILENCE_WARN_MS = 12_000;
const SILENCE_HANGUP_MS = 20_000;

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

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hangupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    warnTimerRef.current = setTimeout(() => setSilenceWarning(true), SILENCE_WARN_MS);
    hangupTimerRef.current = setTimeout(() => {
      clearSilenceTimers();
      setSilenceWarning(false);
      try {
        clientRef.current?.stopCall();
      } catch {
        /* ignore */
      }
      setStatus("idle");
    }, SILENCE_HANGUP_MS);
  }, [clearSilenceTimers]);

  const ensureClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const { RetellWebClient } = await import("retell-client-js-sdk");
    const client = new RetellWebClient();
    client.on("call_started", () => {
      setStatus("live");
      bumpSilenceTimers();
    });
    client.on("call_ended", () => {
      clearSilenceTimers();
      setSilenceWarning(false);
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
    // any speech from either side resets the watchdog
    const onActivity = () => bumpSilenceTimers();
    client.on("update", onActivity);
    client.on("agent_start_talking", onActivity);
    client.on("agent_stop_talking", onActivity);
    clientRef.current = client;
    return client;
  }, [bumpSilenceTimers, clearSilenceTimers]);

  const start = useCallback(async () => {
    setError(null);
    setErrorDetail(null);
    setSilenceWarning(false);
    setStatus("connecting");
    try {
      const client = await ensureClient();
      const { accessToken } = await createWebCall();
      await client.startCall({ accessToken });
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
    start,
    stop,
    isLive: status === "live",
    isConnecting: status === "connecting",
  };
}
