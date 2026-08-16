import type { AIProvider, AIGenerateRequest, AIGenerateResponse } from "../types";
import type { AIProviderName } from "@app/shared";

const DEFAULT_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4.1", name: "GPT-4.1" },
  { id: "o3-mini", name: "o3 Mini" },
];

const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
  { id: "qwen-2.5-32b", name: "Qwen 2.5 32B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B" },
];

function buildBody(req: AIGenerateRequest) {
  return {
    model: req.model,
    messages: req.messages,
    max_tokens: req.maxTokens ?? 1024,
    stream: false,
  };
}

/**
 * OpenAI-compatible chat completions provider.
 * Also used for Groq (same wire protocol, different base URL).
 */
export class OpenAIProvider implements AIProvider {
  readonly name: AIProviderName;
  private readonly baseUrl: string;
  private readonly models: { id: string; name: string }[];

  constructor(
    name: AIProviderName = "openai",
    baseUrl = "https://api.openai.com/v1",
    models: { id: string; name: string }[] = DEFAULT_MODELS
  ) {
    this.name = name;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.models = models;
  }

  async generate(req: AIGenerateRequest & { apiKey: string }): Promise<AIGenerateResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${req.apiKey}` },
      body: JSON.stringify(buildBody(req)),
    });
    if (!res.ok) throw new Error(`AI API error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { total_tokens?: number };
    };
    return {
      content: json.choices[0]?.message?.content ?? "",
      tokensUsed: json.usage?.total_tokens ?? 0,
    };
  }

  async *stream(req: AIGenerateRequest & { apiKey: string }): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${req.apiKey}` },
      body: JSON.stringify({ ...buildBody(req), stream: true }),
    });
    if (!res.ok || !res.body) throw new Error(`AI API error ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // skip malformed chunk
        }
      }
    }
  }

  getAvailableModels() {
    return this.models;
  }
}

export const groqProvider = (): OpenAIProvider =>
  new OpenAIProvider("groq", "https://api.groq.com/openai/v1", GROQ_MODELS);