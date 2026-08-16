import { InlineKeyboard, Keyboard } from "grammy";
import { translate } from "@app/shared";
import type { Lang } from "@app/shared";
import { config } from "./config";

export function tr(lang: Lang, key: string, params?: Record<string, string | number>): string {
  return translate(lang, key as never, params);
}

export function menuKeyboard(lang: Lang): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(tr(lang, "bot.water"), "wellness:water")
    .text(tr(lang, "bot.sleep"), "wellness:sleep")
    .row()
    .text(tr(lang, "bot.workout"), "wellness:workout")
    .text(tr(lang, "bot.habits"), "wellness:habits")
    .row()
    .text(tr(lang, "bot.goals"), "wellness:goals")
    .text(tr(lang, "bot.progress"), "wellness:progress")
    .row()
    .text(tr(lang, "bot.reminders"), "wellness:reminders")
    .text(tr(lang, "bot.ai"), "wellness:ai")
    .row()
    .text(tr(lang, "bot.diagnostics"), "diag")
    .text(tr(lang, "bot.support"), "support")
    .row()
    .text(tr(lang, "bot.profile"), "profile")
    .text(tr(lang, "bot.myFeatures"), "items")
    .row()
    .text(tr(lang, "bot.createFeature"), "create")
    .text(tr(lang, "bot.language"), "language")
    .row()
    .text(tr(lang, "bot.help"), "help")
    .row();

  // Telegram only accepts HTTPS URLs for inline buttons (Web App and URL).
  if (/^https:\/\//.test(config.miniAppUrl)) kb.webApp(tr(lang, "bot.openApp"), config.miniAppUrl);
  if (/^https:\/\//.test(config.webUrl)) kb.url(tr(lang, "bot.openWebsite"), config.webUrl);
  return kb;
}

export function waterKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard()
    .text("+250", "w:250")
    .text("+500", "w:500")
    .text("+750", "w:750")
    .row()
    .text(tr(lang, "bot.waterCustom"), "w:custom")
    .text(tr(lang, "bot.waterRemove"), "w:remove")
    .row()
    .text(tr(lang, "bot.backToMenu"), "menu");
}

export function sleepKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard()
    .text(tr(lang, "bot.sleepDurationOption", { hours: 6 }), "s:360")
    .text(tr(lang, "bot.sleepDurationOption", { hours: 7 }), "s:420")
    .text(tr(lang, "bot.sleepDurationOption", { hours: 8 }), "s:480")
    .row()
    .text(tr(lang, "bot.waterCustom"), "s:custom")
    .row()
    .text(tr(lang, "bot.backToMenu"), "menu");
}

export function workoutKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard()
    .text("20 мин", "wk:20")
    .text("30 мин", "wk:30")
    .text("45 мин", "wk:45")
    .text("60 мин", "wk:60")
    .row()
    .text(tr(lang, "bot.backToMenu"), "menu");
}

export function habitsKeyboard(lang: Lang, habits: { id: string; name: string; icon: string; doneToday: boolean }[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const habit of habits.slice(0, 30)) {
    kb.text(`${habit.doneToday ? "✅" : habit.icon} ${habit.name.slice(0, 25)}`, `h:${habit.id}`);
    kb.row();
  }
  kb.text(tr(lang, "bot.addHabit"), "h:add").text(tr(lang, "bot.backToMenu"), "menu");
  return kb;
}

export function featuresKeyboard(lang: Lang, features: { id: string; title: string }[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const feature of features.slice(0, 40)) {
    kb.text(feature.title.slice(0, 30), `item:view:${feature.id}`);
    kb.text(tr(lang, "bot.edit"), `item:edit:${feature.id}`).text(tr(lang, "bot.delete"), `item:del:${feature.id}`);
    kb.row();
  }
  kb.text(tr(lang, "bot.backToMenu"), "menu");
  return kb;
}

export function featureActionsKeyboard(lang: Lang, featureId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(tr(lang, "bot.edit"), `item:edit:${featureId}`)
    .text(tr(lang, "bot.delete"), `item:del:${featureId}`)
    .row()
    .text(tr(lang, "bot.back"), "items");
}

export function editFieldsKeyboard(lang: Lang, featureId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(tr(lang, "features.featureTitle"), `edit:title:${featureId}`)
    .text(tr(lang, "features.description"), `edit:desc:${featureId}`)
    .row()
    .text(tr(lang, "bot.back"), "items");
}

export function deleteConfirmKeyboard(lang: Lang, featureId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(tr(lang, "bot.yesDelete"), `del:yes:${featureId}`)
    .text(tr(lang, "bot.cancel"), "items");
}

export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("O'zbekcha", "lang:uz")
    .text("English", "lang:en")
    .text("Русский", "lang:ru")
    .row()
    .text(tr("en", "bot.backToMenu"), "menu");
}

export function profileKeyboard(lang: Lang, hasPhone: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(hasPhone ? tr(lang, "bot.updatePhone") : tr(lang, "bot.sharePhone"), "profile:phone")
    .text(tr(lang, "bot.profileRefresh"), "profile:refresh")
    .row()
    .text(tr(lang, "bot.profileBack"), "menu");
  return kb;
}

/** Reply keyboard with Telegram's native contact request button. */
export function phoneRequestKeyboard(lang: Lang): Keyboard {
  return new Keyboard()
    .requestContact(tr(lang, "bot.sharePhone"))
    .text(tr(lang, "bot.cancel"))
    .oneTime(false)
    .resized(true);
}

export function diagnosticStartKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard()
    .text(tr(lang, "bot.diagnosticsStart"), "diag:start")
    .row()
    .text(tr(lang, "bot.backToMenu"), "menu");
}

export function diagnosticOptionKeyboard(lang: Lang, qid: string, options: { key: string }[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const opt of options) {
    const labelKey = `diagnostics.${qid}${opt.key.charAt(0).toUpperCase()}${opt.key.slice(1)}`;
    kb.text(tr(lang, labelKey), `diagq:${qid}:${opt.key}`);
  }
  kb.row().text(tr(lang, "bot.backToMenu"), "menu");
  return kb;
}