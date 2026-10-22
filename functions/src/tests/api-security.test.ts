import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("API authentication boundaries", () => {
  it("exposes only the health route without authentication", async () => {
    await request(app).get("/api/v1/health").expect(200);
    const parent = await request(app).get("/api/v1/parents/me").expect(401);
    const driver = await request(app).get("/api/v1/drivers/me").expect(401);
    expect(parent.body.error.code).toBe("UNAUTHENTICATED");
    expect(driver.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an unauthenticated device before processing card data", async () => {
    const response = await request(app).post("/api/v1/devices/rfid/scan").send({
      deviceId: "device-a", eventId: "event-a", cardUid: "04A1B2C3", scannedAt: new Date().toISOString()
    }).expect(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});

