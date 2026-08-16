import { config } from "./config";

export class ApiBotError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type ApiResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

/**
 * Thin client for the shared backend service endpoints.
 * The bot holds no business logic and no database — it is a UI for the API.
 */
export async function api<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-token": config.botServiceToken,
    },
    body: JSON.stringify(body),
  });
  let json: ApiResult<T> | null = null;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    json = null;
  }
  if (!json || !json.success) {
    const code = json && !json.success ? json.error.code : "internal";
    const message = json && !json.success ? json.error.message : `API error ${res.status}`;
    throw new ApiBotError(code, message, res.status);
  }
  return json.data;
}

export const botApi = {
  me: (telegramUserId: string) =>
    api<{ user: { id: string; name: string; locale: string; telegramFirstName?: string | null }; itemsCount: number; unreadNotifications: number }>("/api/bot/me", { telegramUserId }),
  profile: (telegramUserId: string) =>
    api<{ user: { name: string; email: string | null; phone: string | null; locale: string; createdAt: string; telegramUserId: string | null; telegramUsername: string | null; telegramFirstName: string | null; telegramLastName: string | null }; profile: { bio: string | null } | null }>("/api/bot/profile/get", { telegramUserId }),
  listFeatures: (telegramUserId: string) =>
    api<{ items: { id: string; title: string; description: string | null; status: string; createdAt: string; updatedAt: string }[]; total: number }>("/api/bot/features/list", { telegramUserId }),
  getFeature: (telegramUserId: string, featureId: string) =>
    api<{ feature: { id: string; title: string; description: string | null; status: string; createdAt: string } }>("/api/bot/features/get", { telegramUserId, featureId }),
  createFeature: (telegramUserId: string, title: string, description?: string) =>
    api<{ feature: { id: string; title: string } }>("/api/bot/features/create", { telegramUserId, title, description: description || null }),
  updateFeature: (telegramUserId: string, featureId: string, fields: { title?: string; description?: string | null; status?: string }) =>
    api<{ feature: { id: string; title: string } }>("/api/bot/features/update", { telegramUserId, featureId, ...fields }),
  deleteFeature: (telegramUserId: string, featureId: string) =>
    api<{ ok: boolean }>("/api/bot/features/delete", { telegramUserId, featureId }),
  setLanguage: (telegramUserId: string, locale: string) =>
    api<{ user: { locale: string } }>("/api/bot/language/set", { telegramUserId, locale }),
  confirmLink: (input: { state: string; telegramUserId: string; username?: string | null; firstName?: string | null; lastName?: string | null }) =>
    api<{ userId: string; name: string; linked: boolean }>("/api/bot/telegram/link/confirm", {
      state: input.state,
      telegramUserId: input.telegramUserId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    }),
  syncProfile: (telegramUserId: string, input: { username?: string | null; firstName?: string | null; lastName?: string | null; languageCode?: string | null }) =>
    api<{ userId: string }>("/api/bot/telegram/sync-profile", {
      telegramUserId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      languageCode: input.languageCode ?? null,
    }),
  savePhone: (telegramUserId: string, phone: string) =>
    api<{ userId: string; phone: string }>("/api/bot/telegram/phone/set", { telegramUserId, phone }),

  // ── Wellness ──────────────────────────────────────────────────────────────
  wellnessProgress: (telegramUserId: string) =>
    api<{
      today: {
        score: number;
        streak: number;
        water: { amountMl: number; targetMl: number };
        sleep: { durationMinutes: number; goalMinutes: number; logged: boolean };
        activity: { steps: number; goal: number; activeMinutes: number };
        habits: { done: number; total: number };
      };
    }>("/api/bot/wellness/progress", { telegramUserId }),
  waterAdd: (telegramUserId: string, amountMl: number) =>
    api<{ entry: { id: string }; today: { amountMl: number; targetMl: number } }>("/api/bot/wellness/water/add", { telegramUserId, amountMl }),
  waterRemove: (telegramUserId: string) =>
    api<{ removed: boolean; today: { amountMl: number; targetMl: number } }>("/api/bot/wellness/water/remove", { telegramUserId }),
  sleepLog: (telegramUserId: string, durationMinutes: number) =>
    api<{ entry: { id: string; durationMinutes: number } }>("/api/bot/wellness/sleep/log", { telegramUserId, durationMinutes }),
  workoutCreate: (telegramUserId: string, durationMinutes: number) =>
    api<{ workout: { id: string; durationMinutes: number } }>("/api/bot/wellness/workouts/create", { telegramUserId, durationMinutes, category: "custom" }),
  habitsList: (telegramUserId: string) =>
    api<{ habits: { id: string; name: string; icon: string; doneToday: boolean; currentStreak: number }[] }>("/api/bot/wellness/habits/list", { telegramUserId }),
  habitToggle: (telegramUserId: string, habitId: string) =>
    api<{ habit: { name: string }; done: boolean }>("/api/bot/wellness/habits/toggle", { telegramUserId, habitId }),
  habitCreate: (telegramUserId: string, name: string) =>
    api<{ habit: { id: string; name: string } }>("/api/bot/wellness/habits/create", { telegramUserId, name }),
  goalsList: (telegramUserId: string) =>
    api<{ goals: { id: string; title: string; progress: number; targetValue: number | null; unit: string | null; status: string }[] }>("/api/bot/wellness/goals/list", { telegramUserId }),
  goalCreate: (telegramUserId: string, title: string, targetValue?: number) =>
    api<{ goal: { id: string; title: string } }>("/api/bot/wellness/goals/create", { telegramUserId, title, targetValue }),
  remindersList: (telegramUserId: string) =>
    api<{ reminders: { id: string; title: string; time: string; days: number[]; enabled: boolean }[] }>("/api/bot/wellness/reminders/list", { telegramUserId }),
  wellnessSummary: (telegramUserId: string, locale: string) =>
    api<{ text: string; source: string }>("/api/bot/wellness/summary", { telegramUserId, locale }),
  aiChat: (telegramUserId: string, content: string, conversationId?: string | null) =>
    api<{ conversation: { id: string }; reply: { content: string } }>("/api/bot/ai/chat", { telegramUserId, content, conversationId: conversationId ?? null }),

  // ── Diagnostics & support ─────────────────────────────────────────────────
  diagnosticsCreate: (telegramUserId: string, answers: { questionId: string; optionKey: string; points: number }[]) =>
    api<{ id: string; score: number; createdAt: string; result: { score: number; level: string; sections: { key: string; points: number; max: number; level: string }[]; recommendations: { section: string; level: string }[] } }>(
      "/api/bot/diagnostics/create",
      { telegramUserId, answers }
    ),
  supportCreate: (telegramUserId: string, message: string) =>
    api<{ id: string; status: string; createdAt: string }>("/api/bot/support/create", { telegramUserId, message }),
  supportPending: () =>
    api<{
      newRequests: {
        id: string;
        message: string;
        createdAt: string;
        user: { name: string; telegramUsername: string | null; telegramUserId: string | null; phone: string | null };
      }[];
      replies: { id: string; telegramUserId: string; adminReply: string; locale: string }[];
    }>("/api/bot/support/pending", {}),
  supportAck: (announcedIds: string[], deliveredIds: string[]) =>
    api<{ ok: boolean }>("/api/bot/support/ack", { announcedIds, deliveredIds }),
};