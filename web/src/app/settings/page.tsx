"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackerApi } from "@/features/tracker/api";
import { profileApi } from "@/features/profile/api";
import { PageHeader, Card, CardTitle, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export default function SettingsPage() {
  const { t } = useI18n();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waterTarget, setWaterTarget] = useState("2200");
  const [sleepGoal, setSleepGoal] = useState("480");
  const [stepsGoal, setStepsGoal] = useState("8000");
  const [workoutGoal, setWorkoutGoal] = useState("30");
  const [notifications, setNotifications] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await profileApi.get();
      const profile = data.profile;
      setWaterTarget(String(profile?.waterTargetMl ?? 2200));
      setSleepGoal(String(profile?.sleepGoalMinutes ?? 480));
      setStepsGoal(String(profile?.activityStepsGoal ?? 8000));
      setWorkoutGoal(String(profile?.workoutGoalMinutes ?? 30));
      setNotifications(profile?.notificationsEnabled ?? true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await trackerApi.profileTargets.update({
        waterTargetMl: Number(waterTarget) || 2200,
        sleepGoalMinutes: Number(sleepGoal) || 480,
        activityStepsGoal: Number(stepsGoal) || 8000,
        workoutGoalMinutes: Number(workoutGoal) || 30,
        notificationsEnabled: notifications,
      });
      showToast("success", t("settings.saved"));
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setSaving(false);
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
          <PageHeader icon="⚙️" titleKey="settings.title" subtitleKey="settings.subtitle" />

          <Card>
            <CardTitle>{t("settings.targets")}</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="number" label={t("settings.waterTarget")} value={waterTarget} onChange={(e) => setWaterTarget(e.target.value)} />
              <Input type="number" label={t("settings.sleepGoal")} value={sleepGoal} onChange={(e) => setSleepGoal(e.target.value)} />
              <Input type="number" label={t("settings.stepsGoal")} value={stepsGoal} onChange={(e) => setStepsGoal(e.target.value)} />
              <Input type="number" label={t("settings.workoutGoal")} value={workoutGoal} onChange={(e) => setWorkoutGoal(e.target.value)} />
            </div>
          </Card>

          <Card>
            <CardTitle>{t("settings.notifications")}</CardTitle>
            <p className="-mt-2 mb-3 text-xs text-text-muted">{t("settings.notificationsHint")}</p>
            <button
              onClick={() => setNotifications(!notifications)}
              role="switch"
              aria-checked={notifications}
              className={`relative h-7 w-12 rounded-full transition-colors ${notifications ? "bg-emerald-500" : "bg-surface-border"}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${notifications ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </Card>

          <Card>
            <CardTitle>{t("settings.appearance")}</CardTitle>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="mb-2 block text-sm font-medium text-text">{t("settings.language")}</span>
                <LanguageSwitcher />
              </div>
              <ThemeSwitcher />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => void save()} loading={saving}>
              {t("common.save")}
            </Button>
          </div>
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}