import type { Context } from "grammy";
import type { Lang, DiagnosticAnswer } from "@app/shared";
import { DIAGNOSTIC_QUESTIONS } from "@app/shared";
import { botApi, ApiBotError } from "./api";
import {
  deleteConfirmKeyboard,
  diagnosticStartKeyboard,
  diagnosticOptionKeyboard,
  editFieldsKeyboard,
  featuresKeyboard,
  languageKeyboard,
  menuKeyboard,
  featureActionsKeyboard,
  tr,
  waterKeyboard,
  sleepKeyboard,
  workoutKeyboard,
  habitsKeyboard,
  profileKeyboard,
  phoneRequestKeyboard,
} from "./keyboards";

interface ConversationState {
  step:
    | "create:title"
    | "create:desc"
    | "edit:title"
    | "edit:desc"
    | "water:custom"
    | "sleep:custom"
    | "habit:add"
    | "diag:q"
    | "support:message";
  featureId?: string;
  draftTitle?: string;
  diagIndex?: number;
  diagAnswers?: DiagnosticAnswer[];
}

// In-memory conversation state (single bot process).
const conversations = new Map<number, ConversationState>();
const languages = new Map<number, Lang>();

export function getLang(chatId: number): Lang {
  return languages.get(chatId) ?? "en";
}

function setLang(chatId: number, lang: Lang): void {
  languages.set(chatId, lang);
}

export function clearConversation(chatId: number): void {
  conversations.delete(chatId);
}

/**
 * Syncs the user's current Telegram identity (from_user) into the database
 * on every interaction: telegram_id is the lookup key, username / first_name /
 * last_name / language are refreshed from the verified update. Phone is
 * intentionally never touched here (it can only change via contact sharing).
 */
export function syncFromUser(ctx: Context, tgId: string): void {
  const from = ctx.from;
  if (!from) return;
  botApi
    .syncProfile(tgId, {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
    })
    .catch(() => undefined);
}

/** Loads the stored language from the database once per bot session. */
async function ensureLang(ctx: Context, chatId: number, tgId: string): Promise<Lang> {
  const cached = languages.get(chatId);
  if (cached) return cached;
  try {
    const me = await botApi.me(tgId);
    const locale = (me.user.locale as Lang) || "en";
    setLang(chatId, locale);
    return locale;
  } catch {
    return "en";
  }
}

function errorText(lang: Lang, err: unknown): string {
  if (err instanceof ApiBotError) {
    const key = `errors.${err.code}`;
    const msg = tr(lang, key);
    return msg === key ? err.message : msg;
  }
  return tr(lang, "errors.internal");
}

async function sendMenu(ctx: Context, lang: Lang, extra?: { text?: string }): Promise<void> {
  const text = extra?.text ?? tr(lang, "bot.chooseAction");
  await ctx.reply(text, { reply_markup: menuKeyboard(lang) });
}

async function showProfile(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.profile(tgId);
    const u = data.user;
    const username = u.telegramUsername ? `@${u.telegramUsername}` : tr(lang, "bot.usernameNone");
    const phone = u.phone || tr(lang, "bot.phoneNone");
    const name = [u.telegramFirstName, u.telegramLastName].filter(Boolean).join(" ").trim() || u.name || "—";
    const text = tr(lang, "bot.profileText", {
      name,
      username,
      telegramId: tgId,
      phone,
      language: lang.toUpperCase(),
    });
    await ctx.reply(text, { reply_markup: profileKeyboard(lang, Boolean(u.phone)) });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

/** Asks Telegram natively for the contact (only shows the phone of the user
   *  themselves — Telegram never returns someone else's contact here). */
async function requestPhone(ctx: Context, lang: Lang): Promise<void> {
  await ctx.reply(tr(lang, "bot.phoneSharePrompt"), { reply_markup: phoneRequestKeyboard(lang) });
}

/**
 * Handles the shared contact. Security: only a contact whose user_id matches
 * the current Telegram user is accepted — nobody can attach another person's
 * number to their own profile.
 */
export async function handleContact(ctx: Context): Promise<unknown> {
  const chatId = ctx.chat?.id ?? 0;
  const tgId = String(ctx.from?.id ?? "");
  const contact = ctx.message?.contact;
  if (!chatId || !tgId || !contact) return;
  const lang = await ensureLang(ctx, chatId, tgId);
  syncFromUser(ctx, tgId);

  // Security: only a contact whose user_id matches the current Telegram user
  // is accepted — nobody can attach another person's number to their profile.
  const matches = String(contact.user_id) === tgId;
  if (!matches) {
    return ctx.reply(tr(lang, "bot.contactMismatch"), { reply_markup: menuKeyboard(lang) });
  }

  try {
    const result = await botApi.savePhone(tgId, contact.phone_number);
    await ctx.reply(tr(lang, "bot.phoneSaved", { phone: result.phone }), {
      reply_markup: { remove_keyboard: true },
    });
    return showProfile(ctx, chatId, lang, tgId);
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: { remove_keyboard: true } });
    return showProfile(ctx, chatId, lang, tgId);
  }
}

async function showFeatures(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.listFeatures(tgId);
    if (data.items.length === 0) {
      await ctx.reply(tr(lang, "bot.noFeatures"), { reply_markup: menuKeyboard(lang) });
      return;
    }
    await ctx.reply(tr(lang, "bot.featuresList", { count: data.total }), {
      reply_markup: featuresKeyboard(lang, data.items),
    });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function showFeature(ctx: Context, chatId: number, lang: Lang, tgId: string, featureId: string): Promise<void> {
  try {
    const { feature } = await botApi.getFeature(tgId, featureId);
    const text = tr(lang, "bot.featureView", {
      title: feature.title,
      description: feature.description || "—",
      status: feature.status,
      date: new Date(feature.createdAt).toLocaleDateString(lang),
    });
    await ctx.reply(text, { reply_markup: featureActionsKeyboard(lang, feature.id) });
  } catch (err) {
    await ctx.reply(errorText(lang, err));
  }
}

async function startCreate(ctx: Context, chatId: number, lang: Lang): Promise<void> {
  conversations.set(chatId, { step: "create:title" });
  await ctx.reply(tr(lang, "bot.newFeatureTitle"));
}

async function startEdit(ctx: Context, chatId: number, lang: Lang, featureId: string): Promise<void> {
  conversations.set(chatId, { step: "edit:title", featureId });
  await ctx.reply(tr(lang, "bot.featureEdited"), { reply_markup: editFieldsKeyboard(lang, featureId) });
}

async function askDelete(ctx: Context, chatId: number, lang: Lang, featureId: string): Promise<void> {
  try {
    const { feature } = await botApi.getFeature(String(ctx.from?.id ?? ""), featureId);
    await ctx.reply(tr(lang, "bot.deleteConfirm", { title: feature.title }), {
      reply_markup: deleteConfirmKeyboard(lang, featureId),
    });
  } catch {
    await ctx.reply(tr(lang, "features.notFound"));
  }
}

export function isLinkedUser(ctx: Context): boolean {
  return Boolean(ctx.from?.id);
}

// ── Wellness ────────────────────────────────────────────────────────────────

async function showWater(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.wellnessProgress(tgId);
    await ctx.reply(
      tr(lang, "bot.waterMenu", { amount: data.today.water.amountMl, target: data.today.water.targetMl }),
      { reply_markup: waterKeyboard(lang) }
    );
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function addWaterQuick(ctx: Context, chatId: number, lang: Lang, tgId: string, amountMl: number): Promise<void> {
  try {
    const data = await botApi.waterAdd(tgId, amountMl);
    await ctx.reply(tr(lang, "bot.waterAdded", { amount: amountMl, total: data.today.amountMl }), {
      reply_markup: waterKeyboard(lang),
    });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: waterKeyboard(lang) });
  }
}

async function showSleep(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.wellnessProgress(tgId);
    await ctx.reply(
      tr(lang, "bot.sleepMenu", {
        duration: data.today.sleep.logged ? data.today.sleep.durationMinutes : 0,
        goal: data.today.sleep.goalMinutes,
      }),
      { reply_markup: sleepKeyboard(lang) }
    );
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function logSleep(ctx: Context, chatId: number, lang: Lang, tgId: string, minutes: number): Promise<void> {
  try {
    await botApi.sleepLog(tgId, minutes);
    await ctx.reply(tr(lang, "bot.sleepLogged", { duration: minutes }), { reply_markup: sleepKeyboard(lang) });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: sleepKeyboard(lang) });
  }
}

async function showWorkout(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  await ctx.reply(tr(lang, "bot.workoutMenu"), { reply_markup: workoutKeyboard(lang) });
}

async function logWorkout(ctx: Context, chatId: number, lang: Lang, tgId: string, minutes: number): Promise<void> {
  try {
    await botApi.workoutCreate(tgId, minutes);
    await ctx.reply(tr(lang, "bot.workoutLogged", { minutes }), { reply_markup: workoutKeyboard(lang) });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: workoutKeyboard(lang) });
  }
}

async function showHabits(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.habitsList(tgId);
    if (data.habits.length === 0) {
      await ctx.reply(tr(lang, "bot.noHabits"), { reply_markup: habitsKeyboard(lang, []) });
      return;
    }
    await ctx.reply(tr(lang, "bot.habitsMenu"), { reply_markup: habitsKeyboard(lang, data.habits) });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function toggleHabit(ctx: Context, chatId: number, lang: Lang, tgId: string, habitId: string): Promise<void> {
  try {
    const data = await botApi.habitToggle(tgId, habitId);
    await ctx.answerCallbackQuery({ text: tr(lang, data.done ? "bot.habitDone" : "bot.habitUndone", { name: data.habit.name }) }).catch(() => undefined);
    await showHabits(ctx, chatId, lang, tgId);
  } catch (err) {
    await ctx.answerCallbackQuery({ text: errorText(lang, err), show_alert: true }).catch(() => undefined);
  }
}

async function showGoals(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.goalsList(tgId);
    const active = data.goals.filter((g) => g.status === "active");
    if (active.length === 0) {
      await ctx.reply(tr(lang, "bot.noGoals"), { reply_markup: menuKeyboard(lang) });
      return;
    }
    const lines = active.map((g) => {
      const pct = g.targetValue ? Math.min(100, Math.round((g.progress / g.targetValue) * 100)) : 0;
      return `🎯 ${g.title} — ${pct}%`;
    });
    await ctx.reply(`${tr(lang, "bot.goalsMenu")}\n\n${lines.join("\n")}`, { reply_markup: menuKeyboard(lang) });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function showProgress(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.wellnessProgress(tgId);
    const t = data.today;
    const text = tr(lang, "bot.progressText", {
      score: t.score,
      streak: t.streak,
      water: t.water.amountMl,
      waterTarget: t.water.targetMl,
      sleep: t.sleep.logged ? t.sleep.durationMinutes : 0,
      sleepGoal: t.sleep.goalMinutes,
      steps: t.activity.steps,
      stepsGoal: t.activity.goal,
      habits: t.habits.done,
      habitsTotal: t.habits.total,
    });
    await ctx.reply(`${tr(lang, "bot.progressTitle")}\n\n${text}\n\n${tr(lang, "bot.wellnessDisclaimer")}`, {
      reply_markup: menuKeyboard(lang),
    });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function showReminders(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.remindersList(tgId);
    if (data.reminders.length === 0) {
      await ctx.reply(tr(lang, "bot.noReminders"), { reply_markup: menuKeyboard(lang) });
      return;
    }
    const lines = data.reminders.map((r) => tr(lang, "bot.reminderLine", { time: r.time, title: r.title }));
    await ctx.reply(`${tr(lang, "bot.remindersMenu")}\n\n${lines.join("\n")}\n\n${tr(lang, "bot.wellnessDisclaimer")}`, {
      reply_markup: menuKeyboard(lang),
    });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function showAI(ctx: Context, lang: Lang): Promise<void> {
  await ctx.reply(`${tr(lang, "bot.aiHint")}\n\n${tr(lang, "bot.wellnessDisclaimer")}`, { reply_markup: menuKeyboard(lang) });
}

async function showSummary(ctx: Context, chatId: number, lang: Lang, tgId: string): Promise<void> {
  try {
    const data = await botApi.wellnessSummary(tgId, lang);
    await ctx.reply(data.text, { reply_markup: menuKeyboard(lang) });
  } catch (err) {
    await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
  }
}

async function startWaterCustom(ctx: Context, chatId: number, lang: Lang): Promise<void> {
  conversations.set(chatId, { step: "water:custom" });
  await ctx.reply(tr(lang, "bot.waterCustomAsk"));
}

async function startSleepCustom(ctx: Context, chatId: number, lang: Lang): Promise<void> {
  conversations.set(chatId, { step: "sleep:custom" });
  await ctx.reply(tr(lang, "bot.sleepCustomAsk"));
}

async function startHabitAdd(ctx: Context, chatId: number, lang: Lang): Promise<void> {
  conversations.set(chatId, { step: "habit:add" });
  await ctx.reply(tr(lang, "bot.habitNameAsk"));
}

// ── Diagnostics & support (adminga murojaat) ────────────────────────────────

async function showDiagnosticsStart(ctx: Context, lang: Lang): Promise<void> {
  await ctx.reply(tr(lang, "bot.diagnosticsIntro", { total: DIAGNOSTIC_QUESTIONS.length }), {
    reply_markup: diagnosticStartKeyboard(lang),
  });
}

async function showDiagnosticQuestion(ctx: Context, lang: Lang, index: number): Promise<void> {
  const q = DIAGNOSTIC_QUESTIONS[index];
  if (!q) return;
  const stepText = tr(lang, "bot.diagnosticsQuestion", {
    current: index + 1,
    total: DIAGNOSTIC_QUESTIONS.length,
  });
  await ctx.reply(`${stepText}\n\n${tr(lang, `diagnostics.${q.id}`)}`, {
    reply_markup: diagnosticOptionKeyboard(lang, q.id, q.options),
  });
}

async function handleDiagnosticAnswer(
  ctx: Context,
  chatId: number,
  lang: Lang,
  tgId: string,
  qid: string,
  optionKey: string
): Promise<void> {
  const conv = conversations.get(chatId);
  if (!conv || conv.step !== "diag:q") return;

  const question = DIAGNOSTIC_QUESTIONS.find((q) => q.id === qid);
  const option = question?.options.find((o) => o.key === optionKey);
  if (!question || !option) {
    return showDiagnosticQuestion(ctx, lang, conv.diagIndex ?? 0);
  }

  conv.diagAnswers = [...(conv.diagAnswers ?? []), { questionId: qid, optionKey, points: option.points }];
  conversations.set(chatId, conv);

  if (conv.diagAnswers.length >= DIAGNOSTIC_QUESTIONS.length) {
    clearConversation(chatId);
    try {
      const { result } = await botApi.diagnosticsCreate(tgId, conv.diagAnswers);
      const level = tr(lang, `diagnostics.level${result.level.charAt(0).toUpperCase()}${result.level.slice(1)}`);
      await ctx.reply(`${tr(lang, "bot.diagnosticsDone", { score: result.score, level })}\n\n${tr(lang, "bot.wellnessDisclaimer")}`, {
        reply_markup: menuKeyboard(lang),
      });
    } catch (err) {
      await ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
    }
    return;
  }

  conv.diagIndex = (conv.diagIndex ?? 0) + 1;
  conversations.set(chatId, conv);
  return showDiagnosticQuestion(ctx, lang, conv.diagIndex);
}

async function startSupport(ctx: Context, chatId: number, lang: Lang): Promise<void> {
  conversations.set(chatId, { step: "support:message" });
  await ctx.reply(tr(lang, "bot.supportPrompt"));
}

export async function handleStart(ctx: Context, payload?: string): Promise<unknown> {
  const chatId = ctx.chat?.id ?? 0;
  const tgId = String(ctx.from?.id ?? "");
  if (!tgId || !chatId) return;

  // Deep-link linking flow: /start link_<state>
  if (payload && payload.startsWith("link_")) {
    const state = payload.slice("link_".length);
    try {
      await botApi.confirmLink({
        state,
        telegramUserId: tgId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
      });
      const me = await botApi.me(tgId);
      setLang(chatId, (me.user.locale as Lang) || "en");
      await sendMenu(ctx, getLang(chatId), { text: tr(getLang(chatId), "bot.linkSuccess") });
    } catch {
      await sendMenu(ctx, "en", { text: tr("en", "bot.linkFailed") });
    }
    return;
  }

  // Sync display fields from Telegram's verified update.
  syncFromUser(ctx, tgId);

  try {
    const me = await botApi.me(tgId);
    setLang(chatId, (me.user.locale as Lang) || "en");
    const lang = getLang(chatId);
    await sendMenu(ctx, lang, {
      text: `${tr(lang, "bot.startLinked")}, ${ctx.from?.first_name ?? ""}! ${tr(lang, "bot.startLinkedText")}`,
    });
  } catch (err) {
    if (err instanceof ApiBotError && err.code === "telegramNotLinked") {
      setLang(chatId, "en");
      await sendMenu(ctx, "en", {
        text: `${tr("en", "bot.startUnlinked")}, ${ctx.from?.first_name ?? ""}! ${tr("en", "bot.startUnlinkedText")}`,
      });
      return;
    }
    throw err;
  }
}

export async function handleTextMessage(ctx: Context): Promise<unknown> {
  const chatId = ctx.chat?.id ?? 0;
  const tgId = String(ctx.from?.id ?? "");
  const text = ctx.message?.text?.trim();
  if (!text || !chatId || !tgId) return;

  const lang = await ensureLang(ctx, chatId, tgId);
  syncFromUser(ctx, tgId);

  // Cancel the reply keyboard that asked for the phone contact.
  if (text === tr(lang, "bot.cancel") || text === "/cancel") {
    clearConversation(chatId);
    return sendMenu(ctx, lang, { text: tr(lang, "bot.chooseAction") });
  }

  if (text === "/skip") {
    const conv = conversations.get(chatId);
    if (conv && (conv.step === "create:desc" || conv.step === "edit:desc")) {
      return handleConversationFinish(ctx, chatId, tgId, "", conv);
    }
  }

  if (text.startsWith("/")) {
    // Commands that are not /start
    if (text === "/profile") return showProfile(ctx, chatId, lang, tgId);
    if (text === "/features") return showFeatures(ctx, chatId, lang, tgId);
    if (text === "/progress") return showProgress(ctx, chatId, lang, tgId);
    if (text === "/summary") return showSummary(ctx, chatId, lang, tgId);
    if (text === "/language") {
      return ctx.reply(tr(lang, "bot.chooseLanguage"), { reply_markup: languageKeyboard() });
    }
    if (text === "/help") {
      return ctx.reply(tr(lang, "bot.helpText"), { reply_markup: menuKeyboard(lang) });
    }
    if (text === "/menu" || text === "/cancel") {
      clearConversation(chatId);
      return sendMenu(ctx, lang);
    }
    return;
  }

  const conv = conversations.get(chatId);
  if (!conv) return;

  if (conv.step === "support:message") {
    clearConversation(chatId);
    try {
      await botApi.supportCreate(tgId, text);
      return ctx.reply(tr(lang, "bot.supportSent"), { reply_markup: menuKeyboard(lang) });
    } catch (err) {
      return ctx.reply(errorText(lang, err), { reply_markup: menuKeyboard(lang) });
    }
  }

  if (conv.step === "create:title") {
    conv.step = "create:desc";
    conv.draftTitle = text;
    conversations.set(chatId, conv);
    await ctx.reply(tr(lang, "bot.newFeatureDesc"));
    return;
  }

  if (conv.step === "create:desc") {
    return handleConversationFinish(ctx, chatId, tgId, text, conv);
  }

  if (conv.step === "edit:title" && conv.featureId) {
    try {
      await botApi.updateFeature(tgId, conv.featureId, { title: text });
      clearConversation(chatId);
      await ctx.reply(tr(lang, "bot.featureUpdated", { title: text }), { reply_markup: menuKeyboard(lang) });
    } catch (err) {
      await ctx.reply(errorText(lang, err));
    }
    return;
  }

  if (conv.step === "edit:desc" && conv.featureId) {
    try {
      await botApi.updateFeature(tgId, conv.featureId, { description: text || null });
      clearConversation(chatId);
      await ctx.reply(tr(lang, "bot.featureUpdated", { title: text || "—" }), { reply_markup: menuKeyboard(lang) });
    } catch (err) {
      await ctx.reply(errorText(lang, err));
    }
    return;
  }

  if (conv.step === "water:custom") {
    const amount = Number(text);
    if (!Number.isFinite(amount) || amount < 50 || amount > 5000) {
      return ctx.reply(tr(lang, "bot.waterCustomInvalid"));
    }
    clearConversation(chatId);
    return addWaterQuick(ctx, chatId, lang, tgId, Math.round(amount));
  }

  if (conv.step === "sleep:custom") {
    const minutes = Number(text);
    if (!Number.isFinite(minutes) || minutes < 30 || minutes > 1440) {
      return ctx.reply(tr(lang, "bot.sleepCustomInvalid"));
    }
    clearConversation(chatId);
    return logSleep(ctx, chatId, lang, tgId, Math.round(minutes));
  }

  if (conv.step === "habit:add") {
    if (text.length < 2 || text.length > 64) {
      return ctx.reply(tr(lang, "bot.habitNameInvalid"));
    }
    clearConversation(chatId);
    try {
      await botApi.habitCreate(tgId, text);
      await ctx.reply(tr(lang, "bot.habitCreated", { name: text }));
      return showHabits(ctx, chatId, lang, tgId);
    } catch (err) {
      return ctx.reply(errorText(lang, err));
    }
  }
}

async function handleConversationFinish(
  ctx: Context,
  chatId: number,
  tgId: string,
  description: string,
  conv: ConversationState
): Promise<unknown> {
  const lang = getLang(chatId);
  if (!conv.draftTitle) {
    clearConversation(chatId);
    return sendMenu(ctx, lang, { text: tr(lang, "bot.featureCancelled") });
  }
  try {
    const { feature } = await botApi.createFeature(tgId, conv.draftTitle, description);
    clearConversation(chatId);
    await ctx.reply(tr(lang, "bot.featureCreated", { title: feature.title }), { reply_markup: menuKeyboard(lang) });
  } catch (err) {
    await ctx.reply(errorText(lang, err));
  }
}

export async function handleCallback(ctx: Context): Promise<unknown> {
  const data = ctx.callbackQuery?.data;
  const chatId = ctx.chat?.id ?? 0;
  const tgId = String(ctx.from?.id ?? "");
  if (!data || !chatId || !tgId) return;
  const lang = await ensureLang(ctx, chatId, tgId);
  syncFromUser(ctx, tgId);

  await ctx.answerCallbackQuery().catch(() => undefined);

  if (data === "menu") {
    clearConversation(chatId);
    return sendMenu(ctx, lang);
  }
  if (data === "profile") return showProfile(ctx, chatId, lang, tgId);
  if (data === "profile:phone") return requestPhone(ctx, lang);
  if (data === "profile:refresh") {
    syncFromUser(ctx, tgId);
    await ctx.reply(tr(lang, "bot.profileUpdated"));
    return showProfile(ctx, chatId, lang, tgId);
  }
  if (data === "items") return showFeatures(ctx, chatId, lang, tgId);
  if (data === "create") return startCreate(ctx, chatId, lang);
  if (data === "language") {
    return ctx.reply(tr(lang, "bot.chooseLanguage"), { reply_markup: languageKeyboard() });
  }
  if (data === "help") {
    return ctx.reply(tr(lang, "bot.helpText"), { reply_markup: menuKeyboard(lang) });
  }

  if (data === "diag") return showDiagnosticsStart(ctx, lang);
  if (data === "diag:start") {
    conversations.set(chatId, { step: "diag:q", diagIndex: 0, diagAnswers: [] });
    return showDiagnosticQuestion(ctx, lang, 0);
  }
  if (data === "support") return startSupport(ctx, chatId, lang);

  if (data.startsWith("diagq:")) {
    const [, qid, optionKey] = data.split(":");
    if (qid && optionKey) return handleDiagnosticAnswer(ctx, chatId, lang, tgId, qid, optionKey);
  }

  if (data.startsWith("lang:")) {
    const locale = data.split(":")[1] as Lang;
    try {
      await botApi.setLanguage(tgId, locale);
      setLang(chatId, locale);
      await ctx.reply(`${tr(locale, "bot.languageSet")}: ${locale.toUpperCase()}`);
      return sendMenu(ctx, locale);
    } catch (err) {
      return ctx.reply(errorText(lang, err));
    }
  }

  const [action, field, id] = data.split(":");
  if (action === "wellness") {
    if (field === "water") return showWater(ctx, chatId, lang, tgId);
    if (field === "sleep") return showSleep(ctx, chatId, lang, tgId);
    if (field === "workout") return showWorkout(ctx, chatId, lang, tgId);
    if (field === "habits") return showHabits(ctx, chatId, lang, tgId);
    if (field === "goals") return showGoals(ctx, chatId, lang, tgId);
    if (field === "progress") return showProgress(ctx, chatId, lang, tgId);
    if (field === "reminders") return showReminders(ctx, chatId, lang, tgId);
    if (field === "ai") return showAI(ctx, lang);
    if (field === "summary") return showSummary(ctx, chatId, lang, tgId);
  }

  if (action === "w") {
    if (field === "custom") return startWaterCustom(ctx, chatId, lang);
    if (field === "remove") {
      try {
        const data = await botApi.waterRemove(tgId);
        if (data.removed) {
          await ctx.reply(tr(lang, "bot.waterRemoved", { total: data.today.amountMl }), { reply_markup: waterKeyboard(lang) });
        } else {
          await showWater(ctx, chatId, lang, tgId);
        }
      } catch (err) {
        return ctx.reply(errorText(lang, err), { reply_markup: waterKeyboard(lang) });
      }
      return;
    }
    const amount = Number(field);
    if (Number.isFinite(amount)) return addWaterQuick(ctx, chatId, lang, tgId, amount);
  }

  if (action === "s") {
    if (field === "custom") return startSleepCustom(ctx, chatId, lang);
    const minutes = Number(field);
    if (Number.isFinite(minutes)) return logSleep(ctx, chatId, lang, tgId, minutes);
  }

  if (action === "wk") {
    const minutes = Number(field);
    if (Number.isFinite(minutes)) return logWorkout(ctx, chatId, lang, tgId, minutes);
  }

  if (action === "h") {
    if (field === "add") return startHabitAdd(ctx, chatId, lang);
    if (field) return toggleHabit(ctx, chatId, lang, tgId, field);
  }

  if (action === "item" && field === "view" && id) return showFeature(ctx, chatId, lang, tgId, id);
  if (action === "item" && field === "edit" && id) return startEdit(ctx, chatId, lang, id);
  if (action === "item" && field === "del" && id) return askDelete(ctx, chatId, lang, id);

  if (action === "del" && field === "yes" && id) {
    try {
      await botApi.deleteFeature(tgId, id);
      await ctx.reply(tr(lang, "bot.featureDeleted", { title: id.slice(0, 20) }));
      return showFeatures(ctx, chatId, lang, tgId);
    } catch (err) {
      return ctx.reply(errorText(lang, err));
    }
  }

  if (action === "edit" && (field === "title" || field === "desc") && id) {
    conversations.set(chatId, { step: field === "title" ? "edit:title" : "edit:desc", featureId: id });
    const msg = field === "title" ? tr(lang, "bot.editTitle") : tr(lang, "bot.editDesc");
    return ctx.reply(msg);
  }
}