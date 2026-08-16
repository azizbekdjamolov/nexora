import type {
  ActivityEntry,
  Goal,
  GoalStatus,
  Habit,
  Paginated,
  Reminder,
  ReminderType,
  SleepEntry,
  WaterEntry,
  WellnessSummaryResult,
  WellnessToday,
  WellnessWeek,
  Workout,
  WorkoutCategory,
} from "@app/shared";
import { api } from "@/lib/api";

export interface WaterToday {
  amountMl: number;
  targetMl: number;
  entries: WaterEntry[];
}

export interface WaterWeek {
  days: { date: string; amountMl: number }[];
  totalMl: number;
  streak: number;
}

export interface SleepToday {
  entry: SleepEntry | null;
  goalMinutes: number;
}

export interface SleepWeek {
  days: { date: string; durationMinutes: number }[];
  avgDuration: number;
  consistency: number;
}

export interface ActivityToday {
  steps: number;
  activeMinutes: number;
  goal: number;
  entries: ActivityEntry[];
}

export interface ActivityWeek {
  days: { date: string; steps: number; activeMinutes: number }[];
  avgSteps: number;
}

export interface WorkoutWeek {
  days: { date: string; minutes: number }[];
  totalMinutes: number;
  count: number;
}

export const trackerApi = {
  water: {
    today: (date?: string) => api<WaterToday>(`/water/today${date ? `?date=${date}` : ""}`),
    week: (date?: string) => api<WaterWeek>(`/water/week${date ? `?date=${date}` : ""}`),
    add: (amountMl: number, source?: string) => api<{ entry: WaterEntry; today: { amountMl: number; targetMl: number } }>("/water", { method: "POST", body: JSON.stringify({ amountMl, source }) }),
    remove: (id: string) => api<{ ok: boolean }>(`/water/${id}`, { method: "DELETE" }),
    setTarget: (targetMl: number) => api<{ targetMl: number }>("/water/target", { method: "PATCH", body: JSON.stringify({ targetMl }) }),
  },
  sleep: {
    today: (date?: string) => api<SleepToday>(`/sleep/today${date ? `?date=${date}` : ""}`),
    week: (date?: string) => api<SleepWeek>(`/sleep/week${date ? `?date=${date}` : ""}`),
    log: (body: { durationMinutes: number; sleepStart?: string | null; wakeTime?: string | null; note?: string | null }) =>
      api<{ entry: SleepEntry }>("/sleep", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/sleep/${id}`, { method: "DELETE" }),
    setGoal: (goalMinutes: number) => api<{ goalMinutes: number }>("/sleep/goal", { method: "PATCH", body: JSON.stringify({ goalMinutes }) }),
  },
  activity: {
    today: (date?: string) => api<ActivityToday>(`/activity/today${date ? `?date=${date}` : ""}`),
    week: (date?: string) => api<ActivityWeek>(`/activity/week${date ? `?date=${date}` : ""}`),
    log: (body: { steps: number; activeMinutes?: number; type?: string }) =>
      api<{ entry: ActivityEntry; today: { steps: number; goal: number } }>("/activity", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/activity/${id}`, { method: "DELETE" }),
    setGoal: (stepsGoal: number) => api<{ stepsGoal: number }>("/activity/goal", { method: "PATCH", body: JSON.stringify({ stepsGoal }) }),
  },
  workouts: {
    list: (page = 1) => api<Paginated<Workout>>(`/workouts?page=${page}`),
    week: (date?: string) => api<WorkoutWeek>(`/workouts/week${date ? `?date=${date}` : ""}`),
    create: (body: { category: WorkoutCategory; durationMinutes: number; intensity?: string; notes?: string | null; exercises?: { name: string; sets?: number; reps?: number }[] }) =>
      api<{ workout: Workout }>("/workouts", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/workouts/${id}`, { method: "DELETE" }),
  },
  habits: {
    list: () => api<{ habits: Habit[] }>("/habits"),
    create: (body: { name: string; icon?: string; frequency?: string; reminderTime?: string | null }) =>
      api<{ habit: Habit }>("/habits", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; icon?: string; frequency?: string; active?: boolean; reminderTime?: string | null }) =>
      api<{ habit: Habit }>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/habits/${id}`, { method: "DELETE" }),
    toggle: (id: string) => api<{ habit: Habit; done: boolean; date: string }>(`/habits/${id}/toggle`, { method: "POST", body: "{}" }),
    calendar: (id: string) => api<{ dates: string[] }>(`/habits/${id}/calendar`),
  },
  goals: {
    list: (status?: GoalStatus) => api<{ goals: Goal[] }>(`/goals${status ? `?status=${status}` : ""}`),
    create: (body: { title: string; description?: string | null; targetValue?: number | null; unit?: string | null; deadline?: string | null }) =>
      api<{ goal: Goal }>("/goals", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { title?: string; progress?: number; status?: GoalStatus; targetValue?: number | null; unit?: string | null }) =>
      api<{ goal: Goal }>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/goals/${id}`, { method: "DELETE" }),
  },
  reminders: {
    list: (type?: ReminderType) => api<{ reminders: Reminder[] }>(`/reminders${type ? `?type=${type}` : ""}`),
    create: (body: { type: ReminderType; title: string; time: string; days: number[]; payload?: Record<string, unknown> | null }) =>
      api<{ reminder: Reminder }>("/reminders", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { title?: string; time?: string; days?: number[]; enabled?: boolean }) =>
      api<{ reminder: Reminder }>(`/reminders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/reminders/${id}`, { method: "DELETE" }),
    toggle: (id: string) => api<{ reminder: Reminder }>(`/reminders/${id}/toggle`, { method: "POST", body: "{}" }),
  },
  medications: {
    list: () => api<{ medications: Reminder[] }>("/medications"),
    create: (body: { title: string; time: string; days: number[] }) =>
      api<{ medication: Reminder }>("/medications", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/medications/${id}`, { method: "DELETE" }),
  },
  wellness: {
    today: (date?: string) => api<WellnessToday>(`/wellness/today${date ? `?date=${date}` : ""}`),
    week: (date?: string) => api<WellnessWeek>(`/wellness/week${date ? `?date=${date}` : ""}`),
    summary: (lang: string) => api<WellnessSummaryResult>(`/wellness/summary?lang=${lang}`),
  },
  profileTargets: {
    update: (body: { waterTargetMl?: number; sleepGoalMinutes?: number; activityStepsGoal?: number; workoutGoalMinutes?: number; notificationsEnabled?: boolean }) =>
      api<{ profile: { waterTargetMl: number; sleepGoalMinutes: number; activityStepsGoal: number; workoutGoalMinutes: number; notificationsEnabled: boolean } }>("/profile/targets", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
};