import { useEffect, useRef, useState } from "react";
import { AudioLines, Copy, Check } from "lucide-react";

import { useI18n } from "@/i18n";
import type { TranscriptEntry } from "@/lib/use-voice-agent";
import { formatTranscriptText } from "@/lib/call-history";

/**
 * "Текст разговора" — live transcript of the voice call.
 * Data comes from the Retell SDK "update" event (see useVoiceAgent.transcript);
 * no extra connection or keys are needed. Always visible, with an empty-state
 * hint when there is no conversation yet.
 */
export function LiveTranscript({
  transcript,
  isLive,
}: {
  transcript: TranscriptEntry[];
  isLive: boolean;
}) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const [copied, setCopied] = useState(false);

  // auto-scroll to the newest line, but only if the user is already near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const roleLabel = (role: string) =>
    role === "agent" ? t("transcript.roleAgent") : t("transcript.roleUser");

  const copyAll = async () => {
    const text = formatTranscriptText(
      transcript,
      t("transcript.roleAgent"),
      t("transcript.roleUser"),
    );
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const hasText = transcript.length > 0;

  return (
    <section className="mt-6 w-full max-w-lg rounded-3xl border border-[#34e57a]/35 bg-card/70 shadow-[0_0_30px_rgba(52,229,122,0.1)] backdrop-blur-sm">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-[#34e57a]" />
          <span className="text-sm font-semibold text-foreground">{t("transcript.title")}</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive
                ? "bg-[#34e57a] shadow-[0_0_8px_#34e57a] animate-pulse"
                : "bg-muted-foreground/40"
            }`}
          />
          <span className={isLive ? "text-[#34e57a]" : "text-muted-foreground/70"}>
            {isLive ? t("transcript.live") : t("transcript.idle")}
          </span>
        </span>
      </div>

      {/* body */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-[clamp(180px,38vh,340px)] overflow-y-auto px-5 py-4"
      >
        {!hasText ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AudioLines className="h-9 w-9 text-muted-foreground/40" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground/80">
              {t("transcript.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transcript.map((m, i) => {
              const agent = m.role === "agent";
              const last = i === transcript.length - 1;
              return (
                <div key={i} className={`flex ${agent ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] ${agent ? "text-left" : "text-right"}`}>
                    <div
                      className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${
                        agent ? "text-[#34e57a]" : "text-accent"
                      }`}
                    >
                      {roleLabel(m.role)}
                    </div>
                    <div
                      className={`inline-block rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                        agent
                          ? "rounded-tl-sm border border-[#34e57a]/30 bg-[#34e57a]/10 text-foreground"
                          : "rounded-tr-sm border border-accent/30 bg-accent/10 text-foreground"
                      }`}
                    >
                      {m.content}
                      {last && isLive ? (
                        <span className="ml-0.5 inline-block animate-pulse text-[#34e57a]">▍</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* footer: red copy button */}
      <div className="border-t border-border/60 px-5 py-3">
        <button
          type="button"
          onClick={copyAll}
          disabled={!hasText}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all ${
            hasText
              ? "bg-[#ef4444] text-white shadow-[0_0_22px_rgba(239,68,68,0.4)] hover:bg-[#f25555] active:scale-[0.99]"
              : "cursor-not-allowed bg-muted/40 text-muted-foreground/50"
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("transcript.copied") : t("transcript.copy")}
        </button>
      </div>
    </section>
  );
}
