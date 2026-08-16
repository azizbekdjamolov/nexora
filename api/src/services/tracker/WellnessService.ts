import { translate, type BotProgressResult, type GoalStatus, type Lang, type WellnessAIInput, type WellnessSummaryResult, type WellnessToday, type WellnessWeek, type WorkoutCategory } from "@app/shared";
import { prisma } from "../../db";
import { getProfileTargets, lastNDays, parseDate, todayStr } from "./common";
import { AIService } from "../AIService";

interface DayAggregate {
  date: string;
  waterMl: number;
  sleepMinutes: number;
  steps: number;
  workoutMinutes: number;
  habitsDone: number;
  habitsTotal: number;
  score: number;
  hasAnyData: boolean;
}

function computeScore(a: Omit<DayAggregate, "score" | "hasAnyData">, targets: {
  waterTargetMl: number;
  sleepGoalMinutes: number;
  activityStepsGoal: number;
}): { score: number; hasAnyData: boolean } {
  const waterPart = targets.waterTargetMl > 0 ? Math.min(1, a.waterMl / targets.waterTargetMl) * 25 : 0;
  const sleepPart = a.sleepMinutes > 0 && targets.sleepGoalMinutes > 0 ? Math.min(1, a.sleepMinutes / targets.sleepGoalMinutes) * 25 : 0;
  const activityPart = targets.activityStepsGoal > 0 ? Math.min(1, a.steps / targets.activityStepsGoal) * 25 : 0;
  const habitsPart = a.habitsTotal > 0 ? (a.habitsDone / a.habitsTotal) * 25 : 0;
  const hasAnyData = a.waterMl > 0 || a.sleepMinutes > 0 || a.steps > 0 || a.habitsDone > 0;
  return { score: Math.round(waterPart + sleepPart + activityPart + habitsPart), hasAnyData };
}

export class WellnessService {
  /** Single-day aggregate used by routes and bots. */
  static async dayAggregate(userId: string, date: string): Promise<DayAggregate> {
    const targets = await getProfileTargets(userId);
    const day = parseDate(date);
    const [water, sleep, activity, workout, habits, completions] = await Promise.all([
      prisma.waterEntry.aggregate({ where: { userId, date: day }, _sum: { amountMl: true } }),
      prisma.sleepEntry.findFirst({ where: { userId, date: day }, orderBy: { createdAt: "desc" } }),
      prisma.activityEntry.aggregate({ where: { userId, date: day }, _sum: { steps: true } }),
      prisma.workout.aggregate({ where: { userId, date: day }, _sum: { durationMinutes: true }, _count: true }),
      prisma.habit.count({ where: { userId, active: true } }),
      prisma.habitCompletion.count({ where: { habit: { userId }, date: day, done: true } }),
    ]);
    const base = {
      date: day,
      waterMl: water._sum.amountMl ?? 0,
      sleepMinutes: sleep?.durationMinutes ?? 0,
      steps: activity._sum.steps ?? 0,
      workoutMinutes: workout._sum.durationMinutes ?? 0,
      habitsDone: completions,
      habitsTotal: habits,
    };
    const { score, hasAnyData } = computeScore(base, targets);
    return { ...base, score, hasAnyData };
  }

  static async today(userId: string, date?: string): Promise<WellnessToday> {
    const day = parseDate(date);
    const targets = await getProfileTargets(userId);
    const agg = await this.dayAggregate(userId, day);
    const { score } = computeScore(agg, targets);
    const waterPart = targets.waterTargetMl > 0 ? Math.min(1, agg.waterMl / targets.waterTargetMl) * 25 : 0;
    const sleepPart = agg.sleepMinutes > 0 && targets.sleepGoalMinutes > 0 ? Math.min(1, agg.sleepMinutes / targets.sleepGoalMinutes) * 25 : 0;
    const activityPart = targets.activityStepsGoal > 0 ? Math.min(1, agg.steps / targets.activityStepsGoal) * 25 : 0;
    const habitsPart = agg.habitsTotal > 0 ? (agg.habitsDone / agg.habitsTotal) * 25 : 0;
    const streak = await this.streak(userId, day);
    return {
      date: day,
      score: Math.round(score),
      scoreParts: {
        water: Math.round(waterPart),
        sleep: Math.round(sleepPart),
        activity: Math.round(activityPart),
        habits: Math.round(habitsPart),
      },
      streak,
      water: { amountMl: agg.waterMl, targetMl: targets.waterTargetMl },
      sleep: { durationMinutes: agg.sleepMinutes, goalMinutes: targets.sleepGoalMinutes, logged: agg.sleepMinutes > 0 },
      activity: { steps: agg.steps, goal: targets.activityStepsGoal, activeMinutes: 0 },
      workout: { durationMinutes: agg.workoutMinutes, goalMinutes: targets.workoutGoalMinutes, count: agg.workoutMinutes > 0 ? 1 : 0 },
      habits: { done: agg.habitsDone, total: agg.habitsTotal },
      hasAnyData: agg.hasAnyData,
    };
  }

  static async week(userId: string, date?: string): Promise<WellnessWeek> {
    const end = parseDate(date);
    const days = lastNDays(7, end);
    const aggDays = await Promise.all(days.map((d) => this.dayAggregate(userId, d)));
    const week: WellnessWeek = {
      days: aggDays.map((d) => ({
        date: d.date,
        score: d.score,
        waterMl: d.waterMl,
        sleepMinutes: d.sleepMinutes,
        steps: d.steps,
        workoutMinutes: d.workoutMinutes,
        habitsDone: d.habitsDone,
        habitsTotal: d.habitsTotal,
      })),
      averages: {
        score: Math.round(aggDays.reduce((s, d) => s + d.score, 0) / 7),
        waterMl: Math.round(aggDays.reduce((s, d) => s + d.waterMl, 0) / 7),
        sleepMinutes: Math.round(aggDays.reduce((s, d) => s + d.sleepMinutes, 0) / 7),
        steps: Math.round(aggDays.reduce((s, d) => s + d.steps, 0) / 7),
        workoutMinutes: Math.round(aggDays.reduce((s, d) => s + d.workoutMinutes, 0) / 7),
        habitsRate: Math.round(
          (aggDays.reduce((s, d) => s + d.habitsDone, 0) / Math.max(1, aggDays.reduce((s, d) => s + d.habitsTotal, 0))) * 100
        ),
      },
    };
    await this.persist(userId, aggDays);
    return week;
  }

  /** Streak of consecutive days with any recorded data, counting today (or yesterday if today is empty). */
  static async streak(userId: string, end = todayStr()): Promise<number> {
    let streak = 0;
    const days = lastNDays(365, end).reverse();
    for (let i = 0; i < days.length; i++) {
      const agg = await this.dayAggregate(userId, days[i]);
      if (agg.hasAnyData) {
        streak++;
      } else if (i === 0) {
        continue; // today empty — allow streak from yesterday
      } else {
        break;
      }
    }
    return streak;
  }

  private static computeHabitStreak(doneDates: string[], today: string): number {
    const done = new Set(doneDates);
    let streak = 0;
    const cursor = new Date(`${today}T00:00:00Z`);
    for (let i = 0; i < 3650; i++) {
      const d = cursor.toISOString().slice(0, 10);
      if (done.has(d)) {
        streak++;
        cursor.setTime(cursor.getTime() - 86400000);
      } else {
        break;
      }
    }
    return streak;
  }

  /** Cache snapshots into DailyWellness rows (idempotent). */
  private static async persist(userId: string, days: DayAggregate[]): Promise<void> {
    await Promise.all(
      days.map((d) =>
        prisma.dailyWellness.upsert({
          where: { userId_date: { userId, date: d.date } },
          create: { userId, date: d.date, score: d.score, waterMl: d.waterMl, sleepMinutes: d.sleepMinutes, steps: d.steps },
          update: { score: d.score, waterMl: d.waterMl, sleepMinutes: d.sleepMinutes, steps: d.steps },
        })
      )
    ).catch(() => undefined);
  }

  static async botProgress(userId: string): Promise<BotProgressResult> {
    const [today, week, streak] = await Promise.all([this.today(userId), this.week(userId), this.streak(userId)]);
    return { today, week, streak };
  }

  /** Weekly AI summary with honest fallback when AI is unavailable. */
  static async aiSummary(userId: string, locale: Lang): Promise<WellnessSummaryResult> {
    const week = await this.week(userId);
    const streak = await this.streak(userId);
    const hasAnyData = week.days.some((d) => d.waterMl > 0 || d.sleepMinutes > 0 || d.steps > 0 || d.habitsDone > 0);
    const generatedAt = new Date().toISOString();

    if (!hasAnyData) {
      return { text: translate(locale, "wellness.summaryNoData"), source: "stats", generatedAt };
    }

    const [goals, habits, workouts] = await Promise.all([
      prisma.goal.findMany({ where: { userId, status: "active" }, select: { title: true, progress: true, status: true }, take: 20 }),
      prisma.habit.findMany({
        where: { userId, active: true },
        select: { name: true, completions: { where: { done: true }, select: { date: true } } },
        take: 30,
      }),
      prisma.workout.findMany({ where: { userId, date: { in: week.days.map((d) => d.date) } }, select: { date: true, category: true, durationMinutes: true }, take: 30 }),
    ]);
    const today = todayStr();

    const input: WellnessAIInput = {
      locale,
      streak,
      days: week.days.map((d) => ({
        date: d.date,
        score: d.score,
        waterMl: d.waterMl,
        sleepMinutes: d.sleepMinutes,
        steps: d.steps,
        workoutMinutes: d.workoutMinutes,
        habitsDone: d.habitsDone,
        habitsTotal: d.habitsTotal,
      })),
      goals: goals.map((g) => ({ title: g.title, progress: g.progress, status: g.status as GoalStatus })),
      habits: habits.map((h) => ({
        name: h.name,
        streak: this.computeHabitStreak(h.completions.map((c) => c.date), today),
        totalCompletions: h.completions.length,
      })),
      workouts: workouts.map((w) => ({ date: w.date, category: w.category as WorkoutCategory, durationMinutes: w.durationMinutes })),
    };

    try {
      const text = await AIService.generateWellnessSummary(userId, input);
      return { text, source: "ai", generatedAt };
    } catch {
      const totals = week.days.reduce(
        (acc, d) => ({
          water: acc.water + d.waterMl,
          sleep: acc.sleep + d.sleepMinutes,
          steps: acc.steps + d.steps,
          workouts: acc.workouts + (d.workoutMinutes > 0 ? 1 : 0),
          habitsDone: acc.habitsDone + d.habitsDone,
          habitsTotal: acc.habitsTotal + d.habitsTotal,
        }),
        { water: 0, sleep: 0, steps: 0, workouts: 0, habitsDone: 0, habitsTotal: 0 }
      );
      return {
        text: translate(locale, "wellness.summaryFallback", {
          water: totals.water,
          sleep: totals.sleep,
          steps: totals.steps,
          workouts: totals.workouts,
          habitsDone: totals.habitsDone,
          habitsTotal: totals.habitsTotal,
        }),
        source: "stats",
        generatedAt,
      };
    }
  }
}