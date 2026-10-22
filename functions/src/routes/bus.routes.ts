import { Router } from "express";
import * as c from "../controllers/bus.controller.js";
import { authenticateFirebaseUser, authenticateLocationActor } from "../middleware/auth.js";
import { requireDriverAccessToBus, requireUserAccessToBus } from "../middleware/authorization.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { idParam, locationBody } from "../validators/schemas.js";
export const busRouter = Router();
busRouter.post("/:id/location", asyncHandler(authenticateLocationActor), validateRequest({ params: idParam, body: locationBody }), asyncHandler(requireDriverAccessToBus), asyncHandler(c.updateLocation));
busRouter.get("/:id", asyncHandler(authenticateFirebaseUser), validateRequest({ params: idParam }), asyncHandler(requireUserAccessToBus), asyncHandler(c.getBus));
busRouter.get("/:id/location", asyncHandler(authenticateFirebaseUser), validateRequest({ params: idParam }), asyncHandler(requireUserAccessToBus), asyncHandler(c.getLocation));
busRouter.get("/:id/active-trip", asyncHandler(authenticateFirebaseUser), validateRequest({ params: idParam }), asyncHandler(requireUserAccessToBus), asyncHandler(c.activeTrip));

