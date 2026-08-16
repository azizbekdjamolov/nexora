"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    // Never stack the same message twice — replace the previous one instead.
    setToasts((prev) => [...prev.filter((t) => !(t.kind === kind && t.message === message)).slice(-3), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg animate-slide-up ${
              toast.kind === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : toast.kind === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-text"
            }`}
          >
            <span className="shrink-0 text-base leading-none">{toast.kind === "success" ? "✓" : toast.kind === "error" ? "!" : "i"}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}