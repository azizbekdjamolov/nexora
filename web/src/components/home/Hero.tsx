"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

// Lazy-load the WebGL scene: only loads when the hero is visible and
// the browser supports it. Falls back to CSS gradients otherwise.
const AnimatedBackground = dynamic(() => import("./AnimatedBackground"), {
  ssr: false,
  loading: () => null,
});

export function Hero() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden" aria-label="Hero">
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <span className="glass animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          {t("landing.heroBadge")}
        </span>

        <h1 className="animate-slide-up font-display text-4xl font-bold leading-tight tracking-tight text-text sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
          {t("landing.heroTitle")}
          <br />
          <span className="text-gradient">{t("landing.heroHighlight")}</span>
        </h1>

        <p className="animate-slide-up mt-6 max-w-xl text-base text-text-muted sm:text-lg" style={{ animationDelay: "160ms" }}>
          {t("landing.heroSubtitle")}
        </p>

        <div className="animate-slide-up mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
          <Link href={user ? "/dashboard" : "/register"}>
            <Button size="lg" className="w-full sm:w-auto">
              {user ? t("nav.dashboard") : t("landing.ctaPrimary")}
            </Button>
          </Link>
          <a href="#how">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              {t("landing.ctaSecondary")}
            </Button>
          </a>
        </div>

        <div className="animate-slide-up mt-14 flex items-center gap-6 text-xs text-text-muted" style={{ animationDelay: "320ms" }}>
          <span className="flex items-center gap-1.5"><span aria-hidden>🌐</span> {t("home.platformWebsite")}</span>
          <span className="h-1 w-1 rounded-full bg-surface-border" aria-hidden />
          <span className="flex items-center gap-1.5"><span aria-hidden>🤖</span> {t("home.platformBot")}</span>
          <span className="h-1 w-1 rounded-full bg-surface-border" aria-hidden />
          <span className="flex items-center gap-1.5"><span aria-hidden>📱</span> {t("home.platformMini")}</span>
        </div>
      </div>

      {/* Scroll hint */}
      <a
        href="#features"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-text-muted/60 transition-colors hover:text-text-muted sm:block"
        aria-label={t("landing.ctaSecondary")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-bounce">
          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}