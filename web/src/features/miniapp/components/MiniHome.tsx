"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { useHaptic } from "@/lib/telegram";
import { Button } from "@/components/ui/Button";
import { trackerApi } from "@/features/tracker/api";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";
import type { WellnessToday } from "@app/shared";

const QUICK = [250, 500, 750];

/** Mini App Home: wellness score, streak and quick water logging. */
export function MiniHome() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const lastEvent = useRealtimeEvents();

  const [today, setToday] = useState<WellnessToday | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setToday(await trackerApi.wellness.today());
    } catch {
      // auth gate handles it
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "water.changed" || lastEvent?.type === "wellness.changed" || lastEvent?.type === "habits.changed") void load();
  }, [lastEvent, load]);

  const addWater = async (amountMl: number) => {
    setBusy(true);
    haptic("light");
    try {
      await trackerApi.water.add(amountMl, "miniapp");
      showToast("success", t("water.added"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const parts = today?.scoreParts;
  const liters = today ? (today.water.amountMl / 1000).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col gap-4">
      <section className="glass flex items-center gap-4 rounded-2xl p-5">
        <ProgressRing value={today?.score ?? 0} max={100} size={96} stroke={9} label={`${today?.score ?? 0}`} color="stroke-primary-500" />
        <div className="flex flex-col gap-1">
          <p className="font-display text-base font-bold text-text">{t("miniapp.score")}</p>
          <p className="text-sm text-text-muted">
            🔥 {t("dashboard.streakLabel")}: {today?.streak ?? 0}
          </p>
          <p className="text-xs text-text-muted">{t("miniapp.today")}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {[
          { label: t("miniapp.water"), value: parts?.water ?? 0, icon: "💧" },
          { label: t("miniapp.sleep"), value: parts?.sleep ?? 0, icon: "😴" },
          { label: t("miniapp.activity"), value: parts?.activity ?? 0, icon: "🚶" },
          { label: t("miniapp.habits"), value: parts?.habits ?? 0, icon: "✅" },
        ].map((p) => (
          <div key={p.label} className="glass flex items-center gap-2 rounded-2xl px-4 py-3">
            <span aria-hidden>{p.icon}</span>
            <div>
              <p className="font-display text-lg font-bold text-text">{p.value}</p>
              <p className="text-xs text-text-muted">{p.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-text">{t("miniapp.water")}</p>
          <p className="text-xs text-text-muted">
            {liters} / {(today?.water.targetMl ?? 2200) / 1000} L
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map((q) => (
            <Button key={q} variant="secondary" size="sm" disabled={busy} onClick={() => void addWater(q)}>
              +{q}
            </Button>
          ))}
        </div>
      </section>

      <Link href="/mini/track" className="glass flex items-center justify-between rounded-2xl px-5 py-4">
        <span className="text-sm font-medium text-text">{t("miniapp.navTrack")} →</span>
        <span className="text-text-muted" aria-hidden>
          💧
        </span>
      </Link>
      <Link href="/mini/ai" className="glass flex items-center justify-between rounded-2xl px-5 py-4">
        <span className="text-sm font-medium text-text">✦ {t("miniapp.aiHint")} →</span>
        <span className="text-text-muted" aria-hidden>
          🧠
        </span>
      </Link>
    </div>
  );
}