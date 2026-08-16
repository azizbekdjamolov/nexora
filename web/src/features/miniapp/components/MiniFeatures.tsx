"use client";

import { useCallback, useEffect, useState } from "react";
import type { Feature } from "@app/shared";
import { featuresApi } from "@/features/features/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useRealtimeEvents } from "@/lib/events";
import { useHaptic } from "@/lib/telegram";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { LoadingSpinner } from "@/lib/auth";

export function MiniFeatures() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const lastEvent = useRealtimeEvents();

  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<{ mode: "create" } | { mode: "edit"; feature: Feature } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await featuresApi.list({ pageSize: 100 });
      setFeatures(data.items);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lastEvent?.type === "features.changed") void load();
  }, [lastEvent, load]);

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setSheet({ mode: "create" });
    haptic("light");
  };

  const openEdit = (feature: Feature) => {
    setTitle(feature.title);
    setDescription(feature.description ?? "");
    setSheet({ mode: "edit", feature });
    haptic("light");
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (sheet?.mode === "edit") {
        await featuresApi.update(sheet.feature.id, { title: title.trim(), description: description.trim() || null });
        showToast("success", t("features.updated"));
        haptic("success");
      } else {
        await featuresApi.create({ title: title.trim(), description: description.trim() || null });
        showToast("success", t("features.created"));
        haptic("success");
      }
      setSheet(null);
      void load();
    } catch {
      showToast("error", t("errors.internal"));
      haptic("error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (feature: Feature) => {
    haptic("medium");
    try {
      await featuresApi.remove(feature.id);
      showToast("success", t("features.deleted"));
      void load();
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-text">{t("miniapp.features")}</h2>
        <Button size="sm" onClick={openCreate}>
          + {t("miniapp.addFeature")}
        </Button>
      </div>

      {features.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
          <span className="text-3xl" aria-hidden>✦</span>
          <p className="text-sm font-medium text-text">{t("miniapp.emptyTitle")}</p>
          <p className="max-w-xs text-xs text-text-muted">{t("miniapp.emptyText")}</p>
          <Button size="sm" className="mt-2" onClick={openCreate}>
            {t("miniapp.addFeature")}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {features.map((feature) => (
            <li key={feature.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-text">{feature.title}</h3>
                  {feature.description ? <p className="mt-1 line-clamp-2 text-xs text-text-muted">{feature.description}</p> : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => openEdit(feature)}
                    className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-surface-border/50 px-2.5 text-xs font-medium text-text transition-colors active:scale-95"
                    aria-label={t("common.edit")}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    onClick={() => remove(feature)}
                    className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-red-500/15 px-2.5 text-xs font-medium text-red-500 transition-colors active:scale-95"
                    aria-label={t("common.delete")}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSheet(null)}>
          <div
            className="glass bottom-sheet-enter w-full max-w-md rounded-t-2xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border" aria-hidden />
            <h3 className="mb-4 font-display text-base font-semibold text-text">
              {sheet.mode === "edit" ? t("miniapp.editFeature") : t("miniapp.newFeature")}
            </h3>
            <div className="flex flex-col gap-3">
              <Input label={t("features.featureTitle")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("features.featureTitlePlaceholder")} />
              <Textarea label={t("features.description")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("features.descriptionPlaceholder")} rows={3} />
              <Button onClick={save} loading={saving} className="mt-1 w-full">
                {t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}