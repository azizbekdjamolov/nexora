"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "../api";
import type { ChatMessageView } from "../types";

export interface UseAIChatResult {
  messages: ChatMessageView[];
  sending: boolean;
  error: string | null;
  activeConversationId: string | null;
  send: (content: string) => Promise<void>;
  retry: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newChat: () => void;
  clear: () => Promise<void>;
}

let tempId = 0;
const nextId = (): string => `tmp-${Date.now()}-${tempId++}`;

/**
 * Chat state machine for the AI conversation view.
 * Every send goes to POST /api/ai/chat (server calls the configured AI
 * provider). Conversation ownership is enforced server-side.
 */
export function useAIChat(onConversationChange?: () => void): UseAIChatResult {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const lastFailedIndex = useRef<number | null>(null);

  const notify = useCallback(() => {
    onConversationChange?.();
  }, [onConversationChange]);

  const send = useCallback(
    async (content: string) => {
      const value = content.trim();
      if (!value || sending) return;
      setError(null);
      const userMsg: ChatMessageView = { id: nextId(), role: "user", content: value };
      const pending: ChatMessageView = { id: nextId(), role: "assistant", content: "", pending: true };
      lastFailedIndex.current = null;
      setMessages((prev) => [...prev, userMsg, pending]);
      setSending(true);
      try {
        const result = await aiApi.chat({
          conversationId: activeConversationId,
          content: value,
        });
        setActiveConversationId(result.conversation.id);
        setMessages((prev) => {
          const next = prev.filter((m) => m.id !== pending.id);
          return [
            ...next,
            { id: result.reply.id, role: "assistant", content: result.reply.content },
          ];
        });
        notify();
      } catch (err) {
        const code = err instanceof Error && "code" in err ? (err as { code: string }).code : "internal";
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === pending.id);
          if (idx >= 0) {
            lastFailedIndex.current = idx;
            const next = [...prev];
            next[idx] = { ...next[idx], pending: false, failed: true, content: "" };
            return next;
          }
          return prev;
        });
        setError(code);
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, sending, notify]
  );

  const retry = useCallback(async () => {
    const idx = lastFailedIndex.current;
    if (idx === null || idx < 0) return;
    const failed = messages[idx];
    const user = messages[idx - 1];
    if (!failed || !user) return;
    setError(null);
    setMessages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], pending: true, failed: false };
      return next;
    });
    setSending(true);
    try {
      const result = await aiApi.chat({
        conversationId: activeConversationId,
        content: user.content,
      });
      setActiveConversationId(result.conversation.id);
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== failed.id);
        return [
          ...next,
          { id: result.reply.id, role: "assistant", content: result.reply.content },
        ];
      });
      lastFailedIndex.current = null;
      notify();
    } catch (err) {
      const code = err instanceof Error && "code" in err ? (err as { code: string }).code : "internal";
      setMessages((prev) => {
        const next = [...prev];
        const i = next.findIndex((m) => m.id === failed.id);
        if (i >= 0) {
          next[i] = { ...next[i], pending: false, failed: true, content: "" };
          lastFailedIndex.current = i;
        }
        return next;
      });
      setError(code);
    } finally {
      setSending(false);
    }
  }, [messages, activeConversationId, notify]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const data = await aiApi.conversation(id);
      setMessages(data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
      setActiveConversationId(id);
      setError(null);
    } catch {
      setError("internal");
    }
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    lastFailedIndex.current = null;
  }, []);

  const clear = useCallback(async () => {
    if (activeConversationId) {
      try {
        await aiApi.deleteConversation(activeConversationId);
        notify();
      } catch {
        // ignore — local clear still applies
      }
    }
    newChat();
  }, [activeConversationId, newChat, notify]);

  return { messages, sending, error, activeConversationId, send, retry, loadConversation, newChat, clear };
}