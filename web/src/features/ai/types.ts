import type { AIMessage } from "@app/shared";

/** Client-side chat message view. */
export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  failed?: boolean;
}

export function toMessageView(m: AIMessage): ChatMessageView {
  return { id: m.id, role: m.role, content: m.content };
}