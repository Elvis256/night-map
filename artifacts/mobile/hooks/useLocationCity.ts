import * as Location from "expo-location";
import { useState, useCallback } from "react";

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Kampala:          { lat:  0.3476, lng: 32.5825 },
  Entebbe:          { lat:  0.0512, lng: 32.4637 },
  Mbarara:          { lat: -0.6073, lng: 30.6573 },
  Gulu:             { lat:  2.7748, lng: 32.2991 },
  Jinja:            { lat:  0.4478, lng: 33.2026 },
  Nairobi:          { lat: -1.2921, lng: 36.8219 },
  "Dar es Salaam":  { lat: -6.7924, lng: 39.2083 },
  Dubai:            { lat: 25.2048, lng: 55.2708 },
};

export function nearestCity(lat: number, lng: number): string {
  let best = "Kampala";
  let bestDist = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const dLat = (coords.lat - lat) * (Math.PI / 180);
    const dLng = (coords.lng - lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * (Math.PI / 180)) *
        Math.cos(coords.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < bestDist) { bestDist = dist; best = city; }
  }
  return best;
}

type Status = "idle" | "detecting" | "done" | "denied" | "error";

export function useLocationCity(onDetected: (city: string) => void) {
  const [status, setStatus] = useState<Status>("idle");

  const detect = useCallback(async () => {
    setStatus("detecting");
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
      onDetected(city);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [onDetected]);

  return { detect, status };
}
