"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { trackerApi } from "@/features/tracker/api";
import { BackToDashboard } from "@/features/tracker/components/PageHeader";
import type { Habit } from "@app/shared";

const ICON_CHOICES = ["💧", "🏃", "😴", "📖", "🧘", "🥗", "🚭", "💊", "🎯", "🌅"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function HabitsPage() {
  const { t, tAny } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [calendar, setCalendar] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💧");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [reminderTime, setReminderTime] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const data = await trackerApi.habits.list();
      setHabits(data.habits);
      const calendars = await Promise.all(
        data.habits.map(async (habit) => {
          try {
            const cal = await trackerApi.habits.calendar(habit.id);
            return [habit.id, cal.dates] as const;
          } catch {
            return [habit.id, []] as const;
          }
        }),
      );
      setCalendar(Object.fromEntries(calendars));
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "habits.changed") void load();
  }, [lastEvent, load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setIcon("💧");
    setFrequency("daily");
    setReminderTime("");
    setFormOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setName(habit.name);
    setIcon(habit.icon);
    setFrequency(habit.frequency);
    setReminderTime(habit.reminderTime ?? "");
    setFormOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      showToast("error", t("auth.validationRequired"));
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await trackerApi.habits.update(editing.id, { name: name.trim(), icon, frequency, reminderTime: reminderTime || null });
      } else {
        await trackerApi.habits.create({ name: name.trim(), icon, frequency, reminderTime: reminderTime || null });
      }
      showToast("success", t("habits.saved"));
      setFormOpen(false);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (habit: Habit) => {
    try {
      await trackerApi.habits.toggle(habit.id);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await trackerApi.habits.remove(deleteTarget.id);
      showToast("success", t("habits.deleted"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setDeleteTarget(null);
    }
  };

  const week = useCallback(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-64 max-w-6xl items-center justify-center px-4 py-12">
          <ProtectedRoute>
            <LoadingSpinner />
          </ProtectedRoute>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <BackToDashboard />

          <div className="relative overflow-hidden rounded-3xl border border-surface-border/60 bg-gradient-to-br from-primary-500/10 via-transparent to-accent-500/10 p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-500/20 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent-500/15 blur-3xl" aria-hidden />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-400">{t("nav.dashboard")}</p>
                <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-text sm:text-4xl">
                  ODAT<span className="text-gradient">LAR</span>
                </h1>
                <p className="mt-2 max-w-md text-sm text-text-muted">{t("habits.subtitle")}</p>
              </div>
              <Button onClick={openCreate} className="btn-glow bg-gradient-to-r from-primary-500 to-accent-500">
                + {t("habits.createHabit")}
              </Button>
            </div>
          </div>

          {loadFailed ? (
            <div className="glass flex flex-col items-center gap-4 rounded-2xl p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-2xl" aria-hidden>
                ⚠️
              </span>
              <p className="text-sm text-text-muted">{t("errors.loadFailed")}</p>
              <Button variant="secondary" onClick={() => void load()}>
                ↻ {t("common.retry")}
              </Button>
            </div>
          ) : habits.length === 0 ? (
            <div className="glass relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl p-12 text-center sm:p-16">
              <div className="pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 blur-3xl" aria-hidden />
              <div className="animate-float-slow relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-4xl text-white shadow-glow" aria-hidden>
                ✨
              </div>
              <div className="relative">
                <h2 className="font-display text-2xl font-bold text-text">{t("habits.emptyTitle")}</h2>
                <p className="mt-2 text-sm text-text-muted">{t("habits.emptyText")}</p>
              </div>
              <Button onClick={openCreate} className="btn-glow bg-gradient-to-r from-primary-500 to-accent-500">
                + {t("habits.createFirst")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {habits.map((habit) => {
                const doneSet = new Set(calendar[habit.id] ?? []);
                const weekDone = week().map((d) => doneSet.has(d.toISOString().slice(0, 10)));
                const lastDone = [...(calendar[habit.id] ?? [])].sort().at(-1);
                return (
                  <article
                    key={habit.id}
                    className="glass relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-sm"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary-500/10 blur-2xl" aria-hidden />
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/25 to-accent-500/25 text-2xl ring-1 ring-primary-500/30" aria-hidden>
                        {habit.icon}
                      </span>
                      {habit.doneToday ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                          ✓ {t("habits.doneToday")}
                        </span>
                      ) : (
                        <button
                          onClick={() => void toggle(habit)}
                          className="rounded-full bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          {t("habits.toggleDone")}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <h3 className="font-display text-lg font-semibold text-text">{habit.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-text-muted">
                        <span className="rounded-full bg-surface-raised px-2.5 py-1">
                          {t("habits.streak")} {habit.currentStreak} 🔥
                        </span>
                        <span className="rounded-full bg-surface-raised px-2.5 py-1">
                          {t("habits.totalCompletions")}: {habit.totalCompletions}
                        </span>
                        {habit.reminderTime ? <span className="rounded-full bg-surface-raised px-2.5 py-1">⏰ {habit.reminderTime}</span> : null}
                      </div>
                      {lastDone ? (
                        <p className="mt-3 text-xs text-text-muted">{t("habits.lastCompleted", { date: formatDate(lastDone) })}</p>
                      ) : (
                        <p className="mt-3 text-xs text-text-muted">{t("habits.lastCompleted", { date: "—" })}</p>
                      )}
                    </div>
                    <div className="relative flex items-center justify-between rounded-xl bg-surface-raised/60 px-3 py-2.5">
                      {week().map((d, i) => (
                        <span key={d.toISOString()} className="flex flex-col items-center gap-1" title={d.toDateString()}>
                          <span className="text-[10px] font-medium uppercase text-text-muted">{tAny(`reminders.daysShort.${i}`)}</span>
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                              weekDone[i] ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow-sm" : "bg-surface-border/50 text-text-muted"
                            }`}
                          >
                            {weekDone[i] ? "✓" : "·"}
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="relative mt-auto flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(habit)}>
                        {t("common.edit")}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(habit)}>
                        {t("common.delete")}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ProtectedRoute>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t("habits.editHabit") : t("habits.createHabit")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input label={t("habits.name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("habits.emptyText")} required />
          <div className="flex flex-wrap gap-2">
            {ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
                  icon === ic ? "bg-primary-500 text-white" : "bg-surface-raised"
                }`}
                aria-label={ic}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFrequency("daily")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                frequency === "daily" ? "bg-primary-500 text-white" : "bg-surface-raised text-text-muted hover:text-text"
              }`}
            >
              {t("habits.frequencyDaily")}
            </button>
            <button
              type="button"
              onClick={() => setFrequency("weekly")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                frequency === "weekly" ? "bg-primary-500 text-white" : "bg-surface-raised text-text-muted hover:text-text"
              }`}
            >
              {t("habits.frequencyWeekly")}
            </button>
          </div>
          <Input type="time" label={t("habits.reminderTime")} value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={busy}>
              {t("habits.add")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("habits.confirmDelete")}>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}