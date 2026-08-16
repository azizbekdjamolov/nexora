import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, hashToken } from "../src/security/passwords";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("super-secret-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("super-secret-123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces unique salts", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});

describe("token hashing", () => {
  it("hashes tokens deterministically", () => {
    const token = "abc123";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
});