"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Feedback";
import { trackerApi, type ActivityToday, type ActivityWeek } from "@/features/tracker/api";
import { PageHeader, Card, CardTitle, TrackerGrid, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";
import { StatCard } from "@/features/tracker/components/StatCard";
import { WeekChart, weekdayLabel } from "@/features/tracker/components/WeekChart";

const STEPS_QUICK = [2000, 5000, 8000];

export default function ActivityPage() {
  const { t, tAny } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [today, setToday] = useState<ActivityToday | null>(null);
  const [week, setWeek] = useState<ActivityWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState("");
  const [activeMinutes, setActiveMinutes] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([trackerApi.activity.today(), trackerApi.activity.week()]);
      setToday(t);
      setWeek(w);
      setGoalInput(String(t.goal));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "activity.changed" || lastEvent?.type === "wellness.changed") void load();
  }, [lastEvent, load]);

  const logSteps = async (stepsValue: number) => {
    if (!Number.isFinite(stepsValue) || stepsValue < 0 || stepsValue > 200000) {
      showToast("error", t("activity.invalidSteps"));
      return;
    }
    setBusy(true);
    try {
      await trackerApi.activity.log({ steps: stepsValue, activeMinutes: Number(activeMinutes) || 0 });
      showToast("success", t("activity.logged"));
      setSteps("");
      setActiveMinutes("");
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const saveGoal = async () => {
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value < 1000 || value > 50000) {
      showToast("error", t("activity.invalidSteps"));
      return;
    }
    try {
      await trackerApi.activity.setGoal(value);
      showToast("success", t("activity.saved"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
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

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <BackToDashboard />
          <PageHeader icon="🚶" titleKey="activity.title" subtitleKey="activity.subtitle" />

          <TrackerGrid>
            <Card className="flex flex-col items-center gap-3">
              <CardTitle>{t("water.today")}</CardTitle>
              <ProgressRing value={today?.steps ?? 0} max={today?.goal ?? 8000} label={(today?.steps ?? 0).toLocaleString()} color="stroke-emerald-500" />
              <div className="flex items-center gap-2">
                <StatCard label={t("activity.steps")} value={(today?.steps ?? 0).toLocaleString()} />
                <StatCard label={t("activity.activeMinutes")} value={`${today?.activeMinutes ?? 0}`} accent />
              </div>
            </Card>

            <Card>
              <CardTitle>{t("activity.log")}</CardTitle>
              <div className="grid grid-cols-3 gap-2">
                {STEPS_QUICK.map((s) => (
                  <Button key={s} variant="secondary" disabled={busy} onClick={() => void logSteps(s)}>
                    +{s.toLocaleString()}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <Input type="number" min={0} max={200000} value={steps} onChange={(e) => setSteps(e.target.value)} label={t("activity.steps")} />
                <Input type="number" min={0} max={1440} value={activeMinutes} onChange={(e) => setActiveMinutes(e.target.value)} label={t("activity.activeMinutes")} />
                <Button disabled={busy || !steps} onClick={() => void logSteps(Number(steps))}>
                  {t("activity.log")}
                </Button>
              </div>
              <div className="mt-6 flex gap-2">
                <Input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} label={t("activity.goalLabel")} hint={t("activity.goalHint")} />
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => void saveGoal()}>
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>{t("activity.week")}</CardTitle>
              <WeekChart
                days={(week?.days ?? []).map((d) => ({ date: d.date, value: d.steps }))}
                label={(v) => `${v.toLocaleString()} ${t("activity.steps")}`}
                dayLabel={(d) => weekdayLabel(d, t("reminders.daysShort") as unknown as string[])}
              />
              <div className="mt-3 flex justify-between text-xs text-text-muted">
                <span>{t("wellness.weekAvgSteps")}: {(week?.avgSteps ?? 0).toLocaleString()}</span>
              </div>
            </Card>
          </TrackerGrid>

          <Card>
            <CardTitle>{t("water.history")}</CardTitle>
            {!today || today.entries.length === 0 ? (
              <EmptyState title={t("activity.emptyTitle")} text={t("activity.emptyText")} />
            ) : (
              <ul className="flex flex-col gap-2">
                {today.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3 text-sm">
                    <span className="font-medium text-text">
                      {e.steps.toLocaleString()} {t("activity.steps")} · {tAny(`activity.types.${e.type}`)}
                      {e.source === "bot" ? " · 🤖" : e.source === "miniapp" ? " · 📱" : ""}
                    </span>
                    <span className="text-xs text-text-muted">{new Date(e.createdAt).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}