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

import { useI18n, LOCALES, LOCALE_NAMES } from "@/i18n";
import { useTheme, type Theme } from "@/theme";

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

type InfoKey = "how" | "privacy" | "terms" | "warning";

const INFO_ITEMS: { id: InfoKey; icon: React.ElementType; danger: boolean }[] = [
  { id: "how", icon: Pill, danger: false },
  { id: "privacy", icon: Lock, danger: false },
  { id: "terms", icon: FileText, danger: false },
  { id: "warning", icon: ShieldAlert, danger: true },
];

const THEME_OPTIONS: { id: Theme; icon: React.ElementType }[] = [
  { id: "dark", icon: Moon },
  { id: "light", icon: Sun },
];

function SettingsPage() {
  const { t, tList, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [openInfo, setOpenInfo] = useState<InfoKey | null>(null);

  const active = openInfo ? INFO_ITEMS.find((i) => i.id === openInfo) ?? null : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient backdrop matching home */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.12_210/0.35),transparent_70%)]" />
        <div className="absolute -left-1/4 top-1/3 h-[40vh] w-[60vw] aurora animate-aurora opacity-50" />
        <div className="absolute inset-0 scanlines opacity-30 mix-blend-overlay" />
      </div>

      {/* Header */}
      <header className="relative z-40 mx-auto flex max-w-3xl items-center justify-between px-5 pb-5 pt-safe sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 text-sm font-medium text-muted-foreground backdrop-blur transition hover:border-primary/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("settings.back")}
        </Link>
        <h1 className="font-display text-base font-semibold tracking-tight sm:text-lg">
          {t("settings.title")}
        </h1>
        <span className="w-[72px]" aria-hidden />
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        {/* LANGUAGE */}
        <Section title={t("settings.section.language")} icon={Globe}>
          <div className="divide-y divide-border/60">
            {LOCALES.map((id) => (
              <button
                key={id}
                onClick={() => setLocale(id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-card/40"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{LOCALE_NAMES[id].label}</div>
                  <div className="text-xs text-muted-foreground">{LOCALE_NAMES[id].sub}</div>
                </div>
                {locale === id && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* THEME */}
        <Section title={t("settings.section.theme")} icon={theme === "dark" ? Moon : Sun}>
          <div className="grid grid-cols-2 gap-3 p-3">
            {THEME_OPTIONS.map(({ id, icon: Icon }) => {
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
                  <span className="text-sm font-medium">{t(`settings.theme.${id}`)}</span>
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
        <Section title={t("settings.section.info")} icon={Info}>
          <div className="divide-y divide-border/60">
            {INFO_ITEMS.map(({ id, icon: Icon, danger }) => (
              <button
                key={id}
                onClick={() => setOpenInfo(id)}
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
                <span className="flex-1 text-sm font-medium text-foreground">
                  {t(`settings.info.${id}.label`)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Section>

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          {t("settings.version")}
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
                {t(`settings.info.${active.id}.label`)}
              </h2>
              <button
                onClick={() => setOpenInfo(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-muted-foreground">
              {tList(`settings.info.${active.id}.body`).map((paragraph, i) =>
                active.danger && i === 0 ? (
                  <p
                    key={i}
                    className="rounded-xl border border-[oklch(0.55_0.22_25/0.4)] bg-[oklch(0.30_0.15_25/0.15)] p-4 font-medium text-[oklch(0.92_0.10_25)]"
                  >
                    {paragraph}
                  </p>
                ) : (
                  <p key={i}>{paragraph}</p>
                ),
              )}
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
