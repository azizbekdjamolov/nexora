import type { AIChatMessage, AIChatResult, AIConversationDetail, AIConversationSummary, AIGenerateResult, AIMessage, AIUsageSummary, Lang, WellnessAIInput } from "@app/shared";
import { prisma } from "../db";
import { config } from "../config";
import { createAIProvider } from "../ai";
import { badRequest, notFound, serverError } from "../errors";
import { eventBus, aiDoneEvent } from "../events/bus";

const SYSTEM_PROMPT =
  "You are the AI wellness coach of Vitalis, a health, sport and wellness platform synchronized across a website, a Telegram bot and a Telegram Mini App. " +
  "Help users with general wellness: hydration, sleep, physical activity, habits, workout planning and motivation. " +
  "IMPORTANT SAFETY RULES: you are not a doctor and never provide medical advice. Never diagnose, never prescribe or change medication, never interpret symptoms as diseases. " +
  "For anything that could be a medical condition, advise consulting a qualified healthcare professional. " +
  "Only use data the user provides; never invent health information. Be concise, supportive and accurate.";

const LANG_HINT: Record<Lang, string> = {
  en: "Respond in English.",
  ru: "Отвечай на русском.",
  uz: "O'zbek tilida javob ber.",
};

function mapMessage(m: { id: string; conversationId: string; role: string; content: string; tokensUsed: number; createdAt: Date }): AIMessage {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: (m.role === "assistant" ? "assistant" : "user") as AIMessage["role"],
    content: m.content,
    tokensUsed: m.tokensUsed,
    createdAt: m.createdAt.toISOString(),
  };
}

function mapSummary(c: { id: string; title: string; createdAt: Date; updatedAt: Date; _count?: { messages: number } }, count?: number): AIConversationSummary {
  return {
    id: c.id,
    title: c.title,
    messageCount: count ?? c._count?.messages ?? 0,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export class AIService {
  static provider() {
    return createAIProvider(config.ai.provider);
  }

  static isConfigured(): boolean {
    return Boolean(config.ai.apiKey);
  }

  static info() {
    const provider = this.provider();
    return {
      provider: config.ai.provider,
      model: config.ai.model,
      configured: this.isConfigured(),
      models: provider.getAvailableModels(),
    };
  }

  static async models() {
    const provider = this.provider();
    return provider.getAvailableModels();
  }

  static async generate(userId: string, messages: AIChatMessage[], maxTokens?: number): Promise<AIGenerateResult> {
    if (!this.isConfigured()) {
      throw serverError("AI is not configured yet.");
    }
    const provider = this.provider();
    const result = await provider.generate({
      messages,
      model: config.ai.model,
      maxTokens,
      apiKey: config.ai.apiKey,
    });

    await prisma.aiUsage.create({
      data: {
        userId,
        provider: provider.name,
        model: config.ai.model,
        requestCount: 1,
        tokensUsed: result.tokensUsed,
      },
    });
    eventBus.publish(userId, aiDoneEvent());
    return { content: result.content, provider: provider.name, model: config.ai.model, tokensUsed: result.tokensUsed };
  }

  static async *stream(userId: string, messages: AIChatMessage[], maxTokens?: number): AsyncIterable<string> {
    if (!this.isConfigured()) {
      throw serverError("AI is not configured yet.");
    }
    const provider = this.provider();
    let tokensUsed = 0;
    for await (const chunk of provider.stream({
      messages,
      model: config.ai.model,
      maxTokens,
      apiKey: config.ai.apiKey,
    })) {
      tokensUsed += Math.max(1, chunk.length / 4);
      yield chunk;
    }
    await prisma.aiUsage.create({
      data: {
        userId,
        provider: provider.name,
        model: config.ai.model,
        requestCount: 1,
        tokensUsed: Math.round(tokensUsed),
      },
    });
    eventBus.publish(userId, aiDoneEvent());
  }

  /**
   * Conversation-aware chat. Creates or continues a conversation owned by
   * the authenticated user, persists both messages, tracks usage.
   */
  static async chat(
    userId: string,
    input: { conversationId?: string | null; content: string },
    locale: Lang = "en"
  ): Promise<AIChatResult> {
    if (!this.isConfigured()) {
      throw serverError("AI is not configured yet.");
    }
    const content = String(input.content ?? "").trim().slice(0, 8000);
    if (!content) {
      throw badRequest("Message is required.");
    }

    let conversationId = input.conversationId ?? null;
    if (conversationId) {
      const existing = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
      if (!existing) throw notFound("Conversation not found.", "conversationNotFound");
    }

    const createdConversation = conversationId
      ? null
      : await prisma.aIConversation.create({
          data: {
            userId,
            title: content.slice(0, 60) || "New chat",
          },
        });
    if (createdConversation) conversationId = createdConversation.id;

    const history = await prisma.aIMessage.findMany({
      where: { conversationId: conversationId! },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const providerMessages: AIChatMessage[] = [
      { role: "system", content: `${SYSTEM_PROMPT} ${LANG_HINT[locale] ?? LANG_HINT.en}` },
      ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }) as AIChatMessage),
      { role: "user", content },
    ];

    const provider = this.provider();
    const result = await provider.generate({
      messages: providerMessages,
      model: config.ai.model,
      apiKey: config.ai.apiKey,
    });

    const replyContent = (result.content ?? "").slice(0, 16000);
    const [, assistantMessage] = await prisma.$transaction([
      prisma.aIMessage.create({ data: { conversationId: conversationId!, role: "user", content } }),
      prisma.aIMessage.create({ data: { conversationId: conversationId!, role: "assistant", content: replyContent, tokensUsed: result.tokensUsed } }),
    ]);
    await prisma.aIConversation.update({ where: { id: conversationId! }, data: {} });

    await prisma.aiUsage.create({
      data: {
        userId,
        provider: provider.name,
        model: config.ai.model,
        requestCount: 1,
        tokensUsed: result.tokensUsed,
      },
    });
    eventBus.publish(userId, aiDoneEvent());

    const summary = await this.getSummary(userId, conversationId!);
    return { conversation: summary, reply: mapMessage(assistantMessage) };
  }

  /** Weekly wellness summary from recorded tracker data (safe, data-driven). */
  static async generateWellnessSummary(userId: string, input: WellnessAIInput): Promise<string> {
    if (!this.isConfigured()) {
      throw serverError("AI is not configured yet.");
    }
    const prompt =
      "Summarize the user's wellness week based ONLY on the JSON data below. " +
      "Mention the Wellness Score trend, hydration, sleep, activity, workouts and habits. " +
      "Give 1–2 small, realistic suggestions for next week. Never invent numbers, never diagnose, never prescribe. " +
      `Respond in ${input.locale === "uz" ? "Uzbek" : input.locale === "ru" ? "Russian" : "English"}. Keep it 5–8 sentences, warm and concise.\n\n` +
      `DATA: ${JSON.stringify(input)}`;
    const provider = this.provider();
    const result = await provider.generate({
      messages: [{ role: "user", content: prompt }],
      model: config.ai.model,
      maxTokens: 900,
      apiKey: config.ai.apiKey,
    });
    await prisma.aiUsage.create({
      data: { userId, provider: provider.name, model: config.ai.model, requestCount: 1, tokensUsed: result.tokensUsed },
    });
    eventBus.publish(userId, aiDoneEvent());
    return (result.content ?? "").trim().slice(0, 4000);
  }

  private static async getSummary(userId: string, conversationId: string): Promise<AIConversationSummary> {
    const c = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: { _count: { select: { messages: true } } },
    });
    if (!c) throw notFound("Conversation not found.", "conversationNotFound");
    return mapSummary(c);
  }

  static async listConversations(userId: string): Promise<AIConversationSummary[]> {
    const rows = await prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
      take: 100,
    });
    return rows.map((r) => mapSummary(r));
  }

  static async getConversation(userId: string, conversationId: string): Promise<AIConversationDetail> {
    const c = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    if (!c) throw notFound("Conversation not found.", "conversationNotFound");
    return {
      conversation: mapSummary(c, c.messages.length),
      messages: c.messages.map(mapMessage),
    };
  }

  static async createConversation(userId: string): Promise<AIConversationSummary> {
    const c = await prisma.aIConversation.create({
      data: { userId, title: "New chat" },
      include: { _count: { select: { messages: true } } },
    });
    return mapSummary(c);
  }

  static async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const existing = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
    if (!existing) throw notFound("Conversation not found.", "conversationNotFound");
    await prisma.aIConversation.delete({ where: { id: conversationId } });
  }

  static async usage(userId: string): Promise<AIUsageSummary> {
    const agg = await prisma.aiUsage.aggregate({
      where: { userId },
      _sum: { requestCount: true, tokensUsed: true },
      _count: true,
    });
    const last = await prisma.aiUsage.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return {
      provider: last?.provider ?? config.ai.provider,
      model: last?.model ?? config.ai.model,
      configured: this.isConfigured(),
      requests: agg._sum.requestCount ?? 0,
      tokens: agg._sum.tokensUsed ?? 0,
    };
  }
}