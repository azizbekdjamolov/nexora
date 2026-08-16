"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const pathname = usePathname();

  if (!user) return null;

  const initials = (user.name || "?").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    showToast("info", t("auth.loggedOut"));
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile")) {
      window.location.href = "/";
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <Link
        href="/profile"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm text-text transition-colors hover:bg-surface-border/40"
        aria-label={t("nav.profile")}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-28 truncate font-medium lg:block">{user.name}</span>
      </Link>
      <button
        onClick={handleLogout}
        className="glass flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-text-muted transition-colors hover:text-red-500"
        aria-label={t("nav.logOut")}
        title={t("nav.logOut")}
      >
        <span aria-hidden>⎋</span>
        <span className="hidden sm:inline">{t("nav.logOut")}</span>
      </button>
    </div>
  );
}