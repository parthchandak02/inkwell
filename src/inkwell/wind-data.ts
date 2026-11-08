// Wind for Inkwell: Open-Meteo forecast on a 7x5 grid of points, next 24 hours, cached per view.

export const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
export const WIND_COLS = 7;
export const WIND_ROWS = 5;

export type WindView = { latitude: number; latSpan: number; longitude: number; lngSpan: number };

export type WindData = {
  /** gust[hour][point] in km/h */
  gust: number[][];
  hours: string[];
  key: string;
  source: "fallback" | "live";
  /** speed[hour][point] in km/h; points are row-major, north row first */
  speed: number[][];
  timezone: string;
  /** direction[hour][point] in degrees the wind blows FROM */
  direction: number[][];
};

export function windKey(view: WindView): string {
  return `${view.latitude.toFixed(2)},${view.longitude.toFixed(2)},${view.latSpan.toFixed(2)},${view.lngSpan.toFixed(2)}`;
}

/** Grid sample points, row-major from the north-west corner. */
export function gridPoints(view: WindView): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  for (let row = 0; row < WIND_ROWS; row += 1) {
    for (let col = 0; col < WIND_COLS; col += 1) {
      points.push({
        latitude: Math.max(-89, Math.min(89, view.latitude + view.latSpan / 2 - (view.latSpan * row) / (WIND_ROWS - 1))),
        longitude: ((view.longitude - view.lngSpan / 2 + (view.lngSpan * col) / (WIND_COLS - 1) + 540) % 360) - 180,
      });
    }
  }
  return points;
}

export function windUrl(view: WindView): string {
  const points = gridPoints(view);
  return (
    `${FORECAST_API}?latitude=${points.map((p) => p.latitude.toFixed(3)).join(",")}` +
    `&longitude=${points.map((p) => p.longitude.toFixed(3)).join(",")}` +
    "&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_hours=24&timezone=auto"
  );
}

const numbers = (values: unknown): number[] => (Array.isArray(values) ? values.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : 0)) : []);

export function parseWindResponse(json: unknown, view: WindView): WindData | null {
  const entries = Array.isArray(json) ? json : [json];
  if (entries.length !== WIND_COLS * WIND_ROWS) return null;
  const hourly = entries.map((entry) => (entry && typeof entry === "object" ? (entry as { hourly?: Record<string, unknown> }).hourly : undefined));
  if (hourly.some((series) => !series || !Array.isArray(series.time))) return null;
  const hours = (hourly[0]!.time as unknown[]).map(String);
  const byHour = (key: string) => hours.map((_, hour) => hourly.map((series) => numbers(series![key])[hour] ?? 0));
  // The centre point names the local time zone (corner points may be at sea)
  const centre = entries[Math.floor(entries.length / 2)] as { timezone?: unknown };
  return {
    direction: byHour("wind_direction_10m"),
    gust: byHour("wind_gusts_10m"),
    hours,
    key: windKey(view),
    source: "live",
    speed: byHour("wind_speed_10m"),
    timezone: typeof centre.timezone === "string" ? centre.timezone : "UTC",
  };
}

/** A smooth turning breeze used offline (and labelled as such on the poster). */
export function fallbackWind(view: WindView): WindData {
  const hours = Array.from({ length: 24 }, (_, hour) => `2026-06-21T${String(hour).padStart(2, "0")}:00`);
  const points = gridPoints(view);
  const direction = hours.map((_, hour) => points.map((p, i) => (250 + 35 * Math.sin(hour / 5 + p.latitude * 0.7 + (i % WIND_COLS) * 0.35) + 360) % 360));
  const speed = hours.map((_, hour) => points.map((p, i) => 14 + 8 * Math.sin(hour / 4 + i * 0.4) + Math.abs(p.latitude) / 10));
  return { direction, gust: speed.map((row) => row.map((value) => value * 1.5)), hours, key: windKey(view), source: "fallback", speed, timezone: "UTC" };
}

const cache = new Map<string, WindData>();
const pending = new Map<string, Promise<WindData>>();

export function getCachedWind(view: WindView): WindData | null {
  return cache.get(windKey(view)) ?? null;
}

export function loadWind(view: WindView, fetcher: typeof fetch = (...args) => fetch(...args)): Promise<WindData> {
  const key = windKey(view);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = fetcher(windUrl(view))
    .then((response) => response.json())
    .then((json) => parseWindResponse(json, view) ?? fallbackWind(view))
    .catch(() => fallbackWind(view))
    .then((data) => {
      if (cache.size > 24) cache.delete(cache.keys().next().value!);
      cache.set(key, data);
      pending.delete(key);
      return data;
    });
  pending.set(key, request);
  return request;
}

export function clearWindCache(): void {
  cache.clear();
  pending.clear();
}
