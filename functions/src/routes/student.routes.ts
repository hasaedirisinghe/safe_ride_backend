import { Router } from "express";
import * as c from "../controllers/student.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { requireParentAccessToStudent } from "../middleware/authorization.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { idParam } from "../validators/schemas.js";

export const studentRouter = Router();
studentRouter.use(asyncHandler(authenticateFirebaseUser), requireRole("PARENT", "ADMIN"));
studentRouter.get("/:id", validateRequest({ params: idParam }), asyncHandler(requireParentAccessToStudent), asyncHandler(c.getStudent));
studentRouter.get("/:id/current-status", validateRequest({ params: idParam }), asyncHandler(requireParentAccessToStudent), asyncHandler(c.currentStatus));
studentRouter.get("/:id/current-trip", validateRequest({ params: idParam }), asyncHandler(requireParentAccessToStudent), asyncHandler(c.currentTrip));

