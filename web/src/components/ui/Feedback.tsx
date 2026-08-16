"use client";

import { Button } from "./Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden>
        ⚠️
      </span>
      <p className="max-w-sm text-sm text-text">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {"" /* label set by caller via children */}
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        ✦
      </span>
      <h3 className="font-display text-base font-semibold text-text">{title}</h3>
      <p className="max-w-sm text-sm text-text-muted">{text}</p>
      {action && onAction ? (
        <Button className="mt-2" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}