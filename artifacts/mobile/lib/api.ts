import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { ApiError, setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

export const AUTH_TOKEN_KEY = "authToken";
export const ONBOARDED_KEY = "onboarded";
const DEFAULT_API_PORT = 5000;

/**
 * Where the API lives:
 *  - EXPO_PUBLIC_API_URL when set explicitly
 *  - the Replit domain (API is routed under /api on the same host)
 *  - otherwise the Metro host on port 5000 (local development)
 */
export function resolveApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
  }
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? "";
  const host = hostUri.split(":")[0] || "localhost";
  return `http://${host}:${DEFAULT_API_PORT}`;
}

export const API_BASE = resolveApiBase();

let configured = false;
export function configureApi(): void {
  if (configured) return;
  configured = true;
  setBaseUrl(API_BASE);
  setAuthTokenGetter(() => AsyncStorage.getItem(AUTH_TOKEN_KEY));
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    const data = err.data as { message?: string } | null;
    if (data?.message) return data.message;
    if (err.status === 401) return "Please sign in again.";
    return fallback;
  }
  if (err instanceof Error) {
    if (/network request failed|failed to fetch|load failed/i.test(err.message)) {
      return "Can't reach NightMap right now. Check your connection.";
    }
    return err.message || fallback;
  }
  return fallback;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

/** Reads a local file URI (from the image picker) into a base64 data string. */
export async function fileUriToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
