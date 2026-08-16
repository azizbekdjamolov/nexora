import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SleepService } from "../services/tracker/SleepService";
import { authenticate } from "./helpers";

interface SleepBody {
  date?: string;
  sleepStart?: string | null;
  wakeTime?: string | null;
  durationMinutes?: number;
  note?: string | null;
  source?: string;
}

export function registerSleepRoutes(app: FastifyInstance): void {
  app.get("/api/sleep/today", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const today = await SleepService.today(user.id, req.query.date);
    return { success: true, data: today };
  });

  app.get("/api/sleep/week", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const week = await SleepService.week(user.id, req.query.date);
    return { success: true, data: week };
  });

  app.post("/api/sleep", async (req: FastifyRequest<{ Body: SleepBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const entry = await SleepService.log(user.id, {
      date: body.date,
      sleepStart: body.sleepStart,
      wakeTime: body.wakeTime,
      durationMinutes: body.durationMinutes,
      note: body.note,
      source: body.source === "bot" || body.source === "miniapp" ? body.source : "website",
    });
    return { success: true, data: { entry } };
  });

  app.delete("/api/sleep/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await SleepService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });

  app.patch("/api/sleep/goal", async (req: FastifyRequest<{ Body: { goalMinutes?: number } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const data = await SleepService.setGoal(user.id, req.body?.goalMinutes);
    return { success: true, data };
  });
}