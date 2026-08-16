import type { AIChatMessage, AIProviderName } from "@app/shared";

export interface AIGenerateRequest {
  messages: AIChatMessage[];
  model?: string;
  maxTokens?: number;
}

export interface AIGenerateResponse {
  content: string;
  tokensUsed: number;
}

/** Every AI provider implements this interface. */
export interface AIProvider {
  readonly name: AIProviderName;
  generate(req: AIGenerateRequest & { apiKey: string }): Promise<AIGenerateResponse>;
  stream(req: AIGenerateRequest & { apiKey: string }): AsyncIterable<string>;
  getAvailableModels(): { id: string; name: string }[];
}