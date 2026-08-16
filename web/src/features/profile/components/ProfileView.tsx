"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { profileApi } from "../api";
import { TelegramConnect } from "./TelegramConnect";

export function ProfileView() {
  const { t } = useI18n();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      void profileApi.get().then((data) => setBio(data.profile?.bio ?? "")).catch(() => undefined);
    }
  }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (name.trim().length < 2) {
      setError(t("auth.validationName"));
      return;
    }
    setSaving(true);
    try {
      const data = await profileApi.update({ name: name.trim(), bio: bio.trim() || null });
      updateUser(data.user);
      showToast("success", t("profile.saved"));
    } catch {
      setError(t("errors.internal"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 font-display text-xl font-bold text-white">
          {user.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">{user.name}</h1>
          <p className="text-sm text-text-muted">
            {t("profile.memberSince")} {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="glass flex flex-col gap-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-text">{t("profile.personal")}</h2>
        <Input label={t("profile.name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">{t("profile.email")}</span>
            <p className="text-sm text-text-muted">{user.email ?? "—"}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">{t("profile.phone")}</span>
            <p className="text-sm text-text-muted">{user.phone ?? "—"}</p>
          </div>
        </div>
        <Input label={`${t("features.description")} (${t("common.optional")})`} value={bio} onChange={(e) => setBio(e.target.value)} />
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </form>

      <TelegramConnect />

      <section className="glass flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text">{t("profile.languageSection")}</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text">{t("profile.themeSection")}</span>
            <ThemeSwitcher />
          </div>
        </div>
      </section>
    </div>
  );
}