import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WorkoutService, type WorkoutInput } from "../services/tracker/WorkoutService";
import { authenticate } from "./helpers";

export function registerWorkoutRoutes(app: FastifyInstance): void {
  app.get("/api/workouts", async (req: FastifyRequest<{ Querystring: { page?: string; pageSize?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const data = await WorkoutService.list(user.id, req.query.page ? Number(req.query.page) : 1, req.query.pageSize ? Number(req.query.pageSize) : 20);
    return { success: true, data };
  });

  app.get("/api/workouts/week", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const week = await WorkoutService.week(user.id, req.query.date);
    return { success: true, data: week };
  });

  app.get("/api/workouts/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const workout = await WorkoutService.get(user.id, req.params.id);
    return { success: true, data: { workout } };
  });

  app.post("/api/workouts", async (req: FastifyRequest<{ Body: WorkoutInput }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const workout = await WorkoutService.create(user.id, { ...body, source: body.source === "bot" || body.source === "miniapp" ? body.source : "website" });
    return { success: true, data: { workout } };
  });

  app.patch("/api/workouts/:id", async (req: FastifyRequest<{ Params: { id: string }; Body: WorkoutInput }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const workout = await WorkoutService.update(user.id, req.params.id, body);
    return { success: true, data: { workout } };
  });

  app.delete("/api/workouts/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await WorkoutService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });
}