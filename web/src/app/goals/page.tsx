"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Feedback";
import { trackerApi } from "@/features/tracker/api";
import { PageHeader, Card, BackToDashboard } from "@/features/tracker/components/PageHeader";
import type { Goal } from "@app/shared";

export default function GoalsPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await trackerApi.goals.list();
      setGoals(data.goals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "goals.changed") void load();
  }, [lastEvent, load]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setTargetValue("");
    setUnit("");
    setDeadline("");
    setProgress("0");
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setTargetValue(goal.targetValue !== null ? String(goal.targetValue) : "");
    setUnit(goal.unit ?? "");
    setDeadline(goal.deadline ?? "");
    setProgress(String(goal.progress));
    setFormOpen(true);
  };

  const submit = async () => {
    if (!title.trim()) {
      showToast("error", t("auth.validationRequired"));
      return;
    }
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        targetValue: targetValue ? Number(targetValue) : null,
        unit: unit.trim() || null,
        deadline: deadline || null,
        progress: Number(progress) || 0,
      };
      if (editing) {
        await trackerApi.goals.update(editing.id, body);
      } else {
        await trackerApi.goals.create(body);
      }
      showToast("success", t("goals.saved"));
      setFormOpen(false);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (goal: Goal, status: "completed" | "active") => {
    try {
      await trackerApi.goals.update(goal.id, { status });
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await trackerApi.goals.remove(deleteTarget.id);
      showToast("success", t("goals.deleted"));
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

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <ProtectedRoute>
          <BackToDashboard />
          <div className="flex items-start justify-between gap-4">
            <PageHeader icon="🎯" titleKey="goals.title" subtitleKey="goals.subtitle" />
            <Button onClick={openCreate}>+ {t("goals.createGoal")}</Button>
          </div>

          {goals.length === 0 ? (
            <Card>
              <EmptyState title={t("goals.emptyTitle")} text={t("goals.emptyText")} action={t("goals.createFirst")} onAction={openCreate} />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((goal) => {
                  const pct = goal.targetValue ? Math.min(100, Math.round((goal.progress / goal.targetValue) * 100)) : 0;
                  return (
                    <article key={goal.id} className="glass flex flex-col gap-3 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-text">{goal.title}</h3>
                          {goal.description ? <p className="mt-0.5 text-sm text-text-muted">{goal.description}</p> : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-primary-500/15 px-2.5 py-0.5 text-[11px] font-medium text-primary-500">
                          {t("goals.statusActive")}
                        </span>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-text-muted">
                          <span>
                            {goal.targetValue !== null
                              ? t("goals.progressValue", { value: goal.progress, target: goal.targetValue, unit: goal.unit ?? "" })
                              : t("goals.progress")}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-border">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {goal.deadline ? <p className="text-xs text-text-muted">📅 {goal.deadline}</p> : null}
                      <div className="mt-auto flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void setStatus(goal, "completed")}>
                          {t("goals.markCompleted")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}>
                          {t("common.edit")}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(goal)}>
                          {t("common.delete")}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {completed.length > 0 ? (
                <Card>
                  <h2 className="mb-3 font-display text-base font-semibold text-text">{t("goals.statusCompleted")}</h2>
                  <ul className="flex flex-col gap-2">
                    {completed.map((goal) => (
                      <li key={goal.id} className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3 text-sm">
                        <span className="font-medium text-text">✓ {goal.title}</span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => void setStatus(goal, "active")}>
                            {t("goals.reopen")}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(goal)}>
                            {t("common.delete")}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </>
          )}
        </ProtectedRoute>
      </div>
      </AppShell>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t("goals.editGoal") : t("goals.createGoal")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input label={t("goals.goalTitle")} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label={t("goals.description")} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Input type="number" label={t("goals.targetValue")} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            <Input label={t("goals.unit")} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km / kg / ml" />
          </div>
          <div className="flex gap-2">
            <Input type="date" label={t("goals.deadline")} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <Input type="number" label={t("goals.progress")} value={progress} onChange={(e) => setProgress(e.target.value)} />
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("goals.deleted")}>
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