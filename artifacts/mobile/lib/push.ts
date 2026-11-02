import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "@workspace/api-client-react";

const PUSH_TOKEN_KEY = "pushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function platform(): "ios" | "android" | "web" | "unknown" {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") return Platform.OS;
  return "unknown";
}

/**
 * Asks for permission, fetches the Expo push token and registers it with the
 * API. Returns null when push is unavailable (web, simulator, denied, or no
 * EAS project id yet).
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "NightMap",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF4E62",
      });
    }
    const projectId: string | undefined =
      Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await registerPushToken({ token, platform: platform() });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await unregisterPushToken({ token }).catch(() => {});
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Route carried in a notification's data payload, if any. */
export function routeFromNotification(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as { route?: unknown } | undefined;
  return typeof data?.route === "string" && data.route.startsWith("/") ? data.route : null;
}
