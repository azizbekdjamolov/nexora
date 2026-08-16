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

export function LoginForm() {
  const { t } = useI18n();
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!contact.trim() || !password) {
      setError(t("auth.validationRequired"));
      return;
    }
    setLoading(true);
    try {
      await login(contact.trim(), password);
      showToast("success", t("auth.loggedIn"));
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
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="mt-2 w-full">
        {t("auth.loginButton")}
      </Button>
      <p className="mt-2 text-center text-sm text-text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary-500 hover:underline">
          {t("auth.toRegister")}
        </Link>
      </p>
    </form>
  );
}