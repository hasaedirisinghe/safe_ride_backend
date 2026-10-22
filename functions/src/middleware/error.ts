import type { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "firebase-functions";
import { AppError } from "../utils/errors.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `No route matches ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError = error instanceof AppError ? error : new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred");
  if (appError.status >= 500) logger.error("Unhandled API error", error);
  res.status(appError.status).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details && process.env.APP_ENV !== "production" ? { details: formatDetails(appError.details) } : {})
    },
    timestamp: new Date().toISOString()
  });
};

function formatDetails(details: unknown): unknown {
  if (details && typeof details === "object" && "issues" in details) return (details as { issues: unknown }).issues;
  return details;
}

