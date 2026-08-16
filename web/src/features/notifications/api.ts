import type { Notification } from "@app/shared";
import { api } from "@/lib/api";

export const notificationsApi = {
  list: (limit = 20) => api<{ items: Notification[] }>(`/notifications?limit=${limit}`),
  readAll: () => api<{ ok: boolean }>("/notifications/read-all", { method: "POST" }),
};