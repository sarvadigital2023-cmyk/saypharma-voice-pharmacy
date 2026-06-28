import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { getPharmacyContact, type PharmacyContact as Contact } from "@/lib/pharmacy";

const GREEN = "#34e57a";
const BLUE = "#3b9bff";

/**
 * "Наша аптека" — address + contact phones, read live from pharmacy_settings
 * (pharmacy_address, phone1, phone2). Styled like the neighbouring terminal
 * panels. Updates on page reload when the admin changes the values.
 */
export function PharmacyContact() {
  const { t } = useI18n();
  const [data, setData] = useState<Contact | null>(null);

  useEffect(() => {
    let alive = true;
    getPharmacyContact()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        /* leave placeholders on failure */
      });
    return () => {
      alive = false;
    };
  }, []);

  const address = data?.pharmacy_address ?? null;
  const phones = [data?.phone1, data?.phone2].filter(Boolean) as string[];
  const workingHours = data?.working_hours ?? null;

  return (
    <section className="mt-10 flex justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        {/* terminal-style header */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            saypharma · contacts
          </span>
        </div>

        <h3
          className="mt-4 text-2xl font-bold tracking-tight"
          style={{ color: GREEN, textShadow: `0 0 14px ${GREEN}80` }}
        >
          {t("contact.title")}
        </h3>

        <div className="mt-4 space-y-4">
          {/* address */}
          <div>
            <div className="text-sm font-semibold" style={{ color: BLUE }}>
              {t("contact.address")}
            </div>
            <div
              className="mt-1 text-lg font-semibold"
              style={{ color: GREEN, textShadow: `0 0 10px ${GREEN}66` }}
            >
              {address ?? "—"}
            </div>
          </div>

          {/* phones */}
          <div>
            <div className="text-sm font-semibold" style={{ color: BLUE }}>
              {t("contact.phones")}
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {phones.length > 0 ? (
                phones.map((p) => (
                  <a
                    key={p}
                    href={`tel:${p.replace(/[^\d+]/g, "")}`}
                    className="text-lg font-semibold"
                    style={{ color: GREEN, textShadow: `0 0 10px ${GREEN}66` }}
                  >
                    {p}
                  </a>
                ))
              ) : (
                <span className="text-lg font-semibold" style={{ color: GREEN }}>
                  —
                </span>
              )}
            </div>
          </div>

          {/* working hours */}
          <div>
            <div className="text-sm font-semibold" style={{ color: BLUE }}>
              {t("contact.hours")}
            </div>
            <div
              className="mt-1 text-lg font-semibold"
              style={{ color: GREEN, textShadow: `0 0 10px ${GREEN}66` }}
            >
              {workingHours ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
