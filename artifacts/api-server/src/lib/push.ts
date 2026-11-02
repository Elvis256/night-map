import { eq, inArray } from "drizzle-orm";
import { db, pushTokensTable } from "@workspace/db";
import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/** Sends an Expo push notification to every device registered for the user. Never throws. */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  try {
    const tokens = await db.select().from(pushTokensTable).where(eq(pushTokensTable.userId, userId));
    if (tokens.length === 0) return;
    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default",
      priority: "high",
    }));
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
      "accept-encoding": "gzip, deflate",
    };
    if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Expo push request failed");
      return;
    }
    const json = (await res.json()) as { data?: ExpoTicket[] };
    const dead = tokens
      .filter((_, i) => json.data?.[i]?.details?.error === "DeviceNotRegistered")
      .map((t) => t.token);
    if (dead.length > 0) {
      await db.delete(pushTokensTable).where(inArray(pushTokensTable.token, dead));
    }
  } catch (err) {
    logger.warn({ err }, "Push delivery error");
  }
}
