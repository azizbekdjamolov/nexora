import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config";
import { AppError, toApiError } from "./errors";
import { registerAuthRoutes } from "./routes/auth";
import { registerProfileRoutes } from "./routes/profile";
import { registerFeatureRoutes } from "./routes/features";
import { registerTelegramRoutes } from "./routes/telegram";
import { registerBotRoutes } from "./routes/bot";
import { registerAIRoutes } from "./routes/ai";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerEventsRoute } from "./routes/events";
import { registerWaterRoutes } from "./routes/water";
import { registerSleepRoutes } from "./routes/sleep";
import { registerActivityRoutes } from "./routes/activity";
import { registerWorkoutRoutes } from "./routes/workouts";
import { registerHabitRoutes } from "./routes/habits";
import { registerGoalRoutes } from "./routes/goals";
import { registerReminderRoutes } from "./routes/reminders";
import { registerMedicationRoutes } from "./routes/medications";
import { registerWellnessRoutes } from "./routes/wellness";
import { registerDiagnosticRoutes } from "./routes/diagnostics";
import { registerSupportRoutes } from "./routes/support";
import { startReminderScheduler, stopReminderScheduler } from "./scheduler/reminders";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isProd ? false : { level: "warn" },
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  await app.register(cookie);
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new AppError(403, "forbidden", "Origin not allowed"), false);
    },
    credentials: true,
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  // CSRF defense: for state-changing requests, reject unexpected origins.
  app.addHook("onRequest", async (req, reply) => {
    const method = req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
    const origin = req.headers.origin;
    if (origin && !config.corsOrigins.includes(origin)) {
      return reply.code(403).send({ success: false, error: { code: "forbidden", message: "Origin not allowed." } });
    }
  });

  app.get("/api/health", async () => ({ success: true, data: { ok: true, service: "api", time: new Date().toISOString() } }));

  registerAuthRoutes(app);
  registerProfileRoutes(app);
  registerFeatureRoutes(app);
  registerTelegramRoutes(app);
  registerBotRoutes(app);
  registerAIRoutes(app);
  registerNotificationRoutes(app);
  registerEventsRoute(app);
  registerWaterRoutes(app);
  registerSleepRoutes(app);
  registerActivityRoutes(app);
  registerWorkoutRoutes(app);
  registerHabitRoutes(app);
  registerGoalRoutes(app);
  registerReminderRoutes(app);
  registerMedicationRoutes(app);
  registerWellnessRoutes(app);
  registerDiagnosticRoutes(app);
  registerSupportRoutes(app);
  startReminderScheduler();

  app.setErrorHandler((err, req, reply) => {
    const errObj = err as { statusCode?: number };
    if (errObj.statusCode === 429) {
      return reply.code(429).send(toApiError(new AppError(429, "rateLimited", "Too many requests. Please wait a moment."), config.isProd));
    }
    const status = err instanceof AppError ? err.statusCode : 500;
    const body = toApiError(err, config.isProd);
    if (status === 500) {
      req.log.error(err);
    }
    return reply.code(status).send(body);
  });

  return app;
}