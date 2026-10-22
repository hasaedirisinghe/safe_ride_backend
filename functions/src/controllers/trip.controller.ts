import type { Request, Response } from "express";
import * as service from "../services/trip.service.js";
import { serialize } from "../utils/firestore.js";
import { ok } from "../utils/response.js";

export async function start(req: Request, res: Response) { ok(res, serialize(await service.startTrip(req.authUser!.uid, req.body.busId, req.body.tripType)), "Trip started", 201); }
export async function complete(req: Request, res: Response) { ok(res, serialize(await service.completeTrip(req.authUser!.uid, String(req.params.id))), "Trip completed"); }
export async function confirmDropoff(req: Request, res: Response) { ok(res, serialize(await service.confirmDropoff(req.authUser!.uid, String(req.params.id), req.body.studentId)), "Drop-off confirmed"); }

