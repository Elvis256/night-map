export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Kampala: { lat: 0.3476, lng: 32.5825 },
  Entebbe: { lat: 0.0512, lng: 32.4637 },
  Mbarara: { lat: -0.6073, lng: 30.6573 },
  Gulu: { lat: 2.7748, lng: 32.2991 },
  Jinja: { lat: 0.4478, lng: 33.2026 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
  "Dar es Salaam": { lat: -6.7924, lng: 39.2083 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestCity(lat: number, lng: number): string {
  let best = "Kampala";
  let bestDist = Infinity;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return best;
}

export function cityCoords(city: string | null | undefined): { lat: number; lng: number } | null {
  if (!city) return null;
  return CITY_COORDS[city] ?? null;
}
