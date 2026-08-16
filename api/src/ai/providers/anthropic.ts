import type { AIProvider, AIGenerateRequest, AIGenerateResponse } from "../types";

const MODELS = [
  { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku" },
  { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-7-sonnet-latest", name: "Claude 3.7 Sonnet" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
];

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;

  async generate(req: AIGenerateRequest & { apiKey: string }): Promise<AIGenerateResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": req.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: req.model ?? "claude-3-5-haiku-latest",
        max_tokens: req.maxTokens ?? 1024,
        messages: req.messages.filter((m) => m.role !== "system"),
        ...(req.messages.find((m) => m.role === "system")
          ? { system: req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n") }
          : {}),
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
    return {
      content: text,
      tokensUsed: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0),
    };
  }

  async *stream(req: AIGenerateRequest & { apiKey: string }): AsyncIterable<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": req.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: req.model ?? "claude-3-5-haiku-latest",
        max_tokens: req.maxTokens ?? 1024,
        messages: req.messages.filter((m) => m.role !== "system"),
        stream: true,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Anthropic API error ${res.status}`);
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
        try {
          const json = JSON.parse(trimmed.slice(5).trim()) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (json.type === "content_block_delta" && json.delta?.type === "text_delta" && json.delta.text) {
            yield json.delta.text;
          }
        } catch {
          // skip
        }
      }
    }
  }

  getAvailableModels() {
    return MODELS;
  }
}