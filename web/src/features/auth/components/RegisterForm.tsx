"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { ApiClientError, errorKey } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RegisterForm() {
  const { t } = useI18n();
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !contact.trim() || !password) {
      setError(t("auth.validationRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.validationPassword"));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t("auth.validationPasswordConfirm"));
      return;
    }
    setLoading(true);
    try {
      await register(contact.trim(), password, name.trim());
      showToast("success", t("auth.registered"));
      router.push("/dashboard");
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : "internal";
      setError(t(errorKey(code) as never));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={t("auth.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        required
      />
      <Input
        label={t("auth.emailOrPhone")}
        type="text"
        autoComplete="username"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="example@mail.com or +998..."
        required
      />
      <Input
        label={t("auth.password")}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={t("auth.validationPassword")}
        required
      />
      <Input
        label={t("auth.passwordConfirm")}
        type="password"
        autoComplete="new-password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        required
      />
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="mt-2 w-full">
        {t("auth.registerButton")}
      </Button>
      <p className="mt-2 text-center text-sm text-text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary-500 hover:underline">
          {t("auth.toLogin")}
        </Link>
      </p>
    </form>
  );
}