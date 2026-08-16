import type { AIChatMessage } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AIService } from "../services/AIService";
import { authenticate } from "./helpers";
import { badRequest } from "../errors";

interface AIGenerateBody {
  messages?: AIChatMessage[];
  maxTokens?: number;
}

interface AIChatBody {
  conversationId?: string | null;
  content?: string;
}

function parseMessages(body: AIGenerateBody): AIChatMessage[] {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return [{ role: "user", content: "" }];
  }
  return messages.slice(-20).map((m) => ({
    role: m.role === "system" || m.role === "assistant" ? m.role : "user",
    content: String(m.content ?? "").slice(0, 8000),
  }));
}

/** Isolated /api/ai/* namespace — AI logic lives in AIService only. */
export function registerAIRoutes(app: FastifyInstance): void {
  app.get("/api/ai/info", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    return { success: true, data: AIService.info() };
  });

  app.get("/api/ai/models", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    return { success: true, data: { models: await AIService.models() } };
  });

  app.get("/api/ai/usage", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    return { success: true, data: await AIService.usage(user.id) };
  });

  // Conversation-aware chat. Per-user rate limit with a distinct error code.
  app.post(
    "/api/ai/chat",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req: FastifyRequest<{ Body: AIChatBody }>, reply: FastifyReply) => {
      const user = await authenticate(req, reply);
      if (!user) return;
      const body = req.body ?? {};
      const result = await AIService.chat(
        user.id,
        { conversationId: body.conversationId ?? null, content: body.content ?? "" },
        user.locale
      );
      return { success: true, data: result };
    }
  );

  app.get("/api/ai/conversations", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    return { success: true, data: { items: await AIService.listConversations(user.id) } };
  });

  app.post("/api/ai/conversations", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    return { success: true, data: { conversation: await AIService.createConversation(user.id) } };
  });

  app.get("/api/ai/conversations/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    return { success: true, data: await AIService.getConversation(user.id, req.params.id) };
  });

  app.delete("/api/ai/conversations/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await AIService.deleteConversation(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });

  app.post("/api/ai/generate", async (req: FastifyRequest<{ Body: AIGenerateBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const messages = parseMessages(req.body ?? {});
    const result = await AIService.generate(user.id, messages, req.body?.maxTokens);
    return { success: true, data: result };
  });

  // Streaming endpoint: server-sent events with text deltas.
  app.post("/api/ai/generate/stream", async (req: FastifyRequest<{ Body: AIGenerateBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const messages = parseMessages(req.body ?? {});

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    reply.hijack();

    const encoder = new TextEncoder();
    try {
      for await (const chunk of AIService.stream(user.id, messages, req.body?.maxTokens)) {
        reply.raw.write(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
      }
      reply.raw.write(encoder.encode("event: done\ndata: {}\n\n"));
    } catch (err) {
      reply.raw.write(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: err instanceof Error ? err.message : "AI failed" })}\n\n`));
    } finally {
      reply.raw.end();
    }
  });
}