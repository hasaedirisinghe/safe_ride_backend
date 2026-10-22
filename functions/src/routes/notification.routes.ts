import { Router } from "express";
import * as c from "../controllers/notification.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { tokenBody } from "../validators/schemas.js";
export const notificationRouter = Router();
notificationRouter.use(asyncHandler(authenticateFirebaseUser), requireRole("PARENT"));
notificationRouter.post("/tokens", validateRequest({ body: tokenBody }), asyncHandler(c.register));
notificationRouter.delete("/tokens", validateRequest({ body: tokenBody.pick({ token: true }) }), asyncHandler(c.unregister));

