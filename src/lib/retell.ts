import { createServerFn } from "@tanstack/react-start";

/**
 * Mints a short-lived Retell web-call access token on the server.
 *
 * The Retell API key is a SECRET and is read only from server env
 * (RETELL_API_KEY). The browser never sees it — it only receives the
 * short-lived access_token returned here and feeds it to the Retell web SDK.
 *
 * The app's currently selected language is forwarded as a Retell dynamic
 * variable ({{app_language}}) so the agent answers in the user's language.
 *
 * Required env (set in Vercel → Environment Variables and in local .env):
 *   RETELL_API_KEY   — your Retell secret API key
 *   RETELL_AGENT_ID  — the agent to call (Cimo)
 */
export const createWebCall = createServerFn({ method: "POST" })
  .inputValidator((data: { language?: string }) => ({
    language: typeof data?.language === "string" ? data.language : "English",
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.RETELL_API_KEY;
    const agentId = process.env.RETELL_AGENT_ID;

    if (!apiKey || !agentId) {
      throw new Error("RETELL_NOT_CONFIGURED");
    }

    const res = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        retell_llm_dynamic_variables: { app_language: data.language },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Retell create-web-call failed: ${res.status} ${detail}`);
      throw new Error("RETELL_CALL_FAILED");
    }

    const result = (await res.json()) as { access_token: string; call_id: string };
    return { accessToken: result.access_token, callId: result.call_id };
  });
