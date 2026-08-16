import type { Lang } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WellnessService } from "../services/tracker/WellnessService";
import { authenticate } from "./helpers";

export function registerWellnessRoutes(app: FastifyInstance): void {
  app.get("/api/wellness/today", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const today = await WellnessService.today(user.id, req.query.date);
    return { success: true, data: today };
  });

  app.get("/api/wellness/week", async (req: FastifyRequest<{ Querystring: { date?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const week = await WellnessService.week(user.id, req.query.date);
    return { success: true, data: week };
  });

  app.get("/api/wellness/summary", async (req: FastifyRequest<{ Querystring: { lang?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const locale = (req.query.lang === "en" || req.query.lang === "ru" || req.query.lang === "uz" ? req.query.lang : "en") as Lang;
    const summary = await WellnessService.aiSummary(user.id, locale);
    return { success: true, data: summary };
  });
}