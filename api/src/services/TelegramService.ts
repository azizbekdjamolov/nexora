import type { TelegramLinkStatus } from "@app/shared";
import { normalizePhone, type Lang } from "@app/shared";
import { randomBytes } from "crypto";
import { prisma } from "../db";
import { config, telegramDeepLinkBase } from "../config";
import { conflict, notFound, unauthorized, badRequest } from "../errors";
import { eventBus, telegramLinkedEvent } from "../events/bus";

export class TelegramService {
  /**
   * Creates a short-lived linking state and returns the deep link.
   * User taps it in Telegram -> bot receives /start link_<state> ->
   * bot calls TelegramService.confirmLink with its verified telegram id.
   */
  static async startLinking(userId: string): Promise<{ state: string; deepLink: string }> {
    const state = randomBytes(16).toString("hex");
    await prisma.telegramLinkCode.create({
      data: {
        userId,
        state,
        expiresAt: new Date(Date.now() + config.telegramLinkCodeTtlMs),
      },
    });
    return {
      state,
      deepLink: `${telegramDeepLinkBase()}?start=link_${state}`,
    };
  }

  static async getLinkStatus(userId: string): Promise<TelegramLinkStatus> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("User not found.");
    return {
      linked: Boolean(user.telegramUserId),
      telegramUserId: user.telegramUserId,
      username: user.telegramUsername,
      firstName: user.telegramFirstName,
      lastName: user.telegramLastName,
    };
  }

  /**
   * Called by the bot (with the shared service token) when a user taps
   * the deep link in Telegram. The telegramUserId comes from Telegram's
   * own update object — trusted by the bot, never from the client.
   */
  static async confirmLink(input: {
    state: string;
    telegramUserId: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    photoUrl?: string | null;
  }): Promise<{ userId: string; name: string; linked: boolean }> {
    const code = await prisma.telegramLinkCode.findUnique({ where: { state: input.state } });
    if (!code || code.usedAt || code.expiresAt.getTime() < Date.now()) {
      throw notFound("This link is invalid or expired.", "telegramLinkStateInvalid");
    }

    const existing = await prisma.user.findUnique({ where: { telegramUserId: input.telegramUserId } });
    if (existing && existing.id !== code.userId) {
      throw conflict("This Telegram account is already linked to another account.", "telegramAlreadyLinked");
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: code.userId },
        data: {
          telegramUserId: input.telegramUserId,
          telegramUsername: input.username ?? null,
          telegramFirstName: input.firstName ?? null,
          telegramLastName: input.lastName ?? null,
        },
      });
      await tx.telegramIdentity.upsert({
        where: { telegramUserId: input.telegramUserId },
        create: {
          userId: code.userId,
          telegramUserId: input.telegramUserId,
          username: input.username ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          photoUrl: input.photoUrl ?? null,
          isVerified: true,
        },
        update: {
          userId: code.userId,
          username: input.username ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          photoUrl: input.photoUrl ?? null,
        },
      });
      await tx.telegramLinkCode.update({ where: { id: code.id }, data: { usedAt: new Date() } });
      return updated;
    });

    eventBus.publish(user.id, telegramLinkedEvent());
    return { userId: user.id, name: user.name, linked: true };
  }

  /** Refreshes display fields from the bot's verified update (no auth change).
   *  The bot passes Telegram's from_user values on every interaction, so a
   *  removed username is cleared (null) rather than kept stale. Phone is
   *  never touched here. */
  static async syncTelegramProfile(input: {
    telegramUserId: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    photoUrl?: string | null;
    languageCode?: string | null;
  }): Promise<{ userId: string } | null> {
    const user = await prisma.user.findUnique({ where: { telegramUserId: input.telegramUserId } });
    if (!user) return null;
    // Telegram's language_code is applied only when the account still uses the
    // system default locale (i.e. the user never chose a language explicitly).
    const locale = toSupportedLocale(input.languageCode);
    const syncLocale = locale && user.locale === config.defaultLocale && locale !== user.locale ? { locale } : {};
    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramUsername: input.username ?? null,
        telegramFirstName: input.firstName ?? null,
        telegramLastName: input.lastName ?? null,
        ...syncLocale,
      },
    });
    await prisma.telegramIdentity
      .upsert({
        where: { telegramUserId: input.telegramUserId },
        create: {
          userId: user.id,
          telegramUserId: input.telegramUserId,
          username: input.username ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          photoUrl: input.photoUrl ?? null,
        },
        update: {
          username: input.username ?? null,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          photoUrl: input.photoUrl ?? null,
        },
      })
      .catch(() => undefined);
    return { userId: user.id };
  }

  /**
   * Saves the phone number shared via Telegram's contact request.
   * The bot has already verified contact.user_id === current telegram user,
   * so the phone belongs to this account. An existing phone number is
   * overwritten with the freshly shared one (the user asked to update it).
   */
  static async savePhone(
    telegramUserId: string,
    phone: string
  ): Promise<{ userId: string; phone: string } | null> {
    const user = await prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) return null;
    const normalized = normalizePhone(phone);
    if (!/^\+?\d{7,15}$/.test(normalized)) {
      throw badRequest("Invalid phone number.");
    }
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: normalized },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw conflict("This phone number is already used by another account.", "phoneInUse");
      }
      throw err;
    }
    return { userId: user.id, phone: normalized };
  }

  static async unlink(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("User not found.");
    if (user.telegramUserId) {
      await prisma.telegramIdentity.deleteMany({ where: { telegramUserId: user.telegramUserId } });
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramUserId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramLastName: null,
      },
    });
  }
}

/** Maps Telegram's language_code (e.g. "uz", "ru", "en", "uz@latin") to a
   *  supported locale. Only applied when the user never chose a language
   *  explicitly (see syncTelegramProfile). */
function toSupportedLocale(languageCode?: string | null): Lang | null {
  if (!languageCode) return null;
  const code = languageCode.toLowerCase().split(/[@_-]/)[0];
  if (code === "uz" || code === "ru" || code === "en") return code;
  return null;
}

export function requireServiceToken(token: string | undefined): void {
  if (!token || token !== config.botServiceToken) {
    throw unauthorized("Unauthorized bot service request.", "unauthorizedBot");
  }
}