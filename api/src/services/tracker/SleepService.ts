import type { SleepEntry } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { getProfileTargets, lastNDays, parseDate, publish, todayStr, type TrackerSource } from "./common";

const VALID_SOURCES: TrackerSource[] = ["website", "bot", "miniapp", "custom"];

function mapEntry(e: {
  id: string;
  userId: string;
  date: string;
  sleepStart: Date | null;
  wakeTime: Date | null;
  durationMinutes: number;
  goalMinutes: number;
  source: string;
  note: string | null;
  createdAt: Date;
}): SleepEntry {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date,
    sleepStart: e.sleepStart?.toISOString() ?? null,
    wakeTime: e.wakeTime?.toISOString() ?? null,
    durationMinutes: e.durationMinutes,
    goalMinutes: e.goalMinutes,
    source: (e.source as SleepEntry["source"]) ?? "website",
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  };
}

export class SleepService {
  static async today(userId: string, date?: string): Promise<{ entry: SleepEntry | null; goalMinutes: number }> {
    const day = parseDate(date);
    const targets = await getProfileTargets(userId);
    const entry = await prisma.sleepEntry.findFirst({ where: { userId, date: day }, orderBy: { createdAt: "desc" } });
    return { entry: entry ? mapEntry(entry) : null, goalMinutes: targets.sleepGoalMinutes };
  }

  static async log(
    userId: string,
    input: {
      date?: string;
      sleepStart?: string | null;
      wakeTime?: string | null;
      durationMinutes?: number;
      note?: string | null;
      source?: TrackerSource;
    }
  ): Promise<SleepEntry> {
    const date = parseDate(input.date);
    let durationMinutes = Math.round(Number(input.durationMinutes ?? 0));
    if (input.sleepStart && input.wakeTime) {
      const start = new Date(input.sleepStart);
      const wake = new Date(input.wakeTime);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(wake.getTime()) && wake > start) {
        durationMinutes = Math.round((wake.getTime() - start.getTime()) / 60000);
      }
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 60 || durationMinutes > 960) {
      throw badRequest("Invalid sleep duration.", "sleepInvalid");
    }
    const targets = await getProfileTargets(userId);
    const source = VALID_SOURCES.includes(input.source ?? "website") ? (input.source ?? "website") : "website";
    const entry = await prisma.sleepEntry.create({
      data: {
        userId,
        date,
        sleepStart: input.sleepStart ? new Date(input.sleepStart) : null,
        wakeTime: input.wakeTime ? new Date(input.wakeTime) : null,
        durationMinutes,
        goalMinutes: targets.sleepGoalMinutes,
        source,
        note: input.note?.trim() || null,
      },
    });
    publish(userId, { type: "sleep.changed", action: "created", targetId: entry.id });
    return mapEntry(entry);
  }

  static async remove(userId: string, entryId: string): Promise<void> {
    const existing = await prisma.sleepEntry.findFirst({ where: { id: entryId, userId } });
    if (!existing) throw notFound("Sleep entry not found.", "notFound");
    await prisma.sleepEntry.delete({ where: { id: entryId } });
    publish(userId, { type: "sleep.changed", action: "deleted", targetId: entryId });
  }

  static async week(
    userId: string,
    date?: string
  ): Promise<{ days: { date: string; durationMinutes: number }[]; avgDuration: number; consistency: number }> {
    const end = parseDate(date);
    const days = lastNDays(7, end);
    const rows = await prisma.sleepEntry.findMany({ where: { userId, date: { in: days } } });
    const byDate = new Map<string, number>();
    for (const row of rows) byDate.set(row.date, row.durationMinutes);
    const dayRows = days.map((d) => ({ date: d, durationMinutes: byDate.get(d) ?? 0 }));
    const withSleep = dayRows.filter((d) => d.durationMinutes > 0);
    const avgDuration = withSleep.length ? Math.round(withSleep.reduce((s, d) => s + d.durationMinutes, 0) / withSleep.length) : 0;
    return {
      days: dayRows,
      avgDuration,
      consistency: Math.round((withSleep.length / days.length) * 100),
    };
  }

  static async setGoal(userId: string, goalMinutes?: number): Promise<{ goalMinutes: number }> {
    const value = Math.round(Number(goalMinutes ?? 0));
    if (!Number.isFinite(value) || value < 240 || value > 720) {
      throw badRequest("Invalid sleep goal.", "sleepInvalid");
    }
    await prisma.profile.upsert({ where: { userId }, create: { userId, sleepGoalMinutes: value }, update: { sleepGoalMinutes: value } });
    publish(userId, { type: "wellness.changed" });
    return { goalMinutes: value };
  }

  static async latest(userId: string): Promise<{ date: string; durationMinutes: number } | null> {
    const row = await prisma.sleepEntry.findFirst({ where: { userId }, orderBy: { date: "desc" } });
    return row ? { date: row.date, durationMinutes: row.durationMinutes } : null;
  }

  static hasRecentData(userId: string, end = todayStr()): Promise<number> {
    return prisma.sleepEntry.count({ where: { userId, date: { in: lastNDays(7, end) } } });
  }
}