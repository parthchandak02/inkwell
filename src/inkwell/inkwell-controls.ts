import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { AREAS, CITY_PRESETS, INKWELL_DEFAULTS, INKWELL_TARGETS } from "./inkwell-settings";

const live = {
  applicability: { mode: "always" },
  keyframeable: false,
  performanceReason: "Redraws one still poster in a worker; wind loads once per view and streamlines are cached.",
  performanceRole: "responsiveness",
} as const;

export const placeControls = {
  city: {
    actions: CITY_PRESETS.map((city) => ({ label: city.label, value: city.value, variant: "outline" as const })),
    applicability: { mode: "always" },
    description: "Centres the map on the city.",
    label: "Cities",
    performanceReason: "Sets two sliders at once; one wind load and redraw.",
    performanceRole: "responsiveness",
    target: INKWELL_TARGETS.cityPreset,
    type: "actions",
  },
  latitude: { ...live, defaultValue: INKWELL_DEFAULTS.latitude, description: "Centre of the map; north is positive.", label: "Latitude", max: 80, min: -80, sliderValueKind: "continuous", step: 0.01, target: INKWELL_TARGETS.latitude, type: "slider", unit: "°" },
  longitude: { ...live, defaultValue: INKWELL_DEFAULTS.longitude, description: "Centre of the map; east is positive.", label: "Longitude", max: 180, min: -180, sliderValueKind: "continuous", step: 0.01, target: INKWELL_TARGETS.longitude, type: "slider", unit: "°" },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const windControls = {
  area: {
    ...live,
    defaultValue: INKWELL_DEFAULTS.area,
    description: "How much ground the map covers: a city, its region, or a wide weather system.",
    label: "Area",
    options: AREAS.map((area) => ({ label: area.label, value: area.value })),
    target: INKWELL_TARGETS.area,
    type: "segmented",
  },
  hour: { ...live, defaultValue: INKWELL_DEFAULTS.hour, description: "Hours ahead in the forecast; 0 is the current hour.", label: "Hours ahead", max: 23, min: 0, sliderValueKind: "discrete", step: 1, target: INKWELL_TARGETS.hour, type: "slider", unit: "h", variant: "discrete" },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const inkControls = {
  color: { ...live, defaultValue: INKWELL_DEFAULTS.ink, label: "Ink color", target: INKWELL_TARGETS.ink, type: "color" },
  spacing: { ...live, defaultValue: INKWELL_DEFAULTS.spacing, description: "Distance between brush lines; smaller draws more lines.", label: "Line spacing", max: 60, min: 10, sliderValueKind: "continuous", step: 1, target: INKWELL_TARGETS.spacing, type: "slider", unit: "px" },
  brush: { ...live, defaultValue: INKWELL_DEFAULTS.brush, description: "Brush width; lines also thicken where the wind is stronger.", label: "Brush", max: 3, min: 0.4, sliderValueKind: "continuous", step: 0.1, target: INKWELL_TARGETS.brush, type: "slider", unit: "×" },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const backgroundControls = {
  include: { ...live, defaultValue: true, label: "Background", target: INKWELL_TARGETS.includeBackground, type: "switch" },
  color: { ...live, defaultValue: INKWELL_DEFAULTS.background, label: "Background color", target: INKWELL_TARGETS.background, type: "color" },
} as const satisfies Record<string, ToolcraftControlSchema>;
