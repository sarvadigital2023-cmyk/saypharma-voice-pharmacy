import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCALES, messages, type Locale } from "./translations";

export { LOCALES, LOCALE_NAMES } from "./translations";
export type { Locale } from "./translations";

const STORAGE_KEY = "sp-locale";
const DEFAULT_LOCALE: Locale = "ru";

function isLocale(value: string | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

function lookup(locale: Locale, key: string): string | string[] | undefined {
  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key];
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a key. Supports {var} interpolation. Falls back to the key. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translate a key whose value is a list of strings (e.g. modal paragraphs). */
  tList: (key: string) => string[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start from the default so server and first client render match (no hydration
  // mismatch); the stored locale is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      const found = lookup(locale, key);
      let result = Array.isArray(found) ? found.join(" ") : found ?? key;
      if (vars) {
        for (const [name, val] of Object.entries(vars)) {
          result = result.replaceAll(`{${name}}`, String(val));
        }
      }
      return result;
    };
    const tList = (key: string) => {
      const found = lookup(locale, key);
      if (Array.isArray(found)) return found;
      return found ? [found] : [];
    };
    return { locale, setLocale, t, tList };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
