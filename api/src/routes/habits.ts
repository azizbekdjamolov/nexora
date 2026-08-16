import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { HabitService } from "../services/tracker/HabitService";
import { authenticate } from "./helpers";

interface HabitBody {
  name?: string;
  icon?: string;
  frequency?: string;
  targetPerWeek?: number;
  reminderTime?: string | null;
  active?: boolean;
}

export function registerHabitRoutes(app: FastifyInstance): void {
  app.get("/api/habits", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const habits = await HabitService.list(user.id);
    return { success: true, data: { habits } };
  });

  app.post("/api/habits", async (req: FastifyRequest<{ Body: HabitBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const habit = await HabitService.create(user.id, body);
    return { success: true, data: { habit } };
  });

  app.get("/api/habits/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const habit = await HabitService.get(user.id, req.params.id);
    return { success: true, data: { habit } };
  });

  app.patch("/api/habits/:id", async (req: FastifyRequest<{ Params: { id: string }; Body: HabitBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const habit = await HabitService.update(user.id, req.params.id, body);
    return { success: true, data: { habit } };
  });

  app.delete("/api/habits/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await HabitService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });

  app.post("/api/habits/:id/toggle", async (req: FastifyRequest<{ Params: { id: string }; Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const result = await HabitService.toggle(user.id, req.params.id, req.query.date);
    return { success: true, data: result };
  });

  app.get("/api/habits/:id/calendar", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const dates = await HabitService.calendar(user.id, req.params.id);
    return { success: true, data: { dates } };
  });
}