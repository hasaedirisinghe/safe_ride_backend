import type { Request, Response } from "express";
import { db } from "../config/firebase.js";
import { notFound } from "../utils/errors.js";
import { pageLimit, serialize } from "../utils/firestore.js";
import { ok } from "../utils/response.js";

async function student(id: string) { const snap = await db.collection("students").doc(id).get(); if (!snap.exists) throw notFound("Student not found"); return { id: snap.id, ...snap.data() }; }
export async function getStudent(req: Request, res: Response) { ok(res, serialize(await student(String(req.params.id)))); }
export async function attendance(req: Request, res: Response) {
  const snap = await db.collection("attendanceEvents").where("studentId", "==", String(req.params.id)).orderBy("scannedAt", "desc").limit(pageLimit(req.query.limit)).get();
  ok(res, serialize(snap.docs.map((d) => ({ id: d.id, ...d.data(), cardId: undefined, deviceId: undefined }))));
}
export async function currentStatus(req: Request, res: Response) {
  const active = await statusesForStudent(String(req.params.id)); ok(res, serialize(active[0] ?? { studentId: req.params.id, status: "NOT_BOARDED" }));
}
export async function currentTrip(req: Request, res: Response) {
  const statuses = await statusesForStudent(String(req.params.id)); const status = statuses[0];
  if (!status) return ok(res, null, "No current trip");
  const trip = await db.collection("trips").doc(status.tripId as string).get(); ok(res, trip.exists ? serialize({ id: trip.id, ...trip.data() }) : null);
}
async function statusesForStudent(studentId: string): Promise<Array<Record<string, unknown> & { id: string }>> {
  const snap = await db.collection("studentTripStatus").where("studentId", "==", studentId).orderBy("lastUpdatedAt", "desc").limit(1).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

