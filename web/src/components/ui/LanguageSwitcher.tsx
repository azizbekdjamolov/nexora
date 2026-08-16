"use client";

import { SUPPORTED_LANGS, LANG_NAMES, type Lang } from "@app/shared";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (next: Lang) => {
    setLang(next);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="glass flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-text transition-colors hover:brightness-110"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <span aria-hidden>🌐</span>
        <span className={compact ? "hidden sm:inline" : ""}>{LANG_NAMES[lang]}</span>
      </button>
      {open ? (
        <div className="glass absolute right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-xl p-1.5 shadow-xl" role="listbox">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={l === lang}
              onClick={() => select(l)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-border/50 ${
                l === lang ? "font-semibold text-primary-500" : "text-text"
              }`}
            >
              <span>{LANG_NAMES[l]}</span>
              {l === lang ? <span aria-hidden>✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}