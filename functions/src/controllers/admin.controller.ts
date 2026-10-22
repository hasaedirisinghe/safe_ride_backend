import type { Request, Response } from "express";
import * as adminService from "../services/admin.service.js";
import { ok } from "../utils/response.js";
import { pageLimit, serialize } from "../utils/firestore.js";
import { db } from "../config/firebase.js";

export async function createParent(req: Request, res: Response) { ok(res, serialize(await adminService.createParent(req.body)), "Parent created", 201); }
export async function createStudent(req: Request, res: Response) { ok(res, serialize(await adminService.createEntity("students", req.body)), "Student created", 201); }
export async function createDriver(req: Request, res: Response) { ok(res, serialize(await adminService.createDriver(req.body)), "Driver created", 201); }
export async function createBus(req: Request, res: Response) { ok(res, serialize(await adminService.createEntity("buses", req.body)), "Bus created", 201); }
export async function listBuses(req: Request, res: Response) {
  const snap = await db.collection("buses").orderBy("createdAt", "desc").limit(pageLimit(req.query.limit)).get();
  ok(res, serialize(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
}
export async function createCard(req: Request, res: Response) { ok(res, serialize(await adminService.registerCard(req.body)), "RFID card registered", 201); }
export async function updateCard(req: Request, res: Response) { ok(res, await adminService.updateCard(String(req.params.id), req.body.status), "RFID card updated"); }
export async function createDevice(req: Request, res: Response) { ok(res, serialize(await adminService.provisionDevice(req.body)), "Device provisioned; save the credential now because it will not be shown again", 201); }
export async function rotateCredential(req: Request, res: Response) { ok(res, await adminService.rotateDeviceCredential(String(req.params.id)), "Credential rotated"); }
export async function updateDevice(req: Request, res: Response) { ok(res, await adminService.updateDevice(String(req.params.id), req.body), "Device updated"); }
export async function assignStudent(req: Request, res: Response) { ok(res, await adminService.assignStudent(req.body.studentId, req.body.busId), "Student assignment updated"); }
export async function assignDriver(req: Request, res: Response) { ok(res, await adminService.assignDriver(req.body.driverId, req.body.busId), "Driver assignment updated"); }

export async function listTrips(req: Request, res: Response) { await listAuditCollection(req, res, "trips", "createdAt"); }
export async function listAttendance(req: Request, res: Response) { await listAuditCollection(req, res, "attendanceEvents", "createdAt"); }
export async function listDeviceScans(req: Request, res: Response) { await listAuditCollection(req, res, "deviceScanEvents", "receivedAt"); }
async function listAuditCollection(req: Request, res: Response, collection: string, orderField: string) {
  const snap = await db.collection(collection).orderBy(orderField, "desc").limit(pageLimit(req.query.limit)).get();
  ok(res, serialize(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
}

