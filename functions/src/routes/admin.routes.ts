import { Router } from "express";
import * as c from "../controllers/admin.controller.js";
import { authenticateFirebaseUser, requireRole } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as s from "../validators/schemas.js";

export const adminRouter = Router();
adminRouter.use(asyncHandler(authenticateFirebaseUser), requireRole("ADMIN"));
adminRouter.post("/parents", validateRequest({ body: s.createParentBody }), asyncHandler(c.createParent));
adminRouter.post("/students", validateRequest({ body: s.createStudentBody }), asyncHandler(c.createStudent));
adminRouter.post("/drivers", validateRequest({ body: s.createDriverBody }), asyncHandler(c.createDriver));
adminRouter.get("/buses", validateRequest({ query: s.paginationQuery }), asyncHandler(c.listBuses));
adminRouter.post("/buses", validateRequest({ body: s.createBusBody }), asyncHandler(c.createBus));
adminRouter.post("/rfid-cards", validateRequest({ body: s.createCardBody }), asyncHandler(c.createCard));
adminRouter.patch("/rfid-cards/:id", validateRequest({ params: s.idParam, body: s.updateCardBody }), asyncHandler(c.updateCard));
adminRouter.post("/devices", validateRequest({ body: s.createDeviceBody }), asyncHandler(c.createDevice));
adminRouter.patch("/devices/:id", validateRequest({ params: s.idParam, body: s.updateDeviceBody }), asyncHandler(c.updateDevice));
adminRouter.post("/devices/:id/rotate-credential", validateRequest({ params: s.idParam }), asyncHandler(c.rotateCredential));
adminRouter.post("/assign-student", validateRequest({ body: s.assignStudentBody }), asyncHandler(c.assignStudent));
adminRouter.post("/assign-driver", validateRequest({ body: s.assignDriverBody }), asyncHandler(c.assignDriver));
adminRouter.get("/trips", validateRequest({ query: s.paginationQuery }), asyncHandler(c.listTrips));
adminRouter.get("/attendance-events", validateRequest({ query: s.paginationQuery }), asyncHandler(c.listAttendance));
adminRouter.get("/device-scan-events", validateRequest({ query: s.paginationQuery }), asyncHandler(c.listDeviceScans));

