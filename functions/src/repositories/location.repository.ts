import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { AppError } from "../utils/errors.js";

export interface LocationInput { latitude: number; longitude: number; speed?: number | null; heading?: number | null; recordedAt: Date; }
export interface LocationRepository { get(busId: string): Promise<Record<string, unknown> | null>; saveIfNewer(busId: string, input: LocationInput): Promise<Record<string, unknown>>; }

export class FirestoreLocationRepository implements LocationRepository {
  async get(busId: string): Promise<Record<string, unknown> | null> {
    const snap = await db.collection("busLocations").doc(busId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  async saveIfNewer(busId: string, input: LocationInput): Promise<Record<string, unknown>> {
    const ref = db.collection("busLocations").doc(busId);
    return db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      const recordedAt = Timestamp.fromDate(input.recordedAt);
      if (current.exists && current.get("recordedAt")?.toMillis() >= recordedAt.toMillis()) {
        throw new AppError(409, "STALE_LOCATION", "An equal or newer location is already stored");
      }
      const data = { busId, latitude: input.latitude, longitude: input.longitude, speed: input.speed ?? null,
        heading: input.heading ?? null, recordedAt, updatedAt: Timestamp.now() };
      tx.set(ref, data);
      return data;
    });
  }
}

