"use client";

import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { ChatMessageView } from "../types";
import { AILoading } from "./AILoading";

export function AIMessage({ message }: { message: ChatMessageView }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const isUser = message.role === "user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      showToast("success", t("ai.messageCopied"));
    } catch {
      // clipboard unavailable
    }
  };

  if (message.pending) {
    return (
      <div className="flex justify-start">
        <div className="glass flex items-center gap-3 rounded-2xl rounded-tl-sm px-4 py-3">
          <AILoading />
          <span className="text-xs text-text-muted">{t("ai.thinking")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-primary-600 to-accent-600 text-white"
            : "glass rounded-tl-sm text-text"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && message.content ? (
          <button
            onClick={() => void copy()}
            aria-label={t("ai.copyMessage")}
            title={t("ai.copyMessage")}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-text-muted/70 opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
          >
            {t("common.copy")}
          </button>
        ) : null}
      </div>
    </div>
  );
}