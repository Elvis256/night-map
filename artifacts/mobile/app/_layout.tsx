import {
  useDesignSystemFonts,
} from "@workspace/nightmap-design-system/hooks/use-fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { ONBOARDED_KEY, configureApi, isUnauthorized } from "@/lib/api";
import * as Notifications from "expo-notifications";
import { routeFromNotification } from "@/lib/push";

configureApi();
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  const { authStatus } = useApp();
  const segments = useSegments();
  const inAuth = segments[0] === "auth" || segments[0] === "onboarding";
  const inSetup = segments[0] === "companion-setup";

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeFromNotification(response);
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "signedOut" && !inAuth) {
      AsyncStorage.getItem(ONBOARDED_KEY).then((onboarded) => {
        router.replace(onboarded ? "/auth/login" : "/auth/register");
      });
    } else if (authStatus === "signedIn" && inAuth && !inSetup) {
      router.replace("/(tabs)");
    }
  }, [authStatus, inAuth]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="companion-setup" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="companion/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="verify" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="wallet" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="payment" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="vip" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="bookings" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="score" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="safety" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="deals" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="referral" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="radio" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="live" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { fontsLoaded, fontError } = useDesignSystemFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <RootLayoutNav />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
