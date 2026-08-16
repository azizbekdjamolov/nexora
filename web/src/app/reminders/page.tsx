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
import { trackerApi } from "@/features/tracker/api";
import { PageHeader, Card, BackToDashboard } from "@/features/tracker/components/PageHeader";
import type { Reminder, ReminderType } from "@app/shared";
import { REMINDER_TYPES } from "@app/shared";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function RemindersPage() {
  const { t, tAny } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();
  const daysShort = t("reminders.daysShort") as unknown as string[];

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [type, setType] = useState<ReminderType>("water");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<number[]>(DAYS);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await trackerApi.reminders.list();
      setReminders(data.reminders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "reminders.changed") void load();
  }, [lastEvent, load]);

  const openCreate = () => {
    setEditing(null);
    setType("water");
    setTitle("");
    setTime("09:00");
    setDays(DAYS);
    setFormOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditing(reminder);
    setType(reminder.type);
    setTitle(reminder.title);
    setTime(reminder.time);
    setDays(reminder.days);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!title.trim() || !/^\d{2}:\d{2}$/.test(time)) {
      showToast("error", t("errors.invalidInput"));
      return;
    }
    setBusy(true);
    try {
      const body = { type, title: title.trim(), time, days };
      if (editing) {
        await trackerApi.reminders.update(editing.id, body);
      } else {
        await trackerApi.reminders.create(body);
      }
      showToast("success", t("reminders.saved"));
      setFormOpen(false);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (reminder: Reminder) => {
    try {
      await trackerApi.reminders.toggle(reminder.id);
      await load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await trackerApi.reminders.remove(deleteTarget.id);
      showToast("success", t("reminders.deleted"));
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
          <div className="flex items-start justify-between gap-4">
            <PageHeader icon="🔔" titleKey="reminders.title" subtitleKey="reminders.subtitle" />
            <Button onClick={openCreate}>+ {t("reminders.createReminder")}</Button>
          </div>

          <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-500">{t("reminders.safetyNote")}</p>
          <p className="text-xs text-text-muted">{t("reminders.scheduleNote")}</p>

          {reminders.length === 0 ? (
            <Card>
              <EmptyState title={t("reminders.emptyTitle")} text={t("reminders.emptyText")} action={t("reminders.createReminder")} onAction={openCreate} />
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${reminder.enabled ? "bg-primary-500/15" : "bg-surface-border/50"}`} aria-hidden>
                      {reminder.type === "medication" ? "💊" : reminder.type === "water" ? "💧" : reminder.type === "workout" ? "🏃" : reminder.type === "sleep" ? "😴" : reminder.type === "habit" ? "✅" : "🔔"}
                    </span>
                    <div>
                      <p className={`font-medium text-text ${reminder.enabled ? "" : "line-through opacity-60"}`}>{reminder.title}</p>
                      <p className="text-xs text-text-muted">
                        {reminder.time} · {reminder.days.length === 7 ? t("reminders.days") : reminder.days.map((d) => daysShort[d]).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${reminder.enabled ? "bg-emerald-500/15 text-emerald-500" : "bg-surface-border/60 text-text-muted"}`}>
                      {t(reminder.enabled ? "reminders.enabled" : "reminders.disabled")}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => void toggle(reminder)}>
                      {t("reminders.toggle")}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(reminder)}>
                      {t("common.edit")}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(reminder)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ProtectedRoute>
      </div>
      </AppShell>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t("reminders.editReminder") : t("reminders.createReminder")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-wrap gap-2">
            {REMINDER_TYPES.map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => setType(rt)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${type === rt ? "bg-primary-500 text-white" : "bg-surface-raised text-text-muted hover:text-text"}`}
              >
                {tAny(`reminders.types.${rt}`)}
              </button>
            ))}
          </div>
          <Input label={t("reminders.titleField")} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input type="time" label={t("reminders.time")} value={time} onChange={(e) => setTime(e.target.value)} />
          <div>
            <span className="text-sm font-medium text-text">{t("reminders.days")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())}
                  className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${days.includes(d) ? "bg-primary-500 text-white" : "bg-surface-raised text-text-muted"}`}
                >
                  {daysShort[d]}
                </button>
              ))}
            </div>
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("reminders.confirmDelete")}>
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