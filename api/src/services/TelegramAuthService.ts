import type { AuthUser, Lang, MiniAppAuthResult } from "@app/shared";
import {
  isTelegramInitDataFresh,
  validateTelegramInitData,
} from "@app/shared";
import { prisma } from "../db";
import { config } from "../config";
import { badRequest, unauthorized } from "../errors";
import { toAuthUser, AuthService } from "./AuthService";
import { eventBus, telegramLinkedEvent } from "../events/bus";

/**
 * Server-side Telegram Mini App authentication.
 * The initData signature is verified with HMAC using the bot token —
 * client-supplied identity is never trusted.
 */
export class TelegramAuthService {
  static async authenticateMiniApp(input: {
    initData: string;
    locale?: Lang;
    meta?: { ip?: string; userAgent?: string };
  }): Promise<MiniAppAuthResult> {
    if (!config.telegram.botToken) {
      throw unauthorized("Telegram verification failed. Please open from Telegram.", "telegramInitInvalid");
    }

    const parsed = validateTelegramInitData(input.initData, config.telegram.botToken);
    if (!parsed) {
      throw unauthorized("Telegram verification failed. Please open from Telegram.", "telegramInitInvalid");
    }
    if (!isTelegramInitDataFresh(parsed)) {
      throw unauthorized("Telegram session expired. Please reopen the app.", "telegramInitExpired");
    }
    const tgUser = parsed.user;
    if (!tgUser) {
      throw badRequest("Telegram user is missing from initData.");
    }

    const telegramUserId = String(tgUser.id);
    const existing = await prisma.user.findUnique({ where: { telegramUserId } });

    if (existing) {
      // Linked account — return it as-is, no second account is created.
      const created = await AuthService.createSession(existing.id, input.meta);
      return {
        user: toAuthUser(existing),
        isNewUser: false,
        linkedToExisting: true,
        session: created.session,
        token: created.token,
      };
    }

    // Telegram-first signup: create the account linked to Telegram identity.
    const user = await prisma.user.create({
      data: {
        name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ").trim() || "Telegram User",
        locale: input.locale ?? config.defaultLocale,
        telegramUserId,
        telegramUsername: tgUser.username ?? null,
        telegramFirstName: tgUser.first_name ?? null,
        telegramLastName: tgUser.last_name ?? null,
        avatar: tgUser.photo_url ?? null,
        profile: { create: {} },
      },
    });
    await prisma.telegramIdentity.create({
      data: {
        userId: user.id,
        telegramUserId,
        username: tgUser.username ?? null,
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        photoUrl: tgUser.photo_url ?? null,
        isVerified: true,
      },
    });

    const created = await AuthService.createSession(user.id, input.meta);
    eventBus.publish(user.id, telegramLinkedEvent());
    return {
      user: toAuthUser(user),
      isNewUser: true,
      linkedToExisting: false,
      session: created.session,
      token: created.token,
    };
  }

  static async findUserByTelegramId(telegramUserId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({ where: { telegramUserId } });
    return user ? toAuthUser(user) : null;
  }
}