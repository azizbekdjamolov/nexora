"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { useHaptic } from "@/lib/telegram";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackerApi } from "@/features/tracker/api";
import type { Goal, Habit } from "@app/shared";

/** Mini App Goals: habits (toggle) and goals (create/list). */
export function MiniGoals() {
  const { t, tAny } = useI18n();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const lastEvent = useRealtimeEvents();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, g] = await Promise.all([trackerApi.habits.list(), trackerApi.goals.list()]);
      setHabits(h.habits);
      setGoals(g.goals.filter((x) => x.status === "active"));
    } catch {
      // auth gate handles it
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "habits.changed" || lastEvent?.type === "goals.changed") void load();
  }, [lastEvent, load]);

  const toggleHabit = async (habit: Habit) => {
    haptic("light");
    try {
      await trackerApi.habits.toggle(habit.id);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const createGoal = async () => {
    if (!goalTitle.trim()) {
      showToast("error", t("auth.validationRequired"));
      return;
    }
    setBusy(true);
    try {
      await trackerApi.goals.create({
        title: goalTitle.trim(),
        targetValue: goalTarget ? Number(goalTarget) : null,
        unit: goalUnit.trim() || null,
      });
      showToast("success", t("goals.saved"));
      setGoalTitle("");
      setGoalTarget("");
      setGoalUnit("");
      setAdding(false);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm font-medium text-text">{t("miniapp.habits")}</p>
        {habits.length === 0 ? (
          <p className="text-xs text-text-muted">{t("habits.emptyTitle")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {habits.map((habit) => (
              <li key={habit.id}>
                <button
                  onClick={() => void toggleHabit(habit)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                    habit.doneToday ? "bg-emerald-500/15" : "bg-surface-raised"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm text-text">
                    <span aria-hidden>{habit.icon}</span>
                    {habit.name}
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${habit.doneToday ? "bg-emerald-500 text-white" : "bg-surface-border text-transparent"}`}>
                    ✓
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-text">{t("miniapp.navGoals")}</p>
          <Button variant="secondary" size="sm" onClick={() => setAdding(!adding)}>
            + {t("goals.createGoal")}
          </Button>
        </div>
        {adding ? (
          <div className="mb-3 flex flex-col gap-2 rounded-xl bg-surface-raised p-3">
            <Input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t("goals.goalTitle")} />
            <div className="flex gap-2">
              <Input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder={t("goals.targetValue")} />
              <Input value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} placeholder={t("goals.unit")} />
            </div>
            <Button size="sm" loading={busy} onClick={() => void createGoal()}>
              {t("common.save")}
            </Button>
          </div>
        ) : null}
        {goals.length === 0 ? (
          <p className="text-xs text-text-muted">{t("goals.emptyTitle")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.map((goal) => {
              const pct = goal.targetValue ? Math.min(100, Math.round((goal.progress / goal.targetValue) * 100)) : 0;
              return (
                <li key={goal.id} className="rounded-xl bg-surface-raised px-4 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-text">{goal.title}</span>
                    <span className="text-xs text-text-muted">
                      {goal.targetValue !== null ? tAny("goals.progressValue", { value: goal.progress, target: goal.targetValue, unit: goal.unit ?? "" }) : pct}
                      {goal.targetValue !== null ? "" : "%"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-border">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}