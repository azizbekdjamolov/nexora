import type { AuthUser } from "@app/shared";
import { SESSION_COOKIE } from "@app/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../services/AuthService";
import { prisma } from "../db";

/**
 * Resolves the session cookie into an AuthUser or replies 401.
 * All protected routes must go through this — the frontend alone is
 * never trusted for authorization.
 */
export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  const user = await AuthService.resolveSession(req.cookies?.[SESSION_COOKIE] ?? null);
  if (!user) {
    reply.code(401).send({ success: false, error: { code: "unauthorized", message: "Please sign in to continue." } });
    return null;
  }
  // Throttled last-seen heartbeat (max one write per 5 minutes per user).
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  prisma.user
    .updateMany({
      where: { id: user.id, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: threshold } }] },
      data: { lastActiveAt: new Date() },
    })
    .catch(() => undefined);
  return user;
}