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
import { trackerApi, type SleepToday, type SleepWeek } from "@/features/tracker/api";
import { PageHeader, Card, CardTitle, TrackerGrid, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";
import { StatCard } from "@/features/tracker/components/StatCard";
import { WeekChart, weekdayLabel } from "@/features/tracker/components/WeekChart";

const QUICK_HOURS = [6, 7, 8];

export default function SleepPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [today, setToday] = useState<SleepToday | null>(null);
  const [week, setWeek] = useState<SleepWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState("480");
  const [goalInput, setGoalInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([trackerApi.sleep.today(), trackerApi.sleep.week()]);
      setToday(t);
      setWeek(w);
      setGoalInput(String(t.goalMinutes));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "sleep.changed" || lastEvent?.type === "wellness.changed") void load();
  }, [lastEvent, load]);

  const logSleep = async (minutes?: number) => {
    const value = minutes ?? Number(duration);
    if (!Number.isFinite(value) || value < 60 || value > 960) {
      showToast("error", t("sleep.invalidDuration"));
      return;
    }
    setBusy(true);
    try {
      await trackerApi.sleep.log({ durationMinutes: value });
      showToast("success", t("sleep.logged"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const saveGoal = async () => {
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value < 240 || value > 720) {
      showToast("error", t("sleep.invalidDuration"));
      return;
    }
    try {
      await trackerApi.sleep.setGoal(value);
      showToast("success", t("sleep.saved"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const remove = async (id: string) => {
    try {
      await trackerApi.sleep.remove(id);
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

  const durationValue = today?.entry?.durationMinutes ?? 0;
  const hours = (durationValue / 60).toFixed(1);

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <BackToDashboard />
          <PageHeader icon="😴" titleKey="sleep.title" subtitleKey="sleep.subtitle" />

          <TrackerGrid>
            <Card className="flex flex-col items-center gap-3">
              <CardTitle>{t("sleep.today")}</CardTitle>
              <ProgressRing
                value={durationValue}
                max={today?.goalMinutes ?? 480}
                label={today?.entry ? `${hours} ${t("sleep.hoursShort")}` : "—"}
                color="stroke-violet-500"
              />
              <div className="flex items-center gap-2">
                <StatCard label={t("sleep.duration")} value={today?.entry ? `${durationValue} ${t("sleep.minutesShort")}` : "—"} />
                <StatCard label={t("sleep.goal")} value={`${today?.goalMinutes} ${t("sleep.minutesShort")}`} accent />
              </div>
            </Card>

            <Card>
              <CardTitle>{t("sleep.log")}</CardTitle>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_HOURS.map((h) => (
                  <Button key={h} variant="secondary" disabled={busy} onClick={() => void logSleep(h * 60)}>
                    {t("bot.sleepDurationOption", { hours: h })}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input type="number" min={60} max={960} value={duration} onChange={(e) => setDuration(e.target.value)} label={t("sleep.duration")} />
                <div className="flex items-end">
                  <Button disabled={busy} onClick={() => void logSleep()}>
                    {t("sleep.log")}
                  </Button>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} label={t("sleep.goalLabel")} hint={t("sleep.goalHint")} />
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => void saveGoal()}>
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>{t("sleep.week")}</CardTitle>
              <WeekChart
                days={(week?.days ?? []).map((d) => ({ date: d.date, value: d.durationMinutes }))}
                label={(v) => `${v} ${t("sleep.minutesShort")}`}
                dayLabel={(d) => weekdayLabel(d, t("reminders.daysShort") as unknown as string[])}
              />
              <div className="mt-3 flex justify-between text-xs text-text-muted">
                <span>{t("sleep.avgDuration")}: {week?.avgDuration ?? 0} {t("sleep.minutesShort")}</span>
                <span>{t("sleep.consistency")}: {week?.consistency ?? 0}%</span>
              </div>
            </Card>
          </TrackerGrid>

          <Card>
            <CardTitle>{t("sleep.history")}</CardTitle>
            {!today || !today.entry ? (
              <EmptyState title={t("sleep.emptyTitle")} text={t("sleep.emptyText")} />
            ) : (
              <ul className="flex flex-col gap-2">
                <li className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3 text-sm">
                  <span className="font-medium text-text">
                    {t("sleep.duration")}: {durationValue} {t("sleep.minutesShort")}
                    {today.entry.source === "bot" ? " · 🤖" : today.entry.source === "miniapp" ? " · 📱" : ""}
                  </span>
                  <span className="text-xs text-text-muted">{today.entry.date}</span>
                  <Button variant="ghost" size="sm" onClick={() => void remove(today.entry!.id)}>
                    {t("common.delete")}
                  </Button>
                </li>
              </ul>
            )}
          </Card>
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}