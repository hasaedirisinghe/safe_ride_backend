import { db } from "../config/firebase.js";
import { notFound } from "../utils/errors.js";

export async function profileByUid(collection: "parents" | "drivers", uid: string): Promise<Record<string, unknown> & { id: string }> {
  const snap = await db.collection(collection).where("firebaseUid", "==", uid).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) throw notFound(`${collection === "parents" ? "Parent" : "Driver"} profile not found`);
  return { id: doc.id, ...doc.data() };
}

