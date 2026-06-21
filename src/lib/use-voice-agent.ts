import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

import { createWebCall } from "./retell";

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

  const start = useCallback(
    async (language?: string) => {
      setError(null);
      setStatus("connecting");
      try {
        const client = await ensureClient();
        const { accessToken } = await createWebCall({ data: { language } });
        await client.startCall({ accessToken });
      } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("RETELL_NOT_CONFIGURED")) setError("not-configured");
        else if (
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("microphone")
        )
          setError("mic");
        else setError("failed");
        setStatus("error");
      }
    },
    [ensureClient],
  );

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
