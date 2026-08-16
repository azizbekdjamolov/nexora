import type { WaterEntry } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { getProfileTargets, lastNDays, parseDate, publish, todayStr, type TrackerSource } from "./common";

function mapEntry(e: {
  id: string;
  userId: string;
  date: string;
  amountMl: number;
  targetMl: number;
  source: string;
  note: string | null;
  createdAt: Date;
}): WaterEntry {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date,
    amountMl: e.amountMl,
    targetMl: e.targetMl,
    source: (e.source as WaterEntry["source"]) ?? "website",
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  };
}

const VALID_SOURCES: TrackerSource[] = ["website", "bot", "miniapp", "custom"];

export class WaterService {
  static async today(userId: string, date?: string): Promise<{ amountMl: number; targetMl: number; entries: WaterEntry[] }> {
    const day = parseDate(date);
    const targets = await getProfileTargets(userId);
    const entries = await prisma.waterEntry.findMany({ where: { userId, date: day }, orderBy: { createdAt: "desc" }, take: 50 });
    return {
      amountMl: entries.reduce((sum, e) => sum + e.amountMl, 0),
      targetMl: targets.waterTargetMl,
      entries: entries.map(mapEntry),
    };
  }

  static async add(
    userId: string,
    input: { amountMl?: number; date?: string; note?: string | null; source?: TrackerSource }
  ): Promise<{ entry: WaterEntry; today: { amountMl: number; targetMl: number } }> {
    const amountMl = Math.round(Number(input.amountMl ?? 0));
    if (!Number.isFinite(amountMl) || amountMl < 50 || amountMl > 5000) {
      throw badRequest("Invalid water amount.", "waterInvalid");
    }
    const date = parseDate(input.date);
    const targets = await getProfileTargets(userId);
    const source = VALID_SOURCES.includes(input.source ?? "website") ? (input.source ?? "website") : "website";
    const entry = await prisma.waterEntry.create({
      data: { userId, date, amountMl, targetMl: targets.waterTargetMl, source, note: input.note?.trim() || null },
    });
    const { amountMl: total } = await this.today(userId, date);
    publish(userId, { type: "water.changed", action: "created", targetId: entry.id });
    return { entry: mapEntry(entry), today: { amountMl: total, targetMl: targets.waterTargetMl } };
  }

  static async remove(userId: string, entryId: string): Promise<void> {
    const existing = await prisma.waterEntry.findFirst({ where: { id: entryId, userId } });
    if (!existing) throw notFound("Water entry not found.", "notFound");
    await prisma.waterEntry.delete({ where: { id: entryId } });
    publish(userId, { type: "water.changed", action: "deleted", targetId: entryId });
  }

  static async week(userId: string, date?: string): Promise<{ days: { date: string; amountMl: number }[]; totalMl: number; streak: number }> {
    const end = parseDate(date);
    const days = lastNDays(7, end);
    const rows = await prisma.waterEntry.findMany({
      where: { userId, date: { in: days } },
      orderBy: { createdAt: "asc" },
    });
    const byDate = new Map<string, number>();
    for (const row of rows) {
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.amountMl);
    }
    const dayRows = days.map((d) => ({ date: d, amountMl: byDate.get(d) ?? 0 }));
    return { days: dayRows, totalMl: dayRows.reduce((s, d) => s + d.amountMl, 0), streak: await this.streak(userId, end) };
  }

  static async streak(userId: string, end = todayStr()): Promise<number> {
    let streak = 0;
    for (const day of lastNDays(365, end).reverse()) {
      const total = await prisma.waterEntry.aggregate({ where: { userId, date: day }, _sum: { amountMl: true } });
      if ((total._sum.amountMl ?? 0) > 0) {
        streak++;
      } else if (day !== end) {
        break;
      }
    }
    return streak;
  }

  static async setTarget(userId: string, targetMl?: number): Promise<{ targetMl: number }> {
    const value = Math.round(Number(targetMl ?? 0));
    if (!Number.isFinite(value) || value < 200 || value > 10000) {
      throw badRequest("Invalid water target.", "waterInvalid");
    }
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, waterTargetMl: value },
      update: { waterTargetMl: value },
    });
    publish(userId, { type: "wellness.changed" });
    return { targetMl: value };
  }
}