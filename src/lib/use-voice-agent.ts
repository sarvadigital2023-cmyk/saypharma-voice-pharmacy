import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

import { createWebCall } from "./retell";
import { requestMicrophoneAccess, setMicrophoneGranted } from "./microphone";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceError = "not-configured" | "mic" | "failed" | null;

/**
 * Drives a Retell web voice call (agent "Cimo").
 *
 * start(): mints a token via the server fn, then opens the WebRTC call with
 * the Retell web SDK (loaded lazily so it never runs during SSR).
 * stop():  ends the call.
 */
export function useVoiceAgent() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<VoiceError>(null);

  const ensureClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const { RetellWebClient } = await import("retell-client-js-sdk");
    const client = new RetellWebClient();
    client.on("call_started", () => setStatus("live"));
    client.on("call_ended", () => setStatus("idle"));
    client.on("error", (e: unknown) => {
      console.error("Retell call error:", e);
      setError("failed");
      setStatus("error");
      try {
        client.stopCall();
      } catch {
        /* ignore */
      }
    });
    clientRef.current = client;
    return client;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      // Acquire the microphone OURSELVES before the Retell call, so the browser
      // permission prompt (if any) happens here — never in the middle of the
      // call. We deliberately do NOT skip on the stored flag: the OS permission
      // can differ from the flag (e.g. an installed PWA vs the browser tab), and
      // skipping let the Retell SDK trigger the prompt mid-call. After the first
      // grant this getUserMedia call is silent, so it still prompts only once.
      const micOk = await requestMicrophoneAccess();
      if (!micOk) {
        setMicrophoneGranted(false);
        setError("mic");
        setStatus("error");
        return;
      }

      const client = await ensureClient();
      const { accessToken } = await createWebCall();
      await client.startCall({ accessToken });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("RETELL_NOT_CONFIGURED")) setError("not-configured");
      else if (
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("microphone")
      ) {
        // a recorded grant turned out to be revoked — clear it so we re-prompt
        setMicrophoneGranted(false);
        setError("mic");
      } else setError("failed");
      setStatus("error");
    }
  }, [ensureClient]);

  const stop = useCallback(() => {
    try {
      clientRef.current?.stopCall();
    } catch {
      /* ignore */
    }
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      try {
        clientRef.current?.stopCall();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return {
    status,
    error,
    start,
    stop,
    isLive: status === "live",
    isConnecting: status === "connecting",
  };
}
