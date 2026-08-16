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
import type { Reminder } from "@app/shared";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function MedicationsPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();
  const daysShort = t("reminders.daysShort") as unknown as string[];

  const [medications, setMedications] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<number[]>(DAYS);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await trackerApi.medications.list();
      setMedications(data.medications);
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

  const submit = async () => {
    if (!title.trim() || !/^\d{2}:\d{2}$/.test(time)) {
      showToast("error", t("errors.invalidInput"));
      return;
    }
    setBusy(true);
    try {
      await trackerApi.medications.create({ title: title.trim(), time, days });
      showToast("success", t("reminders.saved"));
      setFormOpen(false);
      setTitle("");
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
      await trackerApi.medications.remove(deleteTarget.id);
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
            <PageHeader icon="💊" titleKey="medications.title" subtitleKey="medications.subtitle" />
            <Button onClick={() => setFormOpen(true)}>+ {t("medications.addMedication")}</Button>
          </div>

          <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-500">{t("medications.safetyNote")}</p>

          {medications.length === 0 ? (
            <Card>
              <EmptyState title={t("medications.emptyTitle")} text={t("medications.emptyText")} action={t("medications.addMedication")} onAction={() => setFormOpen(true)} />
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {medications.map((medication) => (
                <li key={medication.id} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-lg" aria-hidden>
                      💊
                    </span>
                    <div>
                      <p className={`font-medium text-text ${medication.enabled ? "" : "line-through opacity-60"}`}>{medication.title}</p>
                      <p className="text-xs text-text-muted">
                        {medication.time} · {medication.days.length === 7 ? t("reminders.days") : medication.days.map((d) => daysShort[d]).join(", ")}
                      </p>
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(medication)}>
                    {t("common.delete")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ProtectedRoute>
      </div>
      </AppShell>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t("medications.addMedication")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input label={t("reminders.titleField")} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Vitamin D" />
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