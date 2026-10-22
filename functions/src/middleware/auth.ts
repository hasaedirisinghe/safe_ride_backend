import type { NextFunction, Request, Response } from "express";
import { auth, db } from "../config/firebase.js";
import { emulatorAuthEnabled } from "../config/env.js";
import type { Role } from "../types/models.js";
import { AppError, forbidden } from "../utils/errors.js";
import { authenticateDeviceToken } from "../services/device-auth.service.js";

function bearer(req: Request): string {
  const [scheme, token] = (req.header("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw new AppError(401, "UNAUTHENTICATED", "A valid bearer token is required");
  return token;
}

export async function authenticateFirebaseUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (emulatorAuthEnabled && req.header("x-emulator-uid") && req.header("x-emulator-role")) {
      req.authUser = { uid: req.header("x-emulator-uid")!, role: req.header("x-emulator-role")! as Role };
      return next();
    }
    const decoded = await auth.verifyIdToken(bearer(req), true);
    const role = decoded.role as Role | undefined;
    if (!role || !["ADMIN", "PARENT", "DRIVER"].includes(role)) throw forbidden("Account role is not configured");
    req.authUser = { uid: decoded.uid, role };
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError(401, "UNAUTHENTICATED", "Invalid or expired authentication token")); }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role)) return next(forbidden());
    next();
  };
}

export async function authenticateDevice(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (emulatorAuthEnabled && req.header("x-emulator-device-id")) {
      const deviceId = req.header("x-emulator-device-id")!;
      const snap = await db.collection("devices").doc(deviceId).get();
      if (!snap.exists || !snap.get("enabled")) throw new AppError(401, "DEVICE_UNAUTHORIZED", "Invalid device credentials");
      req.device = { deviceId, busId: snap.get("busId"), scanMode: snap.get("scanMode") ?? "BOARDING" };
    } else req.device = await authenticateDeviceToken(bearer(req));
    next();
  } catch (error) { next(error); }
}

export async function authenticateLocationActor(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = bearer(req);
    if (token.split(".").length === 2) req.device = await authenticateDeviceToken(token);
    else {
      const decoded = await auth.verifyIdToken(token, true);
      const role = decoded.role as Role | undefined;
      if (!role) throw forbidden();
      req.authUser = { uid: decoded.uid, role };
    }
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError(401, "UNAUTHENTICATED", "Invalid authentication token")); }
}

