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
import { EmptyState } from "@/components/ui/Feedback";
import { trackerApi, type WorkoutWeek } from "@/features/tracker/api";
import { PageHeader, Card, CardTitle, TrackerGrid, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { StatCard } from "@/features/tracker/components/StatCard";
import { WeekChart, weekdayLabel } from "@/features/tracker/components/WeekChart";
import type { Paginated, Workout, WorkoutCategory } from "@app/shared";
import { WORKOUT_CATEGORIES } from "@app/shared";

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
}

export default function WorkoutsPage() {
  const { t, tAny } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [data, setData] = useState<Paginated<Workout> | null>(null);
  const [week, setWeek] = useState<WorkoutWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);

  const [category, setCategory] = useState<WorkoutCategory>("cardio");
  const [duration, setDuration] = useState("30");
  const [intensity, setIntensity] = useState("moderate");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, w] = await Promise.all([trackerApi.workouts.list(), trackerApi.workouts.week()]);
      setData(list);
      setWeek(w);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "workout.changed" || lastEvent?.type === "wellness.changed") void load();
  }, [lastEvent, load]);

  const openForm = () => {
    setCategory("cardio");
    setDuration("30");
    setIntensity("moderate");
    setNotes("");
    setExercises([]);
    setFormOpen(true);
  };

  const submit = async () => {
    const durationValue = Number(duration);
    if (!Number.isFinite(durationValue) || durationValue < 1 || durationValue > 600) {
      showToast("error", t("workouts.invalidDuration"));
      return;
    }
    setBusy(true);
    try {
      await trackerApi.workouts.create({
        category,
        durationMinutes: durationValue,
        intensity,
        notes: notes.trim() || null,
        exercises: exercises.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), sets: Number(e.sets) || 1, reps: Number(e.reps) || undefined })),
      });
      showToast("success", t("workouts.saved"));
      setFormOpen(false);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await trackerApi.workouts.remove(deleteTarget.id);
      showToast("success", t("workouts.deleted"));
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setDeleteTarget(null);
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
          <PageHeader icon="🏋️" titleKey="workouts.title" subtitleKey="workouts.subtitle" />

          <div className="flex items-center justify-between">
            <TrackerGrid className="!grid-cols-3 w-full">
              <StatCard icon="🏃" label={t("workouts.count")} value={`${data?.total ?? 0}`} />
              <StatCard icon="⏱" label={t("workouts.totalMinutes")} value={`${week?.totalMinutes ?? 0} ${t("workouts.minutes")}`} accent />
              <div className="flex items-end justify-end">
                <Button onClick={openForm}>+ {t("workouts.createWorkout")}</Button>
              </div>
            </TrackerGrid>
          </div>

          <Card>
            <CardTitle>{t("workouts.week")}</CardTitle>
            <WeekChart
              days={(week?.days ?? []).map((d) => ({ date: d.date, value: d.minutes }))}
              label={(v) => `${v} ${t("workouts.minutes")}`}
              dayLabel={(d) => weekdayLabel(d, t("reminders.daysShort") as unknown as string[])}
            />
          </Card>

          <Card>
            <CardTitle>{t("features.myFeatures")}</CardTitle>
            {!data || data.items.length === 0 ? (
              <EmptyState title={t("workouts.emptyTitle")} text={t("workouts.emptyText")} action={t("workouts.createWorkout")} onAction={openForm} />
            ) : (
              <ul className="flex flex-col gap-2">
                {data.items.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {tAny(`workouts.categories.${w.category}`)} · {w.durationMinutes} {t("workouts.minutes")}
                        {w.intensity ? ` · ${tAny(`workouts.intensities.${w.intensity}`)}` : ""}
                      </p>
                      {w.notes ? <p className="truncate text-sm text-text-muted">{w.notes}</p> : null}
                      {w.exercises.length > 0 ? (
                        <p className="mt-1 text-xs text-text-muted">
                          {w.exercises.map((e) => `${e.name} ${e.sets}Г—${e.reps ?? "—"}`).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-text-muted">{w.date}</span>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(w)}>
                        {t("common.delete")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </ProtectedRoute>
      </div>
      </AppShell>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t("workouts.createWorkout")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-wrap gap-2">
            {WORKOUT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  category === c ? "bg-primary-500 text-white" : "bg-surface-raised text-text-muted hover:text-text"
                }`}
              >
                {tAny(`workouts.categories.${c}`)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} label={t("workouts.duration")} />
            <div className="flex-1">
              <span className="text-sm font-medium text-text">{t("workouts.intensity")}</span>
              <div className="mt-1.5 flex gap-2">
                {(["low", "moderate", "high"] as const).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIntensity(i)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${
                      intensity === i ? "bg-primary-500 text-white" : "bg-surface-raised text-text-muted hover:text-text"
                    }`}
                  >
                    {tAny(`workouts.intensities.${i}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} label={t("workouts.notes")} />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text">{t("workouts.exercises")}</span>
            {exercises.map((ex, idx) => (
              <div key={idx} className="flex gap-2">
                <Input placeholder={t("workouts.exerciseName")} value={ex.name} onChange={(e) => setExercises(exercises.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                <Input type="number" placeholder={t("workouts.sets")} className="!w-20" value={ex.sets} onChange={(e) => setExercises(exercises.map((x, i) => (i === idx ? { ...x, sets: e.target.value } : x)))} />
                <Input type="number" placeholder={t("workouts.reps")} className="!w-20" value={ex.reps} onChange={(e) => setExercises(exercises.map((x, i) => (i === idx ? { ...x, reps: e.target.value } : x)))} />
              </div>
            ))}
            <Button variant="secondary" size="sm" type="button" onClick={() => setExercises([...exercises, { name: "", sets: "3", reps: "10" }])}>
              + {t("workouts.addExercise")}
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={busy}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("workouts.deleted")}>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </>
  );
}