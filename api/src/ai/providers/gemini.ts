import type { AIProvider, AIGenerateRequest, AIGenerateResponse } from "../types";

const MODELS = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
];

function toGeminiMessages(messages: AIGenerateRequest["messages"]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : m.role === "system" ? "user" : "user",
    parts: [{ text: m.content }],
  }));
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  private url(model: string, stream: boolean) {
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
    return stream ? `${base}:streamGenerateContent?alt=sse` : `${base}:generateContent`;
  }

  async generate(req: AIGenerateRequest & { apiKey: string }): Promise<AIGenerateResponse> {
    const model = req.model ?? "gemini-2.0-flash";
    const res = await fetch(`${this.url(model, false)}&key=${req.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiMessages(req.messages),
        generationConfig: { maxOutputTokens: req.maxTokens ?? 1024 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { content: text, tokensUsed: json.usageMetadata?.totalTokenCount ?? 0 };
  }

  async *stream(req: AIGenerateRequest & { apiKey: string }): AsyncIterable<string> {
    const model = req.model ?? "gemini-2.0-flash";
    const res = await fetch(`${this.url(model, true)}&key=${req.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiMessages(req.messages),
        generationConfig: { maxOutputTokens: req.maxTokens ?? 1024 },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Gemini API error ${res.status}`);
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
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
          if (text) yield text;
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