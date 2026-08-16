"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupportRequest, SupportStatus } from "@app/shared";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader, Card, CardTitle, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { supportApi } from "@/features/support/api";

const STATUS_KEYS: Record<SupportStatus, string> = {
  new: "support.statusNew",
  in_progress: "support.statusInProgress",
  answered: "support.statusAnswered",
  closed: "support.statusClosed",
};

const STATUS_BADGE: Record<SupportStatus, string> = {
  new: "bg-primary-500/15 text-primary-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  answered: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-surface-raised text-text-muted",
};

export default function SupportPage() {
  const { t, lang } = useI18n();
  const { showToast } = useToast();

  const [items, setItems] = useState<SupportRequest[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await supportApi.my()).items);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    const clean = message.trim();
    if (clean.length < 2) {
      showToast("error", t("errors.invalidInput"));
      return;
    }
    setSending(true);
    try {
      const created = await supportApi.create(clean);
      setItems((prev) => [created, ...prev]);
      setMessage("");
      showToast("success", t("support.sent"));
    } catch {
      showToast("error", t("support.sendError"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppShell>
          <div className="mx-auto flex min-h-64 max-w-6xl items-center justify-center px-4 py-12">
            <ProtectedRoute>
              <LoadingSpinner />
            </ProtectedRoute>
          </div>
        </AppShell>
      </>
    );
  }

  return (
    <>
      <AppShell>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
          <ProtectedRoute>
            <BackToDashboard />
            <PageHeader icon="👨‍💻" titleKey="support.title" subtitleKey="support.subtitle" />

            <Card className="flex flex-col gap-3">
              <CardTitle>{t("support.messageLabel")}</CardTitle>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("support.messagePlaceholder")}
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted/60 transition-colors focus:border-primary-500 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-muted">{message.length}/2000</span>
                <Button onClick={() => void send()} loading={sending}>
                  {t("support.send")}
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <CardTitle>{t("support.myTitle")}</CardTitle>
              {error ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-text-muted">{t("errors.loadFailed")}</p>
                  <Button variant="secondary" onClick={() => { setLoading(true); void load(); }}>
                    {t("common.retry")}
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">{t("support.empty")}</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-surface-raised px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[item.status]}`}>{t(STATUS_KEYS[item.status] as never)}</span>
                      <span className="ml-auto text-xs text-text-muted">
                        {t("support.datePrefix")}: {new Date(item.createdAt).toLocaleString(lang)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text">
                      <span className="font-semibold">{t("support.you")}:</span> {item.message}
                    </p>
                    {item.adminReply ? (
                      <p className="rounded-lg bg-primary-500/10 px-3 py-2 text-sm leading-relaxed text-text">
                        <span className="font-semibold text-primary-500">{t("support.adminLabel")}:</span> {item.adminReply}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">{t("support.noReply")}</p>
                    )}
                  </div>
                ))
              )}
            </Card>
          </ProtectedRoute>
        </div>
      </AppShell>
    </>
  );
}
