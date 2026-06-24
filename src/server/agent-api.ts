// HTTP endpoints the Retell agent "Cimo" calls via Tool Calls.
// Mounted at /api/agent/* from src/server.ts (so it works regardless of the
// framework's route discovery). Runs only on the server (Vercel/Nitro), where
// it talks to Supabase with the SERVICE ROLE key — that key never reaches the
// browser.
//
// PRINCIPLE: no business parameters are hardcoded. Currency, location, delivery
// radius, delivery fee, minimum order, working hours and timezone are ALL read
// live from the pharmacy_settings table. Change them in the admin and the agent
// picks them up automatically (settings are cached for 60s only).
//
// Required server env (set in Vercel → Environment Variables):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   AGENT_TOOL_SECRET    (optional) — shared secret Retell sends as the
//                         "x-agent-secret" header or "?k=" query param.

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

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return null;
  // Parse locale strings like "5,00", "6.00", "1 234,56".
  let s = String(value).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

// ---------------------------------------------------------------- settings

// Everything here mirrors pharmacy_settings 1:1. New columns added in the admin
// (e.g. "timezone") are picked up automatically because we select "*".
type Settings = {
  currency: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_radius_km: number | null;
  delivery_fee: number | null;
  min_order_amount: number | null;
  working_hours: string | null;
  timezone: string | null;
  pharmacy_address: string | null;
  phone1: string | null;
  phone2: string | null;
};

let settingsCache: { value: Settings | null; at: number } | undefined;
const SETTINGS_TTL_MS = 60_000;

async function getSettings(supabase: SupabaseClient): Promise<Settings | null> {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.value;
  // SELECT * so the read never breaks when a new column is added and so new
  // settings columns are picked up without any code change.
  const { data } = await supabase.from("pharmacy_settings").select("*").limit(1).maybeSingle();
  const s = asObject(data);
  const value: Settings | null = data
    ? {
        currency: str(s.currency),
        latitude: num(s.latitude),
        longitude: num(s.longitude),
        delivery_radius_km: num(s.delivery_radius_km),
        delivery_fee: num(s.delivery_fee),
        min_order_amount: num(s.min_order_amount),
        working_hours: str(s.working_hours),
        timezone: str(s.timezone),
        pharmacy_address: str(s.pharmacy_address),
        phone1: str(s.phone1),
        phone2: str(s.phone2),
      }
    : null;
  settingsCache = { value, at: Date.now() };
  return value;
}

// ---------------------------------------------------------------- working hours

/** Minutes since midnight in the given IANA timezone, right now. */
function nowMinutesInTz(tz: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const m = parts.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]) % 24;
    return h * 60 + Number(m[2]);
  } catch {
    return null; // unknown/invalid timezone string
  }
}

/**
 * Is the pharmacy open now? Needs both working_hours (text like "09:00-21:00")
 * and a timezone, both taken from pharmacy_settings. Returns null when either is
 * missing or unparseable — we never guess a timezone.
 */
function isOpenNow(workingHours: string | null, timezone: string | null): boolean | null {
  if (!workingHours || !timezone) return null;
  const m = workingHours.match(/(\d{1,2}):(\d{2})\s*[-–—to ]+\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  const now = nowMinutesInTz(timezone);
  if (now == null) return null;
  if (close === open) return true; // treat equal open/close as 24h
  return close > open ? now >= open && now < close : now >= open || now < close;
}

// ---------------------------------------------------------------- geo

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Geocode a free-form address via OpenStreetMap Nominatim (no API key). This is
 * infrastructure (address → coordinates), not a business parameter. */
async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const u = new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("format", "json");
    u.searchParams.set("limit", "1");
    u.searchParams.set("q", address);
    const res = await fetch(u, {
      headers: { "User-Agent": "SayPharma-Voice/1.0 (pharmacy delivery zone check)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = arr?.[0];
    const lat = num(hit?.lat);
    const lon = num(hit?.lon);
    return lat != null && lon != null ? { lat, lon } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- stock

type Movement = { product_id: string; type: string; quantity: number | null };

/** Stock = sum(quantity where type='in') − sum(quantity where type='out'). */
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

// ---------------------------------------------------------------- tools

async function searchProducts(supabase: SupabaseClient, args: Record<string, unknown>) {
  const raw = String(args.query ?? args.name ?? "").trim().slice(0, 80);
  // strip characters that have meaning inside a PostgREST or() filter
  const q = raw.replace(/[,()*%]/g, " ").trim();

  let query = supabase
    .from("products")
    .select("id,name,active_substance,form,dosage,country,age_category,prescription_required,price")
    .limit(10);
  if (q) query = query.or(`name.ilike.%${q}%,active_substance.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return json({ error: "db_error" }, 500);

  const products = (data ?? []) as Array<Record<string, unknown>>;
  const ids = products.map((p) => String(p.id));

  // stock + settings(currency) in parallel — no extra latency on the search path
  const [stocks, settings] = await Promise.all([stockFor(supabase, ids), getSettings(supabase)]);

  return json({
    currency: settings?.currency ?? null,
    products: products.map((p) => {
      const inStock = stocks.get(String(p.id)) ?? 0;
      const rx = Boolean(p.prescription_required);
      const price = num(p.price);
      return {
        product_id: p.id,
        name: p.name,
        active_substance: p.active_substance,
        form: p.form,
        dosage: p.dosage,
        country: str(p.country),
        age_category: str(p.age_category),
        price,
        prescription_required: rx,
        in_stock: inStock,
        available: inStock > 0 && !rx && price != null,
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
  const s = await getSettings(supabase);
  if (!s) return json({ error: "settings_not_found" }, 500);
  const fee = s.delivery_fee;
  return json({
    currency: s.currency,
    delivery_fee: fee,
    delivery_free: fee != null && fee === 0,
    min_order_amount: s.min_order_amount,
    delivery_radius_km: s.delivery_radius_km,
    pharmacy_address: s.pharmacy_address,
    phone1: s.phone1,
    phone2: s.phone2,
    location: { latitude: s.latitude, longitude: s.longitude },
    working_hours: s.working_hours,
    timezone: s.timezone,
    open_now: isOpenNow(s.working_hours, s.timezone),
  });
}

async function checkDelivery(supabase: SupabaseClient, args: Record<string, unknown>) {
  const s = await getSettings(supabase);
  if (!s) return json({ error: "settings_not_found" }, 500);
  const fee = s.delivery_fee;
  const radius = s.delivery_radius_km;

  const base = {
    currency: s.currency,
    radius_km: radius,
    delivery_fee: fee,
    delivery_free: fee != null && fee === 0,
    working_hours: s.working_hours,
    open_now: isOpenNow(s.working_hours, s.timezone),
  };

  // Resolve the customer location: explicit coords > free-form address > distance.
  let lat = num(args.latitude ?? args.lat);
  let lon = num(args.longitude ?? args.lon ?? args.lng);

  if (lat == null || lon == null) {
    const parts = [args.address, args.street, args.city, args.postcode, args.region, args.country]
      .map((v) => str(v))
      .filter(Boolean);
    const addressText = (str(args.address) ?? parts.join(", ")).trim();
    if (addressText) {
      const geo = await geocode(addressText);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
      } else {
        return json({ ...base, ok: false, reason: "could_not_locate", address: addressText });
      }
    }
  }

  let distanceKm = num(args.distance_km);
  if (distanceKm == null) {
    if (lat == null || lon == null) return json({ ...base, ok: false, reason: "location_required" });
    if (s.latitude == null || s.longitude == null)
      return json({ ...base, ok: false, reason: "pharmacy_location_unset" });
    distanceKm = haversineKm(s.latitude, s.longitude, lat, lon);
  }

  const distance = Math.round(distanceKm * 10) / 10;
  const inZone = radius != null ? distance <= radius : null;
  return json({ ...base, ok: true, in_zone: inZone, distance_km: distance });
}

type OrderItemIn = { product_id?: unknown; quantity?: unknown };

async function createOrder(supabase: SupabaseClient, args: Record<string, unknown>) {
  const customer = asObject(args.customer);
  const phone = String(args.phone ?? customer.phone ?? "").trim();
  const fullName = (args.full_name ?? customer.full_name ?? null) as string | null;
  const address = (args.address ?? customer.address ?? null) as string | null;
  const paymentMethod = (args.payment_method ?? customer.payment_method ?? null) as string | null;
  const comment = (args.comment ?? null) as string | null;

  const settings = await getSettings(supabase);
  const currency = settings?.currency ?? null;

  const rawItems = Array.isArray(args.items) ? (args.items as OrderItemIn[]) : [];
  if (!phone) return json({ ok: false, reason: "phone_required", currency });
  if (rawItems.length === 0) return json({ ok: false, reason: "no_items", currency });

  const items = rawItems
    .map((it) => ({ product_id: String(it.product_id ?? ""), quantity: Math.floor(Number(it.quantity ?? 0)) }))
    .filter((it) => it.product_id && it.quantity > 0);
  if (items.length === 0) return json({ ok: false, reason: "no_valid_items", currency });

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
    if (!p) return json({ ok: false, reason: "product_not_found", product_id: it.product_id, currency });
    if (Boolean(p.prescription_required))
      return json({ ok: false, reason: "prescription_required", product: p.name, currency });
    const price = num(p.price);
    if (price == null) return json({ ok: false, reason: "no_price", product: p.name, currency });
    const inStock = stocks.get(it.product_id) ?? 0;
    if (inStock < it.quantity)
      return json({ ok: false, reason: "insufficient_stock", product: p.name, in_stock: inStock, requested: it.quantity, currency });
    lines.push({ product_id: it.product_id, name: String(p.name), quantity: it.quantity, price });
  }

  const total = Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100;

  // minimum-order check (from settings)
  const minOrder = settings?.min_order_amount ?? null;
  if (minOrder != null && minOrder > 0 && total < minOrder) {
    return json({
      ok: false,
      reason: "min_order_not_met",
      min_order_amount: minOrder,
      total,
      shortfall: Math.round((minOrder - total) * 100) / 100,
      currency,
    });
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
    await supabase
      .from("orders")
      .update({ status: "cancelled", comment: `${comment ?? ""} [stock write failed]`.trim() })
      .eq("id", order.id);
    return json({ ok: false, reason: "stock_write_failed", order_id: order.id }, 500);
  }

  return json({
    ok: true,
    order_id: order.id,
    total_amount: order.total_amount,
    status: order.status,
    items: lines,
    currency,
  });
}

// ---------------------------------------------------------------- router

export async function handleAgentApi(request: Request, url: URL): Promise<Response> {
  // shared-secret auth (enforced only when AGENT_TOOL_SECRET is set).
  // Accepts the secret via the "x-agent-secret" header OR a "?k=" query param.
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
  if (path.endsWith("/api/agent/check-delivery")) return checkDelivery(supabase, args);
  if (path.endsWith("/api/agent/create-order")) return createOrder(supabase, args);
  if (path.endsWith("/api/agent/pharmacy-info")) return pharmacyInfo(supabase);
  return json({ error: "unknown_tool" }, 404);
}
