import {
  DIAGNOSTIC_QUESTIONS,
  diagnosticLevel,
  type DiagnosticAnswer,
  type DiagnosticRecord,
  type DiagnosticResult,
  type DiagnosticSectionKey,
} from "@app/shared";
import { prisma } from "../db";
import { badRequest } from "../errors";

/**
 * Scores the answers into sections and a single 0-100 wellness score.
 * Pure and deterministic — no AI involved, fully translatable client-side.
 * Explicitly an educational self-assessment, never a medical diagnosis.
 */
export function computeDiagnostic(answers: DiagnosticAnswer[]): DiagnosticResult {
  const picked = new Map<string, number>();
  const sections = new Map<DiagnosticSectionKey, { points: number; max: number }>();

  for (const a of answers) {
    const q = DIAGNOSTIC_QUESTIONS.find((x) => x.id === a.questionId);
    if (!q) continue;
    const opt = q.options.find((o) => o.key === a.optionKey);
    if (!opt) continue;
    picked.set(a.questionId, opt.points);
    const sec = sections.get(q.section) ?? { points: 0, max: 0 };
    sec.points += opt.points;
    sec.max += Math.max(...q.options.map((o) => o.points));
    sections.set(q.section, sec);
  }

  if (picked.size !== DIAGNOSTIC_QUESTIONS.length) {
    throw badRequest("Please answer all questions.");
  }

  const sectionResults = [...sections.entries()].map(([key, v]) => ({
    key,
    points: v.points,
    max: v.max,
    level: diagnosticLevel(v.max > 0 ? v.points / v.max : 0),
  }));

  const total = sectionResults.reduce((s, x) => s + x.points, 0);
  const maxTotal = sectionResults.reduce((s, x) => s + x.max, 0);
  const score = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  return {
    score,
    level: diagnosticLevel(maxTotal > 0 ? total / maxTotal : 0),
    sections: sectionResults,
    recommendations: sectionResults.map((s) => ({ section: s.key, level: s.level })),
  };
}

function toRecord(row: {
  id: string;
  score: number;
  createdAt: Date;
  result: string;
}): DiagnosticRecord {
  return {
    id: row.id,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
    result: JSON.parse(row.result) as DiagnosticResult,
  };
}

export const DiagnosticService = {
  async create(userId: string, answers: DiagnosticAnswer[]): Promise<DiagnosticRecord> {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw badRequest("Answers are required.");
    }
    const result = computeDiagnostic(answers);
    const row = await prisma.diagnostic.create({
      data: {
        userId,
        answers: JSON.stringify(answers),
        result: JSON.stringify(result),
        score: result.score,
      },
    });
    return toRecord(row);
  },

  async list(userId: string, limit = 10): Promise<DiagnosticRecord[]> {
    const rows = await prisma.diagnostic.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  },

  async get(userId: string, id: string): Promise<DiagnosticRecord | null> {
    const row = await prisma.diagnostic.findFirst({ where: { id, userId } });
    return row ? toRecord(row) : null;
  },
};
