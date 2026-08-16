"use client";

import { useCallback, useEffect, useState } from "react";
import { telegramApi } from "@/features/telegram/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { useRealtimeEvents } from "@/lib/events";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Links a website account to Telegram using Telegram's deep-link mechanism:
 * 1. backend creates a short-lived state + deep link (no manual codes)
 * 2. user taps the link inside Telegram
 * 3. bot confirms the link with its verified telegram id
 * 4. website polls the status until linked
 */
export function TelegramConnect() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { user, updateUser } = useAuth();
  const lastEvent = useRealtimeEvents();

  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [miniAppUrl, setMiniAppUrl] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    telegramApi
      .info()
      .then((info) => {
        setBotUsername(info.botUsername);
        setMiniAppUrl(info.miniAppUrl);
      })
      .catch(() => undefined);
  }, []);

  // SSE: linking completed in Telegram -> refresh user
  useEffect(() => {
    if (lastEvent?.type === "telegram.linked") {
      setLinking(false);
      showToast("success", t("profile.linkedSuccess"));
      void telegramApi.linkStatus().then((status) => {
        if (status.linked && user) {
          updateUser({ ...user, telegramLinked: true, telegramUserId: status.telegramUserId, telegramUsername: status.username });
        }
      });
    }
  }, [lastEvent, showToast, t, user, updateUser]);

  // Poll fallback (e.g. if SSE dropped)
  const pollStatus = useCallback(async () => {
    if (!linking) return;
    try {
      const status = await telegramApi.linkStatus();
      if (status.linked) {
        setLinking(false);
        showToast("success", t("profile.linkedSuccess"));
        if (user) {
          updateUser({ ...user, telegramLinked: true, telegramUserId: status.telegramUserId, telegramUsername: status.username });
        }
      }
    } catch {
      // keep polling
    }
  }, [linking, showToast, t, user, updateUser]);

  useEffect(() => {
    if (!linking) return;
    const timer = window.setInterval(() => void pollStatus(), 2500);
    return () => window.clearInterval(timer);
  }, [linking, pollStatus]);

  const startLinking = async () => {
    setLinking(true);
    try {
      const { deepLink } = await telegramApi.linkStart();
      window.open(deepLink, "_blank", "noopener");
    } catch {
      setLinking(false);
      showToast("error", t("errors.internal"));
    }
  };

  const unlink = async () => {
    setUnlinking(true);
    try {
      await telegramApi.unlink();
      if (user) updateUser({ ...user, telegramLinked: false, telegramUserId: null, telegramUsername: null });
      showToast("info", t("profile.unlinked"));
      setUnlinkOpen(false);
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setUnlinking(false);
    }
  };

  const linked = Boolean(user?.telegramLinked);
  const displayName = user?.telegramFirstName || user?.telegramUsername || user?.telegramUserId;
  const telegramUsername = user?.telegramUsername ? `@${user.telegramUsername}` : null;

  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-base font-semibold text-text">{t("profile.telegramSection")}</h2>

      {linked ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white" aria-hidden>
              ✈
            </span>
            <div>
              <p className="text-sm font-medium text-text">{displayName ?? t("profile.telegramLinked")}</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                {t("profile.telegramLinked")}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-text-muted">
            <p>{t("profile.username")}: {telegramUsername ?? "—"}</p>
            <p>{t("profile.telegramId")}: {user?.telegramUserId ?? "—"}</p>
            <p>{t("profile.phone")}: {user?.phone ?? "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {miniAppUrl ? (
              <a href={miniAppUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">{t("profile.openMiniApp")}</Button>
              </a>
            ) : null}
            <Button variant="danger" size="sm" onClick={() => setUnlinkOpen(true)}>
              {t("profile.unlinkTelegram")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-text-muted">{t("profile.linkInstructions")}</p>
          {botUsername ? (
            <Button onClick={startLinking} loading={linking} className="self-start">
              {linking ? t("profile.linkingInProgress") : `✈ ${t("profile.linkTelegram")}`}
            </Button>
          ) : (
            <p className="text-xs text-text-muted">@{botUsername ?? "..."}</p>
          )}
        </div>
      )}

      <Modal open={unlinkOpen} onClose={() => setUnlinkOpen(false)} title={t("profile.unlinkConfirm")}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setUnlinkOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={unlink} loading={unlinking}>
            {t("profile.unlinkTelegram")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}