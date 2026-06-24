// Browser geolocation, promise-based, with a timeout and clear failure reasons.
// No UI — the CallGateModal drives the flow and renders the result.

export type GeoResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: "denied" | "unavailable" | "timeout" | "insecure" };

export function requestGeolocation(timeoutMs = 10_000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unavailable" });
      return;
    }
    // Geolocation requires a secure context (https). localhost is allowed.
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      resolve({ ok: false, reason: "insecure" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ ok: true, latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        resolve({ ok: false, reason });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
