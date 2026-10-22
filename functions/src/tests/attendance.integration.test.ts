import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../config/firebase.js";
import { processScan } from "../services/attendance.service.js";
import type { DevicePrincipal } from "../types/models.js";

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = process.env.GCLOUD_PROJECT ?? "saferide-lk-test";
const boarding: DevicePrincipal = { deviceId: "device-a", busId: "bus-a", scanMode: "BOARDING" };

describe.skipIf(!hasEmulator)("RFID transaction integration", () => {
  beforeEach(async () => {
    const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Could not clear emulator data: ${response.status}`);
    const now = Timestamp.now(); const batch = db.batch();
    batch.set(db.doc("students/student-a"), { id: "student-a", status: "active", assignedBusId: "bus-a", parentIds: ["parent-a"] });
    batch.set(db.doc("rfidCards/card-a"), { id: "card-a", uidNormalized: "04A1B2C3", studentId: "student-a", status: "active" });
    batch.set(db.doc("rfidUidRegistry/04A1B2C3"), { cardId: "card-a", studentId: "student-a" });
    batch.set(db.doc("trips/trip-a"), { id: "trip-a", busId: "bus-a", driverId: "driver-a", tripType: "PICKUP", status: "ACTIVE", startedAt: now, createdAt: now });
    batch.set(db.doc("activeTripByBus/bus-a"), { busId: "bus-a", tripId: "trip-a" });
    await batch.commit();
  });

  const input = (eventId: string, cardUid = "04A1B2C3", offsetMs = 0) => ({
    deviceId: "device-a", eventId, cardUid, scannedAt: new Date(Date.now() + offsetMs).toISOString()
  });

  it("rejects and audits an unknown card", async () => {
    await expect(processScan(boarding, input("unknown-1", "FFFFFFFF"))).rejects.toMatchObject({ code: "UNKNOWN_CARD" });
    await expect(db.doc(`deviceScanEvents/device-a_${Buffer.from("unknown-1").toString("base64url")}`).get()).resolves.toMatchObject({ exists: true });
  });

  it("atomically boards a student and queues the parent notification", async () => {
    await expect(processScan(boarding, input("board-1"))).resolves.toMatchObject({ outcome: "ACCEPTED", eventType: "BOARDED", status: "ON_BUS" });
    const [events, status, notices] = await Promise.all([
      db.collection("attendanceEvents").get(), db.doc("studentTripStatus/trip-a_student-a").get(), db.collection("notifications").get()
    ]);
    expect(events.size).toBe(1); expect(status.get("status")).toBe("ON_BUS"); expect(notices.size).toBe(1);
  });

  it("returns the original outcome for a duplicate eventId", async () => {
    await processScan(boarding, input("same-event"));
    await expect(processScan(boarding, input("same-event"))).resolves.toMatchObject({ duplicate: true, outcome: "ACCEPTED" });
    expect((await db.collection("attendanceEvents").get()).size).toBe(1);
  });

  it("rejects rapid repeats and wrong-bus cards", async () => {
    await processScan(boarding, input("first"));
    await expect(processScan(boarding, input("rapid", "04A1B2C3", 1_000))).rejects.toMatchObject({ code: "RAPID_REPEAT" });
    await db.doc("students/student-a").update({ assignedBusId: "bus-b" });
    await expect(processScan(boarding, input("wrong-bus", "04A1B2C3", 20_000))).rejects.toMatchObject({ code: "WRONG_BUS" });
  });

  it("serializes concurrent delivery of one eventId", async () => {
    const results = await Promise.all([processScan(boarding, input("concurrent")), processScan(boarding, input("concurrent"))]);
    expect(results.filter((r) => r.duplicate).length).toBe(1);
    expect((await db.collection("attendanceEvents").get()).size).toBe(1);
  }, 15_000);

  it("allows exit only after boarding when the trusted scanner mode is EXIT", async () => {
    await processScan(boarding, input("board-before-exit"));
    const exitDevice = { ...boarding, scanMode: "EXIT" as const };
    await expect(processScan(exitDevice, input("exit", "04A1B2C3", 20_000))).resolves.toMatchObject({ eventType: "EXITED", status: "EXITED" });
  });
});

