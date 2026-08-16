"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { miniappApi } from "@/features/miniapp/api";
import { useTelegram, useHaptic } from "@/lib/telegram";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { LoadingSpinner } from "@/lib/auth";

/**
 * Auto-authenticates via Telegram initData (validated server-side).
 * Outside Telegram it shows a preview banner and requires normal login.
 */
function MiniAuthGate({ children }: { children: ReactNode }) {
  const { inTelegram, initData } = useTelegram();
  const { user, loading, refresh } = useAuth();
  const { t } = useI18n();
  const [authError, setAuthError] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (!inTelegram || !initData) return;
    if (attempted.current) return;
    attempted.current = true;

    miniappApi
      .auth(initData, undefined)
      .then(() => refresh())
      .catch(() => setAuthError(true));
  }, [loading, user, inTelegram, initData, refresh]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) return <>{children}</>;

  if (!inTelegram) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl" aria-hidden>📱</span>
        <p className="max-w-xs text-sm text-text-muted">{t("miniapp.notInTelegram")}</p>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 px-5 py-2.5 text-sm font-medium text-white">
            {t("nav.login")}
          </Link>
          <Link href="/register" className="glass rounded-xl px-5 py-2.5 text-sm font-medium text-text">
            {t("nav.register")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-4xl" aria-hidden>✈</span>
      <p className="text-sm text-text-muted">
        {authError ? t("errors.telegramInitInvalid") : t("common.loading")}
      </p>
    </div>
  );
}

export function MiniShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const haptic = useHaptic();

  const tabs = [
    { href: "/mini", icon: "◆", label: t("miniapp.navHome"), active: pathname === "/mini" },
    { href: "/mini/ai", icon: "✦", label: t("miniapp.navAI"), active: pathname.startsWith("/mini/ai") },
    { href: "/mini/track", icon: "💧", label: t("miniapp.navTrack"), active: pathname.startsWith("/mini/track") },
    { href: "/mini/goals", icon: "🎯", label: t("miniapp.navGoals"), active: pathname.startsWith("/mini/goals") },
    { href: "/mini/profile", icon: "●", label: t("miniapp.profile"), active: pathname.startsWith("/mini/profile") },
  ];

  return (
    <div className="mini-app mx-auto flex min-h-dvh max-w-md flex-col">
      <MiniAuthGate>
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-sm text-white" aria-hidden>
              ◈
            </span>
            <h1 className="font-display text-base font-bold text-text">{t("common.appName")}</h1>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            {t("miniapp.telegramVerified")}
          </span>
        </header>

        <main className="flex-1 px-4 pb-24">{children}</main>

        <nav className="mini-bottom-nav glass fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center justify-around border-b-0 py-2" aria-label="Mini App navigation">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => haptic("light")}
              aria-current={tab.active ? "page" : undefined}
              className={`flex min-w-20 flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs transition-colors ${
                tab.active ? "font-semibold text-primary-500" : "text-text-muted"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          ))}
        </nav>
      </MiniAuthGate>
    </div>
  );
}