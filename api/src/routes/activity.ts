import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ActivityService } from "../services/tracker/ActivityService";
import { authenticate } from "./helpers";

interface ActivityBody {
  date?: string;
  type?: string;
  steps?: number;
  activeMinutes?: number;
  distanceKm?: number | null;
  note?: string | null;
  source?: string;
}

export function registerActivityRoutes(app: FastifyInstance): void {
  app.get("/api/activity/today", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const today = await ActivityService.today(user.id, req.query.date);
    return { success: true, data: today };
  });

  app.get("/api/activity/week", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const week = await ActivityService.week(user.id, req.query.date);
    return { success: true, data: week };
  });

  app.post("/api/activity", async (req: FastifyRequest<{ Body: ActivityBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const result = await ActivityService.log(user.id, {
      date: body.date,
      type: body.type,
      steps: body.steps,
      activeMinutes: body.activeMinutes,
      distanceKm: body.distanceKm,
      note: body.note,
      source: body.source === "bot" || body.source === "miniapp" ? body.source : "website",
    });
    return { success: true, data: result };
  });

  app.delete("/api/activity/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await ActivityService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });

  app.patch("/api/activity/goal", async (req: FastifyRequest<{ Body: { stepsGoal?: number } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const data = await ActivityService.setGoal(user.id, req.body?.stepsGoal);
    return { success: true, data };
  });
}