import type { FeatureStatus, Lang, WorkoutCategory, DiagnosticAnswer } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { TelegramService, requireServiceToken } from "../services/TelegramService";
import { FeatureService } from "../services/FeatureService";
import { UserService } from "../services/UserService";
import { TelegramAuthService } from "../services/TelegramAuthService";
import { NotificationService } from "../services/NotificationService";
import { DiagnosticService } from "../services/DiagnosticService";
import { SupportService } from "../services/SupportService";
import { badRequest, notFound } from "../errors";
import { prisma } from "../db";
import type { AuthUser } from "@app/shared";
import { WellnessService } from "../services/tracker/WellnessService";
import { WaterService } from "../services/tracker/WaterService";
import { SleepService } from "../services/tracker/SleepService";
import { WorkoutService } from "../services/tracker/WorkoutService";
import { HabitService } from "../services/tracker/HabitService";
import { GoalService } from "../services/tracker/GoalService";
import { ReminderService } from "../services/tracker/ReminderService";

/**
 * Service endpoints used by the Telegram Bot process.
 * Authenticated with the shared BOT_SERVICE_TOKEN header.
 * The bot passes its *verified* telegramUserId (from Telegram updates),
 * and the backend resolves the linked User — the bot never handles
 * passwords or raw user ids from clients.
 */
export function registerBotRoutes(app: FastifyInstance): void {
  const botAuth = (req: FastifyRequest, reply: FastifyReply): string | null => {
    requireServiceToken(req.headers["x-service-token"] as string | undefined);
    const tgId = String((req.body as { telegramUserId?: string | number })?.telegramUserId ?? "");
    if (!tgId) {
      reply.code(400).send({ success: false, error: { code: "invalidInput", message: "telegramUserId is required." } });
      return null;
    }
    return tgId;
  };

  const resolveBotUser = async (tgId: string, reply: FastifyReply): Promise<AuthUser | null> => {
    const user = await TelegramAuthService.findUserByTelegramId(tgId);
    if (!user) {
      reply.code(404).send({ success: false, error: { code: "telegramNotLinked", message: "Your Telegram account is not linked to a website account." } });
      return null;
    }
    // Throttled last-seen heartbeat (max one write per 5 minutes per user).
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    prisma.user
      .updateMany({
        where: { id: user.id, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: threshold } }] },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => undefined);
    return user;
  };

  app.post("/api/bot/me", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const [featuresCount, unread] = await Promise.all([
      prisma.feature.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    return { success: true, data: { user, itemsCount: featuresCount, unreadNotifications: unread } };
  });

  app.post("/api/bot/features/list", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const data = await FeatureService.list(user.id, { page: 1, pageSize: 100 });
    return { success: true, data };
  });

  app.post("/api/bot/features/get", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const featureId = String((req.body as { featureId?: string }).featureId ?? "");
    const feature = await FeatureService.get(user.id, featureId);
    return { success: true, data: { feature } };
  });

  app.post("/api/bot/features/create", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { title?: string; description?: string | null };
    if (!body.title?.trim()) throw badRequest("Title is required.");
    const feature = await FeatureService.create(user.id, { title: body.title, description: body.description }, "bot");
    return { success: true, data: { feature } };
  });

  app.post("/api/bot/features/update", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { featureId?: string; title?: string; description?: string | null; status?: FeatureStatus };
    if (!body.featureId) throw badRequest("featureId is required.");
    const feature = await FeatureService.update(user.id, body.featureId, {
      title: body.title,
      description: body.description,
      status: body.status,
    }, "bot");
    return { success: true, data: { feature } };
  });

  app.post("/api/bot/features/delete", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { featureId?: string };
    if (!body.featureId) throw badRequest("featureId is required.");
    await FeatureService.remove(user.id, body.featureId, "bot");
    return { success: true, data: { ok: true } };
  });

  app.post("/api/bot/language/set", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const locale = (req.body as { locale?: Lang }).locale;
    if (!locale || !["uz", "en", "ru"].includes(locale)) throw badRequest("Invalid locale.");
    const updated = await UserService.updateProfile(user.id, { locale });
    return { success: true, data: { user: updated } };
  });

  app.post("/api/bot/profile/get", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const data = await UserService.getProfile(user.id);
    return { success: true, data };
  });

  // Deep-link confirmation: bot received /start link_<state>
  app.post("/api/bot/telegram/link/confirm", async (req, reply) => {
    requireServiceToken(req.headers["x-service-token"] as string | undefined);
    const body = req.body as {
      state?: string;
      telegramUserId?: string | number;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      photoUrl?: string | null;
    };
    if (!body.state || body.telegramUserId === undefined) {
      throw badRequest("state and telegramUserId are required.");
    }
    const result = await TelegramService.confirmLink({
      state: body.state,
      telegramUserId: String(body.telegramUserId),
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
      photoUrl: body.photoUrl,
    });
    await NotificationService.notify(
      result.userId,
      "telegram.linked",
      "Telegram linked",
      "Your Telegram account was linked.",
      null,
      "system"
    ).catch(() => undefined);
    return { success: true, data: result };
  });

  // /start without link payload — refresh stored telegram profile fields.
  app.post("/api/bot/telegram/sync-profile", async (req, reply) => {
    requireServiceToken(req.headers["x-service-token"] as string | undefined);
    const body = req.body as {
      telegramUserId?: string | number;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      photoUrl?: string | null;
      languageCode?: string | null;
    };
    if (body.telegramUserId === undefined) throw badRequest("telegramUserId is required.");
    const result = await TelegramService.syncTelegramProfile({
      telegramUserId: String(body.telegramUserId),
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
      photoUrl: body.photoUrl,
      languageCode: body.languageCode,
    });
    if (!result) {
      return reply.code(404).send({ success: false, error: { code: "telegramNotLinked", message: "Not linked." } });
    }
    return { success: true, data: result };
  });

  // Phone number shared via Telegram's contact request. The bot verifies
  // contact.user_id === current telegram user before calling this endpoint.
  app.post("/api/bot/telegram/phone/set", async (req, reply) => {
    requireServiceToken(req.headers["x-service-token"] as string | undefined);
    const body = req.body as { telegramUserId?: string | number; phone?: string | null };
    if (body.telegramUserId === undefined || !body.phone) throw badRequest("telegramUserId and phone are required.");
    const result = await TelegramService.savePhone(String(body.telegramUserId), body.phone);
    if (!result) {
      return reply.code(404).send({ success: false, error: { code: "telegramNotLinked", message: "Not linked." } });
    }
    return { success: true, data: result };
  });

  // ── Wellness endpoints used by the Telegram Bot ────────────────────────────

  app.post("/api/bot/wellness/progress", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const data = await WellnessService.botProgress(user.id);
    return { success: true, data };
  });

  app.post("/api/bot/wellness/water/add", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { amountMl?: number };
    const result = await WaterService.add(user.id, { amountMl: body.amountMl, source: "bot" });
    return { success: true, data: result };
  });

  app.post("/api/bot/wellness/water/remove", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const today = await WaterService.today(user.id);
    const latest = today.entries[0];
    if (!latest) return { success: true, data: { removed: false, today } };
    await WaterService.remove(user.id, latest.id);
    const after = await WaterService.today(user.id);
    return { success: true, data: { removed: true, today: after } };
  });

  app.post("/api/bot/wellness/sleep/log", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { durationMinutes?: number; date?: string };
    const entry = await SleepService.log(user.id, { durationMinutes: body.durationMinutes, date: body.date, source: "bot" });
    return { success: true, data: { entry } };
  });

  app.post("/api/bot/wellness/workouts/create", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { category?: string; durationMinutes?: number; notes?: string | null };
    const workout = await WorkoutService.create(user.id, {
      category: body.category as WorkoutCategory,
      durationMinutes: body.durationMinutes,
      notes: body.notes,
      source: "bot",
    });
    return { success: true, data: { workout } };
  });

  app.post("/api/bot/wellness/habits/list", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const habits = await HabitService.list(user.id);
    return { success: true, data: { habits } };
  });

  app.post("/api/bot/wellness/habits/toggle", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { habitId?: string };
    if (!body.habitId) throw badRequest("habitId is required.");
    const result = await HabitService.toggle(user.id, body.habitId);
    return { success: true, data: result };
  });

  app.post("/api/bot/wellness/habits/create", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { name?: string };
    const habit = await HabitService.create(user.id, { name: body.name });
    return { success: true, data: { habit } };
  });

  app.post("/api/bot/wellness/goals/list", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const goals = await GoalService.list(user.id);
    return { success: true, data: { goals } };
  });

  app.post("/api/bot/wellness/goals/create", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const body = req.body as { title?: string; targetValue?: number; unit?: string | null };
    const goal = await GoalService.create(user.id, {
      title: body.title,
      targetValue: body.targetValue,
      unit: body.unit,
    });
    return { success: true, data: { goal } };
  });

  app.post("/api/bot/wellness/reminders/list", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const reminders = await ReminderService.list(user.id);
    return { success: true, data: { reminders } };
  });

  app.post("/api/bot/wellness/summary", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const locale = (req.body as { locale?: Lang }).locale ?? "en";
    const summary = await WellnessService.aiSummary(user.id, locale);
    return { success: true, data: summary };
  });

  // ── Diagnostics & support (adminga murojaat) used by the bot ───────────────

  app.post("/api/bot/diagnostics/create", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const answers = (req.body as { answers?: DiagnosticAnswer[] })?.answers;
    const record = await DiagnosticService.create(user.id, answers ?? []);
    return { success: true, data: record };
  });

  app.post("/api/bot/support/create", async (req, reply) => {
    const tgId = botAuth(req as FastifyRequest, reply);
    if (!tgId) return;
    const user = await resolveBotUser(tgId, reply);
    if (!user) return;
    const message = (req.body as { message?: string })?.message ?? "";
    const request = await SupportService.create(user.id, message);
    return { success: true, data: request };
  });

  // Long-poll: new requests to announce to the admin + replies to deliver.
  app.post("/api/bot/support/pending", async () => {
    const data = await SupportService.pending();
    return { success: true, data };
  });

  app.post("/api/bot/support/ack", async (req) => {
    requireServiceToken(req.headers["x-service-token"] as string | undefined);
    const body = req.body as { announcedIds?: string[]; deliveredIds?: string[] };
    await SupportService.ack(body.announcedIds ?? [], body.deliveredIds ?? []);
    return { success: true, data: { ok: true } };
  });
}