"use client";

import { useI18n } from "@/lib/i18n";
import { useAuth, ProtectedRoute } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileView } from "@/features/profile/components/ProfileView";

export default function ProfilePage() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <>
      <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ProtectedRoute>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-text">{t("profile.title")}</h1>
            <p className="mt-1 text-text-muted">{t("profile.subtitle")}</p>
          </div>
          {user ? <ProfileView /> : null}
        </ProtectedRoute>
      </div>
      </AppShell>
    </>
  );
}