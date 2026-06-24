import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin,
  Truck,
  Mic,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  PhoneCall,
} from "lucide-react";

import { useI18n } from "@/i18n";
import { requestGeolocation } from "@/lib/geolocation";
import { requestMicrophoneOnce } from "@/lib/microphone";
import { checkClientDeliveryZone, type DeliveryZoneResult } from "@/lib/pharmacy";

type CallStatus = "idle" | "connecting" | "live" | "error";

type Phase =
  | "geo-loading"
  | "geo-error"
  | "zone-loading"
  | "zone-out"
  | "mic-prompt"
  | "mic-loading"
  | "mic-error"
  | "calling"
  | "call-error";

type GeoErrorReason = "denied" | "unavailable" | "timeout" | "insecure";

const NEON =
  "bg-[#34e57a] text-[#06210f] shadow-[0_0_28px_rgba(52,229,122,0.45)] hover:bg-[#46f08a] active:scale-[0.99]";

const PHASE_STEP: Record<Phase, { idx: number; err: boolean }> = {
  "geo-loading": { idx: 0, err: false },
  "geo-error": { idx: 0, err: true },
  "zone-loading": { idx: 1, err: false },
  "zone-out": { idx: 1, err: true },
  "mic-prompt": { idx: 2, err: false },
  "mic-loading": { idx: 2, err: false },
  "mic-error": { idx: 2, err: true },
  calling: { idx: 3, err: false },
  "call-error": { idx: 3, err: true },
};

export function CallGateModal({
  open,
  onClose,
  onStartCall,
  callStatus,
  callErrorDetail,
}: {
  open: boolean;
  onClose: () => void;
  onStartCall: () => void;
  callStatus: CallStatus;
  callErrorDetail?: string | null;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("geo-loading");
  const [geoReason, setGeoReason] = useState<GeoErrorReason>("denied");
  const [zone, setZone] = useState<DeliveryZoneResult | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // ----- step orchestration -----

  const runZone = useCallback(async (latitude: number, longitude: number) => {
    setPhase("zone-loading");
    try {
      const result = await checkClientDeliveryZone({ data: { latitude, longitude } });
      setZone(result);
      setPhase(result.in_zone ? "mic-prompt" : "zone-out");
    } catch {
      // if the zone check itself fails, don't block the customer
      setPhase("mic-prompt");
    }
  }, []);

  const runGeo = useCallback(async () => {
    setPhase("geo-loading");
    const res = await requestGeolocation();
    if (res.ok) {
      await runZone(res.latitude, res.longitude);
    } else {
      setGeoReason(res.reason);
      setPhase("geo-error");
    }
  }, [runZone]);

  const runMic = useCallback(async () => {
    setPhase("mic-loading");
    const granted = await requestMicrophoneOnce();
    if (granted) {
      setPhase("calling");
      onStartCall();
    } else {
      setPhase("mic-error");
    }
  }, [onStartCall]);

  // kick off the flow each time the modal opens
  useEffect(() => {
    if (open) void runGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // react to the actual call outcome while we are on the "calling" step
  useEffect(() => {
    if (phase !== "calling") return;
    if (callStatus === "live") onClose();
    else if (callStatus === "error") setPhase("call-error");
  }, [phase, callStatus, onClose]);

  // Esc to close + focus the card on open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    cardRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const steps = [t("gate.step.geo"), t("gate.step.zone"), t("gate.step.mic"), t("gate.step.call")];
  const cur = PHASE_STEP[phase];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("gate.subtitle")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-foreground shadow-2xl outline-none sm:rounded-3xl sm:pt-6"
      >
        {/* header */}
        <div className="flex items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-wide text-muted-foreground">
            SayPharma · {t("gate.subtitle")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("gate.cancel")}
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="px-6 pt-4">
          <PhaseBody
            phase={phase}
            geoReason={geoReason}
            zone={zone}
            callErrorDetail={callErrorDetail ?? null}
            t={t}
          />
        </div>

        {/* steps */}
        <ol className="mt-6 space-y-2 px-6">
          {steps.map((label, i) => {
            const state =
              i < cur.idx ? "done" : i === cur.idx ? (cur.err ? "error" : "active") : "pending";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <StepIcon state={state} />
                <span
                  className={
                    state === "pending"
                      ? "text-muted-foreground/60"
                      : state === "error"
                        ? "text-destructive"
                        : "text-foreground"
                  }
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* actions */}
        <div className="mt-6 px-6">
          <PhaseActions
            phase={phase}
            onRetryGeo={runGeo}
            onAllowMic={runMic}
            onRetryMic={runMic}
            onClose={onClose}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "error" | "pending" }) {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 text-[#34e57a]" />;
  if (state === "error") return <XCircle className="h-5 w-5 text-destructive" />;
  if (state === "active") return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
  return <span className="h-5 w-5 rounded-full border border-border" />;
}

function BigIcon({ kind }: { kind: "geo" | "zone" | "mic" | "call" | "error" }) {
  const base = "mx-auto grid h-16 w-16 place-items-center rounded-2xl";
  if (kind === "error")
    return (
      <div className={`${base} bg-destructive/15 text-destructive`}>
        <AlertTriangle className="h-8 w-8" />
      </div>
    );
  const Icon = kind === "geo" ? MapPin : kind === "zone" ? Truck : kind === "mic" ? Mic : PhoneCall;
  return (
    <div className={`${base} bg-[#34e57a]/15 text-[#34e57a]`}>
      <Icon className="h-8 w-8" />
    </div>
  );
}

function PhaseBody({
  phase,
  geoReason,
  zone,
  callErrorDetail,
  t,
}: {
  phase: Phase;
  geoReason: GeoErrorReason;
  zone: DeliveryZoneResult | null;
  callErrorDetail: string | null;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  let icon: "geo" | "zone" | "mic" | "call" | "error" = "geo";
  let title = "";
  let desc = "";
  let extra: string | null = null;

  switch (phase) {
    case "geo-loading":
      icon = "geo";
      title = t("gate.geo.title");
      desc = t("gate.geo.desc");
      break;
    case "geo-error":
      icon = "error";
      title = t("gate.geo.deniedTitle");
      desc = geoReason === "denied" ? t("gate.geo.deniedDesc") : t("gate.geo.unavailableDesc");
      break;
    case "zone-loading":
      icon = "zone";
      title = t("gate.zone.title");
      desc = t("gate.zone.desc");
      break;
    case "zone-out":
      icon = "error";
      title = t("gate.zone.outTitle");
      desc = t("gate.zone.outDesc");
      extra =
        zone?.pharmacy_address && zone?.phone1
          ? `${t("gate.contactAddress", { address: zone.pharmacy_address })}\n${t("gate.contactPhone", { phone: zone.phone1 })}`
          : zone?.pharmacy_address
            ? t("gate.contactAddress", { address: zone.pharmacy_address })
            : zone?.phone1
              ? t("gate.contactPhone", { phone: zone.phone1 })
              : null;
      break;
    case "mic-prompt":
    case "mic-loading":
      icon = "mic";
      title = t("gate.mic.title");
      desc = t("gate.mic.desc");
      break;
    case "mic-error":
      icon = "error";
      title = t("gate.mic.deniedTitle");
      desc = t("gate.mic.deniedDesc");
      break;
    case "calling":
      icon = "call";
      title = t("gate.call.title");
      desc = t("gate.call.desc");
      break;
    case "call-error":
      icon = "error";
      title = t("gate.call.errorTitle");
      desc = t("gate.call.errorDesc");
      extra = callErrorDetail ? `(${callErrorDetail})` : null;
      break;
  }

  return (
    <div className="text-center">
      <BigIcon kind={icon} />
      <h2 className="mt-4 text-xl font-bold leading-tight">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{desc}</p>
      {extra ? (
        <p className="mt-3 whitespace-pre-line text-sm font-medium text-foreground">{extra}</p>
      ) : null}
    </div>
  );
}

function PhaseActions({
  phase,
  onRetryGeo,
  onAllowMic,
  onRetryMic,
  onClose,
  t,
}: {
  phase: Phase;
  onRetryGeo: () => void;
  onAllowMic: () => void;
  onRetryMic: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const neonBtn = `w-full rounded-2xl px-6 py-4 text-base font-bold transition-all ${NEON}`;
  const ghostBtn =
    "w-full rounded-2xl px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground";

  switch (phase) {
    case "geo-error":
      return (
        <div className="space-y-2">
          <button type="button" onClick={onRetryGeo} className={neonBtn}>
            {t("gate.allowGeo")}
          </button>
          <button type="button" onClick={onClose} className={ghostBtn}>
            {t("gate.cancel")}
          </button>
        </div>
      );
    case "mic-prompt":
      return (
        <button type="button" onClick={onAllowMic} className={neonBtn}>
          {t("gate.allowMic")}
        </button>
      );
    case "mic-error":
      return (
        <div className="space-y-2">
          <button type="button" onClick={onRetryMic} className={neonBtn}>
            {t("gate.retry")}
          </button>
          <button type="button" onClick={onClose} className={ghostBtn}>
            {t("gate.cancel")}
          </button>
        </div>
      );
    case "zone-out":
      return (
        <button type="button" onClick={onClose} className={neonBtn}>
          {t("common.close")}
        </button>
      );
    case "call-error":
      return (
        <div className="space-y-2">
          <button type="button" onClick={onRetryGeo} className={neonBtn}>
            {t("gate.retry")}
          </button>
          <button type="button" onClick={onClose} className={ghostBtn}>
            {t("gate.cancel")}
          </button>
        </div>
      );
    default:
      // geo-loading / zone-loading / mic-loading / calling — no action, just wait
      return (
        <button type="button" onClick={onClose} className={ghostBtn}>
          {t("gate.cancel")}
        </button>
      );
  }
}
