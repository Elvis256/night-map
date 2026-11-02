import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Replit injects env vars directly. For local development we fall back to the
 * workspace-root .env file when the required variables are missing.
 */
export function loadEnv(): void {
  if (process.env.DATABASE_URL && process.env.PORT) return;
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      // ignore and try the next candidate
    }
  }
}
