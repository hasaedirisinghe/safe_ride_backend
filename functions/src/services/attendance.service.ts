import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { env } from "../config/env.js";
import type { DevicePrincipal, StudentTripState } from "../types/models.js";
import { AppError } from "../utils/errors.js";
import { normalizeCardUid } from "../utils/crypto.js";
import { transitionForScan } from "./attendance-state.service.js";

interface ScanInput { deviceId: string; eventId: string; cardUid: string; scannedAt: string; }

export async function processScan(device: DevicePrincipal, input: ScanInput) {
  if (input.deviceId !== device.deviceId) throw new AppError(401, "DEVICE_UNAUTHORIZED", "Invalid device credentials");
  let uidNormalized: string;
  try { uidNormalized = normalizeCardUid(input.cardUid); }
  catch { throw new AppError(400, "INVALID_CARD_UID", "Invalid card data"); }
  const scannedAt = Timestamp.fromDate(new Date(input.scannedAt));
  if (Math.abs(Date.now() - scannedAt.toMillis()) > 24 * 60 * 60 * 1000) throw new AppError(400, "INVALID_SCAN_TIME", "Scan timestamp is outside the accepted window");
  const idempotencyRef = db.collection("deviceScanEvents").doc(`${device.deviceId}_${safeId(input.eventId)}`);
  const registryRef = db.collection("rfidUidRegistry").doc(uidNormalized);

  const result = await db.runTransaction(async (tx) => {
    const previous = await tx.get(idempotencyRef);
    if (previous.exists) return { duplicate: true, outcome: previous.get("outcome"), attendanceEventId: previous.get("attendanceEventId") ?? null };

    const [registry, activeLock] = await Promise.all([
      tx.get(registryRef), tx.get(db.collection("activeTripByBus").doc(device.busId))
    ]);
    if (!registry.exists) return auditAndThrow(tx, idempotencyRef, input, device, "UNKNOWN_CARD", "Unknown or inactive card");
    if (!activeLock.exists) return auditAndThrow(tx, idempotencyRef, input, device, "NO_ACTIVE_TRIP", "No active trip");
    const cardId = registry.get("cardId") as string; const tripId = activeLock.get("tripId") as string;
    const [card, student, trip] = await Promise.all([
      tx.get(db.collection("rfidCards").doc(cardId)),
      tx.get(db.collection("students").doc(registry.get("studentId"))),
      tx.get(db.collection("trips").doc(tripId))
    ]);
    if (!card.exists || card.get("status") !== "active") return auditAndThrow(tx, idempotencyRef, input, device, "INACTIVE_CARD", "Unknown or inactive card");
    if (!student.exists || student.get("status") !== "active") return auditAndThrow(tx, idempotencyRef, input, device, "STUDENT_INACTIVE", "Card cannot be accepted");
    if (student.get("assignedBusId") !== device.busId) return auditAndThrow(tx, idempotencyRef, input, device, "WRONG_BUS", "Card is not valid for this bus");
    if (!trip.exists || trip.get("status") !== "ACTIVE") return auditAndThrow(tx, idempotencyRef, input, device, "NO_ACTIVE_TRIP", "No active trip");

    const studentId = student.id; const statusRef = db.collection("studentTripStatus").doc(`${tripId}_${studentId}`);
    const status = await tx.get(statusRef); const current = status.exists ? status.get("status") as StudentTripState : undefined;
    if (status.exists && status.get("lastUpdatedAt") && scannedAt.toMillis() - status.get("lastUpdatedAt").toMillis() < env.RFID_REPEAT_WINDOW_SECONDS * 1000) {
      return auditAndThrow(tx, idempotencyRef, input, device, "RAPID_REPEAT", "Scan repeated too quickly");
    }
    let transition;
    try { transition = transitionForScan(current, device.scanMode); }
    catch { return auditAndThrow(tx, idempotencyRef, input, device, "INVALID_TRANSITION", "Scan is not valid in the current state"); }

    const eventRef = db.collection("attendanceEvents").doc(); const receivedAt = Timestamp.now();
    const event = { id: eventRef.id, eventId: input.eventId, studentId, cardId, deviceId: device.deviceId, busId: device.busId,
      tripId, eventType: transition.eventType, scannedAt, receivedAt, source: "RFID", createdAt: receivedAt };
    tx.create(eventRef, event);
    tx.set(statusRef, { id: statusRef.id, studentId, tripId, busId: device.busId, status: transition.next, lastEventId: eventRef.id, lastUpdatedAt: scannedAt }, { merge: true });
    if (transition.eventType === "BOARDED") {
      const parentIds = student.get("parentIds") as string[];
      for (const parentId of parentIds) {
        const notificationRef = db.collection("notifications").doc(`${eventRef.id}_${parentId}`);
        tx.create(notificationRef, { id: notificationRef.id, parentId, studentId, tripId, type: "STUDENT_BOARDED",
          title: "Student Boarded", body: "Your child has boarded the school bus.",
          read: false, deliveryStatus: "PENDING", deliveryAttempts: 0, createdAt: receivedAt });
      }
    }
    tx.create(idempotencyRef, { deviceId: device.deviceId, eventId: input.eventId, uidFingerprint: uidNormalized.slice(-4), scannedAt, receivedAt,
      outcome: "ACCEPTED", attendanceEventId: eventRef.id, tripId });
    return { duplicate: false, outcome: "ACCEPTED", attendanceEventId: eventRef.id, eventType: transition.eventType, status: transition.next };
  });
  if ("error" in result) throw new AppError(result.status, result.code, result.message);
  return result;
}

function safeId(eventId: string): string { return Buffer.from(eventId).toString("base64url"); }

function auditAndThrow(tx: FirebaseFirestore.Transaction, ref: FirebaseFirestore.DocumentReference, input: ScanInput, device: DevicePrincipal,
  outcome: string, message: string) {
  tx.create(ref, { deviceId: device.deviceId, eventId: input.eventId, scannedAt: Timestamp.fromDate(new Date(input.scannedAt)), receivedAt: Timestamp.now(), outcome });
  return { error: true as const, status: outcome === "WRONG_BUS" || outcome === "INVALID_TRANSITION" || outcome === "RAPID_REPEAT" ? 409 : 404,
    code: outcome, message };
}

