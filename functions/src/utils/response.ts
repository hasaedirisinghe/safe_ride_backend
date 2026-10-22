import type { Response } from "express";

export function ok(res: Response, data: unknown, message = "Operation completed", status = 200): void {
  res.status(status).json({ success: true, message, data, timestamp: new Date().toISOString() });
}

