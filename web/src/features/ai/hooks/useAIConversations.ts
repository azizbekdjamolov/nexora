"use client";

import { useCallback, useEffect, useState } from "react";
import type { AIConversationSummary } from "@app/shared";
import { aiApi } from "../api";

export interface UseAIConversationsResult {
  conversations: AIConversationSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Loads and manages the user's AI conversation list. */
export function useAIConversations(): UseAIConversationsResult {
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await aiApi.conversations();
      setConversations(data.items);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await aiApi.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { conversations, loading, refresh, remove };
}