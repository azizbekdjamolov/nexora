import type { DiagnosticRecord, DiagnosticSectionKey } from "@app/shared";
import { DIAGNOSTIC_QUESTIONS, diagnosticLevel } from "@app/shared";

const SECTION_META: Record<DiagnosticSectionKey, { icon: string; labelKey: string; color: string }> = {
  sleep: { icon: "😴", labelKey: "diagnostics.secSleep", color: "text-violet-400" },
  water: { icon: "💧", labelKey: "diagnostics.secWater", color: "text-sky-400" },
  activity: { icon: "🚶", labelKey: "diagnostics.secActivity", color: "text-emerald-400" },
  habits: { icon: "✅", labelKey: "diagnostics.secHabits", color: "text-amber-400" },
  energy: { icon: "⚡", labelKey: "diagnostics.secEnergy", color: "text-orange-400" },
  stress: { icon: "😌", labelKey: "diagnostics.secStress", color: "text-rose-400" },
};

export const DIAGNOSTIC_SECTIONS = Object.keys(SECTION_META) as DiagnosticSectionKey[];

export function sectionMeta(key: DiagnosticSectionKey): { icon: string; labelKey: string; color: string } {
  return SECTION_META[key];
}

export function questionLabelKey(qid: string): string {
  return `diagnostics.${qid}`;
}

export function optionLabelKey(qid: string, optionKey: string): string {
  return `diagnostics.${qid}${optionKey.charAt(0).toUpperCase()}${optionKey.slice(1)}`;
}

export function levelLabelKey(level: string): string {
  return `diagnostics.level${level.charAt(0).toUpperCase()}${level.slice(1)}`;
}

export function sectionLabelKey(key: string): string {
  return `diagnostics.sec${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function recommendationKey(section: string, level: string): string {
  return `diagnostics.sec${section.charAt(0).toUpperCase()}${section.slice(1)}${level.charAt(0).toUpperCase()}${level.slice(1)}`;
}

export function levelColor(level: string): string {
  if (level === "good") return "text-emerald-500";
  if (level === "moderate") return "text-amber-500";
  return "text-red-500";
}

export function levelBadgeClass(level: string): string {
  if (level === "good") return "bg-emerald-500/15 text-emerald-500";
  if (level === "moderate") return "bg-amber-500/15 text-amber-500";
  return "bg-red-500/15 text-red-500";
}

export function levelFromScore(score: number): "good" | "moderate" | "low" {
  return diagnosticLevel(score / 100);
}

export function answerPoints(qid: string, optionKey: string): number {
  const q = DIAGNOSTIC_QUESTIONS.find((x) => x.id === qid);
  return q?.options.find((o) => o.key === optionKey)?.points ?? 0;
}

export function formatDiagnosticDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
}

export function latestDiagnostic(records: DiagnosticRecord[]): DiagnosticRecord | null {
  return records.length > 0 ? records[0] : null;
}
