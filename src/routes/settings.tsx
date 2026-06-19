import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  Info,
  ShieldAlert,
  FileText,
  Lock,
  Pill,
  X,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — SayPharma" },
      {
        name: "description",
        content:
          "Настройки приложения SayPharma: язык, тема и важная информация о голосовой аптеке.",
      },
    ],
  }),
  component: SettingsPage,
});

type Lang = "ru" | "uk" | "en";
type Theme = "dark" | "light";
type InfoKey = "how" | "privacy" | "terms" | "warning" | null;

const LANGS: { id: Lang; label: string; sub: string }[] = [
  { id: "ru", label: "Русский", sub: "Russian" },
  { id: "uk", label: "Українська", sub: "Ukrainian" },
  { id: "en", label: "English", sub: "English" },
];

const INFO_CONTENT: Record<
  Exclude<InfoKey, null>,
  { title: string; icon: React.ElementType; body: React.ReactNode }
> = {
  how: {
    title: "Как работает SayPharma",
    icon: Pill,
    body: (
      <>
        <p>
          SayPharma — это голосовая аптека. Вы говорите, что вам нужно, а ИИ-оператор
          находит товар, проверяет наличие и оформляет доставку до двери.
        </p>
        <p>
          Мы продаём <strong className="text-foreground">только безрецептурные</strong> препараты, а также:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-accent">
          <li>витамины и БАДы;</li>
          <li>тонометры, глюкометры, термометры;</li>
          <li>ортопедические товары — подушки, корсеты, массажные коврики;</li>
          <li>медицинские приборы и другие товары для здоровья, не требующие рецепта.</li>
        </ul>
      </>
    ),
  },
  privacy: {
    title: "Политика конфиденциальности",
    icon: Lock,
    body: (
      <>
        <p>
          Мы обрабатываем ваши данные в соответствии с 152-ФЗ. Разговоры с
          ИИ-оператором защищены сквозным шифрованием и используются только
          для оформления вашего заказа.
        </p>
        <p>
          Мы не передаём персональные данные третьим лицам, кроме случаев,
          необходимых для доставки заказа (курьерская служба).
        </p>
      </>
    ),
  },
  terms: {
    title: "Условия использования",
    icon: FileText,
    body: (
      <>
        <p>
          Используя SayPharma, вы соглашаетесь оформлять заказы только для
          личного использования. Сервис предназначен для совершеннолетних.
        </p>
        <p>
          Перед применением любого препарата ознакомьтесь с инструкцией и при
          необходимости проконсультируйтесь со специалистом.
        </p>
      </>
    ),
  },
  warning: {
    title: "Важное предупреждение",
    icon: ShieldAlert,
    body: (
      <>
        <p className="rounded-xl border border-[oklch(0.55_0.22_25/0.4)] bg-[oklch(0.30_0.15_25/0.15)] p-4 text-[oklch(0.92_0.10_25)]">
          SayPharma <strong>не продаёт рецептурные лекарства</strong>.
        </p>
        <p>
          Для получения рецептурных препаратов, пожалуйста, обратитесь в
          обычную аптеку к провизору и предъявите рецепт от лечащего врача.
        </p>
        <p>
          Мы работаем только с безрецептурными средствами, витаминами, БАДами
          и товарами для здоровья.
        </p>
      </>
    ),
  },
};

function SettingsPage() {
  const [lang, setLang] = useState<Lang>("ru");
  const [theme, setTheme] = useState<Theme>("dark");
  const [openInfo, setOpenInfo] = useState<InfoKey>(null);

  const active = openInfo ? INFO_CONTENT[openInfo] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient backdrop matching home */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.12_210/0.35),transparent_70%)]" />
        <div className="absolute -left-1/4 top-1/3 h-[40vh] w-[60vw] aurora animate-aurora opacity-50" />
        <div className="absolute inset-0 scanlines opacity-30 mix-blend-overlay" />
      </div>

      {/* Header */}
      <header className="relative z-40 mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 text-sm font-medium text-muted-foreground backdrop-blur transition hover:border-primary/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <h1 className="font-display text-base font-semibold tracking-tight sm:text-lg">
          Настройки
        </h1>
        <span className="w-[72px]" aria-hidden />
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        {/* LANGUAGE */}
        <Section title="Язык" icon={Globe}>
          <div className="divide-y divide-border/60">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-card/40"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{l.label}</div>
                  <div className="text-xs text-muted-foreground">{l.sub}</div>
                </div>
                {lang === l.id && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* THEME */}
        <Section title="Тема" icon={theme === "dark" ? Moon : Sun}>
          <div className="grid grid-cols-2 gap-3 p-3">
            {(
              [
                { id: "dark", label: "Тёмная", Icon: Moon },
                { id: "light", label: "Светлая", Icon: Sun },
              ] as const
            ).map(({ id, label, Icon }) => {
              const selected = theme === id;
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-primary/60 bg-card/70 shadow-[var(--shadow-glow)]"
                      : "border-border bg-card/30 hover:border-primary/30"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-lg ${
                      selected
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                  {selected && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-accent">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* INFO */}
        <Section title="Информация" icon={Info}>
          <div className="divide-y divide-border/60">
            {(
              [
                { id: "how", label: "Как работает SayPharma", Icon: Pill },
                { id: "privacy", label: "Политика конфиденциальности", Icon: Lock },
                { id: "terms", label: "Условия использования", Icon: FileText },
                { id: "warning", label: "Важное предупреждение", Icon: ShieldAlert, danger: true },
              ] as const
            ).map(({ id, label, Icon, danger }) => (
              <button
                key={id}
                onClick={() => setOpenInfo(id as InfoKey)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-card/40"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    danger
                      ? "bg-[oklch(0.30_0.15_25/0.25)] text-[oklch(0.85_0.18_25)]"
                      : "bg-muted/40 text-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Section>

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          saypharma · v1.0 · бета
        </p>
      </main>

      {/* Info modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-md sm:items-center"
          onClick={() => setOpenInfo(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)]"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <active.icon className="h-4 w-4" />
              </span>
              <h2 className="flex-1 font-display text-base font-semibold">
                {active.title}
              </h2>
              <button
                onClick={() => setOpenInfo(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-muted-foreground">
              {active.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-2">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
        {children}
      </div>
    </section>
  );
}
