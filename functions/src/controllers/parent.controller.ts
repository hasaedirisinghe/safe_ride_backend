import type { Request, Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { profileByUid } from "../services/profile.service.js";
import { forbidden, notFound } from "../utils/errors.js";
import { pageLimit, serialize } from "../utils/firestore.js";
import { ok } from "../utils/response.js";

export async function me(req: Request, res: Response) { ok(res, serialize(await profileByUid("parents", req.authUser!.uid))); }
export async function myStudents(req: Request, res: Response) {
  const parent = await profileByUid("parents", req.authUser!.uid);
  const snap = await db.collection("students").where("parentIds", "array-contains", parent.id).limit(pageLimit(req.query.limit)).get();
  ok(res, serialize(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function notifications(req: Request, res: Response) {
  const parent = await profileByUid("parents", req.authUser!.uid);
  const snap = await db.collection("notifications").where("parentId", "==", parent.id).orderBy("createdAt", "desc").limit(pageLimit(req.query.limit)).get();
  ok(res, serialize(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
export async function markRead(req: Request, res: Response) {
  const parent = await profileByUid("parents", req.authUser!.uid); const ref = db.collection("notifications").doc(String(req.params.id)); const snap = await ref.get();
  if (!snap.exists) throw notFound(); if (snap.get("parentId") !== parent.id) throw forbidden();
  await ref.update({ read: true, readAt: Timestamp.now() }); ok(res, { id: ref.id, read: true }, "Notification marked as read");
}

