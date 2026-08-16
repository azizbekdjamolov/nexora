"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { telegramApi } from "@/features/telegram/api";

/**
 * Compact footer: brand, key links and the Telegram connect button.
 * Renders no error boxes — failures surface as a single toast only.
 */
export function Footer() {
  const { t } = useI18n();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  if (pathname.startsWith("/mini")) return null;

  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    telegramApi
      .info()
      .then((info) => setBotUsername(info.botUsername))
      .catch(() => undefined);
  }, []);

  const botUrl = botUsername ? `https://t.me/${botUsername}` : "https://t.me/";

  const connect = useCallback(async () => {
    if (!user) {
      window.open(botUrl, "_blank", "noopener");
      return;
    }
    setLinking(true);
    try {
      const { deepLink } = await telegramApi.linkStart();
      window.open(deepLink, "_blank", "noopener");
      const timer = window.setInterval(async () => {
        try {
          const status = await telegramApi.linkStatus();
          if (status.linked) {
            window.clearInterval(timer);
            setLinking(false);
            showToast("success", t("profile.linkedSuccess"));
            updateUser({
              ...user,
              telegramLinked: true,
              telegramUserId: status.telegramUserId,
              telegramUsername: status.username,
            });
          }
        } catch {
          // keep polling
        }
      }, 2500);
    } catch {
      setLinking(false);
      showToast("error", t("errors.internal"));
    }
  }, [user, botUrl, showToast, t, updateUser]);

  return (
    <footer className="border-t border-surface-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold text-text" aria-label="NEXORA">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs text-white" aria-hidden>
            ◈
          </span>
          NEX<span className="text-gradient">ORA</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-text-muted" aria-label="Footer">
          <Link href="/#features" className="transition-colors hover:text-text">
            {t("nav.features")}
          </Link>
          <Link href="/register" className="transition-colors hover:text-text">
            {t("nav.register")}
          </Link>
          <Link href="/login" className="transition-colors hover:text-text">
            {t("nav.login")}
          </Link>
          <button
            onClick={() => void connect()}
            disabled={linking}
            title={t("footer.connectTelegramHint")}
            className="flex items-center gap-1.5 rounded-lg bg-surface-border/40 px-3 py-1.5 font-medium text-text transition-colors hover:bg-surface-border/70 disabled:opacity-60"
          >
            <span aria-hidden>✈</span>
            {linking ? t("profile.linkingInProgress") : t("footer.connectTelegram")}
          </button>
        </nav>
        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} NEXORA. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}