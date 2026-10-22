import type { Timestamp } from "firebase-admin/firestore";

export type Role = "ADMIN" | "PARENT" | "DRIVER";
export type TripType = "PICKUP" | "DROPOFF";
export type TripStatus = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type StudentTripState = "NOT_BOARDED" | "ON_BUS" | "EXITED" | "DROPPED_OFF";
export type AttendanceEventType = "BOARDED" | "EXITED";
export type ScanMode = "BOARDING" | "EXIT";

export interface AuthUser { uid: string; role: Role; }
export interface DevicePrincipal { deviceId: string; busId: string; scanMode: ScanMode; }
export interface Parent { id: string; firebaseUid: string; name: string; email: string; phone: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Student { id: string; name: string; studentNumber: string; schoolName: string; grade: string; parentIds: string[]; assignedBusId: string | null; status: "active" | "inactive"; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Driver { id: string; firebaseUid: string; name: string; phone: string; assignedBusId: string | null; status: "active" | "inactive"; }
export interface Bus { id: string; registrationNumber: string; busNumber: string; capacity: number; driverId: string | null; deviceId: string | null; status: "active" | "inactive" | "maintenance"; createdAt: Timestamp; updatedAt: Timestamp; }
export interface Device { id: string; busId: string; credentialHash: string; enabled: boolean; firmwareVersion: string | null; scanMode: ScanMode; lastSeenAt: Timestamp | null; createdAt: Timestamp; }
export interface Trip { id: string; busId: string; driverId: string; tripType: TripType; status: TripStatus; startedAt: Timestamp | null; completedAt: Timestamp | null; createdAt: Timestamp; }

