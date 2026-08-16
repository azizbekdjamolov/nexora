import { createHmac, createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { validateTelegramInitData, isTelegramInitDataFresh } from "@app/shared";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

function buildInitData(overrides: Record<string, string> = {}): { raw: string; hash: string } {
  const fields: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({ id: 987654321, first_name: "Test", username: "testuser" }),
    ...overrides,
  };
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secretKey = createHash("sha256").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const params = new URLSearchParams(fields);
  params.set("hash", hash);
  return { raw: params.toString(), hash };
}

describe("telegram initData validation", () => {
  it("accepts valid initData", () => {
    const { raw } = buildInitData();
    const parsed = validateTelegramInitData(raw, BOT_TOKEN);
    expect(parsed).not.toBeNull();
    expect(parsed?.user?.id).toBe(987654321);
    expect(isTelegramInitDataFresh(parsed!)).toBe(true);
  });

  it("rejects tampered user fields", () => {
    const { raw } = buildInitData();
    const tampered = raw.replace("987654321", "12345");
    expect(validateTelegramInitData(tampered, BOT_TOKEN)).toBeNull();
  });

  it("rejects wrong bot token", () => {
    const { raw } = buildInitData();
    expect(validateTelegramInitData(raw, "other-token")).toBeNull();
  });

  it("rejects missing hash", () => {
    const { raw } = buildInitData();
    const params = new URLSearchParams(raw);
    params.delete("hash");
    expect(validateTelegramInitData(params.toString(), BOT_TOKEN)).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validateTelegramInitData("", BOT_TOKEN)).toBeNull();
    expect(validateTelegramInitData("garbage", BOT_TOKEN)).toBeNull();
  });

  it("rejects stale auth_date", () => {
    const old = String(Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60);
    const { raw } = buildInitData({ auth_date: old });
    const parsed = validateTelegramInitData(raw, BOT_TOKEN);
    expect(parsed).not.toBeNull();
    expect(isTelegramInitDataFresh(parsed!)).toBe(false);
  });
});