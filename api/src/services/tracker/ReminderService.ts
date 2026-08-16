import type { Reminder, ReminderType } from "@app/shared";
import { REMINDER_TYPES } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { NotificationService } from "../NotificationService";
import { publish } from "./common";

function mapReminder(r: {
  id: string;
  userId: string;
  type: string;
  title: string;
  time: string;
  days: string;
  enabled: boolean;
  payload: string | null;
  lastTriggeredAt: Date | null;
  createdAt: Date;
}): Reminder {
  let days: number[] = [];
  try {
    days = JSON.parse(r.days) as number[];
  } catch {
    days = [];
  }
  let payload: Record<string, unknown> | null = null;
  if (r.payload) {
    try {
      payload = JSON.parse(r.payload) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }
  return {
    id: r.id,
    userId: r.userId,
    type: (r.type as ReminderType) ?? "custom",
    title: r.title,
    time: r.time,
    days,
    enabled: r.enabled,
    payload,
    lastTriggeredAt: r.lastTriggeredAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export interface ReminderInput {
  type?: ReminderType;
  title?: string;
  time?: string;
  days?: number[];
  enabled?: boolean;
  payload?: Record<string, unknown> | null;
}

export class ReminderService {
  static async list(userId: string, type?: ReminderType): Promise<Reminder[]> {
    const rows = await prisma.reminder.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: [{ enabled: "desc" }, { time: "asc" }],
      take: 200,
    });
    return rows.map(mapReminder);
  }

  static async create(userId: string, input: ReminderInput): Promise<Reminder> {
    const validated = this.validate(input);
    const row = await prisma.reminder.create({ data: { userId, ...validated } });
    publish(userId, { type: "reminders.changed", action: "created", targetId: row.id });
    return mapReminder(row);
  }

  static async update(userId: string, reminderId: string, input: ReminderInput): Promise<Reminder> {
    const existing = await prisma.reminder.findFirst({ where: { id: reminderId, userId } });
    if (!existing) throw notFound("Reminder not found.", "reminderNotFound");
    const validated = this.validate(input);
    const row = await prisma.reminder.update({ where: { id: reminderId }, data: validated });
    publish(userId, { type: "reminders.changed", action: "updated", targetId: row.id });
    return mapReminder(row);
  }

  static async remove(userId: string, reminderId: string): Promise<void> {
    const existing = await prisma.reminder.findFirst({ where: { id: reminderId, userId } });
    if (!existing) throw notFound("Reminder not found.", "reminderNotFound");
    await prisma.reminder.delete({ where: { id: reminderId } });
    publish(userId, { type: "reminders.changed", action: "deleted", targetId: reminderId });
  }

  static async toggle(userId: string, reminderId: string): Promise<Reminder> {
    const existing = await prisma.reminder.findFirst({ where: { id: reminderId, userId } });
    if (!existing) throw notFound("Reminder not found.", "reminderNotFound");
    const row = await prisma.reminder.update({ where: { id: reminderId }, data: { enabled: !existing.enabled } });
    publish(userId, { type: "reminders.changed", action: "updated", targetId: row.id });
    return mapReminder(row);
  }

  private static validate(input: ReminderInput): {
    type: string;
    title: string;
    time: string;
    days: string;
    enabled: boolean;
    payload: string | null;
  } {
    const type = REMINDER_TYPES.includes(input.type ?? ("" as ReminderType)) ? input.type! : "custom";
    const title = String(input.title ?? "").trim();
    if (!title || title.length > 120) throw badRequest("Reminder title is required (1–120 characters).", "invalidInput");
    const time = String(input.time ?? "");
    if (!/^\d{2}:\d{2}$/.test(time)) throw badRequest("Invalid reminder time (HH:mm).", "invalidInput");
    const days = Array.isArray(input.days)
      ? [...new Set(input.days.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort()
      : [];
    return {
      type,
      title,
      time,
      days: JSON.stringify(days),
      enabled: input.enabled !== undefined ? Boolean(input.enabled) : true,
      payload: input.payload ? JSON.stringify(input.payload) : null,
    };
  }

  /**
   * Sends due reminders (once per day each). Called by the scheduler.
   * Tracking only — never medical advice.
   */
  static async checkDue(now = new Date()): Promise<{ sent: number; skipped: number }> {
    let sent = 0;
    let skipped = 0;
    const weekday = (now.getDay() + 6) % 7; // Monday = 0
    const hhmm = now.toTimeString().slice(0, 5);
    const today = now.toISOString().slice(0, 10);

    const reminders = await prisma.reminder.findMany({
      where: { enabled: true },
      include: { user: { select: { telegramUserId: true, profile: { select: { notificationsEnabled: true } } } } },
    });

    for (const reminder of reminders) {
      let days: number[] = [];
      try {
        days = JSON.parse(reminder.days) as number[];
      } catch {
        days = [];
      }
      const matchesDay = days.length === 0 || days.includes(weekday);
      if (!matchesDay || reminder.time > hhmm) continue;
      const lastTriggered = reminder.lastTriggeredAt;
      if (lastTriggered && lastTriggered.toISOString().slice(0, 10) === today) continue;
      if (reminder.user.profile?.notificationsEnabled === false) {
        skipped++;
        continue;
      }

      await prisma.reminder.update({ where: { id: reminder.id }, data: { lastTriggeredAt: now } }).catch(() => undefined);
      const title = reminder.title;
      const message =
        reminder.type === "medication"
          ? `💊 ${title} — ${reminder.time}. Reminder only — follow your doctor's instructions.`
          : `🔔 ${title} — ${reminder.time}`;
      await NotificationService.notify(reminder.userId, `reminder.${reminder.type}`, title, message, { reminderId: reminder.id }, "telegram").catch(
        () => undefined
      );
      if (reminder.user.telegramUserId) {
        const ok = await NotificationService.sendTelegramMessage(reminder.userId, message).catch(() => false);
        if (ok) sent++;
      }
    }
    return { sent, skipped };
  }
}