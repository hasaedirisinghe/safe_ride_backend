import type { Request, Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { processScan } from "../services/attendance.service.js";
import { ok } from "../utils/response.js";

export async function scan(req: Request, res: Response) { ok(res, await processScan(req.device!, req.body), "Scan processed"); }
export async function heartbeat(req: Request, res: Response) {
  if (req.body.deviceId !== req.device!.deviceId) return void res.status(401).json({ success: false, error: { code: "DEVICE_UNAUTHORIZED", message: "Invalid device credentials" } });
  await db.collection("devices").doc(req.device!.deviceId).update({ lastSeenAt: Timestamp.now(), ...(req.body.firmwareVersion ? { firmwareVersion: req.body.firmwareVersion } : {}) });
  ok(res, { accepted: true }, "Heartbeat accepted");
}

