"use client";

import type { ThemePreference } from "@app/shared";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";

const ICONS: Record<ThemePreference, string> = {
  dark: "🌙",
  light: "☀️",
  system: "🖥️",
};

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const options: ThemePreference[] = ["dark", "light", "system"];

  return (
    <div className="relative" ref={ref}>
      <button
        className="glass flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-text transition-colors hover:brightness-110"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("common.theme")}
      >
        <span aria-hidden>{ICONS[theme]}</span>
        {!compact ? <span>{t(`common.${theme}` as never)}</span> : null}
      </button>
      {open ? (
        <div className="glass absolute right-0 z-50 mt-2 min-w-36 overflow-hidden rounded-xl p-1.5 shadow-xl" role="listbox">
          {options.map((o) => (
            <button
              key={o}
              role="option"
              aria-selected={o === theme}
              onClick={() => {
                setTheme(o);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-border/50 ${
                o === theme ? "font-semibold text-primary-500" : "text-text"
              }`}
            >
              <span aria-hidden>{ICONS[o]}</span>
              <span>{t(`common.${o}` as never)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}