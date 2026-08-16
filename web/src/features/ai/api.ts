import type { AIChatResult, AIConversationDetail, AIConversationSummary, AIModelInfo, AIUsageSummary } from "@app/shared";
import { api } from "@/lib/api";

export const aiApi = {
  info: () =>
    api<{ provider: string; model: string; configured: boolean; models: AIModelInfo[] }>("/ai/info"),
  models: () => api<{ models: AIModelInfo[] }>("/ai/models"),
  usage: () => api<AIUsageSummary>("/ai/usage"),
  chat: (body: { conversationId?: string | null; content: string }) =>
    api<AIChatResult>("/ai/chat", { method: "POST", body: JSON.stringify(body) }),
  conversations: () => api<{ items: AIConversationSummary[] }>("/ai/conversations"),
  conversation: (id: string) => api<AIConversationDetail>(`/ai/conversations/${id}`),
  createConversation: () =>
    api<{ conversation: AIConversationSummary }>("/ai/conversations", { method: "POST" }),
  deleteConversation: (id: string) =>
    api<{ ok: boolean }>(`/ai/conversations/${id}`, { method: "DELETE" }),
};