import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, MicOff, ShieldCheck, Sparkles, Truck, Pill, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LiveMonitor } from "@/components/operator-scene";
import callCenterBg from "@/assets/call-center-bg.jpg";

const STAGE_LINES = [
  "Recognizing speech…",
  "Analyzing request…",
  "Checking stock availability…",
  "Found the product…",
  "Verifying prescription…",
  "Calculating delivery…",
  "Placing the order…",
  "Done. Please confirm by voice.",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SayPharma — голосовая аптека нового поколения" },
      {
        name: "description",
        content:
          "Закажите лекарства и БАДы голосом. SayPharma — электронная аптека, где ИИ-оператор оформит заказ за минуту и доставит до двери.",
      },
      { property: "og:title", content: "SayPharma — голосовая аптека" },
      {
        property: "og:description",
        content: "Поговорите с ИИ-оператором и получите лекарства с доставкой.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "theme-color", content: "#0a0f1f" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const OPERATORS = [
  { id: 1, x: 12, scale: 0.55, delay: 0 },
  { id: 2, x: 30, scale: 0.7, delay: 1.2 },
  { id: 3, x: 50, scale: 1.0, delay: 0.6 },
  { id: 4, x: 70, scale: 0.72, delay: 1.8 },
  { id: 5, x: 88, scale: 0.58, delay: 0.3 },
];

function HomePage() {
  const [talking, setTalking] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  // The "central" operator (id: 3) lights up. Easy to swap by random pick later.
  const activeId = talking ? 3 : null;

  useEffect(() => {
    if (!talking) {
      setStageIdx(0);
      return;
    }
    const t = setInterval(() => {
      setStageIdx((s) => (s + 1) % STAGE_LINES.length);
    }, 1800);
    return () => clearInterval(t);
  }, [talking]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.12_210/0.45),transparent_70%)]" />
        <div className="absolute -left-1/4 top-1/3 h-[50vh] w-[70vw] aurora animate-aurora opacity-70" />
        <div className="absolute -right-1/4 top-1/2 h-[45vh] w-[60vw] aurora animate-aurora opacity-60" style={{ animationDelay: "-6s" }} />
        <div className="absolute inset-0 floor-grid opacity-60" />
        <div className="absolute inset-0 scanlines opacity-50 mix-blend-overlay" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Top nav */}
      <header className="relative z-40 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]">
            <Pill className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            SayPharma
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground transition">Как это работает</a>
          <a href="#trust" className="hover:text-foreground transition">Безопасность</a>
          <a href="#contact" className="hover:text-foreground transition">Контакты</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium backdrop-blur-md hover:border-primary/50 transition">
            Войти
          </button>
          <Link
            to="/settings"
            aria-label="Настройки"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground backdrop-blur-md transition hover:border-primary/50 hover:text-foreground hover:rotate-45"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* CALL-CENTER STAGE */}
      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <section
          aria-label="Виртуальный колл-центр"
          className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-panel)] sm:h-[480px]"
        >
          {/* Premium neon call-center photographic backdrop */}
          <img
            src={callCenterBg}
            alt="Команда операторов SayPharma в неоновом колл-центре"
            loading="lazy"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Color grade + depth wash */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,oklch(0.10_0.04_252/0.55)_75%,oklch(0.08_0.03_252/0.85)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/40" />

          {/* Aurora + scanlines for luminescent atmosphere */}
          <div className="pointer-events-none absolute -inset-10 aurora animate-aurora opacity-40 mix-blend-screen" />
          <div className="pointer-events-none absolute inset-0 scanlines opacity-30 mix-blend-overlay" />

          {/* Drifting bokeh particles */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70 animate-aurora mix-blend-screen"
            style={{
              background:
                "radial-gradient(2px 2px at 18% 30%, oklch(0.92 0.18 200 / 0.9), transparent 60%), radial-gradient(1.5px 1.5px at 72% 22%, oklch(0.88 0.20 290 / 0.7), transparent 60%), radial-gradient(2px 2px at 35% 78%, oklch(0.90 0.18 195 / 0.8), transparent 60%), radial-gradient(1.5px 1.5px at 88% 65%, oklch(0.85 0.18 220 / 0.7), transparent 60%), radial-gradient(2px 2px at 55% 45%, oklch(0.92 0.20 200 / 0.6), transparent 60%)",
            }}
          />

          {/* Heavy dim layer for everyone except the nearest (rightmost) operator */}
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
              activeId ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "radial-gradient(ellipse 36% 100% at 86% 60%, transparent 0%, transparent 30%, oklch(0.05 0.03 252 / 0.78) 92%)",
            }}
          />

          {/* Actually BRIGHTEN her — backdrop-filter boosts the underlying image */}
          <div
            className={`pointer-events-none absolute transition-opacity duration-500 ${
              activeId ? "opacity-100" : "opacity-0"
            }`}
            style={{
              right: "-2%",
              top: "5%",
              width: "34%",
              height: "92%",
              borderRadius: "50%",
              backdropFilter:
                "brightness(1.95) contrast(1.28) saturate(1.7)",
              WebkitBackdropFilter:
                "brightness(1.95) contrast(1.28) saturate(1.7)",
              maskImage:
                "radial-gradient(ellipse 55% 60% at 55% 50%, black 0%, black 45%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 55% 60% at 55% 50%, black 0%, black 45%, transparent 80%)",
            }}
          />

          {/* Soft cyan-green rim glow on top (subtle, doesn't wash her out) */}
          <div
            className={`pointer-events-none absolute transition-opacity duration-700 animate-breath ${
              activeId ? "opacity-80" : "opacity-0"
            }`}
            style={{
              right: "-4%",
              top: "0%",
              width: "38%",
              height: "100%",
              background:
                "radial-gradient(ellipse 55% 55% at 55% 50%, transparent 30%, oklch(0.90 0.28 165 / 0.45) 55%, oklch(0.78 0.22 200 / 0.25) 72%, transparent 88%)",
              filter: "blur(18px)",
              mixBlendMode: "screen",
            }}
          />

          {/* Vertical neon beam from ceiling onto her */}
          <div
            className={`pointer-events-none absolute top-0 h-[60%] w-[14%] transition-opacity duration-700 ${
              activeId ? "opacity-70" : "opacity-0"
            }`}
            style={{
              right: "6%",
              background:
                "linear-gradient(to bottom, oklch(0.95 0.28 170 / 0.55) 0%, oklch(0.85 0.26 160 / 0.25) 50%, transparent 95%)",
              filter: "blur(16px)",
              mixBlendMode: "screen",
            }}
          />

          {/* Her glowing realistic monitor with running status text */}
          <div
            className={`pointer-events-none absolute transition-all duration-500 ${
              activeId ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{
              right: "6%",
              top: "44%",
              width: "30%",
              maxWidth: "360px",
              aspectRatio: "16 / 10",
              perspective: "1000px",
            }}
          >
            {/* Monitor body */}
            <div
              className="relative h-full w-full rounded-[10px] p-[5px]"
              style={{
                background:
                  "linear-gradient(160deg, #2a2f38 0%, #15181d 55%, #0a0c10 100%)",
                boxShadow:
                  "0 18px 40px rgba(0,0,0,0.55), 0 0 80px oklch(0.92 0.30 170 / 0.7), 0 0 140px oklch(0.85 0.28 195 / 0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                transform: "rotateY(-10deg) rotateX(3deg)",
              }}
            >
              {/* Screen */}
              <div
                className="relative h-full w-full overflow-hidden rounded-[5px] animate-screen-flicker"
                style={{
                  background:
                    "linear-gradient(135deg, #04140f 0%, #06221a 60%, #03100c 100%)",
                  boxShadow:
                    "inset 0 0 30px oklch(0.95 0.30 165 / 0.45), inset 0 0 60px oklch(0.85 0.28 200 / 0.25)",
                }}
              >
                {/* Scanlines on screen */}
                <div className="absolute inset-0 scanlines opacity-40 mix-blend-overlay" />
                {/* Glare */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, transparent 40%, transparent 70%, rgba(255,255,255,0.04) 100%)",
                  }}
                />
                <div className="relative p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.95_0.30_30)] animate-breath" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.92_0.22_90)]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.92_0.25_150)]" />
                    <span className="ml-1 font-mono text-[7px] uppercase tracking-[0.25em] text-[oklch(0.85_0.18_165)]">
                      saypharma · console
                    </span>
                  </div>
                  <div className="font-mono text-[10px] leading-relaxed text-[oklch(0.96_0.22_160)] min-h-[40px]">
                    <div className="opacity-50 text-[8px]">$ saypharma --listen</div>
                    <div className="mt-1">
                      <span className="text-[oklch(0.80_0.20_165)]">&gt; </span>
                      {STAGE_LINES[stageIdx]}
                      <span className="animate-caret">▌</span>
                    </div>
                  </div>
                  <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[oklch(0.30_0.08_180/0.4)]">
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${((stageIdx + 1) / STAGE_LINES.length) * 100}%`,
                        background:
                          "linear-gradient(to right, oklch(0.95 0.32 165), oklch(0.88 0.26 200))",
                        boxShadow: "0 0 10px oklch(0.95 0.32 165)",
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Bezel chin with brand dot */}
              <div className="flex items-center justify-center pt-1 pb-0.5">
                <span className="h-1 w-1 rounded-full bg-[oklch(0.85_0.18_165)] shadow-[0_0_6px_oklch(0.85_0.18_165)]" />
              </div>
            </div>
            {/* Stand */}
            <div className="mx-auto mt-0.5 h-2 w-[18%] bg-gradient-to-b from-[#1a1d22] to-[#0a0c10] rounded-b-sm" />
            <div className="mx-auto h-1 w-[40%] bg-gradient-to-b from-[#15181d] to-[#05060a] rounded-sm" />
          </div>

          {/* Top neon ceiling strip */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.88_0.20_195/0.9)] to-transparent shadow-[0_0_30px_oklch(0.88_0.20_195/0.7)]" />

          {/* Floor caption */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            saypharma · operations floor
          </div>
        </section>

        {/* HERO */}
        <div className="grid items-center gap-10 mt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          {/* Left: copy + CTA */}
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent" />
              Голосовая аптека · SayPharma
            </span>

            {/* The CTA */}
            <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                onClick={() => setTalking((t) => !t)}
                className={`group relative inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-semibold transition-all ${
                  talking
                    ? "bg-card text-foreground glow-ring"
                    : "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02]"
                }`}
              >
                <span
                  className={`relative grid h-9 w-9 place-items-center rounded-full ${
                    talking ? "bg-primary/20 pulse-ring" : "bg-white/15"
                  }`}
                >
                  {talking ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </span>
                {talking ? "Завершить разговор" : "Поговорить с SayPharma"}
              </button>

              <span className="text-xs text-muted-foreground">
                {talking ? "Идёт разговор · слушаю вас" : "Бесплатно · без регистрации"}
              </span>
            </div>

            <h1 className="mt-9 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Закажите лекарство
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                одним разговором.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              SayPharma — это аптека, где не нужно искать товар вручную.
              Поговорите с ИИ-оператором голосом — он найдёт препарат,
              проверит наличие и оформит доставку за минуту.
            </p>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Лицензированные поставщики
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-accent" />
                Доставка за 60 минут
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                ИИ работает 24/7
              </span>
            </div>
          </div>

          {/* Right: live monitor panel */}
          <div className="relative flex justify-center lg:justify-end">
            <LiveMonitor running={talking} />
          </div>
        </div>



        {/* HOW IT WORKS */}
        <section id="how" className="mt-24">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Три шага вместо корзины
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Никаких карточек, фильтров и форм оплаты — всё решается в разговоре.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Скажите, что нужно",
                d: "«Нужен парацетамол и витамин D на месяц» — ИИ распознаёт даже сложные запросы.",
              },
              {
                n: "02",
                t: "Подтвердите подбор",
                d: "Оператор уточнит дозировку, бренд и сравнит с тем, что уже есть на складе.",
              },
              {
                n: "03",
                t: "Получите доставку",
                d: "Курьер привезёт заказ в течение часа. Оплата картой или СБП по голосовой команде.",
              },
            ].map((s) => (
              <article
                key={s.n}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm transition hover:border-primary/40"
              >
                <span className="font-mono text-xs text-accent">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.d}
                </p>
                <div className="pointer-events-none absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
              </article>
            ))}
          </div>
        </section>

        {/* TRUST */}
        <section
          id="trust"
          className="mt-20 grid items-center gap-8 rounded-3xl border border-border bg-card/40 p-8 backdrop-blur-sm sm:p-10 lg:grid-cols-2"
        >
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Аптечная точность.
              <br />
              <span className="text-muted-foreground">Скорость разговора.</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Каталог сверяется с реестром РЛС. Рецептурные препараты требуют
              подтверждения. Разговоры защищены сквозным шифрованием.
            </p>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              "Только лицензированные поставщики",
              "Соответствие 152-ФЗ о персональных данных",
              "Проверка взаимодействия препаратов",
              "Подтверждение каждой рецептурной позиции",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer
        id="contact"
        className="relative z-10 border-t border-border/60 bg-background/60 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>© {new Date().getFullYear()} SayPharma. Все права защищены.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Лицензия</a>
            <a href="#" className="hover:text-foreground">Политика</a>
            <a href="mailto:hi@saypharma.app" className="hover:text-foreground">
              hi@saypharma.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
