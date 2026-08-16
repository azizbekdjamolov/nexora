import type { Lang } from "@app/shared";
import { SESSION_COOKIE } from "@app/shared";
import type { FastifyInstance } from "fastify";
import { AuthService } from "../services/AuthService";
import { badRequest } from "../errors";

interface AuthBody {
  contact?: string;
  password?: string;
  name?: string;
  locale?: Lang;
}

function validatePassword(password: string): void {
  if (!password || password.length < 8) {
    throw badRequest("Password must be at least 8 characters.", "validationPassword");
  }
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post(
    "/api/auth/register",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = req.body as AuthBody;
      const contact = body?.contact?.trim();
      const password = body?.password;
      const name = body?.name?.trim();
      if (!contact) throw badRequest("Email or phone number is required.", "validationContact");
      if (!name || name.trim().length < 2) throw badRequest("Name must be at least 2 characters.", "validationName");
      validatePassword(password ?? "");

      const { user, token } = await AuthService.register({
        contact,
        password: password as string,
        name,
        locale: body?.locale,
      });
      reply.setCookie(SESSION_COOKIE, token, AuthService.cookieOptions());
      return { success: true, data: { user } };
    }
  );

  app.post(
    "/api/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = req.body as AuthBody;
      const contact = body?.contact?.trim();
      const password = body?.password;
      if (!contact || !password) throw badRequest("Email/phone and password are required.", "validationContact");
      const { user, token } = await AuthService.login({ contact, password });
      reply.setCookie(SESSION_COOKIE, token, AuthService.cookieOptions());
      return { success: true, data: { user } };
    }
  );

  app.post("/api/auth/logout", async (req, reply) => {
    await AuthService.logout(req.cookies?.[SESSION_COOKIE] ?? null);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { success: true, data: { ok: true } };
  });

  app.get("/api/auth/me", async (req) => {
    const user = await AuthService.resolveSession(req.cookies?.[SESSION_COOKIE] ?? null);
    if (!user) throw badRequest("Please sign in to continue.", "unauthorized");
    return { success: true, data: { user } };
  });
}