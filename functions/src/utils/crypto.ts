import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function generateDeviceSecret(): string { return randomBytes(32).toString("base64url"); }

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(secret, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifySecret(secret: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(secret, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeCardUid(uid: string): string {
  const normalized = uid.replace(/[\s:-]/g, "").toUpperCase();
  if (!/^[0-9A-F]{4,32}$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new AppUidError();
  }
  return normalized;
}

class AppUidError extends Error {
  readonly code = "INVALID_CARD_UID";
  constructor() { super("Card UID must contain an even number of hexadecimal characters"); }
}

