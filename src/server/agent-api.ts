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

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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

// ---------------------------------------------------------------- tools

async function searchProducts(supabase: SupabaseClient, args: Record<string, unknown>) {
  const raw = String(args.query ?? args.name ?? "").trim().slice(0, 80);
  // strip characters that have meaning inside a PostgREST or() filter
  const q = raw.replace(/[,()*%]/g, " ").trim();

  let query = supabase
    .from("products")
    .select("id,name,active_substance,form,dosage,price,prescription_required,description")
    .limit(10);
  if (q) query = query.or(`name.ilike.%${q}%,active_substance.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return json({ error: "db_error" }, 500);

  const products = (data ?? []) as Array<Record<string, unknown>>;
  const stocks = await stockFor(
    supabase,
    products.map((p) => String(p.id)),
  );

  return json({
    products: products.map((p) => {
      const inStock = stocks.get(String(p.id)) ?? 0;
      const rx = Boolean(p.prescription_required);
      return {
        product_id: p.id,
        name: p.name,
        active_substance: p.active_substance,
        form: p.form,
        dosage: p.dosage,
        price: p.price,
        prescription_required: rx,
        in_stock: inStock,
        available: inStock > 0 && !rx,
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
    .select("id,name,price,prescription_required")
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
    if (p.price == null) return json({ ok: false, reason: "no_price", product: p.name });
    const inStock = stocks.get(it.product_id) ?? 0;
    if (inStock < it.quantity)
      return json({ ok: false, reason: "insufficient_stock", product: p.name, in_stock: inStock, requested: it.quantity });
    lines.push({ product_id: it.product_id, name: String(p.name), quantity: it.quantity, price: Number(p.price) });
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
  // shared-secret auth (enforced only when AGENT_TOOL_SECRET is set)
  const secret = process.env.AGENT_TOOL_SECRET;
  if (secret && request.headers.get("x-agent-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
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
