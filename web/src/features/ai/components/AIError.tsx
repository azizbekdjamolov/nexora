"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

/** Error banner shown when an AI request fails; supports retry. */
export function AIError({ code, onRetry, retrying }: { code: string; onRetry: () => void; retrying: boolean }) {
  const { t } = useI18n();
  const message =
    code === "aiRateLimit" || code === "rateLimited"
      ? t("errors.aiRateLimit")
      : code === "aiDisabled"
        ? t("errors.aiDisabled")
        : code === "conversationNotFound"
          ? t("errors.conversationNotFound")
          : t("ai.chatError");

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-red-500" aria-hidden>⚠</span>
        <div>
          <p className="text-sm font-medium text-red-500">{t("ai.errorTitle")}</p>
          <p className="text-xs text-red-500/80">{message}</p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying} className="shrink-0">
        {t("ai.retry")}
      </Button>
    </div>
  );
}