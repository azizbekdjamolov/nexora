export type Lang = "uz" | "en" | "ru";

export const SUPPORTED_LANGS: Lang[] = ["uz", "en", "ru"];
export const LANG_NAMES: Record<Lang, string> = {
  uz: "O'zbekcha",
  en: "English",
  ru: "Русский",
};

export type ThemePreference = "dark" | "light" | "system";

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  telegramUserId: string | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  avatar: string | null;
  locale: Lang;
  theme: ThemePreference;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  bio: string | null;
  timezone: string | null;
  waterTargetMl: number;
  sleepGoalMinutes: number;
  activityStepsGoal: number;
  workoutGoalMinutes: number;
  notificationsEnabled: boolean;
  updatedAt: string;
}

// ---------------------------------------------------------------
// Health, Sport & Wellness tracking domain
// ---------------------------------------------------------------

export type TrackerSource = "website" | "bot" | "miniapp" | "custom";

export interface WaterEntry {
  id: string;
  userId: string;
  date: string;
  amountMl: number;
  targetMl: number;
  source: TrackerSource;
  note: string | null;
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  userId: string;
  date: string;
  sleepStart: string | null;
  wakeTime: string | null;
  durationMinutes: number;
  goalMinutes: number;
  source: TrackerSource;
  note: string | null;
  createdAt: string;
}

export type ActivityType = "walking" | "running" | "cycling" | "general";

export interface ActivityEntry {
  id: string;
  userId: string;
  date: string;
  type: ActivityType;
  steps: number;
  activeMinutes: number;
  distanceKm: number | null;
  source: TrackerSource;
  note: string | null;
  createdAt: string;
}

export type WorkoutCategory = "walking" | "running" | "strength" | "mobility" | "stretching" | "cardio" | "custom";

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  category: WorkoutCategory;
  durationMinutes: number;
  intensity: string | null;
  notes: string | null;
  exercises: WorkoutExercise[];
  source: TrackerSource;
  createdAt: string;
}

export type HabitFrequency = "daily" | "weekly";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  reminderTime: string | null;
  active: boolean;
  createdAt: string;
  doneToday?: boolean;
  currentStreak?: number;
  totalCompletions?: number;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
  done: boolean;
  createdAt: string;
}

export type GoalStatus = "active" | "completed" | "archived";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  targetValue: number | null;
  unit: string | null;
  progress: number;
  deadline: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = "medication" | "water" | "workout" | "sleep" | "habit" | "custom";

export interface Reminder {
  id: string;
  userId: string;
  type: ReminderType;
  title: string;
  time: string;
  days: number[];
  enabled: boolean;
  payload: Record<string, unknown> | null;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface DailyWellness {
  id: string;
  userId: string;
  date: string;
  score: number;
  waterMl: number;
  sleepMinutes: number;
  steps: number;
  workoutMinutes: number;
  habitsDone: number;
  habitsTotal: number;
  calculatedAt: string;
}

export interface WellnessScoreParts {
  water: number;
  sleep: number;
  activity: number;
  habits: number;
}

export interface WellnessToday {
  date: string;
  score: number;
  scoreParts: WellnessScoreParts;
  streak: number;
  water: { amountMl: number; targetMl: number };
  sleep: { durationMinutes: number; goalMinutes: number; logged: boolean };
  activity: { steps: number; goal: number; activeMinutes: number };
  workout: { durationMinutes: number; goalMinutes: number; count: number };
  habits: { done: number; total: number };
  hasAnyData: boolean;
}

export interface WellnessDay {
  date: string;
  score: number;
  waterMl: number;
  sleepMinutes: number;
  steps: number;
  workoutMinutes: number;
  habitsDone: number;
  habitsTotal: number;
}

export interface WellnessWeek {
  days: WellnessDay[];
  averages: {
    score: number;
    waterMl: number;
    sleepMinutes: number;
    steps: number;
    workoutMinutes: number;
    habitsRate: number;
  };
}

/** Text summary of a user's recorded wellness data (from AI or rules). */
export interface WellnessSummaryResult {
  text: string;
  source: "ai" | "stats";
  generatedAt: string;
}

/** Aggregated data sent to the AI for progress analysis. */
export interface WellnessAIInput {
  locale: Lang;
  streak: number;
  days: {
    date: string;
    score: number;
    waterMl: number;
    sleepMinutes: number;
    steps: number;
    workoutMinutes: number;
    habitsDone: number;
    habitsTotal: number;
  }[];
  goals: { title: string; progress: number; status: GoalStatus }[];
  habits: { name: string; streak: number; totalCompletions: number }[];
  workouts: { date: string; category: WorkoutCategory; durationMinutes: number }[];
}

/** Weekly weekday constants: 0 = Monday … 6 = Sunday. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export interface ReminderDueCheck {
  sent: number;
  skipped: number;
}

/** Bot progress payload (shared between bot and API). */
export interface BotProgressResult {
  today: WellnessToday;
  week: WellnessWeek;
  streak: number;
}

export interface TelegramIdentity {
  id: string;
  userId: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  linkedAt: string;
}

export interface AIUsage {
  id: string;
  userId: string;
  provider: string;
  model: string;
  requestCount: number;
  tokensUsed: number;
  createdAt: string;
}

export interface AIUsageSummary {
  provider: string;
  model: string;
  configured: boolean;
  requests: number;
  tokens: number;
}

export interface AIConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokensUsed: number;
  createdAt: string;
}

export interface AIConversationDetail {
  conversation: AIConversationSummary;
  messages: AIMessage[];
}

export interface AIChatResult {
  conversation: AIConversationSummary;
  reply: AIMessage;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export type SessionInfo = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  locale: Lang;
  theme: ThemePreference;
  telegramUserId: string | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  telegramLinked: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TelegramLinkStartResult {
  state: string;
  deepLink: string;
}

export interface TelegramLinkStatus {
  linked: boolean;
  telegramUserId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface MiniAppAuthResult {
  user: AuthUser;
  isNewUser: boolean;
  linkedToExisting: boolean;
  session?: SessionInfo;
  token?: string;
}

export type FeatureStatus = "active" | "archived";

export interface Feature {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  data: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type Platform = "website" | "telegram" | "miniapp";

export type RealtimeEventType =
  | "features.changed"
  | "profile.changed"
  | "telegram.linked"
  | "notification.created"
  | "ai.done"
  | "water.changed"
  | "sleep.changed"
  | "activity.changed"
  | "workout.changed"
  | "habits.changed"
  | "goals.changed"
  | "reminders.changed"
  | "wellness.changed";

export interface RealtimeEvent {
  type: RealtimeEventType;
  action?: "created" | "updated" | "deleted";
  targetId?: string;
  timestamp: number;
}

export type AIProviderName = "openai" | "gemini" | "anthropic" | "groq";

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGenerateRequest {
  messages: AIChatMessage[];
  maxTokens?: number;
}

export interface AIGenerateResult {
  content: string;
  provider: AIProviderName;
  model: string;
  tokensUsed: number;
}

export interface AIModelInfo {
  id: string;
  name: string;
}

export const SESSION_COOKIE = "up_session";
export const SESSION_TTL_DAYS = 30;

export const WELLNESS_DEFAULTS = {
  waterTargetMl: 2200,
  sleepGoalMinutes: 480,
  activityStepsGoal: 8000,
  workoutGoalMinutes: 30,
} as const;

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  "walking",
  "running",
  "strength",
  "mobility",
  "stretching",
  "cardio",
  "custom",
];

export const ACTIVITY_TYPES: ActivityType[] = ["walking", "running", "cycling", "general"];

export const REMINDER_TYPES: ReminderType[] = ["medication", "water", "workout", "sleep", "habit", "custom"];

export const GOAL_STATUSES: GoalStatus[] = ["active", "completed", "archived"];

// ---------------------------------------------------------------
// Diagnostics (self-assessment questionnaire)
// ---------------------------------------------------------------

export type DiagnosticSectionKey = "sleep" | "water" | "activity" | "habits" | "energy" | "stress";
export type DiagnosticLevel = "good" | "moderate" | "low";

export interface DiagnosticQuestionOption {
  key: string;
  points: number;
}

export interface DiagnosticQuestion {
  id: string;
  section: DiagnosticSectionKey;
  options: DiagnosticQuestionOption[];
}

export interface DiagnosticAnswer {
  questionId: string;
  optionKey: string;
  points: number;
}

export interface DiagnosticSectionResult {
  key: DiagnosticSectionKey;
  points: number;
  max: number;
  level: DiagnosticLevel;
}

export interface DiagnosticRecommendation {
  section: DiagnosticSectionKey;
  level: DiagnosticLevel;
}

export interface DiagnosticResult {
  score: number;
  level: DiagnosticLevel;
  sections: DiagnosticSectionResult[];
  recommendations: DiagnosticRecommendation[];
}

export interface DiagnosticRecord {
  id: string;
  score: number;
  createdAt: string;
  result: DiagnosticResult;
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "q1",
    section: "energy",
    options: [
      { key: "high", points: 3 },
      { key: "good", points: 2 },
      { key: "low", points: 1 },
      { key: "none", points: 0 },
    ],
  },
  {
    id: "q2",
    section: "sleep",
    options: [
      { key: "excellent", points: 3 },
      { key: "good", points: 2 },
      { key: "okay", points: 1 },
      { key: "poor", points: 0 },
    ],
  },
  {
    id: "q3",
    section: "activity",
    options: [
      { key: "daily", points: 3 },
      { key: "often", points: 2 },
      { key: "rarely", points: 1 },
      { key: "none", points: 0 },
    ],
  },
  {
    id: "q4",
    section: "water",
    options: [
      { key: "enough", points: 3 },
      { key: "partial", points: 2 },
      { key: "little", points: 1 },
      { key: "none", points: 0 },
    ],
  },
  {
    id: "q5",
    section: "stress",
    options: [
      { key: "calm", points: 3 },
      { key: "light", points: 2 },
      { key: "stressed", points: 1 },
      { key: "overwhelmed", points: 0 },
    ],
  },
  {
    id: "q6",
    section: "habits",
    options: [
      { key: "all", points: 3 },
      { key: "most", points: 2 },
      { key: "some", points: 1 },
      { key: "none", points: 0 },
    ],
  },
  {
    id: "q7",
    section: "stress",
    options: [
      { key: "great", points: 3 },
      { key: "fine", points: 2 },
      { key: "low", points: 1 },
      { key: "rough", points: 0 },
    ],
  },
];

export function diagnosticLevel(ratio: number): DiagnosticLevel {
  if (ratio >= 0.66) return "good";
  if (ratio >= 0.33) return "moderate";
  return "low";
}

// ---------------------------------------------------------------
// Support requests (adminga murojaat)
// ---------------------------------------------------------------

export type SupportStatus = "new" | "in_progress" | "answered" | "closed";

export interface SupportRequest {
  id: string;
  message: string;
  status: SupportStatus;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportRequestAdmin extends SupportRequest {
  user: {
    id: string;
    name: string;
    telegramUsername: string | null;
    telegramUserId: string | null;
    phone: string | null;
  };
}