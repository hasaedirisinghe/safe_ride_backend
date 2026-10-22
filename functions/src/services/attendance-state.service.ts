import type { AttendanceEventType, ScanMode, StudentTripState } from "../types/models.js";
import { AppError } from "../utils/errors.js";

export function transitionForScan(current: StudentTripState | undefined, mode: ScanMode): { eventType: AttendanceEventType; next: StudentTripState } {
  const state = current ?? "NOT_BOARDED";
  if (mode === "BOARDING" && state === "NOT_BOARDED") return { eventType: "BOARDED", next: "ON_BUS" };
  if (mode === "EXIT" && state === "ON_BUS") return { eventType: "EXITED", next: "EXITED" };
  throw new AppError(409, "INVALID_ATTENDANCE_TRANSITION", "Scan is not valid for the current attendance state");
}

