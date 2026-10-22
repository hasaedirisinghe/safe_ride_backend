import { Router } from "express";
import { attendance } from "../controllers/student.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { requireParentAccessToStudent } from "../middleware/authorization.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { idParam, paginationQuery } from "../validators/schemas.js";

export const attendanceRouter = Router();
attendanceRouter.get("/:id/attendance", asyncHandler(authenticateFirebaseUser), requireRole("PARENT", "ADMIN"),
  validateRequest({ params: idParam, query: paginationQuery }), asyncHandler(requireParentAccessToStudent), asyncHandler(attendance));

