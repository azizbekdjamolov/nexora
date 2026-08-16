"use client";

import { useI18n } from "@/lib/i18n";
import { ProtectedRoute } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { AIChat } from "@/features/ai/components/AIChat";

export default function AIPage() {
  const { t } = useI18n();

  return (
    <>
      <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <ProtectedRoute>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-bold text-text">{t("ai.title")}</h1>
            <p className="text-text-muted">{t("ai.subtitle")}</p>
          </div>
          <AIChat />
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}