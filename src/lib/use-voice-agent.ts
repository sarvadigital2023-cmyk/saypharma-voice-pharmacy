import { useCallback, useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";

import { buildAssistant } from "./voice-agent";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceError = "not-configured" | "mic" | "failed" | null;

/**
 * Drives a Vapi web voice call with the inline "Cimo" assistant.
 * The Vapi SDK is browser-only, so it is loaded lazily (never during SSR).
 */
export function useVoiceAgent() {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<VoiceError>(null);

  const ensureClient = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current;
    const key = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (!key) throw new Error("VAPI_NOT_CONFIGURED");
    const { default: VapiClient } = await import("@vapi-ai/web");
    const vapi = new VapiClient(key);
    vapi.on("call-start", () => setStatus("live"));
    vapi.on("call-end", () => setStatus("idle"));
    vapi.on("error", (e: unknown) => {
      console.error("Vapi call error:", e);
      setError("failed");
      setStatus("error");
    });
    vapiRef.current = vapi;
    return vapi;
  }, []);

  const start = useCallback(
    async (languageName: string) => {
      setError(null);
      setStatus("connecting");
      try {
        const vapi = await ensureClient();
        await vapi.start(buildAssistant(languageName) as Parameters<Vapi["start"]>[0]);
      } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("VAPI_NOT_CONFIGURED")) setError("not-configured");
        else if (/permission|microphone|denied|notallowed/i.test(message)) setError("mic");
        else setError("failed");
        setStatus("error");
      }
    },
    [ensureClient],
  );

  const stop = useCallback(() => {
    try {
      vapiRef.current?.stop();
    } catch {
      /* ignore */
    }
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      try {
        vapiRef.current?.stop();
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
