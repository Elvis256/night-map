import { CITY_COORDS } from "./geo";
import { HttpError } from "./errors";

interface WeatherResult {
  city: string;
  temperatureC: number;
  weatherCode: number;
  label: string;
  icon: string;
  tip: string;
  fetchedAt: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { value: WeatherResult; at: number }>();

function describe(code: number, isNight: boolean): { label: string; icon: string; tip: string } {
  if (code === 0) return { label: "Clear", icon: isNight ? "🌙" : "☀️", tip: "Perfect night for rooftops and open-air venues" };
  if (code <= 2) return { label: "Partly cloudy", icon: "⛅", tip: "Good evening for rooftop bars" };
  if (code === 3) return { label: "Overcast", icon: "☁️", tip: "Nice evening ahead, keep a light jacket" };
  if (code <= 48) return { label: "Foggy", icon: "🌫️", tip: "Low visibility on the roads, plan transport early" };
  if (code <= 57) return { label: "Light drizzle", icon: "🌦️", tip: "Indoor venues recommended tonight" };
  if (code <= 67) return { label: "Rain", icon: "🌧️", tip: "Stay indoors, great night for dinner" };
  if (code <= 77) return { label: "Snow", icon: "🌨️", tip: "Bundle up" };
  if (code <= 82) return { label: "Scattered showers", icon: "🌦️", tip: "Indoor venues recommended tonight" };
  return { label: "Thunderstorms", icon: "⛈️", tip: "Stay indoors and keep your phone charged" };
}

export async function getWeather(city: string): Promise<WeatherResult> {
  const coords = CITY_COORDS[city];
  if (!coords) throw new HttpError(404, "Unsupported city", "unknown_city");
  const cached = cache.get(city);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(coords.lat));
  url.searchParams.set("longitude", String(coords.lng));
  url.searchParams.set("current", "temperature_2m,weather_code,is_day");
  url.searchParams.set("timezone", "auto");

  let data: { current?: { temperature_2m?: number; weather_code?: number; is_day?: number } };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    data = (await res.json()) as typeof data;
  } catch (err) {
    if (cached) return cached.value;
    throw new HttpError(503, "Weather service unavailable", "weather_unavailable");
  }
  const current = data.current ?? {};
  const code = current.weather_code ?? 1;
  const temp = current.temperature_2m ?? 24;
  const d = describe(code, current.is_day === 0);
  const value: WeatherResult = {
    city,
    temperatureC: temp,
    weatherCode: code,
    label: `${d.label} · ${Math.round(temp)}°C`,
    icon: d.icon,
    tip: d.tip,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(city, { value, at: Date.now() });
  return value;
}
