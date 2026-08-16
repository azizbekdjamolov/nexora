"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: "◆" },
  { href: "/water", key: "nav.water", icon: "💧" },
  { href: "/sleep", key: "nav.sleep", icon: "😴" },
  { href: "/activity", key: "nav.activity", icon: "🏃" },
  { href: "/workouts", key: "nav.workouts", icon: "🏋️" },
  { href: "/habits", key: "nav.habits", icon: "✅" },
  { href: "/goals", key: "nav.goals", icon: "🎯" },
  { href: "/progress", key: "nav.progress", icon: "📊" },
  { href: "/diagnostics", key: "nav.diagnostics", icon: "🩺" },
  { href: "/ai", key: "nav.aiChat", icon: "✨" },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    showToast("info", t("auth.loggedOut"));
    window.location.href = "/";
  };

  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 py-6" aria-label="NEXORA">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-base text-white shadow-glow-sm" aria-hidden>
          ◈
        </span>
        <span className="font-display text-lg font-bold tracking-wide text-text">
          NEX<span className="text-gradient">ORA</span>
        </span>
      </Link>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-primary-500/20 to-accent-500/10 text-text shadow-glow-sm ring-1 ring-primary-500/40"
                  : "text-text-muted hover:bg-surface-border/40 hover:text-text"
              }`}
            >
              <span className={`w-5 text-center transition-transform duration-200 group-hover:scale-110 ${active ? "text-primary-400" : ""}`} aria-hidden>
                {item.icon}
              </span>
              <span>{t(item.key as never)}</span>
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-400 shadow-glow-sm" aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-surface-border/70 px-3 py-4">
        <Link
          href="/support"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/support") ? "text-text" : "text-text-muted hover:bg-surface-border/40 hover:text-text"
          }`}
        >
          <span className="w-5 text-center" aria-hidden>
            👨‍💻
          </span>
          <span>{t("nav.support")}</span>
        </Link>
        {user?.isAdmin ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin") ? "text-text" : "text-text-muted hover:bg-surface-border/40 hover:text-text"
            }`}
          >
            <span className="w-5 text-center" aria-hidden>
              🛡️
            </span>
            <span>{t("nav.admin")}</span>
          </Link>
        ) : null}
        <Link
          href="/profile"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/profile") ? "text-text" : "text-text-muted hover:bg-surface-border/40 hover:text-text"
          }`}
        >
          <span className="w-5 text-center" aria-hidden>
            👤
          </span>
          <span>{t("nav.profile")}</span>
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/settings") ? "text-text" : "text-text-muted hover:bg-surface-border/40 hover:text-text"
          }`}
        >
          <span className="w-5 text-center" aria-hidden>
            ⚙
          </span>
          <span>{t("nav.settings")}</span>
        </Link>
        <div className="flex items-center gap-1 pt-1">
          <LanguageSwitcher compact />
          <ThemeSwitcher compact />
          <button
            onClick={() => void handleLogout()}
            className="glass ml-auto flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-text-muted transition-colors hover:text-red-500"
            aria-label={t("nav.logOut")}
            title={t("nav.logOut")}
          >
            <span aria-hidden>⎋</span>
            <span className="hidden xl:inline">{t("nav.logOut")}</span>
          </button>
        </div>
        {user ? (
          <p className="truncate px-3 pt-2 text-xs text-text-muted" title={user.name}>
            {user.name}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * NEXORA app shell: fixed left sidebar on desktop, slide-out drawer on
 * tablet/mobile. Replaces the old horizontal navbar on app pages.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="glass fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl text-text lg:hidden"
        aria-label="Open menu"
      >
        <span className="text-lg leading-none" aria-hidden>
          ☰
        </span>
      </button>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-surface-border/60 bg-surface/70 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-surface-border/60 bg-surface/90 shadow-glow backdrop-blur-xl lg:hidden">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </>
      ) : null}

      <main className="min-h-dvh lg:pl-[260px]">{children}</main>
    </>
  );
}