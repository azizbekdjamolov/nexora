import type { Habit } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { parseDate, publish, todayStr } from "./common";

function mapHabit(h: {
  id: string;
  userId: string;
  name: string;
  icon: string;
  frequency: string;
  targetPerWeek: number;
  reminderTime: string | null;
  active: boolean;
  createdAt: Date;
  completions?: { date: string; done: boolean }[];
}): Habit {
  const completions = h.completions ?? [];
  const today = todayStr();
  const doneToday = completions.some((c) => c.date === today && c.done);
  const doneDates = new Set(completions.filter((c) => c.done).map((c) => c.date));
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  for (let i = 0; i < 3650; i++) {
    const d = cursor.toISOString().slice(0, 10);
    if (doneDates.has(d)) {
      streak++;
      cursor.setTime(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  return {
    id: h.id,
    userId: h.userId,
    name: h.name,
    icon: h.icon || "✓",
    frequency: (h.frequency as Habit["frequency"]) ?? "daily",
    targetPerWeek: h.targetPerWeek,
    reminderTime: h.reminderTime,
    active: h.active,
    createdAt: h.createdAt.toISOString(),
    doneToday,
    currentStreak: streak,
    totalCompletions: completions.filter((c) => c.done).length,
  };
}

export class HabitService {
  static async list(userId: string): Promise<Habit[]> {
    const rows = await prisma.habit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
      include: { completions: { where: { done: true }, select: { date: true, done: true } } },
    });
    return rows.map(mapHabit);
  }

  static async get(userId: string, habitId: string): Promise<Habit> {
    const row = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: { completions: { where: { done: true }, select: { date: true, done: true } } },
    });
    if (!row) throw notFound("Habit not found.", "habitNotFound");
    return mapHabit(row);
  }

  static async create(
    userId: string,
    input: { name?: string; icon?: string; frequency?: string; targetPerWeek?: number; reminderTime?: string | null }
  ): Promise<Habit> {
    const name = String(input.name ?? "").trim();
    if (!name || name.length < 1 || name.length > 100) {
      throw badRequest("Habit name is required (1–100 characters).", "invalidInput");
    }
    const frequency = input.frequency === "weekly" ? "weekly" : "daily";
    const targetPerWeek = Math.min(21, Math.max(1, Math.round(Number(input.targetPerWeek ?? (frequency === "daily" ? 7 : 3)))));
    const reminderTime = input.reminderTime && /^\d{2}:\d{2}$/.test(input.reminderTime) ? input.reminderTime : null;
    const row = await prisma.habit.create({
      data: {
        userId,
        name,
        icon: String(input.icon ?? "✓").trim().slice(0, 4) || "✓",
        frequency,
        targetPerWeek,
        reminderTime,
      },
      include: { completions: { where: { done: true }, select: { date: true, done: true } } },
    });
    publish(userId, { type: "habits.changed", action: "created", targetId: row.id });
    return mapHabit(row);
  }

  static async update(
    userId: string,
    habitId: string,
    input: { name?: string; icon?: string; frequency?: string; targetPerWeek?: number; reminderTime?: string | null; active?: boolean }
  ): Promise<Habit> {
    const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!existing) throw notFound("Habit not found.", "habitNotFound");
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name || name.length > 100) throw badRequest("Invalid habit name.", "invalidInput");
      data.name = name;
    }
    if (input.icon !== undefined) data.icon = String(input.icon).trim().slice(0, 4) || "✓";
    if (input.frequency !== undefined) data.frequency = input.frequency === "weekly" ? "weekly" : "daily";
    if (input.targetPerWeek !== undefined) data.targetPerWeek = Math.min(21, Math.max(1, Math.round(Number(input.targetPerWeek))));
    if (input.reminderTime !== undefined) data.reminderTime = input.reminderTime && /^\d{2}:\d{2}$/.test(input.reminderTime) ? input.reminderTime : null;
    if (input.active !== undefined) data.active = Boolean(input.active);
    const row = await prisma.habit.update({
      where: { id: habitId },
      data,
      include: { completions: { where: { done: true }, select: { date: true, done: true } } },
    });
    publish(userId, { type: "habits.changed", action: "updated", targetId: row.id });
    return mapHabit(row);
  }

  static async remove(userId: string, habitId: string): Promise<void> {
    const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!existing) throw notFound("Habit not found.", "habitNotFound");
    await prisma.habit.delete({ where: { id: habitId } });
    publish(userId, { type: "habits.changed", action: "deleted", targetId: habitId });
  }

  /** Toggles today's completion (or a given date). */
  static async toggle(userId: string, habitId: string, date?: string): Promise<{ habit: Habit; done: boolean; date: string }> {
    const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!existing) throw notFound("Habit not found.", "habitNotFound");
    const day = parseDate(date);
    const completion = await prisma.habitCompletion.findUnique({ where: { habitId_date: { habitId, date: day } } });
    const done = !(completion?.done ?? false);
    await prisma.habitCompletion.upsert({
      where: { habitId_date: { habitId, date: day } },
      create: { habitId, date: day, done },
      update: { done },
    });
    const habit = await this.get(userId, habitId);
    publish(userId, { type: "habits.changed", action: "updated", targetId: habitId });
    return { habit, done, date: day };
  }

  static async calendar(userId: string, habitId: string, yearMonth?: string): Promise<string[]> {
    const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!existing) throw notFound("Habit not found.", "habitNotFound");
    const rows = await prisma.habitCompletion.findMany({
      where: { habitId, done: true },
      select: { date: true },
      orderBy: { date: "asc" },
    });
    return rows.map((r) => r.date);
  }

  /** Habits due today (active, with reminderTime). */
  static async dueReminderHabits(): Promise<{ habit: { id: string; userId: string; name: string; reminderTime: string } }[]> {
    const rows = await prisma.habit.findMany({
      where: { active: true, reminderTime: { not: null } },
      select: { id: true, userId: true, name: true, reminderTime: true },
    });
    return rows.map((h) => ({ habit: { id: h.id, userId: h.userId, name: h.name, reminderTime: h.reminderTime! } }));
  }

  static async statsForWeek(userId: string, dates: string[]): Promise<{ done: number; total: number }> {
    const habits = await prisma.habit.findMany({ where: { userId, active: true }, select: { id: true } });
    if (habits.length === 0) return { done: 0, total: 0 };
    const done = await prisma.habitCompletion.count({
      where: { habit: { userId }, date: { in: dates }, done: true },
    });
    return { done, total: habits.length * dates.length };
  }
}