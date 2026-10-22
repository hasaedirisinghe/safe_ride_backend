import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/errors.js";

export function validateRequest(schemas: { body?: ZodType; params?: ZodType; query?: ZodType }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      next();
    } catch (error) {
      next(new AppError(400, "VALIDATION_ERROR", "Request validation failed", error));
    }
  };
}

