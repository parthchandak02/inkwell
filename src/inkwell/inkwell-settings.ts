import type { WindView } from "./wind-data";

export const INKWELL_TARGETS = {
  area: "wind.area",
  background: "appearance.background",
  brush: "ink.brush",
  cityPreset: "place.city",
  hour: "wind.hour",
  includeBackground: "export.includeBackground",
  ink: "ink.color",
  latitude: "place.latitude",
  longitude: "place.longitude",
  spacing: "ink.spacing",
} as const;

export const AREAS = [
  { label: "City", latSpan: 0.6, value: "city" },
  { label: "Region", latSpan: 2.4, value: "region" },
  { label: "Wide", latSpan: 9, value: "wide" },
] as const;
export type AreaValue = (typeof AREAS)[number]["value"];

export const INKWELL_DEFAULTS = { area: "region" as AreaValue, background: "#F2EDE3", brush: 1.4, hour: 0, ink: "#1E1C1A", latitude: 37.77, longitude: -122.42, spacing: 22 } as const;

export const CITY_PRESETS = [
  { label: "San Francisco", latitude: 37.77, longitude: -122.42, value: "city-san-francisco" },
  { label: "Wellington", latitude: -41.29, longitude: 174.78, value: "city-wellington" },
  { label: "Chicago", latitude: 41.88, longitude: -87.63, value: "city-chicago" },
  { label: "Reykjavík", latitude: 64.15, longitude: -21.94, value: "city-reykjavik" },
  { label: "Cape Town", latitude: -33.92, longitude: 18.42, value: "city-cape-town" },
  { label: "Tokyo", latitude: 35.68, longitude: 139.69, value: "city-tokyo" },
  { label: "Mumbai", latitude: 19.08, longitude: 72.88, value: "city-mumbai" },
  { label: "Punta Arenas", latitude: -53.16, longitude: -70.91, value: "city-punta-arenas" },
] as const;

/** Map frame aspect (width / height), shared by the data grid and the drawing. */
export const MAP_ASPECT = 1224 / 888;

export type InkwellSettings = {
  area: AreaValue;
  background: string;
  brush: number;
  hour: number;
  includeBackground: boolean;
  ink: string;
  latitude: number;
  longitude: number;
  placeName: string | null;
  spacing: number;
};

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

function colorValue(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { hex?: unknown }).hex === "string") return (value as { hex: string }).hex;
  return fallback;
}

export function readInkwellSettings(values: Readonly<Record<string, unknown>>): InkwellSettings {
  const latitude = num(values[INKWELL_TARGETS.latitude], INKWELL_DEFAULTS.latitude);
  const longitude = num(values[INKWELL_TARGETS.longitude], INKWELL_DEFAULTS.longitude);
  const city = CITY_PRESETS.find((preset) => Math.abs(preset.latitude - latitude) < 0.005 && Math.abs(preset.longitude - longitude) < 0.005);
  return {
    area: AREAS.find((area) => area.value === values[INKWELL_TARGETS.area])?.value ?? INKWELL_DEFAULTS.area,
    background: colorValue(values[INKWELL_TARGETS.background], INKWELL_DEFAULTS.background),
    brush: Math.max(0.3, num(values[INKWELL_TARGETS.brush], INKWELL_DEFAULTS.brush)),
    hour: Math.max(0, Math.min(23, Math.round(num(values[INKWELL_TARGETS.hour], INKWELL_DEFAULTS.hour)))),
    includeBackground: values[INKWELL_TARGETS.includeBackground] !== false,
    ink: colorValue(values[INKWELL_TARGETS.ink], INKWELL_DEFAULTS.ink),
    latitude,
    longitude,
    placeName: city?.label ?? null,
    spacing: Math.max(8, num(values[INKWELL_TARGETS.spacing], INKWELL_DEFAULTS.spacing)),
  };
}

export function windView(settings: Pick<InkwellSettings, "area" | "latitude" | "longitude">): WindView {
  const latSpan = AREAS.find((area) => area.value === settings.area)!.latSpan;
  const lngSpan = Math.min(359, (latSpan * MAP_ASPECT) / Math.max(0.2, Math.cos((settings.latitude * Math.PI) / 180)));
  return { latitude: settings.latitude, latSpan, longitude: settings.longitude, lngSpan };
}
