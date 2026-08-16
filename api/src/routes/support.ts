import type { SupportStatus } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "@app/shared";
import { authenticate } from "./helpers";
import { SupportService } from "../services/SupportService";
import { config } from "../config";
import { badRequest, forbidden, notFound } from "../errors";

/** Admin access = the user's verified Telegram ID is listed in ADMIN_TELEGRAM_IDS. */
function isAdmin(user: AuthUser): boolean {
  return Boolean(user.telegramUserId && config.adminTelegramIds.includes(user.telegramUserId));
}

function requireAdmin(user: AuthUser, reply: FastifyReply): boolean {
  if (isAdmin(user)) return true;
  reply.code(403).send({ success: false, error: { code: "forbidden", message: "Admin access required." } });
  return false;
}

export function registerSupportRoutes(app: FastifyInstance): void {
  // User: send a new request.
  app.post("/api/support", async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const message = (req.body as { message?: string })?.message ?? "";
    const request = await SupportService.create(user.id, message);
    return { success: true, data: request };
  });

  // User: my own requests.
  app.get("/api/support/my", async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const items = await SupportService.listForUser(user.id);
    return { success: true, data: { items } };
  });

  // ── Admin only ────────────────────────────────────────────────────────────

  app.get("/api/support/admin", async (req, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    if (!requireAdmin(user, reply)) return;
    const items = await SupportService.listAll();
    return { success: true, data: { items } };
  });

  app.post("/api/support/admin/:id/reply", async (req: FastifyRequest, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    if (!requireAdmin(user, reply)) return;
    const { id } = req.params as { id: string };
    const replyText = (req.body as { reply?: string })?.reply ?? "";
    const updated = await SupportService.reply(id, replyText);
    if (!updated) throw notFound("Request not found.");
    return { success: true, data: updated };
  });

  app.post("/api/support/admin/:id/status", async (req: FastifyRequest, reply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    if (!requireAdmin(user, reply)) return;
    const { id } = req.params as { id: string };
    const status = (req.body as { status?: SupportStatus })?.status;
    if (!status) throw badRequest("status is required.");
    const updated = await SupportService.updateStatus(id, status);
    if (!updated) throw notFound("Request not found.");
    return { success: true, data: updated };
  });
}
