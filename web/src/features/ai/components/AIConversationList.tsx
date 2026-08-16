"use client";

import type { AIConversationSummary } from "@app/shared";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function AIConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
  onDelete,
}: {
  conversations: AIConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AIConversationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      showToast("success", t("ai.deleted"));
      setDeleteTarget(null);
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {loading ? (
        <p className="px-3 py-2 text-xs text-text-muted">{t("common.loading")}</p>
      ) : conversations.length === 0 ? (
        <p className="px-3 py-2 text-xs text-text-muted">{t("ai.emptyTitle")}</p>
      ) : (
        conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-xl pr-1 transition-colors ${
                active ? "bg-surface-border/50" : "hover:bg-surface-border/30"
              }`}
            >
              <button
                onClick={() => onSelect(c.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left"
                aria-current={active ? "true" : undefined}
              >
                <p className={`truncate text-sm ${active ? "font-semibold text-text" : "text-text-muted"}`}>
                  {c.title}
                </p>
                <p className="text-[11px] text-text-muted/60">
                  {c.messageCount} · {new Date(c.updatedAt).toLocaleDateString()}
                </p>
              </button>
              <button
                onClick={() => setDeleteTarget(c)}
                aria-label={t("ai.deleteConversation")}
                className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted/60 transition-colors hover:bg-red-500/15 hover:text-red-500 group-hover:flex"
              >
                ✕
              </button>
            </div>
          );
        })
      )}

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("ai.deleteConfirmTitle")}>
        <p className="text-sm text-text-muted">{t("ai.deleteConfirmText")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}