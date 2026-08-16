import type { Workout, WorkoutCategory, WorkoutExercise } from "@app/shared";
import { WORKOUT_CATEGORIES } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { getProfileTargets, lastNDays, parseDate, publish, type TrackerSource } from "./common";

const VALID_SOURCES: TrackerSource[] = ["website", "bot", "miniapp", "custom"];
const VALID_INTENSITY = ["low", "moderate", "high"];

export interface WorkoutInput {
  date?: string;
  category?: WorkoutCategory;
  durationMinutes?: number;
  intensity?: string | null;
  notes?: string | null;
  exercises?: { name?: string; sets?: number; reps?: number | null; weightKg?: number | null; durationSeconds?: number | null }[];
  source?: TrackerSource;
}

function mapExercise(e: {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
}): WorkoutExercise {
  return {
    id: e.id,
    workoutId: e.workoutId,
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weightKg,
    durationSeconds: e.durationSeconds,
  };
}

function mapWorkout(w: {
  id: string;
  userId: string;
  date: string;
  category: string;
  durationMinutes: number;
  intensity: string | null;
  notes: string | null;
  source: string;
  createdAt: Date;
  exercises?: { id: string; workoutId: string; name: string; sets: number; reps: number | null; weightKg: number | null; durationSeconds: number | null }[];
}): Workout {
  return {
    id: w.id,
    userId: w.userId,
    date: w.date,
    category: (w.category as WorkoutCategory) ?? "custom",
    durationMinutes: w.durationMinutes,
    intensity: w.intensity,
    notes: w.notes,
    source: (w.source as Workout["source"]) ?? "website",
    createdAt: w.createdAt.toISOString(),
    exercises: (w.exercises ?? []).map(mapExercise),
  };
}

function parseExercises(input: WorkoutInput["exercises"]): { name: string; sets: number; reps: number | null; weightKg: number | null; durationSeconds: number | null }[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((ex) => ex && typeof ex === "object")
    .map((ex) => ({
      name: String(ex.name ?? "").trim().slice(0, 100),
      sets: Math.max(1, Math.min(50, Math.round(Number(ex.sets ?? 1)))),
      reps: ex.reps !== undefined && ex.reps !== null ? Math.max(0, Math.min(1000, Math.round(Number(ex.reps)))) : null,
      weightKg: ex.weightKg !== undefined && ex.weightKg !== null ? Number(ex.weightKg) : null,
      durationSeconds: ex.durationSeconds !== undefined && ex.durationSeconds !== null ? Math.max(0, Math.round(Number(ex.durationSeconds))) : null,
    }))
    .filter((ex) => ex.name.length > 0)
    .slice(0, 30);
}

export class WorkoutService {
  static async list(userId: string, page = 1, pageSize = 20): Promise<{ items: Workout[]; total: number; page: number; pageSize: number }> {
    const p = Math.max(1, page);
    const ps = Math.min(100, Math.max(1, pageSize));
    const [rows, total] = await Promise.all([
      prisma.workout.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
        include: { exercises: true },
      }),
      prisma.workout.count({ where: { userId } }),
    ]);
    return { items: rows.map(mapWorkout), total, page: p, pageSize: ps };
  }

  static async get(userId: string, workoutId: string): Promise<Workout> {
    const row = await prisma.workout.findFirst({ where: { id: workoutId, userId }, include: { exercises: true } });
    if (!row) throw notFound("Workout not found.", "workoutNotFound");
    return mapWorkout(row);
  }

  static async create(userId: string, input: WorkoutInput): Promise<Workout> {
    const date = parseDate(input.date);
    const durationMinutes = Math.round(Number(input.durationMinutes ?? 0));
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
      throw badRequest("Invalid workout duration.", "workoutNotFound");
    }
    const category = WORKOUT_CATEGORIES.includes(input.category ?? ("" as WorkoutCategory)) ? input.category! : "custom";
    const intensity = input.intensity !== undefined && input.intensity !== null && VALID_INTENSITY.includes(input.intensity) ? input.intensity : null;
    const targets = await getProfileTargets(userId);
    const source = VALID_SOURCES.includes(input.source ?? "website") ? (input.source ?? "website") : "website";
    const exercises = parseExercises(input.exercises);

    const row = await prisma.workout.create({
      data: {
        userId,
        date,
        category,
        durationMinutes,
        intensity,
        notes: input.notes?.trim() || null,
        source,
        exercises: exercises.length ? { create: exercises } : undefined,
      },
      include: { exercises: true },
    });
    publish(userId, { type: "workout.changed", action: "created", targetId: row.id });
    return mapWorkout(row);
  }

  static async update(userId: string, workoutId: string, input: WorkoutInput): Promise<Workout> {
    const existing = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
    if (!existing) throw notFound("Workout not found.", "workoutNotFound");
    const data: Record<string, unknown> = {};
    if (input.date !== undefined) data.date = parseDate(input.date);
    if (input.durationMinutes !== undefined) {
      const durationMinutes = Math.round(Number(input.durationMinutes));
      if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
        throw badRequest("Invalid workout duration.", "workoutNotFound");
      }
      data.durationMinutes = durationMinutes;
    }
    if (input.category !== undefined) data.category = WORKOUT_CATEGORIES.includes(input.category) ? input.category : "custom";
    if (input.intensity !== undefined) data.intensity = input.intensity !== null && VALID_INTENSITY.includes(input.intensity) ? input.intensity : null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.exercises !== undefined) {
      await prisma.workoutExercise.deleteMany({ where: { workoutId } });
      data.exercises = { create: parseExercises(input.exercises) };
    }
    const row = await prisma.workout.update({ where: { id: workoutId }, data, include: { exercises: true } });
    publish(userId, { type: "workout.changed", action: "updated", targetId: row.id });
    return mapWorkout(row);
  }

  static async remove(userId: string, workoutId: string): Promise<void> {
    const existing = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
    if (!existing) throw notFound("Workout not found.", "workoutNotFound");
    await prisma.workout.delete({ where: { id: workoutId } });
    publish(userId, { type: "workout.changed", action: "deleted", targetId: workoutId });
  }

  static async week(userId: string, date?: string): Promise<{ days: { date: string; minutes: number }[]; totalMinutes: number; count: number }> {
    const end = parseDate(date);
    const days = lastNDays(7, end);
    const rows = await prisma.workout.findMany({ where: { userId, date: { in: days } } });
    const byDate = new Map<string, number>();
    for (const row of rows) byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.durationMinutes);
    const dayRows = days.map((d) => ({ date: d, minutes: byDate.get(d) ?? 0 }));
    return {
      days: dayRows,
      totalMinutes: dayRows.reduce((s, d) => s + d.minutes, 0),
      count: rows.length,
    };
  }
}