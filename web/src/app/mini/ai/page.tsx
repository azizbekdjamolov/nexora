"use client";

import { useI18n } from "@/lib/i18n";
import { MiniShell } from "@/features/miniapp/components/MiniShell";
import { AIChat } from "@/features/ai/components/AIChat";

export default function MiniAIPage() {
  const { tAny } = useI18n();
  return (
    <MiniShell>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text">✦ {tAny("miniapp.aiHint")}</p>
        <AIChat />
      </div>
    </MiniShell>
  );
}