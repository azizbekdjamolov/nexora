import type { Notification } from "@app/shared";
import { prisma } from "../db";
import { config, telegramApiUrl } from "../config";
import { eventBus, notificationEvent } from "../events/bus";

export type NotificationSource = "website" | "bot" | "miniapp" | "telegram" | "system";

function mapNotification(n: {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  payload: string | null;
  read: boolean;
  createdAt: Date;
}): Notification {
  let payload: Record<string, unknown> | null = null;
  if (n.payload) {
    try {
      payload = JSON.parse(n.payload) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    payload,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

/**
 * Single notification entry point. All platforms go through this service.
 * Future channels (email, push, SMS) plug in here without touching handlers.
 */
export class NotificationService {
  static async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
    payload?: Record<string, unknown> | null,
    source: NotificationSource = "system"
  ): Promise<Notification | null> {
    if (source === "bot") return null; // the bot itself is the UI — no self-notifications

    const row = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    eventBus.publish(userId, notificationEvent(row.id));

    // Telegram push channel (if the user has a linked account)
    if (source !== "telegram") {
      await this.sendTelegramMessage(userId, `${title}: ${message}`).catch(() => undefined);
    }
    return mapNotification(row);
  }

  static async list(userId: string, limit = 50): Promise<Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, limit),
    });
    return rows.map(mapNotification);
  }

  static async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  /** Sends a Telegram message to the user's linked chat via the Telegram Bot API. */
  static async sendTelegramMessage(userId: string, text: string): Promise<boolean> {
    if (!config.telegram.botToken) return false;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.telegramUserId) return false;
    const res = await fetch(telegramApiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: Number(user.telegramUserId), text, disable_web_page_preview: true }),
    });
    return res.ok;
  }
}