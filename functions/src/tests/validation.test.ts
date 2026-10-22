import { describe, expect, it } from "vitest";
import { locationBody, scanBody } from "../validators/schemas.js";

describe("request validation", () => {
  it("rejects invalid GPS coordinates", () => {
    expect(locationBody.safeParse({ latitude: 91, longitude: 79, recordedAt: new Date().toISOString() }).success).toBe(false);
    expect(locationBody.safeParse({ latitude: 6.9271, longitude: -181, recordedAt: new Date().toISOString() }).success).toBe(false);
  });
  it("does not accept hardware-supplied trusted identifiers", () => {
    const result = scanBody.safeParse({ deviceId: "d1", eventId: "e1", cardUid: "04A1B2C3", scannedAt: new Date().toISOString(), busId: "attacker-bus" });
    expect(result.success).toBe(false);
  });
});

