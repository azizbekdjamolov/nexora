"use client";

import type { AIUsageSummary } from "@app/shared";
import { useI18n } from "@/lib/i18n";

/** Provider / model / usage footer for the AI page. Never claims unlimited AI. */
export function AIUsageBar({ usage, info }: { usage: AIUsageSummary | null; info: { provider: string; model: string; configured: boolean } | null }) {
  const { t } = useI18n();

  const configured = info?.configured ?? usage?.configured ?? false;
  const provider = info?.provider ?? usage?.provider ?? "—";
  const model = info?.model ?? usage?.model ?? "—";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 pb-1 text-[11px] text-text-muted/70">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden />
        {configured ? t("ai.statusConfigured") : t("ai.statusNotConfigured")}
      </span>
      <span>
        {t("ai.providerLabel")}: <span className="text-text-muted">{provider}</span>
      </span>
      <span>
        {t("ai.modelLabel")}: <span className="text-text-muted">{model}</span>
      </span>
      <span>
        {usage && usage.requests > 0
          ? `${t("ai.usageRequests", { count: usage.requests })} · ${t("ai.usageTokens", { tokens: usage.tokens })}`
          : t("ai.usageNone")}
      </span>
    </div>
  );
}