import type { Lang, ThemePreference } from "@app/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserService } from "../services/UserService";
import { badRequest } from "../errors";
import { authenticate } from "./helpers";

interface ProfileBody {
  name?: string;
  avatar?: string | null;
  locale?: Lang;
  theme?: ThemePreference;
  bio?: string | null;
  timezone?: string | null;
  waterTargetMl?: number;
  sleepGoalMinutes?: number;
  activityStepsGoal?: number;
  workoutGoalMinutes?: number;
  notificationsEnabled?: boolean;
}

export function registerProfileRoutes(app: FastifyInstance): void {
  app.get("/api/profile", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const data = await UserService.getProfile(user.id);
    return { success: true, data };
  });

  app.patch("/api/profile", async (req: FastifyRequest<{ Body: ProfileBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    if (body.locale && !["uz", "en", "ru"].includes(body.locale)) {
      throw badRequest("Invalid language.", "validationLocale");
    }
    if (body.theme && !["dark", "light", "system"].includes(body.theme)) {
      throw badRequest("Invalid theme.");
    }
    const updated = await UserService.updateProfile(user.id, body);
    return { success: true, data: { user: updated } };
  });

  app.patch("/api/profile/targets", async (req: FastifyRequest<{ Body: ProfileBody }>, reply: FastifyReply) => {
    const user = await authenticate(req, reply);
    if (!user) return;
    const body = req.body ?? {};
    const updated = await UserService.updateTargets(user.id, {
      waterTargetMl: body.waterTargetMl,
      sleepGoalMinutes: body.sleepGoalMinutes,
      activityStepsGoal: body.activityStepsGoal,
      workoutGoalMinutes: body.workoutGoalMinutes,
      notificationsEnabled: body.notificationsEnabled,
    });
    return { success: true, data: { profile: updated } };
  });
}