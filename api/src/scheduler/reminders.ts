import { ReminderService } from "../services/tracker/ReminderService";

/**
 * Periodic reminder dispatcher. Runs every minute; each enabled reminder
 * fires at most once per day (tracking/notification only — never medical
 * advice). Idempotent via lastTriggeredAt + day-of-week + time checks.
 */
let timer: NodeJS.Timeout | null = null;
let running = false;

export function startReminderScheduler(): void {
  if (timer) return;
  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await ReminderService.checkDue();
    } catch (err) {
      console.error("[scheduler] reminder check failed", err);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, 60_000);
  timer.unref?.();
  void tick();
}

export function stopReminderScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}