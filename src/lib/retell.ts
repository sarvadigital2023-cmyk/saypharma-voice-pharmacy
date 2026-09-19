import { createServerFn } from "@tanstack/react-start";

/**
 * Mints a short-lived Retell web-call access token on the server.
 *
 * The Retell API key is a SECRET and is read only from server env
 * (RETELL_API_KEY). The browser never sees it — it only receives the
 * short-lived access_token returned here and feeds it to the Retell web SDK.
 *
 * The agent runs in multi-language mode, so it auto-detects the spoken
 * language itself — the app does NOT send any language hint.
 *
 * Required env (set in Vercel → Environment Variables and in local .env):
 *   RETELL_API_KEY   — your Retell secret API key (REQUIRED)
 *   RETELL_AGENT_ID  — optional override; defaults to the published "Cimo"
 *                      agent below.
 *
 * The agent's own settings (voice retell-Rita, gpt-4.1-mini, multi language,
 * expressive mode, interruption sensitivity, max duration, data storage, etc.)
 * live on the Retell agent itself — this app just references it by id.
 */
const DEFAULT_AGENT_ID = "agent_ab40edc3f65fa8dc35bea4ef84"; // Cimo

export const createWebCall = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID || DEFAULT_AGENT_ID;

  if (!apiKey) {
    throw new Error("RETELL_NOT_CONFIGURED");
  }

  let res: Response;
  try {
    // v3 endpoint: /v2/create-web-call is deprecated (removal 2026-09-30). The
    // request body is unchanged from v2 — only the version in the path moves.
    res = await fetch("https://api.retellai.com/v3/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: agentId }),
    });
  } catch (e) {
    console.error("Retell create-web-call network error:", e);
    throw new Error("RETELL_CALL_FAILED:network");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Retell create-web-call failed: ${res.status} ${detail}`);
    // include the HTTP status so the cause is visible (401=bad key, 402=quota,
    // 404=agent not found, etc.) instead of a generic failure.
    throw new Error(`RETELL_CALL_FAILED:${res.status}`);
  }

  // v3 returns the same essentials as v2 — a short-lived access token and the
  // call id. Parse tolerantly (accept snake_case or camelCase) so a minor
  // field-name change in v3 can't silently break the call; fail loudly if the
  // access token is missing rather than handing the SDK an undefined token.
  const result = (await res.json()) as {
    access_token?: string;
    accessToken?: string;
    call_id?: string;
    callId?: string;
  };
  const accessToken = result.access_token ?? result.accessToken;
  const callId = result.call_id ?? result.callId ?? null;
  if (!accessToken) {
    console.error("Retell create-web-call returned no access token");
    throw new Error("RETELL_CALL_FAILED:no_access_token");
  }
  return { accessToken, callId };
});
