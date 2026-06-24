// HTTP endpoints the Retell agent "Cimo" calls via Tool Calls.
// Mounted at /api/agent/* from src/server.ts (so it works regardless of the
// framework's route discovery). Runs only on the server (Vercel/Nitro), where
// it talks to Supabase with the SERVICE ROLE key — that key never reaches the
// browser.
//
// Required server env (set in Vercel → Environment Variables):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   AGENT_TOOL_SECRET   (optional but recommended) — shared secret that Retell
//                        sends as the "x-agent-secret" header on every tool call.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

let cachedClient: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  // Reuse the client across warm invocations so we don't re-init it every call.
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cachedClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cachedClient;
}

type Movement = { product_id: string; type: string; quantity: number | null };

/** Stock = sum(quantity where type='in') − sum(quantity where type in ('out','write_off')). */
async function stockFor(supabase: SupabaseClient, productIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>(productIds.map((id) => [id, 0]));
  if (productIds.length === 0) return map;
  const { data } = await supabase
    .from("stock_movements")
    .select("product_id,type,quantity")
    .in("product_id", productIds);
  for (const mv of (data ?? []) as Movement[]) {
    if (!mv.product_id) continue;
    const sign = mv.type === "in" ? 1 : -1;
    map.set(mv.product_id, (map.get(mv.product_id) ?? 0) + sign * (mv.quantity ?? 0));
  }
  return map;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return null;
  // Parse human/locale strings like "5,00", "6.00 грн", "1 234,56", "₴5".
  let s = String(value).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, ""); // drop currency symbols, spaces, letters
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // whichever separator is last is the decimal one; the other is grouping
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", "."); // comma decimal: "5,00" -> "5.00"
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

// The catalog may store prices/origin under different column names depending on
// how the admin set the table up (e.g. price vs price_with_vat vs gross_price,
// country vs manufacturer_country). Resolve them tolerantly so the agent always
// gets a value, and also pass through the raw catalog columns below as a backstop.

// Column whose name MEANS "price" — English, Russian and Ukrainian roots and
// transliterations (price, cena, ціна/цін, вартість/варт, стоимость/стоим...).
const PRICE_KEY = /(price|cena|cina|tsina|tsena|цена|цін|варт|стоим|retail|sell|amount|cost)/i;

// Given a price column name, is it the WITH-VAT, WITHOUT-VAT or a plain price?
function classifyPriceKey(k: string): "with" | "without" | "plain" {
  const s = k.toLowerCase();
  if (/(without|no[_-]?vat|excl|net|без|bez)/.test(s)) return "without";
  if (/(with|incl|gross|vat|tax|ндс|пдв|pdv|nds)/.test(s)) return "with";
  return "plain";
}

function resolvePrices(p: Record<string, unknown>) {
  let withVat =
    num(p.price_with_vat) ??
    num(p.price_vat) ??
    num(p.price_incl_vat) ??
    num(p.price_with_tax) ??
    num(p.gross_price) ??
    num(p.retail_price);
  let withoutVat =
    num(p.price_without_vat) ??
    num(p.price_no_vat) ??
    num(p.price_excl_vat) ??
    num(p.net_price) ??
    num(p.base_price);
  let plain = num(p.price);

  // Scan any price-meaning column (covers RU/UA names like "цена_с_ндс",
  // "ціна_без_пдв", "вартість") to fill whatever the explicit list missed.
  for (const [k, v] of Object.entries(p)) {
    if (!PRICE_KEY.test(k)) continue;
    const n = num(v);
    if (n == null) continue;
    const cls = classifyPriceKey(k);
    if (cls === "with") withVat ??= n;
    else if (cls === "without") withoutVat ??= n;
    else plain ??= n;
  }

  // the price the customer actually pays (prefer the gross/with-VAT figure)
  const charge = withVat ?? plain ?? withoutVat;
  return {
    price: plain ?? charge,
    // always give the agent a "to pay" figure so it never reports "no price"
    price_with_vat: withVat ?? charge,
    price_without_vat: withoutVat,
    charge,
  };
}

function resolveCountry(p: Record<string, unknown>): string | null {
  return str(
    p.manufacturer_country ??
      p.country_of_origin ??
      p.country ??
      p.origin_country ??
      p.made_in ??
      p.origin,
  );
}

function resolveManufacturer(p: Record<string, unknown>): string | null {
  return str(p.manufacturer ?? p.producer ?? p.brand ?? p.vendor ?? p.maker);
}

/** Backstop: surface every catalog column that looks price/origin related, under
 * its real name, so the agent can read it even if the resolvers above miss it. */
function catalogDetails(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v == null || v === "") continue;
    if (
      PRICE_KEY.test(k) ||
      /(vat|tax|ндс|пдв|country|origin|manufact|producer|brand|made_in|краін|стран|вироб|производ)/i.test(k)
    )
      out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------- tools

async function searchProducts(supabase: SupabaseClient, args: Record<string, unknown>) {
  const raw = String(args.query ?? args.name ?? "").trim().slice(0, 80);
  // strip characters that have meaning inside a PostgREST or() filter
  const q = raw.replace(/[,()*%]/g, " ").trim();

  // MATCHING QUERY — kept identical to the original, proven-stable version:
  // explicit columns (no SELECT *), whole-phrase ilike, limit 10. This is the
  // only query that decides whether a product is found.
  let query = supabase
    .from("products")
    .select("id,name,active_substance,form,dosage,price,prescription_required,description")
    .limit(10);
  if (q) query = query.or(`name.ilike.%${q}%,active_substance.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return json({ error: "db_error" }, 500);

  const products = (data ?? []) as Array<Record<string, unknown>>;
  const ids = products.map((p) => String(p.id));

  // Fetch stock and the full rows (price-with-VAT / country / extra columns) in
  // PARALLEL, keyed by the already-matched ids — so enrichment adds no latency
  // over the original search and can never stop a product from being found.
  const [stocks, fullById] = await Promise.all([
    stockFor(supabase, ids),
    (async () => {
      const map = new Map<string, Record<string, unknown>>();
      if (ids.length) {
        const { data: full } = await supabase.from("products").select("*").in("id", ids);
        for (const row of (full ?? []) as Array<Record<string, unknown>>) map.set(String(row.id), row);
      }
      return map;
    })(),
  ]);

  return json({
    products: products.map((p) => {
      const pid = String(p.id);
      const full = fullById.get(pid) ?? p; // fall back to the matched row
      const inStock = stocks.get(pid) ?? 0;
      const rx = Boolean(full.prescription_required ?? p.prescription_required);
      const prices = resolvePrices(full);
      return {
        product_id: p.id,
        name: p.name,
        active_substance: p.active_substance,
        form: p.form,
        dosage: p.dosage,
        manufacturer: resolveManufacturer(full),
        country: resolveCountry(full),
        price: prices.price,
        price_with_vat: prices.price_with_vat,
        price_without_vat: prices.price_without_vat,
        prescription_required: rx,
        in_stock: inStock,
        available: inStock > 0 && !rx,
        details: catalogDetails(full),
      };
    }),
  });
}

async function checkAvailability(supabase: SupabaseClient, args: Record<string, unknown>) {
  const productId = String(args.product_id ?? "");
  const quantity = Math.max(1, Number(args.quantity ?? 1) || 1);
  if (!productId) return json({ error: "product_id_required" }, 400);

  const stocks = await stockFor(supabase, [productId]);
  const inStock = stocks.get(productId) ?? 0;
  return json({ available: inStock >= quantity, in_stock: inStock, requested: quantity });
}

async function pharmacyInfo(supabase: SupabaseClient) {
  const { data } = await supabase.from("pharmacy_settings").select("*").limit(1).maybeSingle();
  const s = asObject(data);
  return json({
    delivery_fee: s.delivery_fee ?? null,
    min_order_amount: s.min_order_amount ?? null,
    working_hours: s.working_hours ?? null,
    delivery_radius_km: s.delivery_radius_km ?? null,
    location: { latitude: s.latitude ?? null, longitude: s.longitude ?? null },
  });
}

type OrderItemIn = { product_id?: unknown; quantity?: unknown };

async function createOrder(supabase: SupabaseClient, args: Record<string, unknown>) {
  const customer = asObject(args.customer);
  const phone = String(args.phone ?? customer.phone ?? "").trim();
  const fullName = (args.full_name ?? customer.full_name ?? null) as string | null;
  const address = (args.address ?? customer.address ?? null) as string | null;
  const paymentMethod = (args.payment_method ?? customer.payment_method ?? null) as string | null;
  const comment = (args.comment ?? null) as string | null;

  const rawItems = Array.isArray(args.items) ? (args.items as OrderItemIn[]) : [];
  if (!phone) return json({ ok: false, reason: "phone_required" });
  if (rawItems.length === 0) return json({ ok: false, reason: "no_items" });

  const items = rawItems
    .map((it) => ({ product_id: String(it.product_id ?? ""), quantity: Math.floor(Number(it.quantity ?? 0)) }))
    .filter((it) => it.product_id && it.quantity > 0);
  if (items.length === 0) return json({ ok: false, reason: "no_valid_items" });

  const ids = [...new Set(items.map((it) => it.product_id))];
  const { data: prodRows, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .in("id", ids);
  if (prodErr) return json({ error: "db_error" }, 500);

  const byId = new Map((prodRows ?? []).map((p) => [String(p.id), p as Record<string, unknown>]));
  const stocks = await stockFor(supabase, ids);

  // validate everything BEFORE writing anything
  const lines: Array<{ product_id: string; name: string; quantity: number; price: number }> = [];
  for (const it of items) {
    const p = byId.get(it.product_id);
    if (!p) return json({ ok: false, reason: "product_not_found", product_id: it.product_id });
    if (Boolean(p.prescription_required))
      return json({ ok: false, reason: "prescription_required", product: p.name });
    const charge = resolvePrices(p).charge;
    if (charge == null) return json({ ok: false, reason: "no_price", product: p.name });
    const inStock = stocks.get(it.product_id) ?? 0;
    if (inStock < it.quantity)
      return json({ ok: false, reason: "insufficient_stock", product: p.name, in_stock: inStock, requested: it.quantity });
    lines.push({ product_id: it.product_id, name: String(p.name), quantity: it.quantity, price: charge });
  }

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  // optional minimum-order check
  const { data: settings } = await supabase.from("pharmacy_settings").select("min_order_amount").limit(1).maybeSingle();
  const minOrder = settings?.min_order_amount;
  if (minOrder != null && total < Number(minOrder)) {
    return json({ ok: false, reason: "min_order_not_met", min_order_amount: Number(minOrder), total });
  }

  // create the order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      phone,
      full_name: fullName,
      address,
      payment_method: paymentMethod,
      comment,
      items: lines,
      total_amount: total,
      status: "new",
    })
    .select("id,total_amount,status")
    .single();
  if (orderErr || !order) return json({ error: "order_create_failed" }, 500);

  // write the stock-out movements
  const { error: moveErr } = await supabase.from("stock_movements").insert(
    lines.map((l) => ({
      product_id: l.product_id,
      type: "out",
      quantity: l.quantity,
      notes: `order ${order.id}`,
    })),
  );
  if (moveErr) {
    // best effort: flag the order so stock stays consistent for staff review
    await supabase.from("orders").update({ status: "cancelled", comment: `${comment ?? ""} [stock write failed]`.trim() }).eq("id", order.id);
    return json({ ok: false, reason: "stock_write_failed", order_id: order.id }, 500);
  }

  return json({ ok: true, order_id: order.id, total_amount: order.total_amount, status: order.status, items: lines });
}

// ---------------------------------------------------------------- router

export async function handleAgentApi(request: Request, url: URL): Promise<Response> {
  // shared-secret auth (enforced only when AGENT_TOOL_SECRET is set).
  // Accepts the secret via the "x-agent-secret" header OR a "?k=" query param,
  // so Retell tools can authenticate without custom headers.
  const secret = process.env.AGENT_TOOL_SECRET;
  if (secret) {
    const provided = request.headers.get("x-agent-secret") ?? url.searchParams.get("k");
    if (provided !== secret) return json({ error: "unauthorized" }, 401);
  }

  const supabase = getClient();
  if (!supabase) return json({ error: "supabase_not_configured" }, 500);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* empty/invalid body is fine for GET-like tools */
  }
  // Retell wraps arguments in { name, args, call }. Accept that or a plain body.
  const wrapper = asObject(body);
  const args = wrapper.args && typeof wrapper.args === "object" ? asObject(wrapper.args) : wrapper;

  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/api/agent/search-products")) return searchProducts(supabase, args);
  if (path.endsWith("/api/agent/check-availability")) return checkAvailability(supabase, args);
  if (path.endsWith("/api/agent/create-order")) return createOrder(supabase, args);
  if (path.endsWith("/api/agent/pharmacy-info")) return pharmacyInfo(supabase);
  return json({ error: "unknown_tool" }, 404);
}
