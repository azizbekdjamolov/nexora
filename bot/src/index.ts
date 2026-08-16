import { Bot } from "grammy";
import { config } from "./config";
import { handleStart, handleTextMessage, handleCallback, handleContact, getLang } from "./handlers";
import { botApi } from "./api";
import { translate } from "@app/shared";

/** Every 30s: announce new support requests to the admin and deliver replies. */
function startSupportPoller(bot: Bot): void {
  setInterval(async () => {
    try {
      const { newRequests, replies } = await botApi.supportPending();
      const announced: string[] = [];
      const delivered: string[] = [];

      for (const req of newRequests) {
        const u = req.user;
        const adminLang = getLang(Number(config.adminIds[0])) || "uz";
        const name = u.name || "—";
        const username = u.telegramUsername ? `@${u.telegramUsername}` : translate(adminLang, "bot.usernameNone" as never);
        const phone = u.phone || translate(adminLang, "bot.phoneNone" as never);
        const time = new Date(req.createdAt).toLocaleString(adminLang);
        for (const adminId of config.adminIds) {
          if (u.telegramUserId && u.telegramUserId === adminId) continue; // admin's own requests stay in the panel
          await bot.api
            .sendMessage(adminId, translate(adminLang, "bot.supportNewToAdmin" as never, { name, username, id: u.telegramUserId ?? "—", phone, message: req.message, time }))
            .catch((err) => console.error("[bot] admin notify failed", err.message));
        }
        announced.push(req.id);
      }

      for (const r of replies) {
        const lang = r.locale === "uz" || r.locale === "ru" ? r.locale : "en";
        await bot.api
          .sendMessage(Number(r.telegramUserId), translate(lang, "bot.supportReply" as never, { reply: r.adminReply }))
          .catch((err) => console.error("[bot] reply delivery failed", err.message));
        delivered.push(r.id);
      }

      if (announced.length > 0 || delivered.length > 0) {
        await botApi.supportAck(announced, delivered).catch((err) => console.error("[bot] support ack failed", err.message));
      }
    } catch (err) {
      console.error("[bot] support poll error", err);
    }
  }, 30_000);
}

async function main(): Promise<void> {
  if (!config.botToken) {
    console.error("[bot] TELEGRAM_BOT_TOKEN is not set. Add it to .env (see .env.example).");
    process.exit(1);
  }

  const bot = new Bot(config.botToken);

  bot.api.setMyCommands([
    { command: "start", description: "Start" },
    { command: "profile", description: "My profile" },
    { command: "features", description: "My features" },
    { command: "language", description: "Language" },
    { command: "menu", description: "Main menu" },
    { command: "cancel", description: "Cancel current action" },
    { command: "progress", description: "My wellness score" },
    { command: "summary", description: "AI wellness summary" },
  ]).catch(() => undefined);

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim() ?? "";
    await handleStart(ctx, payload);
  });

  bot.on("callback_query:data", async (ctx) => {
    try {
      await handleCallback(ctx);
    } catch (err) {
      console.error("[bot] callback error", err);
      await ctx.reply("Something went wrong. Try /menu").catch(() => undefined);
    }
  });

  bot.on("message:text", async (ctx) => {
    try {
      await handleTextMessage(ctx);
    } catch (err) {
      console.error("[bot] message error", err);
      await ctx.reply("Something went wrong. Try /menu").catch(() => undefined);
    }
  });

  bot.on("message:contact", async (ctx) => {
    try {
      await handleContact(ctx);
    } catch (err) {
      console.error("[bot] contact error", err);
      await ctx.reply("Something went wrong. Try /menu").catch(() => undefined);
    }
  });

  bot.catch((err) => {
    console.error("[bot] global error", err.error);
  });

  // Long polling by default; webhook URL is available in config if needed.
  await bot.init();
  await bot.api.deleteWebhook({ drop_pending_updates: true });
  startSupportPoller(bot);
  await bot.start({
    onStart: (me) => console.log(`[bot] @${me.username} started`),
  });
}

main().catch((err) => {
  console.error("[bot] fatal", err);
  process.exit(1);
});