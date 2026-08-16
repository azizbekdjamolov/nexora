import type { ApiError } from "@app/shared";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function badRequest(message: string, code = "invalidInput"): AppError {
  return new AppError(400, code, message);
}

export function unauthorized(message: string, code = "unauthorized"): AppError {
  return new AppError(401, code, message);
}

export function forbidden(message: string, code = "forbidden"): AppError {
  return new AppError(403, code, message);
}

export function notFound(message: string, code = "notFound"): AppError {
  return new AppError(404, code, message);
}

export function conflict(message: string, code = "conflict"): AppError {
  return new AppError(409, code, message);
}

export function tooManyRequests(message: string): AppError {
  return new AppError(429, "rateLimited", message);
}

export function serverError(message: string): AppError {
  return new AppError(500, "internal", message);
}

export function toApiError(err: unknown, isProd: boolean): ApiError {
  if (err instanceof AppError) {
    return { success: false, error: { code: err.code, message: err.message } };
  }
  if (isProd) {
    return { success: false, error: { code: "internal", message: "Something went wrong." } };
  }
  const raw = err instanceof Error ? err.message : String(err);
  return { success: false, error: { code: "internal", message: raw } };
}