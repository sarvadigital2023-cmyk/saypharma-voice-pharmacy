import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, MicOff, ShieldCheck, Sparkles, Truck, Pill, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LiveMonitor } from "@/components/operator-scene";
import callCenterEn from "@/assets/call-center-en.jpg";
import { useI18n } from "@/i18n";
import { useVoiceAgent } from "@/lib/use-voice-agent";
import { CallGateModal } from "@/components/CallGateModal";
import { LiveTranscript } from "@/components/LiveTranscript";

const STAGE_LINES = [
  "Processing order…",
  "Checking stock…",
  "Verifying prescription…",
  "Locating courier…",
  "Calculating ETA…",
  "Reserving item…",
  "Confirming address…",
  "Order placed ✓",
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

function HomePage() {
  const { t } = useI18n();
  const voice = useVoiceAgent();
  const talking = voice.isLive;
  const active = talking || voice.isConnecting;
  const voiceError =
    voice.error === "not-configured"
      ? t("voice.notConfigured")
      : voice.error === "mic"
        ? t("voice.mic")
        : voice.error
          ? `${t("voice.failed")}${voice.errorDetail ? ` (${voice.errorDetail})` : ""}`
          : null;
  const [gateOpen, setGateOpen] = useState(false);

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
      <header className="relative z-40 mx-auto flex max-w-7xl items-center justify-between px-5 pb-5 pt-safe sm:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]">
            <Pill className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            SayPharma
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground transition">{t("nav.how")}</a>
          <a href="#trust" className="hover:text-foreground transition">{t("nav.security")}</a>
          <a href="#contact" className="hover:text-foreground transition">{t("nav.contacts")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium backdrop-blur-md hover:border-primary/50 transition">
            {t("nav.signIn")}
          </button>
          <Link
            to="/settings"
            aria-label={t("nav.settings")}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground backdrop-blur-md transition hover:border-primary/50 hover:text-foreground hover:rotate-45"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* CALL-CENTER STAGE */}
      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <section
          aria-label="SayPharma call-center"
          className="relative aspect-[2026/1051] w-full overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-panel)] [container-type:inline-size]"
        >
          {/* Enhanced photographic backdrop */}
          <img
            src={callCenterEn}
            alt="SayPharma neon call-center with a live operator"
            width={2026}
            height={1051}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Atmosphere wash */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 40% 60% at 74% 50%, rgba(50,230,255,.10), transparent 60%), radial-gradient(ellipse 60% 50% at 30% 40%, rgba(255,60,60,.06), transparent 60%)",
            }}
          />

          {/* Wall sign (always visible) */}
          <div
            className="absolute font-extrabold uppercase text-[#e9f8ff]"
            style={{
              left: "13.5%",
              top: "40.5%",
              width: "31%",
              lineHeight: 1.12,
              fontSize: "3.4cqw",
              letterSpacing: ".01em",
              textShadow: "0 0 0.5cqw rgba(110,220,255,.65), 0 0 0.15cqw rgba(255,255,255,.6)",
            }}
          >
            Your order is
            <br />
            our priority
          </div>

          {/* ===== ACTIVE STATE: the selected operator lights up ===== */}
          {/* Brightened + masked operator (pulsing brightness "beat") */}
          <img
            src={callCenterEn}
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              talking ? "opacity-100 animate-sp-beat" : "opacity-0"
            }`}
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 15% 48% at 74% 56%, #000 52%, transparent 82%)",
              maskImage:
                "radial-gradient(ellipse 15% 48% at 74% 56%, #000 52%, transparent 82%)",
            }}
          />
          {/* Teal-blue tint on her */}
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
              talking ? "opacity-50" : "opacity-0"
            }`}
            style={{
              mixBlendMode: "soft-light",
              background: "linear-gradient(180deg,#37f5d6,#46b6ff)",
              WebkitMaskImage:
                "radial-gradient(ellipse 14% 46% at 74% 55%, #000 48%, transparent 82%)",
              maskImage:
                "radial-gradient(ellipse 14% 46% at 74% 55%, #000 48%, transparent 82%)",
            }}
          />
          {/* Neon bloom on her (pulsing) */}
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
              talking ? "opacity-100 animate-sp-pulse" : "opacity-0"
            }`}
            style={{
              mixBlendMode: "screen",
              filter: "blur(1.4cqw)",
              background:
                "radial-gradient(ellipse 11% 34% at 74% 50%, rgba(64,245,220,.6), rgba(60,170,255,.22) 55%, transparent 74%)",
            }}
          />

          {/* Running English console on HER monitor (active) */}
          <div
            className={`absolute overflow-hidden border transition-opacity duration-500 ${
              talking ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: "43.4%",
              top: "50.6%",
              width: "17.6%",
              height: "24.4%",
              borderRadius: "0.4cqw",
              borderColor: "#2ff5c977",
              transform: "perspective(80cqw) rotateY(-9deg)",
              transformOrigin: "right center",
              background: "linear-gradient(135deg,#05241b,#073b2c 60%,#031410)",
              boxShadow: "0 0 1.4cqw #2ff5c9aa, inset 0 0 1.6cqw #2ff5c955",
            }}
          >
            <div
              className="flex items-center border-b"
              style={{ gap: "0.3cqw", padding: "0.3cqw 0.5cqw", borderColor: "#1c5a47" }}
            >
              <span className="rounded-full" style={{ width: "0.7cqw", height: "0.7cqw", background: "#ff5f6d" }} />
              <span className="rounded-full" style={{ width: "0.7cqw", height: "0.7cqw", background: "#ffd24a" }} />
              <span className="rounded-full" style={{ width: "0.7cqw", height: "0.7cqw", background: "#3dffce" }} />
              <b
                className="font-mono uppercase"
                style={{ marginLeft: "0.4cqw", fontSize: "1.05cqw", letterSpacing: ".12em", color: "#9affdf" }}
              >
                SayPharma · Live
              </b>
            </div>
            <div
              className="relative overflow-hidden"
              style={{
                height: "calc(100% - 2.6cqw)",
                padding: "0.4cqw 0.7cqw",
                WebkitMaskImage: "linear-gradient(transparent, #000 16%, #000 84%, transparent)",
                maskImage: "linear-gradient(transparent, #000 16%, #000 84%, transparent)",
              }}
            >
              <div className="animate-sp-marquee">
                {[...STAGE_LINES, ...STAGE_LINES].map((line, i) => (
                  <div
                    key={i}
                    className="whitespace-nowrap font-mono"
                    style={{
                      fontSize: "1.45cqw",
                      lineHeight: 1.85,
                      color: i % STAGE_LINES.length === 0 ? "#eafff7" : "#7ff0c8",
                      textShadow: "0 0 0.5cqw #34f5c8aa",
                    }}
                  >
                    &gt; {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Brand bar with neon-framed red cross (always visible) */}
          <div
            className="absolute left-1/2 flex -translate-x-1/2 items-center rounded-full backdrop-blur"
            style={{
              top: "4%",
              gap: "1.6cqw",
              padding: "1.1cqw 3.2cqw",
              background: "rgba(4,16,22,.55)",
              border: "0.22cqw solid #46f5e0",
              boxShadow: "0 0 2.4cqw #2ff5c9aa, inset 0 0 1.8cqw #2ff5c955",
            }}
          >
            <span className="relative inline-block" style={{ width: "3.4cqw", height: "3.4cqw" }}>
              <span
                className="absolute"
                style={{ left: "40%", top: 0, width: "20%", height: "100%", borderRadius: "0.3cqw", background: "#ff3b3b", boxShadow: "0 0 1.4cqw #ff3b3b" }}
              />
              <span
                className="absolute"
                style={{ top: "40%", left: 0, height: "20%", width: "100%", borderRadius: "0.3cqw", background: "#ff3b3b", boxShadow: "0 0 1.4cqw #ff3b3b" }}
              />
            </span>
            <b
              className="font-display font-extrabold text-[#eaffff]"
              style={{ fontSize: "3.1cqw", textShadow: "0 0 1.4cqw #46f5e0aa" }}
            >
              SayPharma
            </b>
            <span
              className="font-mono uppercase"
              style={{ fontSize: "1.5cqw", letterSpacing: ".18em", color: "#7ff0d8" }}
            >
              Pharmacy 24/7
            </span>
          </div>

          {/* LISTENING chip (active) */}
          <div
            className={`absolute flex items-center rounded-full font-mono uppercase transition-opacity duration-500 ${
              talking ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: "2.4cqw",
              bottom: "2.4cqw",
              gap: "1.2cqw",
              padding: "0.9cqw 2cqw",
              fontSize: "1.5cqw",
              letterSpacing: ".12em",
              color: "#7ff0d8",
              background: "rgba(4,19,26,.66)",
              border: "0.2cqw solid #2ff5c955",
            }}
          >
            <span
              className="rounded-full animate-sp-pulse"
              style={{ width: "1.2cqw", height: "1.2cqw", background: "#46ffd0", boxShadow: "0 0 1.4cqw #46ffd0" }}
            />
            Listening · operator speaking
          </div>
        </section>

        {/* HERO */}
        <div className="grid items-center gap-8 mt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          {/* Left: copy + CTA */}
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent" />
              {t("home.badge")}
            </span>

            {/* The CTA */}
            <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                onClick={() => (voice.isLive ? voice.stop() : setGateOpen(true))}
                aria-busy={voice.isConnecting}
                className={`group relative inline-flex min-w-[19.5rem] items-center justify-center gap-3 rounded-full px-7 py-4 text-sm font-semibold transition-all ${
                  active
                    ? "bg-card text-foreground glow-ring"
                    : "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02]"
                }`}
              >
                <span
                  className={`relative grid h-9 w-9 place-items-center rounded-full ${
                    active ? "bg-primary/20 pulse-ring" : "bg-white/15"
                  }`}
                >
                  {talking ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </span>
                {voice.isConnecting
                  ? t("home.cta.connecting")
                  : talking
                    ? t("home.cta.stop")
                    : t("home.cta.start")}
              </button>

              <span
                className={`text-xs ${
                  voiceError
                    ? "text-destructive"
                    : talking && voice.silenceWarning
                      ? "text-amber-400"
                      : "text-muted-foreground"
                }`}
              >
                {voice.isConnecting
                  ? t("home.caption.connecting")
                  : talking
                    ? voice.silenceWarning
                      ? t("voice.silenceWarning")
                      : t("home.caption.talking")
                    : voiceError ?? t("home.caption.idle")}
              </span>
            </div>

            <CallGateModal
              open={gateOpen}
              onClose={() => setGateOpen(false)}
              onStartCall={voice.start}
              callStatus={voice.status}
              callErrorDetail={voice.errorDetail}
            />

            {/* Live transcript of the call — sits right under the talk button */}
            <LiveTranscript transcript={voice.transcript} isLive={voice.isLive} />

            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t("home.h1a")}
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {t("home.h1b")}
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("home.lead")}
            </p>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                {t("home.trust.licensed")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-accent" />
                {t("home.trust.delivery")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {t("home.trust.ai247")}
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
            {t("how.title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {t("how.subtitle")}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { n: "01", t: t("how.s1.t"), d: t("how.s1.d") },
              { n: "02", t: t("how.s2.t"), d: t("how.s2.d") },
              { n: "03", t: t("how.s3.t"), d: t("how.s3.d") },
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
              {t("trust.titleA")}
              <br />
              <span className="text-muted-foreground">{t("trust.titleB")}</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("trust.lead")}
            </p>
          </div>
          <ul className="grid gap-3 text-sm">
            {[t("trust.i1"), t("trust.i2"), t("trust.i3"), t("trust.i4")].map((item) => (
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
          <div>{t("footer.rights", { year: new Date().getFullYear() })}</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">{t("footer.license")}</a>
            <a href="#" className="hover:text-foreground">{t("footer.policy")}</a>
            <a href="mailto:hi@saypharma.app" className="hover:text-foreground">
              hi@saypharma.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
