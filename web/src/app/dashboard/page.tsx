"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth, ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useRealtimeEvents } from "@/lib/events";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { trackerApi } from "@/features/tracker/api";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";
import { WeekChart, weekdayLabel } from "@/features/tracker/components/WeekChart";
import type { WellnessToday } from "@app/shared";

function greetingKey(hour: number): "wellness.greetingMorning" | "wellness.greetingAfternoon" | "wellness.greetingEvening" {
  if (hour < 12) return "wellness.greetingMorning";
  if (hour < 18) return "wellness.greetingAfternoon";
  return "wellness.greetingEvening";
}

const CARDS = [
  { href: "/water", icon: "💧", key: "dashboard.waterCard", event: "water.changed" },
  { href: "/sleep", icon: "😴", key: "dashboard.sleepCard", event: "sleep.changed" },
  { href: "/activity", icon: "🚶", key: "dashboard.activityCard", event: "activity.changed" },
  { href: "/workouts", icon: "🏋️", key: "dashboard.workoutCard", event: "workout.changed" },
  { href: "/habits", icon: "✅", key: "dashboard.habitsCard", event: "habits.changed" },
  { href: "/goals", icon: "🎯", key: "dashboard.goalsCard", event: "goals.changed" },
] as const;

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const lastEvent = useRealtimeEvents();

  const [today, setToday] = useState<WellnessToday | null>(null);
  const [week, setWeek] = useState<{ days: { date: string; score: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([trackerApi.wellness.today(), trackerApi.wellness.week()]);
      setToday(t);
      setWeek(w);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      lastEvent?.type === "wellness.changed" ||
      lastEvent?.type === "water.changed" ||
      lastEvent?.type === "sleep.changed" ||
      lastEvent?.type === "activity.changed" ||
      lastEvent?.type === "workout.changed" ||
      lastEvent?.type === "habits.changed" ||
      lastEvent?.type === "goals.changed" ||
      lastEvent?.type === "reminders.changed"
    ) {
      void load();
    }
  }, [lastEvent, load]);

  const hour = new Date().getHours();
  const parts = today?.scoreParts;

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-bold text-text">
              {t(greetingKey(hour))}, {user?.name}!
            </h1>
            <p className="text-text-muted">{t("dashboard.wellnessSubtitle")}</p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoadingSpinner label={t("common.loading")} />
            </div>
          ) : (
            <>
              <section className="glass flex flex-col gap-6 rounded-3xl p-6 md:flex-row md:items-center">
                <div className="flex items-center gap-6">
                  <ProgressRing value={today?.score ?? 0} max={100} size={140} stroke={12} label={`${today?.score ?? 0}`} color="stroke-primary-500" />
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-lg font-bold text-text">{t("dashboard.wellnessTitle")}</h2>
                    <p className="text-sm text-text-muted">
                      🔥 {t("dashboard.streakLabel")}: {today?.streak ?? 0} {t("wellness.streakDays", { count: today?.streak ?? 0 })}
                    </p>
                    <p className="text-xs text-text-muted">{t("wellness.disclaimer")}</p>
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: t("wellness.partsWater"), value: parts?.water ?? 0, color: "text-sky-400" },
                    { label: t("wellness.partsSleep"), value: parts?.sleep ?? 0, color: "text-violet-400" },
                    { label: t("wellness.partsActivity"), value: parts?.activity ?? 0, color: "text-emerald-400" },
                    { label: t("wellness.partsHabits"), value: parts?.habits ?? 0, color: "text-amber-400" },
                  ].map((p) => (
                    <div key={p.label} className="rounded-2xl bg-surface-raised px-4 py-3">
                      <p className={`font-display text-xl font-bold ${p.color}`}>{p.value}</p>
                      <p className="text-xs text-text-muted">{p.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CARDS.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group glass flex items-center justify-between rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised text-xl" aria-hidden>
                        {card.icon}
                      </span>
                      <span className="font-display text-base font-semibold text-text">{t(card.key)}</span>
                    </div>
                    <span className="text-text-muted transition-transform group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </Link>
                ))}
              </section>

              <div className="grid gap-5 md:grid-cols-2">
                <section className="glass rounded-2xl p-5">
                  <h2 className="mb-3 font-display text-base font-semibold text-text">{t("wellness.week")}</h2>
                  <WeekChart
                    days={(week?.days ?? []).map((d) => ({ date: d.date, value: d.score }))}
                    max={100}
                    label={(v) => `${v}/100`}
                    dayLabel={(d) => weekdayLabel(d, t("reminders.daysShort") as unknown as string[])}
                  />
                  <Link href="/progress" className="mt-3 inline-block text-sm text-primary-500 hover:underline">
                    {t("dashboard.viewAll")} →
                  </Link>
                </section>

                <section className="glass flex flex-col justify-between gap-4 rounded-2xl p-5">
                  <div>
                    <h2 className="font-display text-base font-semibold text-text">{t("dashboard.aiTitle")}</h2>
                    <p className="mt-1 text-sm text-text-muted">{t("dashboard.aiOpenChatHint")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/ai" className="flex-1">
                      <Button className="w-full">✦ {t("dashboard.aiOpenChat")}</Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant="secondary">⚙️ {t("dashboard.editProfile")}</Button>
                    </Link>
                  </div>
                </section>
              </div>

              {!today?.hasAnyData ? (
                <p className="rounded-xl bg-primary-500/10 px-4 py-3 text-sm text-primary-500">{t("dashboard.noDataHint")}</p>
              ) : null}
            </>
          )}
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}