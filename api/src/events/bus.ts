import { EventEmitter } from "events";
import type { RealtimeEvent } from "@app/shared";

/**
 * In-process realtime event bus.
 * Each user has a channel; SSE clients subscribe per user id.
 * For horizontal scaling this can be swapped for Redis pub/sub
 * without touching route or service code.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export const eventBus = {
  publish(userId: string, event: RealtimeEvent): void {
    emitter.emit(`user:${userId}`, event);
  },
  subscribe(userId: string, listener: (event: RealtimeEvent) => void): () => void {
    const channel = `user:${userId}`;
    emitter.on(channel, listener);
    return () => emitter.off(channel, listener);
  },
};

export function featureEvent(action: "created" | "updated" | "deleted", featureId: string): RealtimeEvent {
  return { type: "features.changed", action, targetId: featureId, timestamp: Date.now() };
}

export function telegramLinkedEvent(): RealtimeEvent {
  return { type: "telegram.linked", timestamp: Date.now() };
}

export function profileChangedEvent(): RealtimeEvent {
  return { type: "profile.changed", timestamp: Date.now() };
}

export function notificationEvent(notificationId: string): RealtimeEvent {
  return { type: "notification.created", targetId: notificationId, timestamp: Date.now() };
}

export function aiDoneEvent(): RealtimeEvent {
  return { type: "ai.done", timestamp: Date.now() };
}