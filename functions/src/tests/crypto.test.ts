import { describe, expect, it } from "vitest";
import { hashSecret, normalizeCardUid, verifySecret } from "../utils/crypto.js";

describe("RFID UID normalization", () => {
  it("removes separators and normalizes case", () => expect(normalizeCardUid("04:a1-b2 c3")).toBe("04A1B2C3"));
  it.each(["", "XYZ1", "ABC", "04/11"])("rejects malformed UID %s", (uid) => expect(() => normalizeCardUid(uid)).toThrow());
});

describe("device credentials", () => {
  it("hashes and verifies without retaining plaintext", async () => {
    const hash = await hashSecret("secret-value");
    expect(hash).not.toContain("secret-value");
    await expect(verifySecret("secret-value", hash)).resolves.toBe(true);
    await expect(verifySecret("wrong", hash)).resolves.toBe(false);
  });
});

