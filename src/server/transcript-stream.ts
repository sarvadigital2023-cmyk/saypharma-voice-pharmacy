// Live transcript bridge: Retell monitor WebSocket -> Server-Sent Events.
//
// WHY THIS EXISTS
// The browser SDK normally delivers the live transcript over the call's data
// channel. On this account Retell issues gateway-only web-call tokens, and the
// gateway transport in retell-client-js-sdk parses its data channel with
// `JSON.parse(e.data)` inside an EMPTY catch — plus its legacy RetellWebClient
// only understands the old "update" event, while v3 sends "transcript_snapshot"
// and "transcript_updated". The result is that no transcript event ever reaches
// the page and the panel stayed empty until the call ended.
//
// Retell exposes the transcript on a SEPARATE channel that does not depend on
// the call transport at all:
//   wss://api.retellai.com/v2/monitor-call/{call_id}
// authenticated with the WebSocket subprotocols ["bearer", <API key>]
// (both verified against Retell's own SDK build).
//
// That key is secret, so the browser must never open that socket itself. This
// endpoint opens it on the server and relays only the utterances to the page as
// SSE.
//
// Required server env: RETELL_API_KEY.

type Utterance = { role: string; content: string; id?: string; time_sec?: number };

/** Messages that carry the transcript, per Retell's SDK:
 *  { transcript_snapshot: "transcript", transcript_updated: "transcript", call_ended: "end" } */
const TRANSCRIPT_TYPES = new Set(["transcript_snapshot", "transcript_updated"]);

/** Keep speech only — the array also carries tool_call_invocation /
 * tool_call_result / node_transition / dtmf entries. */
function speechOnly(list: unknown): Utterance[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((u) => {
      const o = (u ?? {}) as Record<string, unknown>;
      return {
        role: String(o.role ?? ""),
        content: String(o.content ?? ""),
        id: o.id == null ? undefined : String(o.id),
        time_sec: Number.isFinite(Number(o.time_sec)) ? Number(o.time_sec) : undefined,
      };
    })
    .filter((u) => (u.role === "agent" || u.role === "user") && u.content.trim().length > 0);
}

function sseHeaders(): HeadersInit {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // proxies must not buffer an event stream
    "x-accel-buffering": "no",
  };
}

/**
 * GET /api/transcript-stream?callId=...
 *
 * Streams `data: {"entries":[{role,content},...]}` lines for as long as the
 * platform allows. The browser uses EventSource, which reconnects on its own
 * when the serverless function hits its time limit — and because Retell sends a
 * full `transcript_snapshot` on connect, every reconnect resynchronises the
 * whole conversation instead of losing it.
 */
export async function handleTranscriptStream(request: Request, url: URL): Promise<Response> {
  const callId = url.searchParams.get("callId") ?? "";
  if (!callId) {
    return new Response(JSON.stringify({ error: "callId_required" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.error("transcript-stream: RETELL_API_KEY is not set");
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (typeof WebSocket === "undefined") {
    console.error("transcript-stream: WebSocket is unavailable in this runtime");
    return new Response(JSON.stringify({ error: "no_websocket" }), {
      status: 501,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const encoder = new TextEncoder();
  const wsUrl = `wss://api.retellai.com/v2/monitor-call/${encodeURIComponent(callId)}`;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      const clearHeartbeat = () => {
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = undefined;
      };

      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* stream already torn down */
        }
      };

      const shutdown = (ws?: WebSocket) => {
        if (closed) return;
        closed = true;
        clearHeartbeat();
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      let socket: WebSocket;
      try {
        // ["bearer", key] is exactly what Retell's SDK sends as subprotocols
        socket = new WebSocket(wsUrl, ["bearer", apiKey]);
      } catch (e) {
        console.error("transcript-stream: cannot open monitor socket:", e);
        send({ error: "monitor_open_failed" });
        shutdown();
        return;
      }

      // keep intermediaries from closing an idle stream
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* ignore */
        }
      }, 15_000);

      socket.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
          const type = String(msg.type ?? msg.event_type ?? "");
          if (TRANSCRIPT_TYPES.has(type)) {
            const entries = speechOnly(msg.transcript ?? msg.transcript_object ?? msg.utterances);
            if (entries.length > 0) send({ entries });
            return;
          }
          if (type === "call_ended") {
            send({ ended: true });
            shutdown(socket);
          }
        } catch (e) {
          // deliberately NOT swallowed silently — this is the exact failure mode
          // that made the SDK's own gateway channel impossible to debug.
          console.error("transcript-stream: undecodable monitor message:", e);
        }
      };

      socket.onerror = () => {
        console.error(`transcript-stream: monitor socket error for ${callId}`);
        send({ error: "monitor_socket_error" });
        shutdown(socket);
      };

      socket.onclose = () => shutdown(socket);

      request.signal?.addEventListener("abort", () => shutdown(socket));
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
