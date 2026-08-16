"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/** Shared page header used by all tracker pages. */
export function PageHeader({ icon, titleKey, subtitleKey }: { icon: string; titleKey: string; subtitleKey: string }) {
  const { tAny } = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-lg text-white" aria-hidden>
          {icon}
        </span>
        <h1 className="font-display text-2xl font-bold text-text">{tAny(titleKey)}</h1>
      </div>
      <p className="text-sm text-text-muted">{tAny(subtitleKey)}</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-2xl p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 font-display text-base font-semibold text-text">{children}</h2>;
}

export function BackToDashboard() {
  const { t } = useI18n();
  return (
    <Link href="/dashboard" className="text-sm text-text-muted transition-colors hover:text-text">
      ← {t("dashboard.title")}
    </Link>
  );
}

export function TrackerGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-5 md:grid-cols-3 ${className}`}>{children}</div>;
}