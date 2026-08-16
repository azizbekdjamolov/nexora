import { createHmac, createHash, timingSafeEqual } from "crypto";

export interface TelegramInitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface ParsedTelegramInitData {
  fields: Record<string, string>;
  user: TelegramInitDataUser | null;
  authDate: number;
  hash: string;
}

/**
 * Parses Telegram Mini App initData query string into structured fields.
 * Pure function — no secrets needed for parsing.
 */
export function parseTelegramInitData(initData: string): ParsedTelegramInitData | null {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const fields: Record<string, string> = {};
  params.forEach((value, key) => {
    fields[key] = value;
  });
  const hash = fields["hash"];
  const authDateStr = fields["auth_date"];
  if (!hash || !authDateStr) return null;

  let user: TelegramInitDataUser | null = null;
  if (fields["user"]) {
    try {
      user = JSON.parse(fields["user"]) as TelegramInitDataUser;
    } catch {
      user = null;
    }
  }

  return {
    fields,
    user,
    authDate: Number(authDateStr) || 0,
    hash,
  };
}

/**
 * Validates Telegram initData signature exactly as Telegram's official
 * auth algorithm requires:
 *  1. secret_key = SHA256(bot_token)
 *  2. data_check_string = sorted key=value pairs joined with "\n" (hash excluded)
 *  3. computed = HMAC_SHA256(secret_key, data_check_string), hex-encoded
 *  4. computed must equal the hash from initData (timing-safe compare)
 */
export function validateTelegramInitData(initData: string, botToken: string): ParsedTelegramInitData | null {
  const parsed = parseTelegramInitData(initData);
  if (!parsed) return null;

  const secretKey = createHash("sha256").update(botToken).digest();

  const dataCheckString = Object.keys(parsed.fields)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${parsed.fields[k]}`)
    .join("\n");

  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(parsed.hash, "hex");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? parsed : null;
}

/** Accept initData if it was generated within this window (seconds). */
export const TELEGRAM_INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;

export function isTelegramInitDataFresh(parsed: ParsedTelegramInitData, maxAgeSec = TELEGRAM_INIT_DATA_MAX_AGE_SEC): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - parsed.authDate <= maxAgeSec && parsed.authDate <= now + 60 * 5;
}