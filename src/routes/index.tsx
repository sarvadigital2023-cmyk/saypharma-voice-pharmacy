import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, MicOff, ShieldCheck, Sparkles, Truck, Pill } from "lucide-react";
import { CallCenterBackdrop, LiveMonitor } from "@/components/operator-scene";

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

function HomePage() {
  const [talking, setTalking] = useState(false);
  // central operator (index 3 of 6) lights up when in conversation
  const activeIndex = talking ? 3 : null;

  return (
    <div className="relative min-h-screen">
      {/* Cinematic full-page call-center backdrop */}
      <CallCenterBackdrop activeIndex={activeIndex} />

      {/* Top nav */}
      <header className="relative z-40 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]">
            <Pill className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight neon-text">
            SayPharma
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground transition">Как это работает</a>
          <a href="#trust" className="hover:text-foreground transition">Безопасность</a>
          <a href="#contact" className="hover:text-foreground transition">Контакты</a>
        </nav>
        <button className="rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium backdrop-blur-md hover:border-primary/50 transition">
          Войти
        </button>
      </header>

      {/* HERO */}
      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="grid items-center gap-10 pt-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-16">
          {/* Left: copy + CTA */}
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur shadow-[0_0_20px_-5px_var(--glow-soft)]">
              <Sparkles className="h-3 w-3 text-accent" />
              Голосовая аптека · бета
            </span>

            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Закажите лекарство
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent neon-text">
                одним разговором.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              SayPharma — это аптека, где не нужно искать товар вручную.
              Поговорите с ИИ-оператором голосом — он найдёт препарат,
              проверит наличие и оформит доставку за минуту.
            </p>

            {/* The CTA */}
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
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
                {talking ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Оператор слушает вас
                  </span>
                ) : (
                  "Бесплатно · без регистрации"
                )}
              </span>
            </div>

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

        {/* spacer to let the backdrop breathe before content sections */}
        <div className="h-[42vh] sm:h-[48vh]" aria-hidden="true">
          <div className="mx-auto mt-auto flex h-full max-w-md items-end justify-center pb-6 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/60">
            saypharma · operations floor
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section id="how" className="mt-8">
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
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md transition hover:border-primary/50 hover:shadow-[0_0_40px_-10px_var(--glow-soft)]"
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
          className="mt-20 grid items-center gap-8 rounded-3xl border border-border bg-card/60 p-8 backdrop-blur-md sm:p-10 lg:grid-cols-2"
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
