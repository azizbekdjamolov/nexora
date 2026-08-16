import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { NotificationService } from "../services/NotificationService";
import { authenticate } from "./helpers";

export function registerNotificationRoutes(app: FastifyInstance): void {
  app.get("/api/notifications", async (req: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const items = await NotificationService.list(user.id, limit);
    return { success: true, data: { items } };
  });

  app.post("/api/notifications/read-all", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await NotificationService.markAllRead(user.id);
    return { success: true, data: { ok: true } };
  });
}