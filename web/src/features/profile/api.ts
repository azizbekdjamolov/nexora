import type { AuthUser, Profile } from "@app/shared";
import { api } from "@/lib/api";

export const profileApi = {
  get: () => api<{ user: AuthUser; profile: Profile | null }>("/profile"),
  update: (body: Partial<{ name: string; avatar: string | null; locale: string; theme: string; bio: string | null; timezone: string | null }>) =>
    api<{ user: AuthUser }>("/profile", { method: "PATCH", body: JSON.stringify(body) }),
};