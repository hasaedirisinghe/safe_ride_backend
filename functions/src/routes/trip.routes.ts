import { Router } from "express";
import * as c from "../controllers/trip.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { completeTripParams, confirmDropoffBody, startTripBody } from "../validators/schemas.js";
export const tripRouter = Router();
tripRouter.use(asyncHandler(authenticateFirebaseUser), requireRole("DRIVER"));
tripRouter.post("/start", validateRequest({ body: startTripBody }), asyncHandler(c.start));
tripRouter.post("/:id/complete", validateRequest({ params: completeTripParams }), asyncHandler(c.complete));
tripRouter.post("/:id/confirm-dropoff", validateRequest({ params: completeTripParams, body: confirmDropoffBody }), asyncHandler(c.confirmDropoff));

