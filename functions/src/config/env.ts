import { z } from "zod";

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("production"),
  ALLOWED_ORIGINS: z.string().default(""),
  RFID_REPEAT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(300).default(10),
  ENABLE_EMULATOR_AUTH: z.enum(["true", "false"]).default("false"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export const env = schema.parse(process.env);
export const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((v) => v.trim()).filter(Boolean);
export const emulatorAuthEnabled =
  env.APP_ENV !== "production" && env.ENABLE_EMULATOR_AUTH === "true" && process.env.FUNCTIONS_EMULATOR === "true";

