import type { Lang, AIProviderName } from "@app/shared";

function loadEnv(): void {
  try {
    const loader = (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
    if (typeof loader === "function") loader();
  } catch {
    // .env file is optional
  }
}
loadEnv();

function parseLang(value: string | undefined): Lang {
  return value === "uz" || value === "ru" ? value : "en";
}

export const config = {
  isProd: process.env.NODE_ENV === "production",

  siteName: process.env.SITE_NAME ?? "Nexus",
  siteDescription:
    process.env.SITE_DESCRIPTION ?? "One account. Everywhere. Website, Telegram Bot and Mini App on one shared engine.",
  defaultLocale: parseLang(process.env.DEFAULT_LOCALE),

  // Render injects PORT; fall back to API_PORT for local development.
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",

  authSecret: process.env.AUTH_SECRET ?? "dev-secret-change-me",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  botServiceToken: process.env.BOT_SERVICE_TOKEN ?? "dev-bot-service-token",

  // Telegram user IDs allowed to access the admin panel (/admin).
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
    miniAppUrl: process.env.TELEGRAM_MINI_APP_URL ?? "http://localhost:3000/mini",
  },

  ai: {
    provider: (process.env.AI_PROVIDER ?? "openai") as AIProviderName,
    apiKey:
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.AI_API_KEY ||
      "",
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
  },

  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  telegramLinkCodeTtlMs: 10 * 60 * 1000,
};

export function telegramApiUrl(method: string): string {
  return `https://api.telegram.org/bot${config.telegram.botToken}/${method}`;
}

export function telegramDeepLinkBase(): string {
  return `https://t.me/${config.telegram.botUsername}`;
}