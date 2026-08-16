import type { Lang } from "@app/shared";
import { SESSION_COOKIE } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../services/AuthService";
import { TelegramService } from "../services/TelegramService";
import { TelegramAuthService } from "../services/TelegramAuthService";
import { config, telegramDeepLinkBase } from "../config";
import { authenticate } from "./helpers";

interface MiniAppAuthBody {
  initData?: string;
  locale?: Lang;
}

export function registerTelegramRoutes(app: FastifyInstance): void {
  // Public info needed by all clients to build Telegram links.
  app.get("/api/telegram/info", async () => {
    return {
      success: true,
      data: {
        botUsername: config.telegram.botUsername,
        deepLinkBase: telegramDeepLinkBase(),
        miniAppUrl: config.telegram.miniAppUrl,
      },
    };
  });

  // STEP: website user taps "Link Telegram" -> creates a state + deep link.
  app.post("/api/telegram/link/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const result = await TelegramService.startLinking(user.id);
    return { success: true, data: result };
  });

  // Website polls this while the user is inside Telegram.
  app.get("/api/telegram/link/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const status = await TelegramService.getLinkStatus(user.id);
    return { success: true, data: status };
  });

  app.post("/api/telegram/unlink", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await TelegramService.unlink(user.id);
    return { success: true, data: { ok: true } };
  });

  // Mini App auth: verify initData server-side, then open/create the linked account.
  app.post("/api/telegram/miniapp/auth", async (req: FastifyRequest<{ Body: MiniAppAuthBody }>, reply: FastifyReply) => {
    const initData = req.body?.initData;
    if (!initData) {
      return reply.code(401).send({ success: false, error: { code: "telegramInitInvalid", message: "Telegram verification failed. Please open from Telegram." } });
    }
    const result = await TelegramAuthService.authenticateMiniApp({
      initData,
      locale: req.body?.locale,
      meta: { ip: req.ip, userAgent: req.headers["user-agent"] },
    });
    if (result.token) {
      reply.setCookie(SESSION_COOKIE, result.token, AuthService.cookieOptions());
    }
    return { success: true, data: { user: result.user, isNewUser: result.isNewUser, linkedToExisting: result.linkedToExisting } };
  });
}