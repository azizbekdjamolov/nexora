import type { AuthUser, Lang, Profile, ThemePreference } from "@app/shared";
import { prisma } from "../db";
import { toAuthUser } from "./AuthService";
import { eventBus, profileChangedEvent } from "../events/bus";
import { mapProfile } from "./tracker/common";

export class UserService {
  static async getProfile(userId: string): Promise<{ user: AuthUser; profile: Profile | null }> {
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
    ]);
    if (!user) throw new Error("User not found");
    return {
      user: toAuthUser(user),
      profile: profile ? mapProfile(profile) : null,
    };
  }

  static async updateProfile(
    userId: string,
    input: {
      name?: string;
      avatar?: string | null;
      locale?: Lang;
      theme?: ThemePreference;
      bio?: string | null;
      timezone?: string | null;
    }
  ): Promise<AuthUser> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.avatar !== undefined) data.avatar = input.avatar;
    if (input.locale !== undefined) data.locale = input.locale;
    if (input.theme !== undefined) data.theme = input.theme;

    const profileData: Record<string, unknown> = {};
    if (input.bio !== undefined) profileData.bio = input.bio;
    if (input.timezone !== undefined) profileData.timezone = input.timezone;

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data });
      if (Object.keys(profileData).length > 0) {
        await tx.profile.upsert({
          where: { userId },
          create: { userId, ...profileData },
          update: profileData,
        });
      }
      return updated;
    });

    eventBus.publish(userId, profileChangedEvent());
    return toAuthUser(user);
  }

  static async updateTargets(
    userId: string,
    input: {
      waterTargetMl?: number;
      sleepGoalMinutes?: number;
      activityStepsGoal?: number;
      workoutGoalMinutes?: number;
      notificationsEnabled?: boolean;
    }
  ): Promise<Profile> {
    const data: Record<string, unknown> = {};
    if (input.waterTargetMl !== undefined) {
      const value = Math.round(Number(input.waterTargetMl));
      if (!Number.isFinite(value) || value < 200 || value > 10000) throw new Error("Invalid water target");
      data.waterTargetMl = value;
    }
    if (input.sleepGoalMinutes !== undefined) {
      const value = Math.round(Number(input.sleepGoalMinutes));
      if (!Number.isFinite(value) || value < 240 || value > 720) throw new Error("Invalid sleep goal");
      data.sleepGoalMinutes = value;
    }
    if (input.activityStepsGoal !== undefined) {
      const value = Math.round(Number(input.activityStepsGoal));
      if (!Number.isFinite(value) || value < 1000 || value > 50000) throw new Error("Invalid steps goal");
      data.activityStepsGoal = value;
    }
    if (input.workoutGoalMinutes !== undefined) {
      const value = Math.round(Number(input.workoutGoalMinutes));
      if (!Number.isFinite(value) || value < 0 || value > 600) throw new Error("Invalid workout goal");
      data.workoutGoalMinutes = value;
    }
    if (input.notificationsEnabled !== undefined) data.notificationsEnabled = Boolean(input.notificationsEnabled);
    if (Object.keys(data).length === 0) throw new Error("Nothing to update");
    const profile = await prisma.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    eventBus.publish(userId, profileChangedEvent());
    return mapProfile(profile);
  }
}