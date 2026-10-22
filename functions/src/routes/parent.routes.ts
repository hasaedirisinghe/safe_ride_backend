import { Router } from "express";
import * as c from "../controllers/parent.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notificationParam, paginationQuery } from "../validators/schemas.js";

export const parentRouter = Router();
parentRouter.use(asyncHandler(authenticateFirebaseUser), requireRole("PARENT"));
parentRouter.get("/me", asyncHandler(c.me));
parentRouter.get("/me/students", validateRequest({ query: paginationQuery }), asyncHandler(c.myStudents));
parentRouter.get("/me/notifications", validateRequest({ query: paginationQuery }), asyncHandler(c.notifications));
parentRouter.patch("/me/notifications/:id/read", validateRequest({ params: notificationParam }), asyncHandler(c.markRead));

