import { z } from "zod";

const id = z.string().trim().min(1).max(128);
const isoDate = z.iso.datetime({ offset: true });
const optionalFirebaseUid = z.string().trim().min(1).max(128).optional();

export const paginationQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() });
export const idParam = z.object({ id });
export const notificationParam = z.object({ id });

export const createParentBody = z.object({
  firebaseUid: optionalFirebaseUid,
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().min(7).max(24),
  temporaryPassword: z.string().min(8).max(128).optional()
});

export const createStudentBody = z.object({
  name: z.string().trim().min(2).max(120),
  studentNumber: z.string().trim().min(1).max(50),
  schoolName: z.string().trim().min(2).max(160),
  grade: z.string().trim().min(1).max(30),
  parentIds: z.array(id).min(1),
  assignedBusId: id.nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active")
});

export const createDriverBody = z.object({
  firebaseUid: optionalFirebaseUid,
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(24),
  email: z.email().optional(),
  temporaryPassword: z.string().min(8).max(128).optional(),
  assignedBusId: id.nullable().optional()
});

export const createBusBody = z.object({
  registrationNumber: z.string().trim().min(2).max(30),
  busNumber: z.string().trim().min(1).max(30),
  capacity: z.number().int().min(1).max(100),
  status: z.enum(["active", "inactive", "maintenance"]).default("active")
});

export const createCardBody = z.object({ cardUid: z.string().min(4).max(64), studentId: id });
export const updateCardBody = z.object({ status: z.enum(["active", "inactive", "lost"]) });
export const createDeviceBody = z.object({
  id: id.optional(), busId: id, firmwareVersion: z.string().max(80).nullable().optional(),
  scanMode: z.enum(["BOARDING", "EXIT"]).default("BOARDING")
});
export const updateDeviceBody = z.object({
  enabled: z.boolean().optional(), scanMode: z.enum(["BOARDING", "EXIT"]).optional()
}).refine((value) => value.enabled !== undefined || value.scanMode !== undefined, { message: "At least one field is required" });
export const assignStudentBody = z.object({ studentId: id, busId: id.nullable() });
export const assignDriverBody = z.object({ driverId: id, busId: id.nullable() });

export const scanBody = z.object({
  deviceId: id,
  eventId: z.string().trim().min(1).max(160),
  cardUid: z.string().trim().min(4).max(64),
  scannedAt: isoDate
}).strict();
export const heartbeatBody = z.object({
  deviceId: id, firmwareVersion: z.string().trim().max(80).optional(), recordedAt: isoDate.optional()
}).strict();

export const startTripBody = z.object({ busId: id, tripType: z.enum(["PICKUP", "DROPOFF"]) });
export const completeTripParams = z.object({ id });
export const confirmDropoffBody = z.object({ studentId: id });
export const driverScanModeBody = z.object({ scanMode: z.enum(["BOARDING", "EXIT"]) }).strict();
export const locationBody = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(300).nullable().optional(),
  heading: z.number().min(0).lt(360).nullable().optional(),
  recordedAt: isoDate
}).strict();
export const tokenBody = z.object({ token: z.string().trim().min(20).max(4096), platform: z.enum(["android", "ios", "web"]) });

