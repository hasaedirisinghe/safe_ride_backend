import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { auth, db } from "../config/firebase.js";
import { conflict, notFound } from "../utils/errors.js";
import { generateDeviceSecret, hashSecret, normalizeCardUid } from "../utils/crypto.js";

async function ensureAuthUser(role: "PARENT" | "DRIVER", input: { firebaseUid?: string; email?: string; phone?: string; name: string; temporaryPassword?: string }) {
  let uid = input.firebaseUid;
  if (!uid) {
    const user = await auth.createUser({ email: input.email, phoneNumber: input.phone?.startsWith("+") ? input.phone : undefined,
      displayName: input.name, password: input.temporaryPassword });
    uid = user.uid;
  }
  await auth.setCustomUserClaims(uid, { role });
  return uid;
}

export async function createParent(input: Record<string, unknown>) {
  const now = Timestamp.now();
  const uid = await ensureAuthUser("PARENT", input as never);
  const duplicate = await db.collection("parents").where("firebaseUid", "==", uid).limit(1).get();
  if (!duplicate.empty) throw conflict("PARENT_EXISTS", "A parent profile already exists for this account");
  const ref = db.collection("parents").doc(uid);
  const data = { id: ref.id, firebaseUid: uid, name: input.name, email: input.email, phone: input.phone, createdAt: now, updatedAt: now };
  await ref.set(data); return data;
}

export async function createDriver(input: Record<string, unknown>) {
  const uid = await ensureAuthUser("DRIVER", input as never);
  const ref = db.collection("drivers").doc(uid);
  const data = { id: ref.id, firebaseUid: uid, name: input.name, phone: input.phone, assignedBusId: input.assignedBusId ?? null, status: "active" };
  await ref.set(data); return data;
}

export async function createEntity(collection: "students" | "buses", input: Record<string, unknown>) {
  const now = Timestamp.now(); const ref = db.collection(collection).doc();
  const data = { id: ref.id, ...input, ...(collection === "students" ? { assignedBusId: input.assignedBusId ?? null } : { driverId: null, deviceId: null }), createdAt: now, updatedAt: now };
  await ref.set(data);
  if (collection === "students" && input.assignedBusId) await syncParentBusAccess(input.parentIds as string[]);
  return data;
}

export async function registerCard(input: { cardUid: string; studentId: string }) {
  const uidNormalized = normalizeCardUid(input.cardUid);
  const student = await db.collection("students").doc(input.studentId).get();
  if (!student.exists) throw notFound("Student not found");
  const uniqueRef = db.collection("rfidUidRegistry").doc(uidNormalized);
  const cardRef = db.collection("rfidCards").doc();
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(uniqueRef);
    if (existing.exists) throw conflict("RFID_UID_IN_USE", "RFID card is already registered");
    const data = { id: cardRef.id, uidNormalized, studentId: input.studentId, status: "active", issuedAt: Timestamp.now(), revokedAt: null };
    tx.create(uniqueRef, { cardId: cardRef.id, studentId: input.studentId, createdAt: FieldValue.serverTimestamp() });
    tx.create(cardRef, data); return data;
  });
}

export async function updateCard(id: string, status: "active" | "inactive" | "lost") {
  const ref = db.collection("rfidCards").doc(id);
  await db.runTransaction(async (tx) => {
    const card = await tx.get(ref); if (!card.exists) throw notFound("RFID card not found");
    const registry = db.collection("rfidUidRegistry").doc(card.get("uidNormalized"));
    const existing = status === "active" ? await tx.get(registry) : null;
    tx.update(ref, { status, revokedAt: status === "active" ? null : Timestamp.now() });
    if (status === "active") {
      if (existing!.exists && existing!.get("cardId") !== id) throw conflict("RFID_UID_IN_USE", "RFID card UID is assigned to another active card");
      tx.set(registry, { cardId: id, studentId: card.get("studentId"), createdAt: FieldValue.serverTimestamp() });
    }
    else tx.delete(registry);
  });
  return { id, status };
}

export async function provisionDevice(input: { id?: string; busId: string; firmwareVersion?: string | null; scanMode: "BOARDING" | "EXIT" }) {
  const bus = await db.collection("buses").doc(input.busId).get(); if (!bus.exists) throw notFound("Bus not found");
  const ref = input.id ? db.collection("devices").doc(input.id) : db.collection("devices").doc();
  if ((await ref.get()).exists) throw conflict("DEVICE_EXISTS", "Device identifier already exists");
  const secret = generateDeviceSecret(); const credentialHash = await hashSecret(secret);
  const data = { id: ref.id, busId: input.busId, credentialHash, enabled: true, firmwareVersion: input.firmwareVersion ?? null,
    scanMode: input.scanMode, lastSeenAt: null, createdAt: Timestamp.now() };
  await db.runTransaction(async (tx) => { tx.create(ref, data); tx.update(bus.ref, { deviceId: ref.id, updatedAt: Timestamp.now() }); });
  return { id: ref.id, credential: `${ref.id}.${secret}`, busId: input.busId, scanMode: input.scanMode };
}

export async function rotateDeviceCredential(id: string) {
  const ref = db.collection("devices").doc(id); if (!(await ref.get()).exists) throw notFound("Device not found");
  const secret = generateDeviceSecret(); await ref.update({ credentialHash: await hashSecret(secret), credentialRotatedAt: Timestamp.now() });
  return { id, credential: `${id}.${secret}` };
}

export async function updateDevice(id: string, input: { enabled?: boolean; scanMode?: "BOARDING" | "EXIT" }) {
  const ref = db.collection("devices").doc(id); if (!(await ref.get()).exists) throw notFound("Device not found");
  await ref.update({ ...input, updatedAt: Timestamp.now() }); return { id, ...input };
}

export async function assignStudent(studentId: string, busId: string | null) {
  const student = db.collection("students").doc(studentId);
  const studentSnap = await student.get(); if (!studentSnap.exists) throw notFound("Student not found");
  if (busId && !(await db.collection("buses").doc(busId).get()).exists) throw notFound("Bus not found");
  await student.update({ assignedBusId: busId, updatedAt: Timestamp.now() });
  await syncParentBusAccess(studentSnap.get("parentIds") as string[]);
  return { studentId, busId };
}

async function syncParentBusAccess(parentIds: string[]): Promise<void> {
  for (const parentId of parentIds) {
    const parent = await db.collection("parents").doc(parentId).get(); if (!parent.exists) continue;
    const uid = parent.get("firebaseUid") as string;
    const [current, students] = await Promise.all([
      db.collection("parentBusAccess").where("parentId", "==", parentId).get(),
      db.collection("students").where("parentIds", "array-contains", parentId).get()
    ]);
    const busIds = new Set(students.docs.map((d) => d.get("assignedBusId") as string | null).filter((v): v is string => Boolean(v)));
    const batch = db.batch(); current.docs.forEach((d) => batch.delete(d.ref));
    busIds.forEach((busId) => batch.set(db.collection("parentBusAccess").doc(`${uid}_${busId}`), { parentId, firebaseUid: uid, busId, updatedAt: Timestamp.now() }));
    await batch.commit();
  }
}

export async function assignDriver(driverId: string, busId: string | null) {
  const driver = db.collection("drivers").doc(driverId); if (!(await driver.get()).exists) throw notFound("Driver not found");
  if (busId && !(await db.collection("buses").doc(busId).get()).exists) throw notFound("Bus not found");
  await db.runTransaction(async (tx) => {
    const oldBusId = (await tx.get(driver)).get("assignedBusId") as string | null;
    if (oldBusId && oldBusId !== busId) tx.update(db.collection("buses").doc(oldBusId), { driverId: null, updatedAt: Timestamp.now() });
    tx.update(driver, { assignedBusId: busId });
    if (busId) tx.update(db.collection("buses").doc(busId), { driverId, updatedAt: Timestamp.now() });
  }); return { driverId, busId };
}

