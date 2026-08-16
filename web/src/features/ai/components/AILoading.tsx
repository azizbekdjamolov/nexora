"use client";

import { useI18n } from "@/lib/i18n";

/** Three-dot typing indicator for pending AI messages. */
export function AILoading() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500 [animation-delay:300ms]" />
    </span>
  );
}