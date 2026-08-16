"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMessages, type Lang, type MessageKey } from "@app/shared";

export const LANG_STORAGE_KEY = "up_lang";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Lookup for dynamic/deep keys not covered by MessageKey (e.g. `activity.types.walking`). */
  tAny: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectSystemLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("uz")) return "uz";
  if (nav.startsWith("ru")) return "ru";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    return stored === "uz" || stored === "ru" || stored === "en" ? stored : detectSystemLang();
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
      document.cookie = `${LANG_STORAGE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      // storage unavailable
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      const dict = getMessages(lang) as unknown as Record<string, unknown>;
      const parts = key.split(".");
      let value: unknown = dict;
      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return key;
        }
      }
      if (typeof value !== "string") return key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (m, name: string) =>
        name in params ? String(params[name]) : m
      );
    },
    [lang]
  );

  const tAny = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = getMessages(lang) as unknown as Record<string, unknown>;
      const parts = key.split(".");
      let value: unknown = dict;
      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return key;
        }
      }
      if (typeof value !== "string") return key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (m, name: string) =>
        name in params ? String(params[name]) : m
      );
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, tAny }), [lang, setLang, t, tAny]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}