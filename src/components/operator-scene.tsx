import { useEffect, useState } from "react";

/**
 * Single operator illustration — abstract, elegant silhouette of a woman at a
 * desk with a monitor. Pure SVG so it scales crisply and animates cheaply.
 *
 * `active` triggers: soft blue rim-light, a slight 3/4 turn toward the viewer,
 * and a "live" monitor with cycling status text.
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
  return (
    <div
      className="absolute bottom-[18%] -translate-x-1/2 transition-all duration-700"
      style={{
        left: `${x}%`,
        transform: `translateX(-50%) scale(${scale})`,
        zIndex: active ? 30 : Math.round(scale * 10),
        filter: active ? "none" : `brightness(${0.55 + scale * 0.3})`,
      }}
    >
      <div
        className="relative animate-float-soft"
        style={{ animationDelay: `${delay}s` }}
      >
        {/* Glow halo when active */}
        {active && (
          <div
            className="pointer-events-none absolute -inset-12 rounded-full opacity-80 animate-breath"
            style={{
              background:
                "radial-gradient(circle, var(--glow-soft) 0%, transparent 65%)",
            }}
          />
        )}

        <svg
          width="220"
          height="240"
          viewBox="0 0 220 240"
          className="relative transition-transform duration-1000 ease-out"
          style={{
            transform: active ? "rotateY(-22deg)" : "rotateY(0deg)",
            transformOrigin: "center 60%",
          }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`mon-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={active ? "oklch(0.85 0.18 215)" : "oklch(0.55 0.08 230)"}
              />
              <stop
                offset="100%"
                stopColor={active ? "oklch(0.55 0.18 220)" : "oklch(0.32 0.05 240)"}
              />
            </linearGradient>
            <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.32 0.03 250)" />
              <stop offset="100%" stopColor="oklch(0.18 0.02 250)" />
            </linearGradient>
            <radialGradient id={`rim-${id}`} cx="0.2" cy="0.3" r="0.9">
              <stop offset="0%" stopColor="oklch(0.85 0.18 215 / 0.7)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Monitor */}
          <g>
            <rect
              x="20"
              y="40"
              width="110"
              height="70"
              rx="6"
              fill={`url(#mon-${id})`}
              className={active ? "animate-screen-flicker" : ""}
            />
            <rect
              x="20"
              y="40"
              width="110"
              height="70"
              rx="6"
              fill="none"
              stroke="oklch(0.45 0.05 240)"
              strokeWidth="1"
            />
            {/* screen lines */}
            <g opacity="0.5">
              <line x1="28" y1="54" x2="100" y2="54" stroke="white" strokeWidth="1.5" />
              <line x1="28" y1="62" x2="80" y2="62" stroke="white" strokeWidth="1" opacity="0.7" />
              <line x1="28" y1="70" x2="90" y2="70" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="28" y1="82" x2="70" y2="82" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="28" y1="90" x2="95" y2="90" stroke="white" strokeWidth="1" opacity="0.4" />
            </g>
            {/* stand */}
            <rect x="68" y="110" width="14" height="14" fill="oklch(0.25 0.02 250)" />
            <rect x="55" y="122" width="40" height="4" rx="2" fill="oklch(0.22 0.02 250)" />
          </g>

          {/* Desk */}
          <rect x="0" y="124" width="220" height="6" rx="2" fill="oklch(0.22 0.02 250)" />
          <rect x="0" y="124" width="220" height="2" fill="oklch(0.35 0.04 240 / 0.6)" />

          {/* Headset behind head */}
          <path
            d="M138 55 Q152 35 172 55"
            stroke="oklch(0.5 0.04 240)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Operator silhouette: head + shoulders + ponytail */}
          <g>
            {/* shoulders / body */}
            <path
              d="M130 230 Q130 165 155 158 Q175 152 195 158 Q210 165 215 230 Z"
              fill={`url(#body-${id})`}
            />
            {/* neck */}
            <rect x="160" y="138" width="14" height="18" rx="4" fill="oklch(0.28 0.03 250)" />
            {/* head */}
            <ellipse cx="167" cy="118" rx="22" ry="26" fill="oklch(0.30 0.03 250)" />
            {/* ponytail */}
            <path
              d="M188 110 Q210 130 200 165 Q195 175 188 170 Q192 145 182 125 Z"
              fill="oklch(0.22 0.025 250)"
            />
            {/* headset cushion */}
            <ellipse cx="148" cy="120" rx="6" ry="9" fill="oklch(0.18 0.02 250)" />
            <ellipse cx="186" cy="120" rx="6" ry="9" fill="oklch(0.18 0.02 250)" />
            {/* mic boom */}
            <path
              d="M148 124 Q140 138 155 144"
              stroke="oklch(0.45 0.04 240)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="156" cy="145" r="2.5" fill={active ? "var(--glow)" : "oklch(0.5 0.05 230)"} />

            {/* rim light when active */}
            {active && (
              <path
                d="M130 230 Q130 165 155 158 Q175 152 195 158 Q210 165 215 230 Z"
                fill={`url(#rim-${id})`}
                opacity="0.9"
              />
            )}
            {active && (
              <ellipse
                cx="155"
                cy="112"
                rx="22"
                ry="26"
                fill={`url(#rim-${id})`}
                opacity="0.7"
              />
            )}
          </g>

          {/* keyboard glow */}
          <rect
            x="25"
            y="128"
            width="100"
            height="3"
            rx="1"
            fill={active ? "var(--glow)" : "oklch(0.4 0.04 230)"}
            opacity={active ? 0.9 : 0.35}
          />
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
    <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-xl shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          saypharma · live
        </span>
      </div>

      <div className="mt-4 space-y-2 font-mono text-xs text-muted-foreground min-h-[140px]">
        {STAGES.slice(0, stage).map((s, i) => (
          <div key={i} className="flex items-start gap-2 opacity-70">
            <span className="text-accent">✓</span>
            <span>{s}</span>
          </div>
        ))}
        {running && (
          <div className="flex items-start gap-2 text-foreground">
            <span className="text-glow">▸</span>
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
