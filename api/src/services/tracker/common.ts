import type { Profile } from "@app/shared";
import { WELLNESS_DEFAULTS } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { eventBus } from "../../events/bus";
import type { RealtimeEvent } from "@app/shared";

/** Current date as YYYY-MM-DD (server clock). */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export type TrackerSource = "website" | "bot" | "miniapp" | "custom";

export function parseDate(value: string | undefined | null): string {
  const date = (value ?? todayStr()).trim();
  if (!isValidDateString(date)) throw badRequest("Invalid date.", "invalidInput");
  return date;
}

/** Last n days as YYYY-MM-DD, oldest → newest, ending at `end`. */
export function lastNDays(n: number, end = todayStr()): string[] {
  const days: string[] = [];
  const endDate = new Date(`${end}T00:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate.getTime() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export interface ProfileTargets {
  waterTargetMl: number;
  sleepGoalMinutes: number;
  activityStepsGoal: number;
  workoutGoalMinutes: number;
  notificationsEnabled: boolean;
}

export async function getProfileTargets(userId: string): Promise<ProfileTargets> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    await prisma.profile.create({ data: { userId } });
    return {
      waterTargetMl: WELLNESS_DEFAULTS.waterTargetMl,
      sleepGoalMinutes: WELLNESS_DEFAULTS.sleepGoalMinutes,
      activityStepsGoal: WELLNESS_DEFAULTS.activityStepsGoal,
      workoutGoalMinutes: WELLNESS_DEFAULTS.workoutGoalMinutes,
      notificationsEnabled: true,
    };
  }
  return {
    waterTargetMl: profile.waterTargetMl,
    sleepGoalMinutes: profile.sleepGoalMinutes,
    activityStepsGoal: profile.activityStepsGoal,
    workoutGoalMinutes: profile.workoutGoalMinutes,
    notificationsEnabled: profile.notificationsEnabled,
  };
}

export function mapProfile(p: {
  id: string;
  userId: string;
  bio: string | null;
  timezone: string | null;
  waterTargetMl: number;
  sleepGoalMinutes: number;
  activityStepsGoal: number;
  workoutGoalMinutes: number;
  notificationsEnabled: boolean;
  updatedAt: Date;
}): Profile {
  return {
    id: p.id,
    userId: p.userId,
    bio: p.bio,
    timezone: p.timezone,
    waterTargetMl: p.waterTargetMl,
    sleepGoalMinutes: p.sleepGoalMinutes,
    activityStepsGoal: p.activityStepsGoal,
    workoutGoalMinutes: p.workoutGoalMinutes,
    notificationsEnabled: p.notificationsEnabled,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function publish(userId: string, event: Omit<RealtimeEvent, "timestamp">): void {
  eventBus.publish(userId, { ...event, timestamp: Date.now() });
}

export async function requireOwned<T>(row: T | null, message: string, code = "notFound"): Promise<T> {
  if (!row) throw notFound(message, code);
  return row;
}