import { Router } from "express";
import * as c from "../controllers/driver.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validateRequest } from "../middleware/validate.js";
import { driverScanModeBody } from "../validators/schemas.js";
export const driverRouter = Router();
driverRouter.use(asyncHandler(authenticateFirebaseUser), requireRole("DRIVER"));
driverRouter.get("/me", asyncHandler(c.me));
driverRouter.get("/me/bus", asyncHandler(c.myBus));
driverRouter.get("/me/students", asyncHandler(c.myStudents));
driverRouter.patch("/me/scanner-mode", validateRequest({ body: driverScanModeBody }), asyncHandler(c.updateScannerMode));

