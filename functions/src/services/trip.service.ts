import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { profileByUid } from "./profile.service.js";

export async function startTrip(uid: string, busId: string, tripType: "PICKUP" | "DROPOFF") {
  const driver = await profileByUid("drivers", uid);
  if (driver.assignedBusId !== busId || driver.status !== "active") throw forbidden();
  const lockRef = db.collection("activeTripByBus").doc(busId);
  const tripRef = db.collection("trips").doc();
  return db.runTransaction(async (tx) => {
    const [bus, lock] = await Promise.all([tx.get(db.collection("buses").doc(busId)), tx.get(lockRef)]);
    if (!bus.exists) throw notFound("Bus not found");
    if (lock.exists) throw conflict("ACTIVE_TRIP_EXISTS", "This bus already has an active trip");
    const now = Timestamp.now();
    const trip = { id: tripRef.id, busId, driverId: driver.id, tripType, status: "ACTIVE", startedAt: now, completedAt: null, createdAt: now };
    tx.create(tripRef, trip); tx.create(lockRef, { tripId: tripRef.id, busId, createdAt: now });
    return trip;
  });
}

export async function completeTrip(uid: string, tripId: string) {
  const driver = await profileByUid("drivers", uid); const ref = db.collection("trips").doc(tripId);
  return db.runTransaction(async (tx) => {
    const trip = await tx.get(ref); if (!trip.exists) throw notFound("Trip not found");
    if (trip.get("driverId") !== driver.id) throw forbidden();
    if (trip.get("status") !== "ACTIVE") throw conflict("TRIP_NOT_ACTIVE", "Trip is not active");
    const incomplete = await tx.get(db.collection("studentTripStatus").where("tripId", "==", tripId).where("status", "==", "ON_BUS").limit(1));
    if (!incomplete.empty) throw conflict("STUDENTS_STILL_ON_BUS", "Trip cannot complete while students are still on the bus");
    const completedAt = Timestamp.now(); tx.update(ref, { status: "COMPLETED", completedAt });
    tx.delete(db.collection("activeTripByBus").doc(trip.get("busId")));
    return { id: tripId, status: "COMPLETED", completedAt };
  });
}

export async function confirmDropoff(uid: string, tripId: string, studentId: string) {
  const driver = await profileByUid("drivers", uid); const tripRef = db.collection("trips").doc(tripId);
  const statusRef = db.collection("studentTripStatus").doc(`${tripId}_${studentId}`);
  return db.runTransaction(async (tx) => {
    const [trip, status, student] = await Promise.all([
      tx.get(tripRef),
      tx.get(statusRef),
      tx.get(db.collection("students").doc(studentId))
    ]);
    if (!trip.exists || trip.get("status") !== "ACTIVE") throw notFound("Active trip not found");
    if (trip.get("driverId") !== driver.id) throw forbidden();
    if (!student.exists) throw notFound("Student not found");
    if (!status.exists || status.get("status") !== "EXITED") throw conflict("INVALID_ATTENDANCE_TRANSITION", "Student must be marked exited before drop-off confirmation");
    const lastUpdatedAt = Timestamp.now();
    tx.update(statusRef, { status: "DROPPED_OFF", lastUpdatedAt, dropoffConfirmedBy: driver.id });

    const parentIds = student.get("parentIds") as string[] ?? [];
    for (const parentId of parentIds) {
      const notificationRef = db.collection("notifications").doc(`dropoff_${tripId}_${studentId}_${parentId}`);
      tx.create(notificationRef, {
        id: notificationRef.id,
        parentId,
        studentId,
        tripId,
        type: "STUDENT_DROPPED_OFF",
        title: "Student Dropped Off",
        body: "Your child's drop-off has been confirmed by the driver.",
        read: false,
        deliveryStatus: "PENDING",
        deliveryAttempts: 0,
        createdAt: lastUpdatedAt
      });
    }
    return { tripId, studentId, status: "DROPPED_OFF", lastUpdatedAt };
  });
}

