import { Timestamp } from "firebase-admin/firestore";

export function serialize<T>(value: T): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map(serialize) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)])) as T;
  }
  return value;
}

export function pageLimit(raw: unknown): number {
  const n = Number(raw ?? 20);
  return Number.isInteger(n) ? Math.min(Math.max(n, 1), 100) : 20;
}

