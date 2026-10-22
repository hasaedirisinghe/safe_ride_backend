import { Timestamp } from "firebase-admin/firestore";
import { auth, db } from "./config/firebase.js";
import { hashSecret } from "./utils/crypto.js";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("Seed is emulator-only. Start the Firestore and Auth emulators first.");
}

const now = Timestamp.now();
const users = [
  { uid: "admin-demo", email: "admin@saferide.test", password: "DemoPass123!", role: "ADMIN" },
  { uid: "parent-demo", email: "parent@saferide.test", password: "DemoPass123!", role: "PARENT" },
  { uid: "driver-demo", email: "driver@saferide.test", password: "DemoPass123!", role: "DRIVER" }
] as const;
for (const user of users) {
  try { await auth.createUser({ uid: user.uid, email: user.email, password: user.password }); } catch (error: unknown) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "auth/uid-already-exists")) throw error;
  }
  await auth.setCustomUserClaims(user.uid, { role: user.role });
}

const credential = "device-demo.local-device-secret";
const batch = db.batch();
batch.set(db.doc("parents/parent-demo"), { id: "parent-demo", firebaseUid: "parent-demo", name: "Nimali Perera", email: "parent@saferide.test", phone: "+94770000001", createdAt: now, updatedAt: now });
batch.set(db.doc("drivers/driver-demo"), { id: "driver-demo", firebaseUid: "driver-demo", name: "Sunil Fernando", phone: "+94770000002", assignedBusId: "bus-demo", status: "active" });
batch.set(db.doc("buses/bus-demo"), { id: "bus-demo", registrationNumber: "WP-NB-1234", busNumber: "SR-01", capacity: 30, driverId: "driver-demo", deviceId: "device-demo", status: "active", createdAt: now, updatedAt: now });
batch.set(db.doc("students/student-demo"), { id: "student-demo", name: "Kavindu Perera", studentNumber: "ST-001", schoolName: "SafeRide College", grade: "6", parentIds: ["parent-demo"], assignedBusId: "bus-demo", status: "active", createdAt: now, updatedAt: now });
batch.set(db.doc("rfidCards/card-demo"), { id: "card-demo", uidNormalized: "04A1B2C3", studentId: "student-demo", status: "active", issuedAt: now, revokedAt: null });
batch.set(db.doc("rfidUidRegistry/04A1B2C3"), { cardId: "card-demo", studentId: "student-demo", createdAt: now });
batch.set(db.doc("rfidCards/card-demo-physical"), { id: "card-demo-physical", uidNormalized: "BAB9421D", studentId: "student-demo", status: "active", issuedAt: now, revokedAt: null });
batch.set(db.doc("rfidUidRegistry/BAB9421D"), { cardId: "card-demo-physical", studentId: "student-demo", createdAt: now });
batch.set(db.doc("devices/device-demo"), { id: "device-demo", busId: "bus-demo", credentialHash: await hashSecret("local-device-secret"), enabled: true, firmwareVersion: "demo-1.0", scanMode: "BOARDING", lastSeenAt: null, createdAt: now });
batch.set(db.doc("parentBusAccess/parent-demo_bus-demo"), { parentId: "parent-demo", firebaseUid: "parent-demo", busId: "bus-demo", updatedAt: now });
await batch.commit();
console.log(JSON.stringify({ message: "Emulator seed complete", deviceCredential: credential, users: users.map(({ email, password, role }) => ({ email, password, role })) }, null, 2));

