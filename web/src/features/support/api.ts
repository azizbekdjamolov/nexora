import type { SupportRequest, SupportRequestAdmin, SupportStatus } from "@app/shared";
import { api } from "@/lib/api";

export const supportApi = {
  my: () => api<{ items: SupportRequest[] }>("/support/my"),
  create: (message: string) =>
    api<SupportRequest>("/support", { method: "POST", body: JSON.stringify({ message }) }),
  adminList: () => api<{ items: SupportRequestAdmin[] }>("/support/admin"),
  adminReply: (id: string, reply: string) =>
    api<SupportRequest>(`/support/admin/${id}/reply`, { method: "POST", body: JSON.stringify({ reply }) }),
  adminStatus: (id: string, status: SupportStatus) =>
    api<SupportRequest>(`/support/admin/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
};
