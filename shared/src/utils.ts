import { randomBytes } from "crypto";

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Normalizes phone numbers: keeps digits and leading + only. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/[\s\-().]/g, "");
  if (!digits.startsWith("+")) {
    return digits.startsWith("00") ? `+${digits.slice(2)}` : `+${digits}`;
  }
  return digits;
}

export function isValidPhone(value: string): boolean {
  return /^\+?\d{7,15}$/.test(normalizePhone(value));
}

/** Detects whether the login identifier is an email or a phone number. */
export function detectContactType(value: string): "email" | "phone" {
  return isEmail(value) ? "email" : "phone";
}

export function formatDate(iso: string, locale = "en"): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}