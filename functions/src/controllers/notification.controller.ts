import type { Request, Response } from "express";
import { registerToken, unregisterToken } from "../services/notification.service.js";
import { ok } from "../utils/response.js";
export async function register(req: Request, res: Response) { ok(res, await registerToken(req.authUser!.uid, req.body.token, req.body.platform), "Notification token registered", 201); }
export async function unregister(req: Request, res: Response) { await unregisterToken(req.authUser!.uid, req.body.token); ok(res, null, "Notification token removed"); }

