import type { AuthedUser } from "./lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export {};
