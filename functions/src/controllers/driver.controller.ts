import type { Request, Response } from "express";
import { db } from "../config/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { profileByUid } from "../services/profile.service.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { serialize } from "../utils/firestore.js";
import { ok } from "../utils/response.js";

export async function me(req: Request, res: Response) { ok(res, serialize(await profileByUid("drivers", req.authUser!.uid))); }
export async function myBus(req: Request, res: Response) {
  const driver = await profileByUid("drivers", req.authUser!.uid); if (!driver.assignedBusId) return ok(res, null, "No bus assigned");
  const bus = await db.collection("buses").doc(driver.assignedBusId as string).get(); if (!bus.exists) throw notFound("Bus not found");
  const deviceId = bus.get("deviceId") as string | null;
  const device = deviceId ? await db.collection("devices").doc(deviceId).get() : null;
  ok(res, serialize({ id: bus.id, ...bus.data(), scanMode: device?.exists ? device.get("scanMode") : null }));
}
export async function myStudents(req: Request, res: Response) {
  const driver = await profileByUid("drivers", req.authUser!.uid); if (!driver.assignedBusId) return ok(res, []);
  const busId = driver.assignedBusId as string;
  const [snap, activeTrip] = await Promise.all([
    db.collection("students").where("assignedBusId", "==", busId).where("status", "==", "active").get(),
    db.collection("activeTripByBus").doc(busId).get(),
  ]);
  const tripId = activeTrip.exists ? activeTrip.get("tripId") as string : null;
  const students = await Promise.all(snap.docs.map(async (student) => {
    if (!tripId) return { id: student.id, ...student.data(), tripId: null, tripStatus: "NOT_BOARDED", lastUpdatedAt: null };
    const status = await db.collection("studentTripStatus").doc(`${tripId}_${student.id}`).get();
    return {
      id: student.id,
      ...student.data(),
      tripId,
      tripStatus: status.exists ? status.get("status") : "NOT_BOARDED",
      lastUpdatedAt: status.exists ? status.get("lastUpdatedAt") : null,
    };
  }));
  ok(res, serialize(students));
}

export async function updateScannerMode(req: Request, res: Response) {
  const driver = await profileByUid("drivers", req.authUser!.uid);
  if (!driver.assignedBusId || driver.status !== "active") throw forbidden();
  const busId = driver.assignedBusId as string;
  const [bus, activeTrip] = await Promise.all([
    db.collection("buses").doc(busId).get(),
    db.collection("activeTripByBus").doc(busId).get(),
  ]);
  if (!bus.exists) throw notFound("Bus not found");
  if (!activeTrip.exists) throw conflict("NO_ACTIVE_TRIP", "Start a trip before changing scanner mode");
  const deviceId = bus.get("deviceId") as string | null;
  if (!deviceId) throw notFound("No scanner is assigned to this bus");
  const deviceRef = db.collection("devices").doc(deviceId);
  const device = await deviceRef.get();
  if (!device.exists || device.get("busId") !== busId || !device.get("enabled")) throw notFound("Active scanner not found");
  const scanMode = req.body.scanMode as "BOARDING" | "EXIT";
  const updatedAt = Timestamp.now();
  await deviceRef.update({ scanMode, updatedAt });
  ok(res, serialize({ deviceId, busId, scanMode, updatedAt }), `Scanner changed to ${scanMode.toLowerCase()} mode`);
}

