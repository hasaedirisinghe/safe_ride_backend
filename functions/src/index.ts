import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { app } from "./app.js";
import { deliverNotification } from "./services/notification.service.js";

const region = defineString("SAFERIDE_FUNCTION_REGION", { default: "asia-south1" });
setGlobalOptions({ region, maxInstances: 20, concurrency: 80, timeoutSeconds: 60, memory: "512MiB" });

export const api = onRequest(app);

export const dispatchNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
  if (event.params.notificationId) await deliverNotification(event.params.notificationId);
});

