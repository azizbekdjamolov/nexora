import type { Goal, GoalStatus } from "@app/shared";
import { GOAL_STATUSES } from "@app/shared";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../errors";
import { isValidDateString, publish } from "./common";

function mapGoal(g: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  targetValue: number | null;
  unit: string | null;
  progress: number;
  deadline: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Goal {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    targetValue: g.targetValue,
    unit: g.unit,
    progress: g.progress,
    deadline: g.deadline,
    status: (g.status as GoalStatus) ?? "active",
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export class GoalService {
  static async list(userId: string, status?: GoalStatus): Promise<Goal[]> {
    const rows = await prisma.goal.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return rows.map(mapGoal);
  }

  static async get(userId: string, goalId: string): Promise<Goal> {
    const row = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!row) throw notFound("Goal not found.", "goalNotFound");
    return mapGoal(row);
  }

  static async create(
    userId: string,
    input: {
      title?: string;
      description?: string | null;
      targetValue?: number | null;
      unit?: string | null;
      progress?: number;
      deadline?: string | null;
      status?: GoalStatus;
    }
  ): Promise<Goal> {
    const title = String(input.title ?? "").trim();
    if (!title || title.length > 200) throw badRequest("Goal title is required (1–200 characters).", "invalidInput");
    const targetValue = input.targetValue !== undefined && input.targetValue !== null ? Number(input.targetValue) : null;
    if (targetValue !== null && (!Number.isFinite(targetValue) || targetValue <= 0)) {
      throw badRequest("Invalid target value.", "invalidInput");
    }
    let progress = Number(input.progress ?? 0);
    if (!Number.isFinite(progress) || progress < 0) progress = 0;
    if (targetValue !== null && progress > targetValue) progress = targetValue;
    const deadline = input.deadline && isValidDateString(input.deadline) ? input.deadline : null;
    const status = GOAL_STATUSES.includes(input.status ?? ("" as GoalStatus)) ? input.status! : "active";
    const row = await prisma.goal.create({
      data: {
        userId,
        title,
        description: input.description?.trim() || null,
        targetValue,
        unit: input.unit?.trim()?.slice(0, 20) || null,
        progress,
        deadline,
        status,
      },
    });
    publish(userId, { type: "goals.changed", action: "created", targetId: row.id });
    return mapGoal(row);
  }

  static async update(
    userId: string,
    goalId: string,
    input: {
      title?: string;
      description?: string | null;
      targetValue?: number | null;
      unit?: string | null;
      progress?: number;
      deadline?: string | null;
      status?: GoalStatus;
    }
  ): Promise<Goal> {
    const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!existing) throw notFound("Goal not found.", "goalNotFound");
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      const title = String(input.title).trim();
      if (!title || title.length > 200) throw badRequest("Invalid goal title.", "invalidInput");
      data.title = title;
    }
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.unit !== undefined) data.unit = input.unit?.trim()?.slice(0, 20) || null;
    if (input.deadline !== undefined) data.deadline = input.deadline && isValidDateString(input.deadline) ? input.deadline : null;
    if (input.status !== undefined) data.status = GOAL_STATUSES.includes(input.status) ? input.status : "active";
    if (input.targetValue !== undefined) {
      const targetValue = input.targetValue !== null ? Number(input.targetValue) : null;
      if (targetValue !== null && (!Number.isFinite(targetValue) || targetValue <= 0)) throw badRequest("Invalid target value.", "invalidInput");
      data.targetValue = targetValue;
    }
    if (input.progress !== undefined) {
      let progress = Number(input.progress);
      if (!Number.isFinite(progress) || progress < 0) progress = 0;
      const target = input.targetValue !== undefined && input.targetValue !== null ? Number(input.targetValue) : existing.targetValue;
      if (target !== null && progress > target) progress = target;
      data.progress = progress;
    }
    const row = await prisma.goal.update({ where: { id: goalId }, data });
    publish(userId, { type: "goals.changed", action: "updated", targetId: row.id });
    return mapGoal(row);
  }

  static async remove(userId: string, goalId: string): Promise<void> {
    const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!existing) throw notFound("Goal not found.", "goalNotFound");
    await prisma.goal.delete({ where: { id: goalId } });
    publish(userId, { type: "goals.changed", action: "deleted", targetId: goalId });
  }
}