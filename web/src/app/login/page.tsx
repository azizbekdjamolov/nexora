"use client";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <>
      <Navbar />
      <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {user ? (
            <p className="text-center text-text-muted">
              {t("auth.loggedIn")}{" "}
              <a href="/dashboard" className="font-medium text-primary-500 hover:underline">
                {t("nav.dashboard")}
              </a>
            </p>
          ) : (
            <div className="glass rounded-3xl p-8">
              <h1 className="font-display text-2xl font-bold text-text">{t("auth.loginTitle")}</h1>
              <p className="mt-2 mb-6 text-sm text-text-muted">{t("auth.loginSubtitle")}</p>
              <LoginForm />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}