import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ReminderService, type ReminderInput } from "../services/tracker/ReminderService";
import { authenticate } from "./helpers";

export function registerMedicationRoutes(app: FastifyInstance): void {
  app.get("/api/medications", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const reminders = await ReminderService.list(user.id, "medication");
    return { success: true, data: { medications: reminders } };
  });

  app.post("/api/medications", async (req: FastifyRequest<{ Body: ReminderInput }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const reminder = await ReminderService.create(user.id, { ...body, type: "medication" });
    return { success: true, data: { medication: reminder } };
  });

  app.patch("/api/medications/:id", async (req: FastifyRequest<{ Params: { id: string }; Body: ReminderInput }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const reminder = await ReminderService.update(user.id, req.params.id, { ...body, type: "medication" });
    return { success: true, data: { medication: reminder } };
  });

  app.delete("/api/medications/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await ReminderService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });
}