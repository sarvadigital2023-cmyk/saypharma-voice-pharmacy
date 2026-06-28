import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side delivery-zone check for the website's call gate.
 *
 * The browser sends only the customer's coordinates. We read the pharmacy
 * location + radius from pharmacy_settings with the SERVICE ROLE key on the
 * server, compute the distance here, and return only safe data — the pharmacy
 * coordinates never reach the browser.
 *
 * If the pharmacy location or radius is not configured, we treat the customer as
 * in-zone (configured:false) so the call is never blocked by an empty setting.
 *
 * Required server env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

export type DeliveryZoneResult = {
  configured: boolean;
  in_zone: boolean;
  distance_km: number | null;
  radius_km: number | null;
  currency: string | null;
  delivery_fee: number | null;
  delivery_free: boolean;
  min_order_amount: number | null;
  working_hours: string | null;
  pharmacy_address: string | null;
  phone1: string | null;
  phone2: string | null;
};

function toNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStr(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

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

export const checkClientDeliveryZone = createServerFn({ method: "POST" })
  .inputValidator((data: { latitude: number; longitude: number }) => ({
    latitude: Number(data?.latitude),
    longitude: Number(data?.longitude),
  }))
  .handler(async ({ data }): Promise<DeliveryZoneResult> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      // settings unreachable — don't block the call
      return {
        configured: false,
        in_zone: true,
        distance_km: null,
        radius_km: null,
        currency: null,
        delivery_fee: null,
        delivery_free: false,
        min_order_amount: null,
        working_hours: null,
        pharmacy_address: null,
        phone1: null,
        phone2: null,
      };
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data: row } = await supabase
      .from("pharmacy_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    const s = (row ?? {}) as Record<string, unknown>;

    const fee = toNum(s.delivery_fee);
    const radius = toNum(s.delivery_radius_km);
    const plat = toNum(s.latitude);
    const plon = toNum(s.longitude);
    const clat = Number.isFinite(data.latitude) ? data.latitude : null;
    const clon = Number.isFinite(data.longitude) ? data.longitude : null;

    const base = {
      currency: toStr(s.currency),
      delivery_fee: fee,
      delivery_free: fee != null && fee === 0,
      min_order_amount: toNum(s.min_order_amount),
      working_hours: toStr(s.working_hours),
      pharmacy_address: toStr(s.pharmacy_address),
      phone1: toStr(s.phone1),
      phone2: toStr(s.phone2),
      radius_km: radius,
    };

    // not enough data to judge → treat as in-zone (never block on empty settings)
    if (plat == null || plon == null || radius == null || clat == null || clon == null) {
      return { ...base, configured: false, in_zone: true, distance_km: null };
    }

    const distance = Math.round(haversineKm(plat, plon, clat, clon) * 10) / 10;
    return { ...base, configured: true, in_zone: distance <= radius, distance_km: distance };
  });

/**
 * Public pharmacy contact info for the website (address + phones). Read live from
 * pharmacy_settings with the service-role key on the server; only safe fields
 * reach the browser. Change them in the admin and the site updates on reload.
 */
export type PharmacyContact = {
  pharmacy_address: string | null;
  phone1: string | null;
  phone2: string | null;
};

export const getPharmacyContact = createServerFn({ method: "GET" }).handler(
  async (): Promise<PharmacyContact> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { pharmacy_address: null, phone1: null, phone2: null };

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase
      .from("pharmacy_settings")
      .select("pharmacy_address,phone1,phone2")
      .limit(1)
      .maybeSingle();
    const s = (data ?? {}) as Record<string, unknown>;
    return {
      pharmacy_address: toStr(s.pharmacy_address),
      phone1: toStr(s.phone1),
      phone2: toStr(s.phone2),
    };
  },
);
