"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebAppLike {
  initData: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
  };
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
  HapticFeedback?: { impactOccurred?: (style: string) => void; notificationOccurred?: (type: string) => void };
  isExpanded?: boolean;
  disableVerticalSwipes?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebAppLike };
  }
}

interface TelegramContextValue {
  webApp: TelegramWebAppLike | null;
  inTelegram: boolean;
  initData: string;
  telegramUser: TelegramUser | null;
  theme: "light" | "dark" | null;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

function getWebApp(): TelegramWebAppLike | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebAppLike | null>(null);

  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    setWebApp(wa);
    try {
      wa.ready?.();
      wa.expand?.();
      wa.setHeaderColor?.("#05070f");
      wa.setBackgroundColor?.("#05070f");
      wa.disableVerticalSwipes?.();
    } catch {
      // SDK methods may be absent on older clients
    }
    const applyTheme = () => setWebApp((prev) => prev ?? wa);
    wa.onEvent?.("themeChanged", applyTheme);
    return () => wa.offEvent?.("themeChanged", applyTheme);
  }, []);

  const value = useMemo<TelegramContextValue>(
    () => ({
      webApp,
      inTelegram: Boolean(webApp?.initData),
      initData: webApp?.initData ?? "",
      telegramUser: webApp?.initDataUnsafe?.user ?? null,
      theme: webApp?.colorScheme ?? null,
    }),
    [webApp]
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext);
  if (!ctx) throw new Error("useTelegram must be used within TelegramProvider");
  return ctx;
}

export function useHaptic(): (kind: "light" | "medium" | "heavy" | "success" | "error") => void {
  const { webApp } = useTelegram();
  return useCallback(
    (kind) => {
      try {
        if (kind === "success" || kind === "error") {
          webApp?.HapticFeedback?.notificationOccurred?.(kind);
        } else {
          webApp?.HapticFeedback?.impactOccurred?.(kind);
        }
      } catch {
        // haptics unavailable
      }
    },
    [webApp]
  );
}