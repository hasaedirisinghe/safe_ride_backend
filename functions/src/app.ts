import cors from "cors";
import express from "express";
import helmet from "helmet";
import { allowedOrigins, env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { busRouter } from "./routes/bus.routes.js";
import { deviceRouter } from "./routes/device.routes.js";
import { driverRouter } from "./routes/driver.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { parentRouter } from "./routes/parent.routes.js";
import { studentRouter } from "./routes/student.routes.js";
import { tripRouter } from "./routes/trip.routes.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || env.APP_ENV !== "production" || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error("Origin is not allowed"));
} }));
app.use(express.json({ limit: "32kb", strict: true }));
app.use((req, res, next) => {
  if (env.APP_ENV === "production" && req.header("x-forwarded-proto") && req.header("x-forwarded-proto") !== "https") {
    return res.status(400).json({ success: false, error: { code: "HTTPS_REQUIRED", message: "HTTPS is required" } });
  }
  next();
});

const api = express.Router();
api.get("/health", (_req, res) => res.json({ success: true, message: "SafeRide-LK API is healthy", data: { version: "v1" }, timestamp: new Date().toISOString() }));
api.use("/auth", authRouter);
api.use("/admin", adminRouter);
api.use("/parents", parentRouter);
api.use("/students", attendanceRouter, studentRouter);
api.use("/drivers", driverRouter);
api.use("/trips", tripRouter);
api.use("/buses", busRouter);
api.use("/devices", deviceRouter);
api.use("/notifications", notificationRouter);
app.use("/api/v1", api);
app.use(notFoundHandler);
app.use(errorHandler);

