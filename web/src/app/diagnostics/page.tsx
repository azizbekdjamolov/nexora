"use client";

import { useCallback, useEffect, useState } from "react";
import { DIAGNOSTIC_QUESTIONS } from "@app/shared";
import type { DiagnosticAnswer, DiagnosticRecord } from "@app/shared";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { ProtectedRoute, LoadingSpinner } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { PageHeader, Card, CardTitle, BackToDashboard } from "@/features/tracker/components/PageHeader";
import { ProgressRing } from "@/features/tracker/components/ProgressRing";
import { diagnosticsApi } from "@/features/diagnostics/api";
import {
  sectionMeta,
  optionLabelKey,
  questionLabelKey,
  sectionLabelKey,
  recommendationKey,
  levelBadgeClass,
  levelColor,
  levelLabelKey,
  formatDiagnosticDate,
} from "@/features/diagnostics/utils";

type Mode = "flow" | "result" | "history" | "intro";

function ResultCard({ record, onRetake, onHistory, onBack }: { record: DiagnosticRecord; onRetake: () => void; onHistory: () => void; onBack: () => void }) {
  const { t, tAny } = useI18n();
  const result = record.result;

  return (
    <div className="flex flex-col gap-5">
      <section className="glass flex flex-col items-center gap-6 rounded-3xl p-6 md:flex-row md:justify-center">
        <ProgressRing value={result.score} max={100} size={140} stroke={12} label={`${result.score}`} color="stroke-primary-500" />
        <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
          <h2 className="font-display text-lg font-bold text-text">{t("diagnostics.resultTitle")}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelBadgeClass(result.level)}`}>{tAny(levelLabelKey(result.level) as never)}</span>
          <p className="text-xs text-text-muted">{t("wellness.disclaimer")}</p>
        </div>
      </section>

      <Card>
        <CardTitle>{t("diagnostics.sectionsTitle")}</CardTitle>
        <div className="flex flex-col gap-3">
          {result.sections.map((s) => {
            const meta = sectionMeta(s.key);
            const ratio = s.max > 0 ? s.points / s.max : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-5 text-center text-base" aria-hidden>
                  {meta.icon}
                </span>
                <span className="w-28 shrink-0 text-sm text-text">{tAny(sectionLabelKey(s.key) as never)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
                  <div className={`h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 ${s.level === "low" ? "opacity-40" : s.level === "moderate" ? "opacity-70" : ""}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <span className={`w-16 shrink-0 text-right text-xs font-semibold ${levelColor(s.level)}`}>
                  {s.points}/{s.max}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardTitle>💡 {t("diagnostics.recommendationsTitle")}</CardTitle>
        <div className="flex flex-col gap-4">
          {result.recommendations.map((r) => {
            const meta = sectionMeta(r.section);
            return (
              <div key={r.section} className="rounded-xl bg-surface-raised px-4 py-3">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
                  <span aria-hidden>{meta.icon}</span>
                  {tAny(sectionLabelKey(r.section) as never)}
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelBadgeClass(r.level)}`}>{tAny(levelLabelKey(r.level) as never)}</span>
                </p>
                <p className="text-sm leading-relaxed text-text-muted">{tAny(recommendationKey(r.section, r.level) as never)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="rounded-xl bg-surface-raised px-4 py-3 text-xs leading-relaxed text-text-muted">{t("diagnostics.disclaimer")}</p>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onRetake}>{t("diagnostics.retake")}</Button>
        <Button variant="secondary" onClick={onHistory}>
          {t("diagnostics.history")}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {t("diagnostics.back")}
        </Button>
      </div>
    </div>
  );
}

function HistoryList({ records, onOpen, onBack }: { records: DiagnosticRecord[]; onOpen: (r: DiagnosticRecord) => void; onBack: () => void }) {
  const { t, tAny, lang } = useI18n();
  if (records.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-3xl" aria-hidden>
          🩺
        </span>
        <p className="text-sm text-text-muted">{t("diagnostics.noHistory")}</p>
        <Button onClick={onBack}>{t("diagnostics.start")}</Button>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>{t("diagnostics.historyTitle")}</CardTitle>
      {records.map((r) => (
        <button
          key={r.id}
          onClick={() => onOpen(r)}
          className="flex items-center gap-4 rounded-xl bg-surface-raised px-4 py-3 text-left transition-colors hover:bg-surface-border/40"
        >
          <span className={`text-xs font-semibold ${levelColor(r.result.level)}`}>{tAny(levelLabelKey(r.result.level) as never)}</span>
          <span className="ml-auto text-sm text-text-muted">{formatDiagnosticDate(r.createdAt, lang)}</span>
          <span className="font-display text-base font-bold text-text">{r.score}/100</span>
        </button>
      ))}
      <Button variant="ghost" onClick={onBack}>
        {t("diagnostics.back")}
      </Button>
    </Card>
  );
}

export default function DiagnosticsPage() {
  const { t, tAny, lang } = useI18n();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [current, setCurrent] = useState<DiagnosticRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await diagnosticsApi.list();
      setRecords(data.items);
      const latest = data.items[0];
      if (latest) {
        setCurrent(latest);
        setMode("result");
      }
    } catch {
      // Surface via the retry state below.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const start = () => {
    setAnswers([]);
    setStep(0);
    setMode("flow");
  };

  const pick = (questionId: string, optionKey: string) => {
    const q = DIAGNOSTIC_QUESTIONS.find((x) => x.id === questionId);
    const opt = q?.options.find((o) => o.key === optionKey);
    if (!q || !opt) return;
    const next = [...answers, { questionId, optionKey, points: opt.points }];
    setAnswers(next);
    if (next.length >= DIAGNOSTIC_QUESTIONS.length) {
      void submit(next);
    } else {
      setStep(next.length);
    }
  };

  const submit = async (finalAnswers: DiagnosticAnswer[]) => {
    setSubmitting(true);
    try {
      const record = await diagnosticsApi.create(finalAnswers);
      setCurrent(record);
      setMode("result");
      setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
      showToast("success", t("diagnostics.completed"));
    } catch {
      showToast("error", t("errors.internal"));
    } finally {
      setSubmitting(false);
    }
  };

  const openRecord = (r: DiagnosticRecord) => {
    setCurrent(r);
    setMode("result");
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

  const question = DIAGNOSTIC_QUESTIONS[step];

  return (
    <>
      <AppShell>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
          <ProtectedRoute>
            <BackToDashboard />
            <PageHeader icon="🩺" titleKey="diagnostics.title" subtitleKey="diagnostics.subtitle" />

            {mode === "flow" && question ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300" style={{ width: `${((step + 1) / DIAGNOSTIC_QUESTIONS.length) * 100}%` }} />
                  </div>
                  <span className="text-xs text-text-muted">{t("diagnostics.step", { current: step + 1, total: DIAGNOSTIC_QUESTIONS.length })}</span>
                </div>
                <Card className="flex flex-col gap-5">
                  <h2 className="font-display text-lg font-semibold text-text">{tAny(questionLabelKey(question.id) as never)}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {question.options.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => pick(question.id, opt.key)}
                        className="group glass rounded-xl px-4 py-3 text-left text-sm font-medium text-text transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-sm hover:ring-1 hover:ring-primary-500/40"
                      >
                        {tAny(optionLabelKey(question.id, opt.key) as never)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    {step > 0 ? (
                      <Button variant="ghost" onClick={() => setStep(step - 1)}>
                        {t("diagnostics.back")}
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => setMode("history")}>
                      {t("diagnostics.history")}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}

            {mode === "result" && current ? (
              <ResultCard record={current} onRetake={start} onHistory={() => setMode("history")} onBack={() => setMode("history")} />
            ) : null}

            {mode === "history" ? (
              <HistoryList records={records} onOpen={openRecord} onBack={current ? () => setMode("result") : start} />
            ) : null}

            {mode === "intro" ? (
              <Card className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="text-4xl" aria-hidden>
                  🩺
                </span>
                <h2 className="font-display text-lg font-bold text-text">{t("diagnostics.title")}</h2>
                <p className="max-w-md text-sm leading-relaxed text-text-muted">{t("diagnostics.subtitle")}</p>
                <p className="max-w-md text-xs leading-relaxed text-text-muted">{t("diagnostics.disclaimer")}</p>
                <Button onClick={start} loading={submitting}>
                  {t("diagnostics.start")}
                </Button>
              </Card>
            ) : null}

            {mode === "flow" && submitting ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner label={t("common.loading")} />
              </div>
            ) : null}
          </ProtectedRoute>
        </div>
      </AppShell>
    </>
  );
}
