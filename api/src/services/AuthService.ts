import type { AuthUser, Lang, SessionInfo } from "@app/shared";
import {
  detectContactType,
  isEmail,
  isValidPhone,
  normalizePhone,
  SESSION_COOKIE,
} from "@app/shared";
import { prisma } from "../db";
import { config } from "../config";
import { badRequest, conflict, unauthorized } from "../errors";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "../security/passwords";

export type ContactType = "email" | "phone";

export function normalizeContact(contact: string): { type: ContactType; value: string } {
  const type = detectContactType(contact);
  if (type === "email") {
    return { type, value: contact.trim().toLowerCase() };
  }
  return { type, value: normalizePhone(contact) };
}

function toAuthUser(u: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  locale: string;
  theme: string;
  telegramUserId: string | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  createdAt: Date;
}): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatar: u.avatar,
    locale: (u.locale as Lang) || config.defaultLocale,
    theme: (u.theme as AuthUser["theme"]) || "system",
    telegramUserId: u.telegramUserId,
    telegramUsername: u.telegramUsername,
    telegramFirstName: u.telegramFirstName,
    telegramLastName: u.telegramLastName,
    telegramLinked: Boolean(u.telegramUserId),
    isAdmin: Boolean(u.telegramUserId && config.adminTelegramIds.includes(u.telegramUserId)),
    createdAt: u.createdAt.toISOString(),
  };
}

export class AuthService {
  static async register(input: {
    contact: string;
    password: string;
    name: string;
    locale?: Lang;
  }): Promise<{ user: AuthUser; session: SessionInfo; token: string }> {
    const { type, value } = normalizeContact(input.contact);
    const passwordHash = await hashPassword(input.password);

    const existing = await prisma.user.findFirst({
      where: type === "email" ? { email: value } : { phone: value },
    });
    if (existing) {
      throw conflict(
        type === "email" ? "This email is already registered." : "This phone number is already registered.",
        type === "email" ? "emailInUse" : "phoneInUse"
      );
    }

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: type === "email" ? value : null,
        phone: type === "phone" ? value : null,
        passwordHash,
        locale: input.locale ?? config.defaultLocale,
        profile: { create: {} },
      },
    });

    const created = await this.createSession(user.id);
    return { user: toAuthUser(user), session: created.session, token: created.token };
  }

  static async login(input: { contact: string; password: string }): Promise<{ user: AuthUser; session: SessionInfo; token: string }> {
    const { type, value } = normalizeContact(input.contact);
    const user = await prisma.user.findFirst({
      where: type === "email" ? { email: value } : { phone: value },
    });

    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw unauthorized("Invalid email/phone or password.", "invalidCredentials");
    }

    const created = await this.createSession(user.id);
    return { user: toAuthUser(user), session: created.session, token: created.token };
  }

  static async createSession(
    userId: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ session: SessionInfo; token: string }> {
    const token = newSessionToken();
    const session = await prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + config.sessionTtlMs),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });
    return {
      session: {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
      token,
    };
  }

  static sessionTokenFromCookie(cookie: string | undefined): string | null {
    return cookie || null;
  }

  /** Resolves a session token to a user. Sliding expiration. */
  static async resolveSession(token: string | null): Promise<AuthUser | null> {
    if (!token) return null;
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }
    // sliding expiration: refresh if older than 24h
    if (Date.now() - session.lastUsedAt.getTime() > 24 * 60 * 60 * 1000) {
      await prisma.session
        .update({
          where: { id: session.id },
          data: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + config.sessionTtlMs) },
        })
        .catch(() => undefined);
    }
    return toAuthUser(session.user);
  }

  static async logout(token: string | null): Promise<void> {
    if (!token) return;
    await prisma.session.delete({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
  }

  static cookieOptions() {
    return {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: config.isProd,
      maxAge: config.sessionTtlMs / 1000,
    };
  }

  static cookieName(): string {
    return SESSION_COOKIE;
  }

  static async verifyContactAvailable(contact: string): Promise<{ ok: boolean; error?: string }> {
    if (isEmail(contact)) {
      const exists = await prisma.user.findUnique({ where: { email: contact.trim().toLowerCase() } });
      return exists ? { ok: false, error: "emailInUse" } : { ok: true };
    }
    if (!isValidPhone(contact)) return { ok: false, error: "invalidContact" };
    const exists = await prisma.user.findUnique({ where: { phone: normalizePhone(contact) } });
    return exists ? { ok: false, error: "phoneInUse" } : { ok: true };
  }
}

export { toAuthUser };