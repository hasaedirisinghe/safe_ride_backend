import type { AuthUser, DevicePrincipal } from "./models.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      device?: DevicePrincipal;
    }
  }
}
export {};

