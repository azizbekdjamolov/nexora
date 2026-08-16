"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportRequestAdmin, SupportStatus } from "@app/shared";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useAuth, ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/features/tracker/components/PageHeader";
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

const FILTERS: (SupportStatus | "all")[] = ["all", "new", "in_progress", "answered", "closed"];

export default function AdminPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<SupportRequestAdmin[]>([]);
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setItems((await supportApi.adminList()).items);
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (user?.isAdmin) void load();
  }, [user?.isAdmin, load]);

  // Auto-refresh so the admin sees new requests and bot-delivered replies.
  useEffect(() => {
    if (!user?.isAdmin) return;
    const timer = window.setInterval(() => {
      void load();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [user?.isAdmin, load]);

  const sendReply = async (id: string) => {
    const reply = (drafts[id] ?? "").trim();
    if (!reply) {
      showToast("error", t("admin.emptyReply"));
      return;
    }
    setReplyingId(id);
    try {
      const updated = await supportApi.adminReply(id, reply);
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      showToast("success", t("admin.replySent"));
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setReplyingId(null);
    }
  };

  const setStatus = async (id: string, status: SupportStatus) => {
    try {
      const updated = await supportApi.adminStatus(id, status);
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch {
      showToast("error", t("errors.internal"));
    }
  };

  const visible = filter === "all" ? items : items.filter((r) => r.status === filter);

  return (
    <>
      <AppShell>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
          <ProtectedRoute>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-lg text-white" aria-hidden>
                  🛡️
                </span>
                <h1 className="font-display text-2xl font-bold text-text">{t("admin.title")}</h1>
              </div>
              <p className="text-sm text-text-muted">{t("admin.subtitle")}</p>
            </div>

            {!user?.isAdmin ? (
              <Card className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="text-3xl" aria-hidden>
                  🔒
                </span>
                <p className="text-sm text-text-muted">{t("admin.notAdmin")}</p>
                <Link href="/dashboard">
                  <Button variant="secondary">{t("admin.back")}</Button>
                </Link>
              </Card>
            ) : loading ? (
              <div className="flex min-h-64 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <Card className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        filter === f ? "bg-gradient-to-r from-primary-500 to-accent-500 text-white" : "bg-surface-raised text-text-muted hover:text-text"
                      }`}
                    >
                      {f === "all" ? t("admin.requests") : t(STATUS_KEYS[f] as never)}
                      {f === "all" ? ` (${items.length})` : ` (${items.filter((r) => r.status === f).length})`}
                    </button>
                  ))}
                  <button
                    onClick={() => { setLoading(true); void load(); }}
                    className="ml-auto rounded-full bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text"
                  >
                    🔄
                  </button>
                </div>

                {visible.length === 0 ? (
                  <p className="py-10 text-center text-sm text-text-muted">{t("admin.noRequests")}</p>
                ) : (
                  visible.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-surface-raised px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-text">👤 {item.user.name || "—"}</span>
                        <span className="text-xs text-text-muted">
                          {item.user.telegramUsername ? `@${item.user.telegramUsername}` : "—"}
                        </span>
                        <span className="ml-auto text-xs text-text-muted">
                          {t("admin.date")}: {new Date(item.createdAt).toLocaleString(lang)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[item.status]}`}>{t(STATUS_KEYS[item.status] as never)}</span>
                      </div>
                      <div className="grid gap-2 text-xs text-text-muted sm:grid-cols-2">
                        <p>
                          {t("support.datePrefix")} ID: {item.user.telegramUserId ?? "—"}
                        </p>
                        <p>
                          {t("profile.phone")}: {item.user.phone ?? t("bot.phoneNone")}
                        </p>
                      </div>
                      <p className="rounded-lg bg-surface/70 px-3 py-2 text-sm leading-relaxed text-text">
                        💬 {item.message}
                      </p>
                      {item.adminReply ? (
                        <p className="rounded-lg bg-primary-500/10 px-3 py-2 text-sm leading-relaxed text-text">
                          <span className="font-semibold text-primary-500">{t("admin.replyBlock")}:</span> {item.adminReply}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <textarea
                            value={drafts[item.id] ?? ""}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder={t("admin.replyPlaceholder")}
                            rows={2}
                            maxLength={2000}
                            className="w-full resize-none rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-muted/60 transition-colors focus:border-primary-500 focus:outline-none"
                          />
                          <Button size="sm" onClick={() => void sendReply(item.id)} loading={replyingId === item.id}>
                            {t("admin.replySend")}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.status !== "in_progress" ? (
                            <Button size="sm" variant="secondary" onClick={() => void setStatus(item.id, "in_progress")}>
                              {t("admin.markInProgress")}
                            </Button>
                          ) : null}
                          {item.status !== "answered" ? (
                            <Button size="sm" variant="secondary" onClick={() => void setStatus(item.id, "answered")}>
                              {t("admin.markAnswered")}
                            </Button>
                          ) : null}
                          {item.status !== "closed" ? (
                            <Button size="sm" variant="ghost" onClick={() => void setStatus(item.id, "closed")}>
                              {t("admin.markClosed")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            )}
          </ProtectedRoute>
        </div>
      </AppShell>
    </>
  );
}
