import type { NextFunction, Request, Response } from "express";
import { db } from "../config/firebase.js";
import { forbidden, notFound } from "../utils/errors.js";

export async function requireParentAccessToStudent(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.authUser?.role === "ADMIN") return next();
    if (req.authUser?.role !== "PARENT") throw forbidden();
    const [parent, student] = await Promise.all([
      db.collection("parents").where("firebaseUid", "==", req.authUser.uid).limit(1).get(),
      db.collection("students").doc(String(req.params.id)).get()
    ]);
    if (!student.exists) throw notFound();
    const parentId = parent.docs[0]?.id;
    if (!parentId || !(student.get("parentIds") as string[] | undefined)?.includes(parentId)) throw forbidden();
    next();
  } catch (error) { next(error); }
}

export async function requireDriverAccessToBus(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.device) {
      if (req.device.busId !== req.params.id) throw forbidden();
      return next();
    }
    if (req.authUser?.role === "ADMIN") return next();
    if (req.authUser?.role !== "DRIVER") throw forbidden();
    const drivers = await db.collection("drivers").where("firebaseUid", "==", req.authUser.uid).limit(1).get();
    if (drivers.empty || drivers.docs[0]!.get("assignedBusId") !== req.params.id) throw forbidden();
    next();
  } catch (error) { next(error); }
}

export async function requireUserAccessToBus(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.authUser?.role === "ADMIN") return next();
    if (req.authUser?.role === "DRIVER") return requireDriverAccessToBus(req, _res, next);
    if (req.authUser?.role !== "PARENT") throw forbidden();
    const parents = await db.collection("parents").where("firebaseUid", "==", req.authUser.uid).limit(1).get();
    const parentId = parents.docs[0]?.id; if (!parentId) throw forbidden();
    const student = await db.collection("students").where("parentIds", "array-contains", parentId).where("assignedBusId", "==", req.params.id).limit(1).get();
    if (student.empty) throw forbidden(); next();
  } catch (error) { next(error); }
}

