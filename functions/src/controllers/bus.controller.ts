import type { Request, Response } from "express";
import { db } from "../config/firebase.js";
import { FirestoreLocationRepository } from "../repositories/location.repository.js";
import { notFound } from "../utils/errors.js";
import { serialize } from "../utils/firestore.js";
import { ok } from "../utils/response.js";

const locations = new FirestoreLocationRepository();
export async function getBus(req: Request, res: Response) { const snap = await db.collection("buses").doc(String(req.params.id)).get(); if (!snap.exists) throw notFound("Bus not found"); ok(res, serialize({ id: snap.id, ...snap.data() })); }
export async function getLocation(req: Request, res: Response) { ok(res, serialize(await locations.get(String(req.params.id))), "Location retrieved"); }
export async function activeTrip(req: Request, res: Response) {
  const lock = await db.collection("activeTripByBus").doc(String(req.params.id)).get(); if (!lock.exists) return ok(res, null, "No active trip");
  const trip = await db.collection("trips").doc(lock.get("tripId")).get(); ok(res, trip.exists ? serialize({ id: trip.id, ...trip.data() }) : null);
}
export async function updateLocation(req: Request, res: Response) {
  const data = await locations.saveIfNewer(String(req.params.id), { ...req.body, recordedAt: new Date(req.body.recordedAt) }); ok(res, serialize(data), "Location updated");
}

