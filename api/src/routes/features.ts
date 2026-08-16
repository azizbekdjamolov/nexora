import type { FeatureStatus } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FeatureService } from "../services/FeatureService";
import { authenticate } from "./helpers";

interface FeatureBody {
  title?: string;
  description?: string | null;
  status?: FeatureStatus;
  data?: Record<string, unknown> | null;
}

/**
 * /api/features — generic topic-neutral entity module.
 * Topic-specific modules will be added later without restructuring.
 */
export function registerFeatureRoutes(app: FastifyInstance): void {
  app.get("/api/features", async (req: FastifyRequest<{ Querystring: { status?: string; page?: string; pageSize?: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const status = req.query.status === "active" || req.query.status === "archived" ? (req.query.status as FeatureStatus) : undefined;
    const data = await FeatureService.list(user.id, {
      status,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 50,
    });
    return { success: true, data };
  });

  app.post("/api/features", async (req: FastifyRequest<{ Body: FeatureBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const feature = await FeatureService.create(user.id, {
      title: body.title ?? "",
      description: body.description,
      status: body.status,
      data: body.data,
    }, "website");
    return { success: true, data: { feature } };
  });

  app.get("/api/features/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const feature = await FeatureService.get(user.id, req.params.id);
    return { success: true, data: { feature } };
  });

  app.patch("/api/features/:id", async (req: FastifyRequest<{ Params: { id: string }; Body: FeatureBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const feature = await FeatureService.update(user.id, req.params.id, {
      title: body.title,
      description: body.description,
      status: body.status,
      data: body.data,
    }, "website");
    return { success: true, data: { feature } };
  });

  app.delete("/api/features/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    await FeatureService.remove(user.id, req.params.id, "website");
    return { success: true, data: { ok: true } };
  });
}