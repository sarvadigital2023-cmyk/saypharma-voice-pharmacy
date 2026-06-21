#!/usr/bin/env node
/**
 * One-shot setup for the SayPharma voice agent "Cimo" on Retell AI.
 *
 * Run it from a machine/shell that has internet access to api.retellai.com:
 *
 *   RETELL_API_KEY=key_xxx node scripts/setup-retell-agent.mjs
 *
 * Optional env:
 *   FORCE=1                 recreate the agent even if "Cimo" already exists
 *   RETELL_VOICE_ID=...     force a specific voice id (otherwise auto-picks a
 *                           female voice, preferring one named "Rita")
 *
 * It will: find or create agent "Cimo", attach a Retell LLM with a
 * multilingual (RU/UK/EN) pharmacy prompt, pick a pleasant female voice, and
 * print the agent_id to put into RETELL_AGENT_ID.
 *
 * No secrets are stored — the key is read from the environment only.
 */

const KEY = process.env.RETELL_API_KEY;
const BASE = "https://api.retellai.com";

if (!KEY) {
  console.error("Missing RETELL_API_KEY. Run: RETELL_API_KEY=key_xxx node scripts/setup-retell-agent.mjs");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return json;
}

// Multilingual pharmacy assistant prompt. {{app_language}} is injected per call
// from the web app (the language selected in Settings).
const GENERAL_PROMPT = `You are Cimo, a warm, friendly FEMALE voice assistant for SayPharma — a voice pharmacy that delivers over-the-counter medicines, vitamins/supplements and health devices. This is a spoken phone-style conversation, so keep replies short and natural and ask one question at a time.

LANGUAGE
- The customer's preferred language is {{app_language}}. Greet and speak in {{app_language}} by default.
- You are fluent in Russian, Ukrainian and English. If the customer speaks or asks for another of these languages, switch immediately and continue in it.

WHAT YOU DO
1. Greet the customer warmly and ask how you can help.
2. Take the order: ask what they need (product name, form, dosage, quantity). You sell ONLY non-prescription items: OTC medicines, vitamins and supplements, medical devices (blood-pressure monitors, glucometers, thermometers), orthopedic and health goods.
3. Check availability: confirm the item; assume common OTC items are in stock. If unsure, say you will check and confirm.
4. Collect delivery details: full address, recipient name and phone number. Read them back to confirm.
5. Summarize the order (items, quantities, address) and confirm before finalizing.
6. Offer payment by card or instant transfer on delivery.

RULES
- NEVER sell or promise prescription-only medicines. If asked, kindly explain SayPharma handles only non-prescription products and suggest visiting a regular pharmacy with a doctor's prescription.
- Do NOT diagnose or give dosing advice beyond the package instructions; suggest consulting a specialist when appropriate.
- If the customer needs a human or something you cannot do, take their request and say a specialist will follow up.

Begin by greeting the customer in {{app_language}} and asking how you can help.`;

async function main() {
  console.log("→ Checking account and listing agents…");
  const agentsResp = await api("GET", "/list-agents");
  const agents = Array.isArray(agentsResp) ? agentsResp : agentsResp.agents ?? [];
  console.log(`  found ${agents.length} agent(s).`);
  const existing = agents.find((a) => (a.agent_name || "").trim().toLowerCase() === "cimo");

  if (existing) {
    console.log("\n✓ Agent 'Cimo' already exists:");
    console.log("  agent_id:", existing.agent_id);
    console.log("  voice_id:", existing.voice_id, "| language:", existing.language);
    console.log("  response_engine:", JSON.stringify(existing.response_engine));
    if (!process.env.FORCE) {
      console.log("\nReview it in the Retell dashboard. To recreate a fresh, fully-configured");
      console.log("agent named 'Cimo', re-run with FORCE=1. Otherwise set:");
      console.log(`  RETELL_AGENT_ID=${existing.agent_id}`);
      return;
    }
    console.log("\nFORCE=1 set — creating a new, freshly configured 'Cimo' alongside it.");
  }

  // Pick a voice
  console.log("\n→ Listing voices to pick a pleasant female voice…");
  const voicesResp = await api("GET", "/list-voices");
  const voices = Array.isArray(voicesResp) ? voicesResp : voicesResp.voices ?? [];
  const females = voices.filter((v) => (v.gender || "").toLowerCase() === "female");
  let voiceId = process.env.RETELL_VOICE_ID;
  if (!voiceId) {
    const rita = females.find((v) => (v.voice_name || "").toLowerCase().includes("rita"));
    const pick = rita || females[0] || voices[0];
    voiceId = pick && pick.voice_id;
    console.log(
      "  female candidates:",
      females.slice(0, 8).map((v) => `${v.voice_name}(${v.voice_id})`).join(", ") || "(none flagged female)",
    );
    console.log("  chosen voice:", pick ? `${pick.voice_name} -> ${voiceId}` : "(none)");
  } else {
    console.log("  using RETELL_VOICE_ID:", voiceId);
  }
  if (!voiceId) throw new Error("No voice available — set RETELL_VOICE_ID explicitly.");

  // Create the Retell LLM
  console.log("\n→ Creating Retell LLM (multilingual pharmacy prompt)…");
  const llm = await api("POST", "/create-retell-llm", {
    general_prompt: GENERAL_PROMPT,
    model: "gpt-4o",
  });
  console.log("  llm_id:", llm.llm_id);

  // Create the agent
  console.log("\n→ Creating agent 'Cimo'…");
  const agent = await api("POST", "/create-agent", {
    agent_name: "Cimo",
    voice_id: voiceId,
    language: "multi", // auto-detect across supported languages (RU/UK/EN)
    response_engine: { type: "retell-llm", llm_id: llm.llm_id },
  });

  console.log("\n========================================================");
  console.log("✓ DONE. Agent 'Cimo' is ready.");
  console.log("  agent_id:", agent.agent_id);
  console.log("  voice_id:", voiceId);
  console.log("\nSet this in Vercel (and local .env):");
  console.log(`  RETELL_AGENT_ID=${agent.agent_id}`);
  console.log("========================================================");
}

main().catch((e) => {
  console.error("\n✗ Failed:", e.message);
  process.exit(1);
});
