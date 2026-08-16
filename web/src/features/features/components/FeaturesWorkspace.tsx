"use client";

import { useCallback, useEffect, useState } from "react";
import type { Feature } from "@app/shared";
import { featuresApi } from "../api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { LoadingSpinner } from "@/lib/auth";

export function FeatureForm({
  open,
  onClose,
  feature,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  feature: Feature | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(feature?.title ?? "");
      setDescription(feature?.description ?? "");
      setError(null);
    }
  }, [open, feature]);

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError(t("auth.validationRequired"));
      return;
    }
    setSaving(true);
    try {
      if (feature) {
        await featuresApi.update(feature.id, { title: title.trim(), description: description.trim() || null });
        showToast("success", t("features.updated"));
      } else {
        await featuresApi.create({ title: title.trim(), description: description.trim() || null });
        showToast("success", t("features.created"));
      }
      onSaved();
      onClose();
    } catch {
      setError(t("errors.internal"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={feature ? t("features.editFeature") : t("features.createFeature")}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input label={t("features.featureTitle")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("features.featureTitlePlaceholder")} required />
        <Textarea label={t("features.description")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("features.descriptionPlaceholder")} rows={4} />
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function FeatureCard({ feature, onEdit, onDelete }: { feature: Feature; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <article className="glass flex flex-col gap-2 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-text">{feature.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            feature.status === "active"
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-surface-border/60 text-text-muted"
          }`}
        >
          {t(feature.status === "active" ? "features.statusActive" : "features.statusArchived")}
        </span>
      </div>
      {feature.description ? <p className="text-sm leading-relaxed text-text-muted">{feature.description}</p> : null}
      <p className="mt-auto text-xs text-text-muted/70">{t("common.updatedAt")}: {new Date(feature.updatedAt).toLocaleString()}</p>
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          {t("common.edit")}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          {t("common.delete")}
        </Button>
      </div>
    </article>
  );
}

export function FeaturesWorkspace() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const lastEvent = useRealtimeEvents();

  const [features, setFeatures] = useState<Feature[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feature | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await featuresApi.list();
      setFeatures(data.items);
      setTotal(data.total);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time: any platform (bot, mini app, another tab) changes features.
  useEffect(() => {
    if (lastEvent?.type === "features.changed") {
      void load();
    }
  }, [lastEvent, load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await featuresApi.remove(deleteTarget.id);
      showToast("success", t("features.deleted"));
      void load();
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label={t("common.loading")} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={t("errors.internal")} onRetry={() => { setLoading(true); void load(); }} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-text">{t("features.myFeatures")}</h2>
          <p className="text-sm text-text-muted">{total} · {user?.name}</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          + {t("features.createFeature")}
        </Button>
      </div>

      {features.length === 0 ? (
        <EmptyState
          title={t("features.emptyTitle")}
          text={t("features.emptyText")}
          action={t("features.createFirst")}
          onAction={() => { setEditing(null); setFormOpen(true); }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onEdit={() => { setEditing(feature); setFormOpen(true); }}
              onDelete={() => setDeleteTarget(feature)}
            />
          ))}
        </div>
      )}

      <FeatureForm open={formOpen} onClose={() => setFormOpen(false)} feature={editing} onSaved={load} />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("features.deleteConfirmTitle")}
      >
        <p className="text-sm text-text-muted">{t("features.deleteConfirmText")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}