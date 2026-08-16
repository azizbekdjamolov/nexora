import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WaterService } from "../services/tracker/WaterService";
import { authenticate } from "./helpers";

interface WaterBody {
  amountMl?: number;
  date?: string;
  note?: string | null;
  source?: string;
}

export function registerWaterRoutes(app: FastifyInstance): void {
  app.get("/api/water/today", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const today = await WaterService.today(user.id, req.query.date);
    return { success: true, data: today };
  });

  app.get("/api/water/week", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const week = await WaterService.week(user.id, req.query.date);
    return { success: true, data: week };
  });

  app.post("/api/water", async (req: FastifyRequest<{ Body: WaterBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const result = await WaterService.add(user.id, {
      amountMl: body.amountMl,
      date: body.date,
      note: body.note,
      source: body.source === "bot" || body.source === "miniapp" ? body.source : "website",
    });
    return { success: true, data: result };
  });

  app.delete("/api/water/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await WaterService.remove(user.id, req.params.id);
    return { success: true, data: { ok: true } };
  });

  app.patch("/api/water/target", async (req: FastifyRequest<{ Body: { targetMl?: number } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const data = await WaterService.setTarget(user.id, req.body?.targetMl);
    return { success: true, data };
  });
}