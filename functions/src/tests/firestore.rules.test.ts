import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!hasEmulator)("Firestore security rules", () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "saferide-lk-test", firestore: { rules: readFileSync(resolve(process.cwd(), "../firestore.rules"), "utf8") } });
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc("parents/parent-uid").set({ firebaseUid: "parent-uid" });
      await db.doc("students/student-a").set({ parentIds: ["parent-uid"], assignedBusId: "bus-a" });
      await db.doc("students/student-b").set({ parentIds: ["other-parent"], assignedBusId: "bus-b" });
      await db.doc("attendanceEvents/event-a").set({ studentId: "student-a", busId: "bus-a" });
      await db.doc("attendanceEvents/event-b").set({ studentId: "student-b", busId: "bus-b" });
      await db.doc("rfidCards/card-a").set({ uidNormalized: "04A1" });
    });
  });
  afterAll(async () => env.cleanup());

  it("allows a parent to read only their linked child and attendance", async () => {
    const db = env.authenticatedContext("parent-uid", { role: "PARENT" }).firestore();
    await assertSucceeds(db.doc("students/student-a").get());
    await assertSucceeds(db.doc("attendanceEvents/event-a").get());
    await assertFails(db.doc("students/student-b").get());
    await assertFails(db.doc("attendanceEvents/event-b").get());
  });
  it("blocks all client writes and sensitive card reads", async () => {
    const db = env.authenticatedContext("admin-uid", { role: "ADMIN" }).firestore();
    await assertFails(db.doc("students/new").set({ name: "Nope" }));
    await assertFails(db.doc("rfidCards/card-a").get());
  });
});

