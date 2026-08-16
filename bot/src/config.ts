function loadEnv(): void {
  try {
    const loader = (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
    if (typeof loader === "function") loader();
  } catch {
    // .env file is optional
  }
}
loadEnv();

export const config = {
  isProd: process.env.NODE_ENV === "production",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  botServiceToken: process.env.BOT_SERVICE_TOKEN ?? "dev-bot-service-token",
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  miniAppUrl: process.env.TELEGRAM_MINI_APP_URL ?? "http://localhost:3000/mini",
  // Telegram IDs that receive notifications about new support requests.
  adminIds: (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};