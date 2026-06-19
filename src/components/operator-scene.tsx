import { useEffect, useState } from "react";

/**
 * Silhouette operator at a workstation — designed to read as an atmospheric
 * back-lit figure in a dark call-center. When `active`, the silhouette is
 * rim-lit with cyan/blue luminescent light and gently scales/moves forward.
 */
type OperatorProps = {
  id: number;
  active: boolean;
  /** position on the floor in % of the scene width */
  x: number;
  /** depth — smaller = farther away */
  scale: number;
  /** subtle animation phase offset (seconds) */
  delay?: number;
};

export function Operator({ id, active, x, scale, delay = 0 }: OperatorProps) {
  // active operators are pushed forward and lit; idle ones recede into haze
  const finalScale = active ? scale * 1.25 : scale;
  const opacity = active ? 1 : 0.35 + scale * 0.35;

  return (
    <div
      className="absolute bottom-[14%] -translate-x-1/2 transition-all duration-[1200ms] ease-out"
      style={{
        left: `${x}%`,
        transform: `translateX(-50%) translateY(${active ? "-10px" : "0"}) scale(${finalScale})`,
        zIndex: active ? 30 : Math.round(scale * 10),
        opacity,
        filter: active
          ? "none"
          : `brightness(${0.45 + scale * 0.25}) blur(${(1 - scale) * 1.4}px)`,
      }}
    >
      <div
        className="relative animate-float-soft"
        style={{ animationDelay: `${delay}s` }}
      >
        {/* Halo behind active operator */}
        {active && (
          <>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full animate-breath"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.85 0.18 215 / 0.45) 0%, oklch(0.78 0.16 200 / 0.18) 35%, transparent 70%)",
              }}
            />
            {/* floor reflection puddle */}
            <div
              className="pointer-events-none absolute left-1/2 -bottom-6 -translate-x-1/2 h-12 w-56 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse, oklch(0.85 0.18 215 / 0.7), transparent 70%)",
              }}
            />
          </>
        )}

        <svg
          width="200"
          height="260"
          viewBox="0 0 200 260"
          className={`relative ${active ? "animate-monitor-glow" : ""}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`mon-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={active ? "oklch(0.88 0.18 215)" : "oklch(0.50 0.10 230)"}
              />
              <stop
                offset="100%"
                stopColor={active ? "oklch(0.55 0.18 220)" : "oklch(0.25 0.05 240)"}
              />
            </linearGradient>
            <linearGradient id={`sil-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.08 0.015 250)" />
              <stop offset="100%" stopColor="oklch(0.04 0.01 250)" />
            </linearGradient>
            <linearGradient id={`rim-${id}`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.92 0.18 215 / 0.95)" />
              <stop offset="40%" stopColor="oklch(0.78 0.16 200 / 0.45)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <radialGradient id={`screen-light-${id}`} cx="0.5" cy="0.4" r="0.7">
              <stop offset="0%" stopColor="oklch(0.85 0.18 215 / 0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id={`blur-${id}`}>
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* Cone of light from monitor toward operator */}
          {active && (
            <path
              d="M30 50 L120 50 L150 150 L10 150 Z"
              fill={`url(#screen-light-${id})`}
              opacity="0.55"
            />
          )}

          {/* Monitor */}
          <g filter={`url(#blur-${id})`}>
            <rect
              x="18"
              y="38"
              width="108"
              height="72"
              rx="5"
              fill={`url(#mon-${id})`}
              className={active ? "animate-screen-flicker" : ""}
            />
            <rect
              x="18"
              y="38"
              width="108"
              height="72"
              rx="5"
              fill="none"
              stroke={active ? "oklch(0.82 0.14 220 / 0.8)" : "oklch(0.35 0.04 240)"}
              strokeWidth="0.8"
            />
            {/* screen content lines */}
            <g opacity={active ? 0.7 : 0.4}>
              <line x1="26" y1="50" x2="100" y2="50" stroke="white" strokeWidth="1.2" />
              <line x1="26" y1="58" x2="78" y2="58" stroke="white" strokeWidth="0.8" opacity="0.8" />
              <line x1="26" y1="66" x2="92" y2="66" stroke="white" strokeWidth="0.8" opacity="0.6" />
              <line x1="26" y1="78" x2="70" y2="78" stroke="white" strokeWidth="0.8" opacity="0.6" />
              <line x1="26" y1="86" x2="95" y2="86" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="26" y1="94" x2="60" y2="94" stroke="white" strokeWidth="0.8" opacity="0.5" />
            </g>
            <rect x="66" y="110" width="12" height="12" fill="oklch(0.14 0.02 250)" />
            <rect x="54" y="120" width="36" height="3" rx="1.5" fill="oklch(0.12 0.02 250)" />
          </g>

          {/* Desk edge with thin neon line */}
          <rect x="0" y="124" width="200" height="4" rx="1" fill="oklch(0.10 0.015 250)" />
          <rect
            x="0"
            y="124"
            width="200"
            height="1"
            fill={active ? "oklch(0.85 0.18 215 / 0.9)" : "oklch(0.40 0.05 230 / 0.5)"}
          />

          {/* Keyboard glow strip */}
          <rect
            x="22"
            y="130"
            width="100"
            height="2"
            rx="1"
            fill={active ? "oklch(0.85 0.18 215)" : "oklch(0.40 0.05 230)"}
            opacity={active ? 0.95 : 0.3}
          />

          {/* Silhouette: shoulders + head + ponytail + headphones */}
          <g>
            {/* shoulders/body — dark silhouette */}
            <path
              d="M118 250 Q118 165 145 156 Q170 148 195 158 L200 250 Z"
              fill={`url(#sil-${id})`}
            />
            {/* neck */}
            <path d="M152 138 L168 138 L170 158 L150 158 Z" fill="oklch(0.06 0.01 250)" />
            {/* head — slightly turned 3/4 */}
            <ellipse cx="160" cy="115" rx="22" ry="26" fill="oklch(0.06 0.01 250)" />
            {/* ponytail / hair flow */}
            <path
              d="M180 105 Q205 130 198 175 Q193 190 184 184 Q190 150 178 122 Z"
              fill="oklch(0.05 0.01 250)"
            />
            {/* hair top */}
            <path
              d="M140 100 Q150 78 168 80 Q188 82 182 105 Q170 92 152 96 Q145 100 140 105 Z"
              fill="oklch(0.04 0.01 250)"
            />

            {/* Headphones — band */}
            <path
              d="M140 96 Q160 70 182 96"
              stroke={active ? "oklch(0.80 0.10 230)" : "oklch(0.30 0.04 240)"}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* ear cups */}
            <ellipse cx="140" cy="118" rx="7" ry="11" fill="oklch(0.10 0.02 250)" />
            <ellipse cx="180" cy="118" rx="7" ry="11" fill="oklch(0.10 0.02 250)" />
            {active && (
              <>
                <ellipse cx="140" cy="118" rx="7" ry="11" fill="none" stroke="oklch(0.85 0.18 215 / 0.8)" strokeWidth="0.8" />
                <ellipse cx="180" cy="118" rx="7" ry="11" fill="none" stroke="oklch(0.85 0.18 215 / 0.8)" strokeWidth="0.8" />
              </>
            )}
            {/* mic boom */}
            <path
              d="M140 124 Q132 140 148 146"
              stroke={active ? "oklch(0.80 0.10 230)" : "oklch(0.30 0.04 240)"}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            <circle
              cx="150"
              cy="147"
              r="2.4"
              fill={active ? "oklch(0.92 0.18 215)" : "oklch(0.45 0.05 230)"}
            />

            {/* Rim light: thin cyan edge on left side (toward the bright monitor) */}
            {active && (
              <>
                <path
                  d="M118 250 Q118 165 145 156 Q170 148 195 158"
                  fill="none"
                  stroke={`url(#rim-${id})`}
                  strokeWidth="2"
                  opacity="0.9"
                />
                {/* left-edge highlight on head */}
                <path
                  d="M140 100 Q138 110 138 125 Q139 138 145 142"
                  stroke="oklch(0.92 0.18 215 / 0.85)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* shoulder highlight */}
                <path
                  d="M120 250 Q120 195 135 170"
                  stroke="oklch(0.85 0.18 215 / 0.55)"
                  strokeWidth="1.2"
                  fill="none"
                />
                {/* mic LED dot */}
                <circle cx="150" cy="147" r="4" fill="oklch(0.92 0.18 215 / 0.4)" />
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

const STAGES = [
  "Распознаю речь…",
  "Анализирую запрос…",
  "Проверяю наличие на складе…",
  "Нашёл подходящий товар…",
  "Сверяю с рецептом…",
  "Рассчитываю доставку…",
  "Оформляю заказ…",
  "Готово. Подтвердите голосом.",
];

export function LiveMonitor({ running }: { running: boolean }) {
  const [stage, setStage] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!running) {
      setStage(0);
      setTyped("");
      return;
    }
    let i = 0;
    setTyped("");
    const text = STAGES[stage];
    const typer = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(typer);
    }, 35);
    const next = setTimeout(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, 2400);
    return () => {
      clearInterval(typer);
      clearTimeout(next);
    };
  }, [stage, running]);

  return (
    <div
      className={`relative w-full max-w-md rounded-2xl border bg-card/70 p-5 backdrop-blur-xl shadow-[var(--shadow-panel)] transition-all duration-500 ${
        running ? "border-primary/50 glow-ring" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          saypharma · live
        </span>
      </div>

      <div className="mt-4 space-y-2 font-mono text-xs text-muted-foreground min-h-[160px]">
        {STAGES.slice(0, stage).map((s, i) => (
          <div key={i} className="flex items-start gap-2 opacity-70">
            <span className="text-accent">✓</span>
            <span>{s}</span>
          </div>
        ))}
        {running && (
          <div className="flex items-start gap-2 text-foreground">
            <span className="text-[color:var(--glow)] neon-text">▸</span>
            <span>
              {typed}
              <span className="animate-caret">▍</span>
            </span>
          </div>
        )}
        {!running && (
          <div className="text-muted-foreground/60 italic">
            Нажмите кнопку, чтобы начать разговор…
          </div>
        )}
      </div>

      {running && (
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {stage + 1}/{STAGES.length}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Full-bleed cinematic backdrop: a dark call-center floor with operator
 * silhouettes, ambient haze, sweeping light, and scanlines. Mounted behind
 * the page content via position:fixed.
 */
const BG_OPERATORS = [
  { id: 101, x: 8,  scale: 0.45, delay: 0.0 },
  { id: 102, x: 22, scale: 0.55, delay: 1.4 },
  { id: 103, x: 38, scale: 0.65, delay: 0.7 },
  { id: 104, x: 62, scale: 0.65, delay: 2.1 },
  { id: 105, x: 78, scale: 0.55, delay: 0.3 },
  { id: 106, x: 92, scale: 0.45, delay: 1.0 },
];

export function CallCenterBackdrop({ activeIndex }: { activeIndex: number | null }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden center-backdrop"
    >
      {/* Ceiling lights */}
      <div className="absolute inset-x-0 top-0 flex justify-around px-6 sm:px-16">
        {BG_OPERATORS.map((op, i) => (
          <div
            key={op.id}
            className={`h-1 w-16 sm:w-24 rounded-full transition-all duration-700 ${
              activeIndex === i
                ? "bg-[color:var(--glow)] shadow-[0_0_40px_var(--glow)]"
                : "bg-primary/20"
            }`}
          />
        ))}
      </div>

      {/* Sweeping light beam */}
      <div className="absolute -top-20 left-1/2 h-[120%] w-[40%] -translate-x-1/2 origin-top">
        <div className="absolute inset-0 animate-light-sweep bg-[linear-gradient(180deg,oklch(0.85_0.18_215/0.18),transparent_70%)] blur-3xl" />
      </div>

      {/* Ambient haze blobs */}
      <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-drift" />
      <div className="absolute right-[8%] top-[35%] h-80 w-80 rounded-full bg-accent/10 blur-3xl animate-drift" style={{ animationDelay: "4s" }} />
      <div className="absolute left-[40%] bottom-[10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-drift" style={{ animationDelay: "8s" }} />

      {/* Floor */}
      <div className="absolute inset-x-0 bottom-0 h-[70vh] floor-grid" />

      {/* Operators row */}
      <div className="absolute inset-x-0 bottom-0 h-[70vh]">
        {BG_OPERATORS.map((op, i) => (
          <Operator
            key={op.id}
            id={op.id}
            x={op.x}
            scale={op.scale}
            delay={op.delay}
            active={activeIndex === i}
          />
        ))}
      </div>

      {/* Bottom vignette to anchor content */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-background/80 to-transparent" />
      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/90 to-transparent" />

      {/* Scanlines overlay for CRT feel */}
      <div className="absolute inset-0 scanlines opacity-60" />
    </div>
  );
}
