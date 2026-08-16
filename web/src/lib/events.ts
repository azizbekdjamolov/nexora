"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeEvent } from "@app/shared";
import { useAuth } from "./auth";

/**
 * Opens one Server-Sent Events connection while authenticated and
 * exposes the latest event. Components decide what to refetch.
 */
export function useRealtimeEvents(): RealtimeEvent | null {
  const { user } = useAuth();
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!user) return;
    if (esRef.current) return;

    const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    const es = new EventSource(`${base}/api/events`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as RealtimeEvent;
        setLastEvent(parsed);
      } catch {
        // ignore malformed
      }
    };
    // Named event fallback (Fastify sends event: <type>)
    const NAMED = [
      "features.changed",
      "profile.changed",
      "telegram.linked",
      "notification.created",
      "ai.done",
      "water.changed",
      "sleep.changed",
      "activity.changed",
      "workout.changed",
      "habits.changed",
      "goals.changed",
      "reminders.changed",
      "wellness.changed",
    ] as const;
    for (const type of NAMED) {
      es.addEventListener(type, handler(type));
    }

    function handler(type: RealtimeEvent["type"]) {
      return (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as RealtimeEvent;
          parsed.type = type;
          setLastEvent(parsed);
        } catch {
          // ignore
        }
      };
    }

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [user]);

  return lastEvent;
}