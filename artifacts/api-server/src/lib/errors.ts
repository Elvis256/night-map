import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`, "not_found");
export const forbidden = (msg = "Not allowed") => new HttpError(403, msg, "forbidden");
export const badRequest = (msg: string, code = "bad_request") => new HttpError(400, msg, code);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request",
      code: "validation",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, code: err.code ?? "error" });
    return;
  }
  if (err && typeof err === "object" && "type" in err && (err as { type?: string }).type === "entity.too.large") {
    res.status(413).json({ message: "Upload too large", code: "too_large" });
    return;
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ message: "Internal server error", code: "internal" });
}
