import type { MiniAppAuthResult, TelegramLinkStatus } from "@app/shared";
import { api } from "@/lib/api";

export const telegramApi = {
  info: () =>
    api<{ botUsername: string; deepLinkBase: string; miniAppUrl: string }>("/telegram/info"),
  linkStart: () => api<{ state: string; deepLink: string }>("/telegram/link/start", { method: "POST" }),
  linkStatus: () =>
    api<TelegramLinkStatus>("/telegram/link/status"),
  unlink: () => api<{ ok: boolean }>("/telegram/unlink", { method: "POST" }),
  miniAppAuth: (initData: string, locale?: string) =>
    api<MiniAppAuthResult>("/telegram/miniapp/auth", {
      method: "POST",
      body: JSON.stringify({ initData, locale }),
    }),
};