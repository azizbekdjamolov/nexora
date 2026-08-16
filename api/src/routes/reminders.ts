import type { ReminderType } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ReminderService, type ReminderInput } from "../services/tracker/ReminderService";
import { authenticate } from "./helpers";

export function registerReminderRoutes(app: FastifyInstance): void {
  app.get("/api/reminders", async (req: FastifyRequest<{ Querystring: { type?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const type = req.query.type === "medication" || req.query.type === "water" || req.query.type === "workout" || req.query.type === "sleep" || req.query.type === "habit" || req.query.type === "custom" ? (req.query.type as ReminderType) : undefined;
    const reminders = await ReminderService.list(user.id, type);
    return { success: true, data: { reminders } };
  });

  app.post("/api/reminders", async (req: FastifyRequest<{ Body: ReminderInput }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const reminder = await ReminderService.create(user.id, body);
    return { success: true, data: { reminder } };
  });

  app.patch("/api/reminders/:id", async (req: FastifyRequest<{ Params: { id: string }; Body: ReminderInput }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const reminder = await ReminderService.update(user.id, req.params.id, body);
    return { success: true, data: { reminder } };
  });

  app.delete("/api/reminders/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await ReminderService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });

  app.post("/api/reminders/:id/toggle", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const reminder = await ReminderService.toggle(user.id, req.params.id);
    return { success: true, data: { reminder } };
  });
}