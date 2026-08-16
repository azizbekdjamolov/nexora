import type { GoalStatus } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { GoalService } from "../services/tracker/GoalService";
import { authenticate } from "./helpers";

interface GoalBody {
  title?: string;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  progress?: number;
  deadline?: string | null;
  status?: GoalStatus;
}

export function registerGoalRoutes(app: FastifyInstance): void {
  app.get("/api/goals", async (req: FastifyRequest<{ Querystring: { status?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const status = req.query.status === "active" || req.query.status === "completed" || req.query.status === "archived" ? (req.query.status as GoalStatus) : undefined;
    const goals = await GoalService.list(user.id, status);
    return { success: true, data: { goals } };
  });

  app.post("/api/goals", async (req: FastifyRequest<{ Body: GoalBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const goal = await GoalService.create(user.id, body);
    return { success: true, data: { goal } };
  });

  app.get("/api/goals/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const goal = await GoalService.get(user.id, req.params.id);
    return { success: true, data: { goal } };
  });

  app.patch("/api/goals/:id", async (req: FastifyRequest<{ Params: { id: string }; Body: GoalBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const goal = await GoalService.update(user.id, req.params.id, body);
    return { success: true, data: { goal } };
  });

  app.delete("/api/goals/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await GoalService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });
}