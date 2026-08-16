"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { aiApi } from "../api";
import { useAIChat } from "../hooks/useAIChat";
import { useAIConversations } from "../hooks/useAIConversations";
import { AIMessage } from "./AIMessage";
import { AIInput } from "./AIInput";
import { AIError } from "./AIError";
import { AIConversationList } from "./AIConversationList";
import { AIUsageBar } from "./AIUsageBar";
import type { AIUsageSummary } from "@app/shared";

/**
 * Full AI chat experience: conversation list, message bubbles, loading,
 * error/retry, clear, new conversation. Talks to the backend only —
 * the configured provider is called server-side.
 */
export function AIChat() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();

  const { conversations, refresh, remove } = useAIConversations();
  const chat = useAIChat(() => void refresh());
  const [info, setInfo] = useState<{ provider: string; model: string; configured: boolean } | null>(null);
  const [usage, setUsage] = useState<AIUsageSummary | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void aiApi.info().then(setInfo).catch(() => undefined);
    void aiApi.usage().then(setUsage).catch(() => undefined);
  }, []);

  useEffect(() => {
    void aiApi.usage().then(setUsage).catch(() => undefined);
  }, [chat.messages.length, chat.activeConversationId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.sending]);

  const hasFailed = chat.messages.some((m) => m.failed);

  const handleClear = async () => {
    await chat.clear();
    setClearOpen(false);
    showToast("success", t("ai.cleared"));
    void refresh();
  };

  const handleNewChat = () => {
    chat.newChat();
    setSidebarOpen(false);
  };

  const handleSelect = (id: string) => {
    void chat.loadConversation(id);
    setSidebarOpen(false);
  };

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-surface-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-sm text-white" aria-hidden>
            ✦
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-text">{t("ai.title")}</h2>
            <p className="hidden truncate text-xs text-text-muted sm:block">{t("ai.subtitle")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            {t("ai.conversations")}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNewChat}>
            + {t("ai.newChat")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClearOpen(true)}
            disabled={chat.messages.length === 0}
            title={t("ai.clearConversation")}
          >
            {t("ai.clearConversation")}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 border-r border-surface-border/60 p-2 lg:block">
          <AIConversationList
            conversations={conversations}
            activeId={chat.activeConversationId}
            loading={false}
            onSelect={handleSelect}
            onDelete={remove}
          />
        </aside>

        {/* Sidebar (mobile drawer) */}
        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div
              className="glass flex w-72 flex-col rounded-r-2xl p-3"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="mb-2 flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold text-text">{t("ai.conversations")}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                  ✕
                </Button>
              </div>
              <AIConversationList
                conversations={conversations}
                activeId={chat.activeConversationId}
                loading={false}
                onSelect={handleSelect}
                onDelete={remove}
              />
            </div>
          </div>
        ) : null}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="flex h-[52vh] flex-col gap-4 overflow-y-auto px-4 py-4 sm:h-[56vh]">
            {chat.messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 text-2xl" aria-hidden>
                  ✦
                </span>
                <h3 className="font-display text-lg font-bold text-text">
                  {t("ai.welcomeTitle", { name: user?.name?.split(" ")[0] ?? "" })}
                </h3>
                <p className="max-w-sm text-sm text-text-muted">{t("ai.welcomeText")}</p>
              </div>
            ) : (
              chat.messages.map((m) => <AIMessage key={m.id} message={m} />)
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-surface-border/60 p-3 sm:p-4">
            {chat.error && hasFailed ? (
              <AIError code={chat.error} onRetry={() => void chat.retry()} retrying={chat.sending} />
            ) : null}
            <AIInput onSend={(content) => void chat.send(content)} disabled={chat.sending} />
            <p className="px-1 text-[11px] text-text-muted/50">{t("ai.inputHint")}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border/60 px-4 py-2.5">
        <AIUsageBar usage={usage} info={info} />
      </div>

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title={t("ai.clearConfirmTitle")}>
        <p className="text-sm text-text-muted">{t("ai.clearConfirmText")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setClearOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={() => void handleClear()}>
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}