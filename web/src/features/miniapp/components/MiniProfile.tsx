"use client";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export function MiniProfile() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass flex items-center gap-3 rounded-2xl p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 font-display text-sm font-bold text-white">
          {user.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-text">{user.name}</h2>
          <p className="truncate text-xs text-text-muted">
            {user.email ?? user.phone ?? `@${user.telegramUsername ?? "telegram"}`}
          </p>
        </div>
      </div>

      <div className="glass flex flex-col gap-4 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text">{t("common.language")}</span>
          <LanguageSwitcher compact />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text">{t("common.theme")}</span>
          <ThemeSwitcher compact />
        </div>
      </div>

      <button
        onClick={() => void logout()}
        className="mt-2 flex h-12 items-center justify-center rounded-xl bg-red-500/15 text-sm font-medium text-red-500 transition-colors active:scale-[0.98]"
      >
        {t("common.logout")}
      </button>
    </div>
  );
}