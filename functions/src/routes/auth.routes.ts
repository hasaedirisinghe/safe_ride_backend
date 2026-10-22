import { Router } from "express";
import { authenticateFirebaseUser } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ok } from "../utils/response.js";
export const authRouter = Router();
authRouter.get("/session", asyncHandler(authenticateFirebaseUser), (req, res) => ok(res, req.authUser));

