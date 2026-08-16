import type { MiniAppAuthResult } from "@app/shared";
import { api } from "@/lib/api";

/**
 * Telegram Mini App module. Shares the same backend, database and
 * session cookie as the website and the bot.
 */
export const miniappApi = {
  auth: (initData: string, locale?: string) =>
    api<MiniAppAuthResult>("/telegram/miniapp/auth", {
      method: "POST",
      body: JSON.stringify({ initData, locale }),
    }),
};