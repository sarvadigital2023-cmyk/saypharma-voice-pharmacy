import { useCallback, useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

import { createWebCall } from "./retell";
import { acquireMicrophoneStream, setMicrophoneGranted } from "./microphone";

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type VoiceError = "not-configured" | "mic" | "failed" | null;

/**
 * Drives a Retell web voice call (agent "Cimo").
 *
 * start(): acquires the microphone (prompting once, up front), then mints a
 * token via the server fn and opens the WebRTC call with the Retell web SDK
 * (loaded lazily so it never runs during SSR).
 * stop():  ends the call.
 */
export function useVoiceAgent() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<VoiceError>(null);

  // Release our keep-alive microphone stream. The Retell SDK opens its own
  // capture for the call; ours only exists to make the permission prompt happen
  // before the call and to avoid a release-then-reacquire gap during connect.
  const releaseMic = useCallback(() => {
    const stream = micStreamRef.current;
    if (!stream) return;
    micStreamRef.current = null;
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      /* ignore */
    }
  }, []);

  const ensureClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const { RetellWebClient } = await import("retell-client-js-sdk");
    const client = new RetellWebClient();
    client.on("call_started", () => {
      // the SDK now has its own capture — drop our keep-alive stream
      releaseMic();
      setStatus("live");
    });
    client.on("call_ended", () => {
      releaseMic();
      setStatus("idle");
    });
    client.on("error", (e: unknown) => {
      console.error("Retell call error:", e);
      releaseMic();
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
  }, [releaseMic]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    // 1) Microphone first: acquire it ourselves so the browser prompt (if any)
    //    appears BEFORE the call, never in the middle of it. We keep the stream
    //    open and only release it once the call's own capture is live (see the
    //    call_started handler), so there is no release/reacquire race that could
    //    make the SDK's getUserMedia fail.
    let stream: MediaStream | null = null;
    try {
      stream = await acquireMicrophoneStream();
    } catch {
      stream = null;
    }
    if (!stream) {
      setMicrophoneGranted(false);
      setError("mic");
      setStatus("error");
      return;
    }
    micStreamRef.current = stream;

    // 2) Now start the Retell call.
    try {
      const client = await ensureClient();
      const { accessToken } = await createWebCall();
      await client.startCall({ accessToken });
    } catch (e) {
      console.error(e);
      releaseMic();
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("RETELL_NOT_CONFIGURED")) setError("not-configured");
      else if (
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("microphone")
      ) {
        setMicrophoneGranted(false);
        setError("mic");
      } else setError("failed");
      setStatus("error");
    }
  }, [ensureClient, releaseMic]);

  const stop = useCallback(() => {
    try {
      clientRef.current?.stopCall();
    } catch {
      /* ignore */
    }
    releaseMic();
    setStatus("idle");
  }, [releaseMic]);

  useEffect(
    () => () => {
      try {
        clientRef.current?.stopCall();
      } catch {
        /* ignore */
      }
      releaseMic();
    },
    [releaseMic],
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
