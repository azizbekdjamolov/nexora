import type { AuthUser } from "@app/shared";
import { api } from "@/lib/api";

export const authApi = {
  me: () => api<{ user: AuthUser }>("/auth/me"),
  register: (body: { contact: string; password: string; name: string; locale?: string }) =>
    api<{ user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { contact: string; password: string }) =>
    api<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
};