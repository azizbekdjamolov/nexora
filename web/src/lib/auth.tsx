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
import type { AuthUser } from "@app/shared";
import { authApi } from "@/features/auth/api";
import { useI18n } from "./i18n";
import { profileApi } from "@/features/profile/api";
import { ApiClientError } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (contact: string, password: string) => Promise<void>;
  register: (contact: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, setLang } = useI18n();

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      if (data.user.locale !== lang) setLang(data.user.locale);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [lang, setLang]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (contact: string, password: string) => {
    const data = await authApi.login({ contact, password });
    setUser(data.user);
    setLang(data.user.locale);
  }, [setLang]);

  const register = useCallback(async (contact: string, password: string, name: string) => {
    const data = await authApi.register({ contact, password, name, locale: lang });
    setUser(data.user);
  }, [lang]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const updateUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  const syncProfile = useCallback(async () => {
    const data = await profileApi.get();
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout, updateUser, syncProfile }),
    [user, loading, refresh, login, register, logout, updateUser, syncProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children, fallbackPath = "/login" }: { children: ReactNode; fallbackPath?: string }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label={t("common.loading")} />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = fallbackPath;
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label={t("common.loading")} />
      </div>
    );
  }

  return <>{children}</>;
}

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-primary-500" />
      {label ? <p className="text-sm text-text-muted">{label}</p> : null}
    </div>
  );
}