import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { db, messaging } from "../config/firebase.js";

export async function deliverNotification(notificationId: string): Promise<void> {
  const ref = db.collection("notifications").doc(notificationId); const snap = await ref.get();
  if (!snap.exists || snap.get("deliveryStatus") === "SENT") return;
  const parent = await db.collection("parents").doc(snap.get("parentId")).get();
  if (!parent.exists) return markFailure(ref, "Parent profile not found");
  const tokens = await db.collection("notificationTokens").where("userId", "==", parent.get("firebaseUid")).limit(500).get();
  if (tokens.empty) { await ref.update({ deliveryStatus: "NO_TOKENS", deliveryAttempts: (snap.get("deliveryAttempts") ?? 0) + 1, lastAttemptAt: Timestamp.now() }); return; }
  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.docs.map((d) => d.get("token")),
      notification: { title: snap.get("title"), body: snap.get("body") },
      data: { type: snap.get("type"), studentId: snap.get("studentId"), tripId: snap.get("tripId") }
    });
    const batch = db.batch();
    response.responses.forEach((result, i) => {
      if (!result.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(result.error?.code ?? "")) batch.delete(tokens.docs[i]!.ref);
    });
    batch.update(ref, { deliveryStatus: response.failureCount === response.responses.length ? "FAILED" : "SENT", deliveryAttempts: (snap.get("deliveryAttempts") ?? 0) + 1,
      successCount: response.successCount, failureCount: response.failureCount, lastAttemptAt: Timestamp.now() });
    await batch.commit();
  } catch (error) { logger.error("FCM delivery failed", { notificationId, error }); await markFailure(ref, "FCM delivery failed"); throw error; }
}

async function markFailure(ref: FirebaseFirestore.DocumentReference, reason: string) {
  await ref.update({ deliveryStatus: "FAILED", deliveryAttempts: FieldValue.increment(1), lastDeliveryError: reason, lastAttemptAt: Timestamp.now() });
}

export async function registerToken(uid: string, token: string, platform: string) {
  const id = Buffer.from(token).toString("base64url").slice(0, 500);
  await db.collection("notificationTokens").doc(id).set({ id, userId: uid, token, platform, updatedAt: Timestamp.now() });
  return { id, platform };
}

export async function unregisterToken(uid: string, token: string) {
  const id = Buffer.from(token).toString("base64url").slice(0, 500); const ref = db.collection("notificationTokens").doc(id); const snap = await ref.get();
  if (snap.exists && snap.get("userId") === uid) await ref.delete();
}

