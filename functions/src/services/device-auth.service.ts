import { db } from "../config/firebase.js";
import type { Device, DevicePrincipal } from "../types/models.js";
import { AppError } from "../utils/errors.js";
import { verifySecret } from "../utils/crypto.js";

export async function authenticateDeviceToken(token: string): Promise<DevicePrincipal> {
  const separator = token.indexOf(".");
  if (separator < 1) throw unauthorized();
  const deviceId = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  const snap = await db.collection("devices").doc(deviceId).get();
  if (!snap.exists) throw unauthorized();
  const device = snap.data() as Device;
  if (!device.enabled || !(await verifySecret(secret, device.credentialHash))) throw unauthorized();
  return { deviceId, busId: device.busId, scanMode: device.scanMode ?? "BOARDING" };
}

function unauthorized(): AppError { return new AppError(401, "DEVICE_UNAUTHORIZED", "Invalid device credentials"); }

