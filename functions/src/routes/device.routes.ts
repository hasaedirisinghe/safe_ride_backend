import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import * as c from "../controllers/device.controller.js";
import { authenticateDevice } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { heartbeatBody, scanBody } from "../validators/schemas.js";
export const deviceRouter = Router();
deviceRouter.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "127.0.0.1")
}));
deviceRouter.post("/rfid/scan", asyncHandler(authenticateDevice), validateRequest({ body: scanBody }), asyncHandler(c.scan));
deviceRouter.post("/heartbeat", asyncHandler(authenticateDevice), validateRequest({ body: heartbeatBody }), asyncHandler(c.heartbeat));

