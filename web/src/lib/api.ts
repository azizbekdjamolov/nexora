import type { ApiResponse } from "@app/shared";

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Central API client. Same-origin /api/* in development (Next.js rewrite),
 * configurable via NEXT_PUBLIC_API_URL in production. Cookies are always
 * included (credentials: "include").
 *
 * Feature-specific API modules live in src/features/<module>/api.ts and
 * build on this client — no random fetch calls in components.
 */
const base = (): string =>
  (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "") + "/api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = typeof init?.body === "string" && init.body.length > 0;
  const res = await fetch(`${base()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      // Only claim a JSON body when we actually send one — Fastify rejects
      // empty bodies sent with Content-Type: application/json (500).
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }

  if (!res.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : { code: "internal", message: `HTTP ${res.status}` };
    throw new ApiClientError(error.code, error.message, res.status);
  }
  return json.data;
}

/** Error code -> i18n key mapping (client side). */
export function errorKey(code: string): string {
  const map: Record<string, string> = {
    unauthorized: "errors.unauthorized",
    forbidden: "errors.forbidden",
    notFound: "errors.notFound",
    featureNotFound: "errors.featureNotFound",
    conversationNotFound: "errors.conversationNotFound",
    validation: "errors.validation",
    validationPassword: "auth.validationPassword",
    validationName: "auth.validationName",
    validationContact: "auth.validationContact",
    emailInUse: "auth.emailInUse",
    phoneInUse: "auth.phoneInUse",
    invalidCredentials: "auth.invalidCredentials",
    rateLimited: "errors.rateLimited",
    internal: "errors.internal",
    telegramInitInvalid: "errors.telegramInitInvalid",
    telegramInitExpired: "errors.telegramInitExpired",
    telegramNotLinked: "errors.telegramNotLinked",
    telegramLinkStateInvalid: "errors.telegramLinkStateInvalid",
    telegramAlreadyLinked: "errors.telegramAlreadyLinked",
    aiFailed: "errors.aiFailed",
    aiDisabled: "errors.aiDisabled",
    aiRateLimit: "errors.aiRateLimit",
  };
  return map[code] ?? "errors.internal";
}