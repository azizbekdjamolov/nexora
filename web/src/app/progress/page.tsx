"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { trackerApi } from "@/features/tracker/api";
import { PageHeader, Card, CardTitle, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { StatCard } from "@/features/tracker/components/StatCard";
import { WeekChart, weekdayLabel } from "@/features/tracker/components/WeekChart";
import type { WellnessSummaryResult, WellnessWeek } from "@app/shared";

export default function ProgressPage() {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [week, setWeek] = useState<WellnessWeek | null>(null);
  const [summary, setSummary] = useState<WellnessSummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      setWeek(await trackerApi.wellness.week());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "wellness.changed" || lastEvent?.type === "water.changed" || lastEvent?.type === "sleep.changed" || lastEvent?.type === "activity.changed" || lastEvent?.type === "habits.changed") {
      void load();
    }
  }, [lastEvent, load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await trackerApi.wellness.summary(lang);
      setSummary(result);
      showToast("success", t("progress.generated"));
    } catch {
      showToast("error", t("progress.error"));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppShell>
        <div className="mx-auto flex min-h-64 max-w-6xl items-center justify-center px-4 py-12">
          <ProtectedRoute>
            <LoadingSpinner />
          </ProtectedRoute>
        </div>
        </AppShell>
      </>
    );
  }

  const averages = week?.averages;

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <BackToDashboard />
          <PageHeader icon="📊" titleKey="progress.title" subtitleKey="progress.subtitle" />

          <Card>
            <CardTitle>{t("progress.scoreTrend")}</CardTitle>
            <WeekChart
              days={(week?.days ?? []).map((d) => ({ date: d.date, value: d.score }))}
              max={100}
              label={(v) => `${v}/100`}
              dayLabel={(d) => weekdayLabel(d, t("reminders.daysShort") as unknown as string[])}
            />
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon="💧" label={t("wellness.weekAvgWater")} value={`${averages?.waterMl ?? 0} ml`} />
            <StatCard icon="😴" label={t("wellness.weekAvgSleep")} value={`${averages?.sleepMinutes ?? 0} min`} />
            <StatCard icon="🚶" label={t("wellness.weekAvgSteps")} value={(averages?.steps ?? 0).toLocaleString()} />
            <StatCard icon="🏋️" label={t("wellness.weekAvgWorkout")} value={`${averages?.workoutMinutes ?? 0} min`} />
            <StatCard icon="✅" label={t("progress.habitsRate")} value={`${averages?.habitsRate ?? 0}%`} />
            <StatCard icon="⭐" label={t("wellness.weekAvgScore")} value={`${averages?.score ?? 0}/100`} accent />
          </div>

          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{t("progress.aiSummary")}</CardTitle>
                <p className="-mt-2 text-xs text-text-muted">{t("progress.disclaimer")}</p>
              </div>
              <Button onClick={() => void generate()} loading={generating}>
                {generating ? t("progress.generating") : t("progress.generate")}
              </Button>
            </div>
            {summary ? (
              <p className="whitespace-pre-wrap rounded-xl bg-surface-raised px-4 py-4 text-sm leading-relaxed text-text">{summary.text}</p>
            ) : (
              <p className="text-sm text-text-muted">{t("wellness.aiSummaryHint")}</p>
            )}
          </Card>
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}