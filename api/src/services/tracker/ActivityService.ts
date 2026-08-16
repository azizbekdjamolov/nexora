import type { ActivityEntry } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { getProfileTargets, lastNDays, parseDate, publish, todayStr, type TrackerSource } from "./common";

const VALID_SOURCES: TrackerSource[] = ["website", "bot", "miniapp", "custom"];
const VALID_TYPES = ["walking", "running", "cycling", "general"];

function mapEntry(e: {
  id: string;
  userId: string;
  date: string;
  type: string;
  steps: number;
  activeMinutes: number;
  distanceKm: number | null;
  source: string;
  note: string | null;
  createdAt: Date;
}): ActivityEntry {
  return {
    id: e.id,
    userId: e.userId,
    date: e.date,
    type: (e.type as ActivityEntry["type"]) ?? "general",
    steps: e.steps,
    activeMinutes: e.activeMinutes,
    distanceKm: e.distanceKm,
    source: (e.source as ActivityEntry["source"]) ?? "website",
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  };
}

export class ActivityService {
  static async today(userId: string, date?: string): Promise<{ steps: number; activeMinutes: number; goal: number; entries: ActivityEntry[] }> {
    const day = parseDate(date);
    const targets = await getProfileTargets(userId);
    const entries = await prisma.activityEntry.findMany({ where: { userId, date: day }, orderBy: { createdAt: "desc" }, take: 50 });
    return {
      steps: entries.reduce((s, e) => s + e.steps, 0),
      activeMinutes: entries.reduce((s, e) => s + e.activeMinutes, 0),
      goal: targets.activityStepsGoal,
      entries: entries.map(mapEntry),
    };
  }

  static async log(
    userId: string,
    input: {
      date?: string;
      type?: string;
      steps?: number;
      activeMinutes?: number;
      distanceKm?: number | null;
      note?: string | null;
      source?: TrackerSource;
    }
  ): Promise<{ entry: ActivityEntry; today: { steps: number; goal: number } }> {
    const date = parseDate(input.date);
    const steps = Math.round(Number(input.steps ?? 0));
    const activeMinutes = Math.round(Number(input.activeMinutes ?? 0));
    if (!Number.isFinite(steps) || steps < 0 || steps > 200000) {
      throw badRequest("Invalid steps value.", "activityInvalid");
    }
    if (!Number.isFinite(activeMinutes) || activeMinutes < 0 || activeMinutes > 1440) {
      throw badRequest("Invalid active minutes.", "activityInvalid");
    }
    const type = VALID_TYPES.includes(input.type ?? "") ? input.type! : "general";
    const targets = await getProfileTargets(userId);
    const source = VALID_SOURCES.includes(input.source ?? "website") ? (input.source ?? "website") : "website";
    const entry = await prisma.activityEntry.create({
      data: {
        userId,
        date,
        type,
        steps,
        activeMinutes,
        distanceKm: input.distanceKm !== undefined && input.distanceKm !== null ? Number(input.distanceKm) : null,
        source,
        note: input.note?.trim() || null,
      },
    });
    const { steps: total } = await this.today(userId, date);
    publish(userId, { type: "activity.changed", action: "created", targetId: entry.id });
    return { entry: mapEntry(entry), today: { steps: total, goal: targets.activityStepsGoal } };
  }

  static async remove(userId: string, entryId: string): Promise<void> {
    const existing = await prisma.activityEntry.findFirst({ where: { id: entryId, userId } });
    if (!existing) throw notFound("Activity entry not found.", "notFound");
    await prisma.activityEntry.delete({ where: { id: entryId } });
    publish(userId, { type: "activity.changed", action: "deleted", targetId: entryId });
  }

  static async week(userId: string, date?: string): Promise<{ days: { date: string; steps: number; activeMinutes: number }[]; avgSteps: number }> {
    const end = parseDate(date);
    const days = lastNDays(7, end);
    const rows = await prisma.activityEntry.findMany({ where: { userId, date: { in: days } } });
    const byDate = new Map<string, { steps: number; activeMinutes: number }>();
    for (const row of rows) {
      const cur = byDate.get(row.date) ?? { steps: 0, activeMinutes: 0 };
      cur.steps += row.steps;
      cur.activeMinutes += row.activeMinutes;
      byDate.set(row.date, cur);
    }
    const dayRows = days.map((d) => ({ date: d, ...(byDate.get(d) ?? { steps: 0, activeMinutes: 0 }) }));
    const avgSteps = Math.round(dayRows.reduce((s, d) => s + d.steps, 0) / days.length);
    return { days: dayRows, avgSteps };
  }

  static async setGoal(userId: string, stepsGoal?: number): Promise<{ stepsGoal: number }> {
    const value = Math.round(Number(stepsGoal ?? 0));
    if (!Number.isFinite(value) || value < 1000 || value > 50000) {
      throw badRequest("Invalid steps goal.", "activityInvalid");
    }
    await prisma.profile.upsert({ where: { userId }, create: { userId, activityStepsGoal: value }, update: { activityStepsGoal: value } });
    publish(userId, { type: "wellness.changed" });
    return { stepsGoal: value };
  }
}