import type { AIProviderName } from "@app/shared";
import type { AIProvider } from "./types";
import { OpenAIProvider, groqProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import { AnthropicProvider } from "./providers/anthropic";

const registry: Record<AIProviderName, () => AIProvider> = {
  openai: () => new OpenAIProvider(),
  groq: groqProvider,
  gemini: () => new GeminiProvider(),
  anthropic: () => new AnthropicProvider(),
};

export function createAIProvider(name: AIProviderName): AIProvider {
  const factory = registry[name];
  if (!factory) throw new Error(`Unknown AI provider: ${name}`);
  return factory();
}

export function listProviders(): AIProviderName[] {
  return Object.keys(registry) as AIProviderName[];
}

export type { AIProvider, AIGenerateRequest, AIGenerateResponse } from "./types";