export type WindSource = "live" | "fallback";

export type WindSnapshot = {
  direction: number;
  fetchedAt: number;
  source: WindSource;
  speed: number;
};

export const FALLBACK_WIND: WindSnapshot = {
  direction: 270,
  fetchedAt: Date.now(),
  source: "fallback",
  speed: 5,
};

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current_weather=true";

export const WIND_POLL_MS = 60_000;

type OpenMeteoResponse = {
  current_weather?: {
    winddirection?: number;
    windspeed?: number;
  };
};

export function windVectorFromSnapshot(snapshot: WindSnapshot): { vx: number; vy: number } {
  const radians = (snapshot.direction * Math.PI) / 180;
  return {
    vx: -Math.sin(radians) * snapshot.speed,
    vy: Math.cos(radians) * snapshot.speed,
  };
}

export function mapWindSpeedToPixelsPerSecond(speedKmh: number): number {
  const clamped = Math.max(0, Math.min(100, speedKmh));
  return (clamped / 100) * 30;
}

export function secondsSince(timestamp: number): number {
  return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
}

export async function fetchWindSnapshot(): Promise<WindSnapshot> {
  try {
    const response = await fetch(OPEN_METEO_URL);
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with ${response.status}`);
    }

    const payload = (await response.json()) as OpenMeteoResponse;
    const speed = payload.current_weather?.windspeed;
    const direction = payload.current_weather?.winddirection;

    if (!Number.isFinite(speed) || !Number.isFinite(direction)) {
      throw new Error("Open-Meteo response missing wind fields");
    }

    return {
      direction: direction!,
      fetchedAt: Date.now(),
      source: "live",
      speed: speed!,
    };
  } catch {
    return {
      ...FALLBACK_WIND,
      fetchedAt: Date.now(),
      source: "fallback",
    };
  }
}
