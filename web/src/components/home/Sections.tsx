"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  { icon: "⭐", key: "feature1" },
  { icon: "🔥", key: "feature2" },
  { icon: "🏋️", key: "feature3" },
  { icon: "🧠", key: "feature4" },
  { icon: "🤖", key: "feature5" },
  { icon: "🔒", key: "feature6" },
] as const;

export function Stats() {
  const { t } = useI18n();
  const chips = [
    { icon: "💧", key: "statsWater" },
    { icon: "😴", key: "statsSleep" },
    { icon: "🚶", key: "statsActivity" },
    { icon: "🏋️", key: "statsWorkouts" },
    { icon: "✅", key: "statsHabits" },
    { icon: "🎯", key: "statsGoals" },
  ] as const;
  const stats = [
    { value: "stat1Value", label: "stat1Label" },
    { value: "stat2Value", label: "stat2Label" },
    { value: "stat3Value", label: "stat3Label" },
    { value: "stat4Value", label: "stat4Label" },
  ] as const;
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-label={t("landing.statsTitle")}>
      <div className="mb-10 text-center">
        <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">{t("landing.statsTitle")}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-muted">{t("landing.statsSubtitle")}</p>
      </div>
      <div className="mb-12 flex flex-wrap items-center justify-center gap-2">
        {chips.map((c) => (
          <span key={c.key} className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-text-muted">
            <span aria-hidden>{c.icon}</span> {t(`landing.${c.key}`)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-6 text-center">
            <p className="font-display text-3xl font-bold text-gradient sm:text-4xl">{t(`landing.${s.value}`)}</p>
            <p className="mt-1 text-sm text-text-muted">{t(`landing.${s.label}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Features() {
  const { t } = useI18n();
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-label={t("landing.featuresTitle")}>
      <div className="mb-14 text-center">
        <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">{t("landing.featuresTitle")}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-muted">{t("landing.featuresSubtitle")}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.key} className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 text-2xl" aria-hidden>
              {f.icon}
            </span>
            <h3 className="font-display text-base font-semibold text-text">{t(`landing.${f.key}Title` as never)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{t(`landing.${f.key}Text` as never)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AI() {
  const { t } = useI18n();
  const examples = ["aiExample1", "aiExample2", "aiExample3"] as const;
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-label={t("landing.aiTitle")}>
      <div className="glass relative overflow-hidden rounded-3xl p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_260px_at_80%_10%,rgba(122,87,255,0.22),transparent_70%)]" aria-hidden />
        <div className="relative grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">{t("landing.aiTitle")}</h2>
            <p className="mt-4 max-w-xl text-text-muted">{t("landing.aiSubtitle")}</p>
            <Link href="/register" className="mt-6 inline-block">
              <Button>{t("landing.ctaPrimary")}</Button>
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {examples.map((ex) => (
              <div key={ex} className="glass flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-text">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white" aria-hidden>
                  ✦
                </span>
                <Link href="/ai" className="hover:text-primary-500">
                  {t(`landing.${ex}`)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { n: "1", title: "how1Title", text: "how1Text" },
    { n: "2", title: "how2Title", text: "how2Text" },
    { n: "3", title: "how3Title", text: "how3Text" },
  ] as const;
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-label={t("landing.howTitle")}>
      <div className="mb-14 text-center">
        <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">{t("landing.howTitle")}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-text-muted">{t("landing.howSubtitle")}</p>
      </div>
      <ol className="grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="glass relative rounded-2xl p-6">
            <span className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 font-display text-sm font-bold text-white" aria-hidden>
              {s.n}
            </span>
            <h3 className="mt-3 font-display text-base font-semibold text-text">{t(`landing.${s.title}`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{t(`landing.${s.text}`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Telegram() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-label={t("landing.telegramTitle")}>
      <div className="glass flex flex-col items-center gap-8 rounded-3xl p-8 text-center sm:p-12 lg:flex-row lg:text-left">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/30 to-accent-500/30 text-4xl" aria-hidden>
          ✈️
        </span>
        <div className="flex-1">
          <h2 className="font-display text-3xl font-bold text-text">{t("landing.telegramTitle")}</h2>
          <p className="mt-3 max-w-2xl text-text-muted">{t("landing.telegramText")}</p>
        </div>
        <Link href="/login">
          <Button variant="secondary" size="lg">
            {t("landing.ctaPrimary")}
          </Button>
        </Link>
      </div>
    </section>
  );
}

export function Security() {
  const { t } = useI18n();
  const items = [
    { icon: "🔒", key: "security1" },
    { icon: "💬", key: "security2" },
    { icon: "🩺", key: "security3" },
  ] as const;
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-label={t("landing.securityText")}>
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.key} className="glass rounded-2xl p-6">
            <span className="mb-3 block text-3xl" aria-hidden>{item.icon}</span>
            <p className="font-medium text-text">{t(`landing.${item.key}`)}</p>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-text-muted">{t("landing.securityText")}</p>
    </section>
  );
}

export function FAQ() {
  const { t } = useI18n();
  const faqs = [1, 2, 3, 4, 5] as const;
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6" aria-label={t("landing.faqTitle")}>
      <h2 className="mb-10 text-center font-display text-3xl font-bold text-text">{t("landing.faqTitle")}</h2>
      <details className="group glass rounded-2xl px-6 py-4" open>
        <summary className="cursor-pointer list-none font-medium text-text">
          {t("landing.faq1q")}
          <span className="float-right text-text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">{t("landing.faq1a")}</p>
      </details>
      {faqs.slice(1).map((n) => (
        <details key={n} className="group glass mt-3 rounded-2xl px-6 py-4">
          <summary className="cursor-pointer list-none font-medium text-text">
            {t(`landing.faq${n}q`)}
            <span className="float-right text-text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{t(`landing.faq${n}a`)}</p>
        </details>
      ))}
    </section>
  );
}

export function CTA() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
      <div className="glass relative overflow-hidden rounded-3xl p-10 text-center sm:p-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(79,107,255,0.25),transparent_70%)]" aria-hidden />
        <h2 className="relative font-display text-3xl font-bold text-text sm:text-4xl">{t("landing.ctaTitle")}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-text-muted">{t("landing.ctaText")}</p>
        <div className="relative mt-8 flex justify-center">
          <Link href={user ? "/dashboard" : "/register"}>
            <Button size="lg">{user ? t("nav.dashboard") : t("landing.ctaPrimary")}</Button>
          </Link>
        </div>
        <p className="relative mt-6 text-xs text-text-muted/70">{t("landing.disclaimer")}</p>
      </div>
    </section>
  );
}