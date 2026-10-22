import { db } from "./config/firebase.js";
import { startTrip } from "./services/trip.service.js";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("Demo reset is emulator-only. Start the Firestore and Auth emulators first.");
}

const transientCollections = [
  "attendanceEvents",
  "studentTripStatus",
  "notifications",
  "deviceScanEvents",
  "trips",
  "activeTripByBus"
] as const;

for (const collection of transientCollections) await clearCollection(collection);

await db.collection("devices").doc("device-demo").update({ scanMode: "BOARDING" });
const trip = await startTrip("driver-demo", "bus-demo", "PICKUP");

console.log(JSON.stringify({
  message: "Demo scan state reset",
  cardUid: "BAB9421D",
  deviceMode: "BOARDING",
  activeTripId: trip.id
}, null, 2));

async function clearCollection(name: string): Promise<void> {
  while (true) {
    const snapshot = await db.collection(name).limit(400).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    for (const document of snapshot.docs) batch.delete(document.ref);
    await batch.commit();
  }
}
