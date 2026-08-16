"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { useHaptic } from "@/lib/telegram";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackerApi, type SleepToday, type WaterToday } from "@/features/tracker/api";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";

/** Mini App Track: log water, sleep and steps in one screen. */
export function MiniTrack() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const lastEvent = useRealtimeEvents();

  const [water, setWater] = useState<WaterToday | null>(null);
  const [sleep, setSleep] = useState<SleepToday | null>(null);
  const [steps, setSteps] = useState("");
  const [customWater, setCustomWater] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([trackerApi.water.today(), trackerApi.sleep.today()]);
      setWater(w);
      setSleep(s);
    } catch {
      // auth gate handles it
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "water.changed" || lastEvent?.type === "sleep.changed" || lastEvent?.type === "activity.changed") void load();
  }, [lastEvent, load]);

  const addWater = async (amountMl: number) => {
    setBusy(true);
    haptic("light");
    try {
      await trackerApi.water.add(amountMl, "miniapp");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addCustomWater = async () => {
    const value = Number(customWater);
    if (!Number.isFinite(value) || value < 50 || value > 5000) {
      showToast("error", t("water.invalidAmount"));
      return;
    }
    setCustomWater("");
    await addWater(value);
  };

  const logSleep = async (minutes: number) => {
    setBusy(true);
    haptic("light");
    try {
      await trackerApi.sleep.log({ durationMinutes: minutes });
      showToast("success", t("sleep.logged"));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const logSteps = async () => {
    const value = Number(steps);
    if (!Number.isFinite(value) || value < 0 || value > 200000) {
      showToast("error", t("activity.invalidSteps"));
      return;
    }
    setBusy(true);
    haptic("light");
    try {
      await trackerApi.activity.log({ steps: value, activeMinutes: 0 });
      showToast("success", t("activity.logged"));
      setSteps("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="glass flex items-center gap-4 rounded-2xl p-5">
        <ProgressRing value={water?.amountMl ?? 0} max={water?.targetMl ?? 2200} size={84} stroke={8} label={`${(water?.amountMl ?? 0) / 1000}L`} color="stroke-sky-500" />
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm font-medium text-text">{t("miniapp.water")}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[250, 500, 750].map((q) => (
              <Button key={q} variant="secondary" size="sm" disabled={busy} onClick={() => void addWater(q)}>
                +{q}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm font-medium text-text">{t("miniapp.water")} — {t("water.custom")}</p>
        <div className="flex gap-2">
          <Input type="number" value={customWater} onChange={(e) => setCustomWater(e.target.value)} placeholder={t("water.customAmountLabel")} />
          <Button disabled={busy || !customWater} onClick={() => void addCustomWater()}>
            {t("water.log")}
          </Button>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm font-medium text-text">{t("miniapp.sleep")}</p>
        <p className="mb-3 text-xs text-text-muted">
          {sleep?.entry ? `${t("sleep.duration")}: ${sleep.entry.durationMinutes} ${t("sleep.minutesShort")}` : t("sleep.emptyTitle")}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {[6, 7, 8].map((h) => (
            <Button key={h} variant="secondary" size="sm" disabled={busy} onClick={() => void logSleep(h * 60)}>
              {t("bot.sleepDurationOption", { hours: h })}
            </Button>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm font-medium text-text">{t("miniapp.activity")}</p>
        <div className="flex gap-2">
          <Input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={t("activity.steps")} />
          <Button disabled={busy || !steps} onClick={() => void logSteps()}>
            {t("activity.log")}
          </Button>
        </div>
      </section>
    </div>
  );
}