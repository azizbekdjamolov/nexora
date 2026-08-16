"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth, ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Feedback";
import { trackerApi, type WaterToday, type WaterWeek } from "@/features/tracker/api";
import { PageHeader, Card, CardTitle, TrackerGrid, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";
import { StatCard } from "@/features/tracker/components/StatCard";
import { WeekChart, weekdayLabel } from "@/features/tracker/components/WeekChart";

const QUICK = [250, 500, 750];

export default function WaterPage() {
  const { t, tAny } = useI18n();
  const { showToast } = useToast();
  const { user } = useAuth();
  const lastEvent = useRealtimeEvents();

  const [today, setToday] = useState<WaterToday | null>(null);
  const [week, setWeek] = useState<WaterWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [custom, setCustom] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([trackerApi.water.today(), trackerApi.water.week()]);
      setToday(t);
      setWeek(w);
      setTargetInput(String(t.targetMl));
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "water.changed" || lastEvent?.type === "wellness.changed") void load();
  }, [lastEvent, load]);

  const add = async (amountMl: number) => {
    setBusy(true);
    try {
      await trackerApi.water.add(amountMl, "website");
      showToast("success", t("water.added"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const amount = Number(custom);
    if (!Number.isFinite(amount) || amount < 50 || amount > 5000) {
      showToast("error", t("water.invalidAmount"));
      return;
    }
    setCustom("");
    await add(amount);
  };

  const saveTarget = async () => {
    const value = Number(targetInput);
    if (!Number.isFinite(value) || value < 200 || value > 10000) {
      showToast("error", t("water.invalidAmount"));
      return;
    }
    try {
      await trackerApi.water.setTarget(value);
      showToast("success", t("water.saved"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const remove = async (id: string) => {
    try {
      await trackerApi.water.remove(id);
      showToast("success", t("water.removed"));
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

  const ratio = today && today.targetMl > 0 ? today.amountMl / today.targetMl : 0;
  const liters = today ? (today.amountMl / 1000).toFixed(1) : "0.0";

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <BackToDashboard />
          <PageHeader icon="💧" titleKey="water.title" subtitleKey="water.subtitle" />

          <TrackerGrid>
            <Card className="flex flex-col items-center gap-3">
              <CardTitle>{t("water.today")}</CardTitle>
              <ProgressRing value={today?.amountMl ?? 0} max={today?.targetMl ?? 1} label={`${liters} L`} color="stroke-sky-500" />
              <div className="flex items-center gap-2">
                <StatCard label={t("water.current")} value={`${today?.amountMl ?? 0} ${t("water.units")}`} />
                <StatCard label={t("water.target")} value={`${today?.targetMl ?? 0} ${t("water.units")}`} accent />
              </div>
              {today && today.amountMl > 0 && today.amountMl >= today.targetMl ? <p className="text-sm font-medium text-emerald-500">✓ {t("water.target")}</p> : null}
            </Card>

            <Card>
              <CardTitle>{t("water.log")}</CardTitle>
              <div className="grid grid-cols-3 gap-2">
                {QUICK.map((q) => (
                  <Button key={q} variant="secondary" disabled={busy} onClick={() => void add(q)}>
                    {tAny(`water.add${q}`)}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input type="number" min={50} max={5000} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t("water.customAmountLabel")} aria-label={t("water.customAmountLabel")} />
                <Button disabled={busy || !custom} onClick={() => void addCustom()}>
                  {t("water.log")}
                </Button>
              </div>
              <div className="mt-6 flex gap-2">
                <Input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} label={t("water.targetLabel")} hint={t("water.targetHint")} />
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => void saveTarget()}>
                    {t("common.save")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>{t("water.week")}</CardTitle>
              <WeekChart
                days={(week?.days ?? []).map((d) => ({ date: d.date, value: d.amountMl }))}
                label={(v) => `${v} ml`}
                dayLabel={(d) => weekdayLabel(d, t("reminders.daysShort") as unknown as string[])}
              />
              <div className="mt-3 flex justify-between text-xs text-text-muted">
                <span>{t("water.totalLabel")}: {week?.totalMl ?? 0} ml</span>
                <span>{t("wellness.streak")}: {week?.streak ?? 0} {t("wellness.streakDays", { count: week?.streak ?? 0 })}</span>
              </div>
            </Card>
          </TrackerGrid>

          <Card>
            <CardTitle>{t("water.history")}</CardTitle>
            {!today || today.entries.length === 0 ? (
              <EmptyState title={t("water.emptyTitle")} text={t("water.emptyText")} />
            ) : (
              <ul className="flex flex-col gap-2">
                {today.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3 text-sm">
                    <span className="font-medium text-text">
                      +{e.amountMl} {t("water.units")}
                      {e.source === "bot" ? " · 🤖" : e.source === "miniapp" ? " · 📱" : ""}
                    </span>
                    <span className="text-xs text-text-muted">{new Date(e.createdAt).toLocaleTimeString()}</span>
                    <Button variant="ghost" size="sm" onClick={() => void remove(e.id)}>
                      {t("common.delete")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="text-xs text-text-muted">👤 {user?.name}</p>
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}