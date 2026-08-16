"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { UserMenu } from "./UserMenu";

/**
 * Slim public header for landing/auth pages only.
 * Authenticated app pages use AppShell (left sidebar) instead.
 */
export function Navbar() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (pathname.startsWith("/mini")) return null;

  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-x-0 border-t-0">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-text" aria-label="Home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-sm text-white" aria-hidden>
              ◈
            </span>
            <span>
              NEX<span className="text-gradient">ORA</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <Link href="/#how" className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:text-text">
              {t("nav.how")}
            </Link>
            {user ? (
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:text-text">
                {t("nav.dashboard")}
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
            {!loading && user ? (
              <UserMenu />
            ) : !loading ? (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{t("nav.register")}</Button>
                </Link>
              </>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}