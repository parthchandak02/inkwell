import type { ToolcraftControlSectionInventoryEntry, ToolcraftProductReadiness } from "../app/acceptance/types";
import { INKWELL_TARGETS } from "./inkwell-settings";

export const inkwellSectionInventory = [
  {
    entity: "Output background", entityId: "background",
    finiteSelectors: [{ reason: "Shows or hides the background fill and PNG alpha; the color stays editable either way.", role: "parameter", target: INKWELL_TARGETS.includeBackground }],
    groupingReason: "One output background; runtime relocates this source pair into Settings.",
    id: "runtime.setup", targets: [INKWELL_TARGETS.includeBackground, INKWELL_TARGETS.background], title: "Settings",
  },
  {
    entity: "Map centre", entityId: "place", finiteSelectors: [],
    groupingReason: "Cities, latitude and longitude choose where the wind is read; cities only set the two sliders.",
    id: "place", targets: [INKWELL_TARGETS.cityPreset, INKWELL_TARGETS.latitude, INKWELL_TARGETS.longitude], title: "Place",
  },
  {
    entity: "Wind field", entityId: "wind",
    finiteSelectors: [
      { reason: "Chooses how much ground the wind field covers; every other control stays relevant.", role: "parameter", target: INKWELL_TARGETS.area },
      { reason: "Chooses which forecast hour is drawn; every other control stays relevant.", role: "parameter", target: INKWELL_TARGETS.hour },
    ],
    groupingReason: "Area and forecast hour choose which wind field is drawn.",
    id: "wind", targets: [INKWELL_TARGETS.area, INKWELL_TARGETS.hour], title: "Wind",
  },
  {
    entity: "Brush lines", entityId: "ink", finiteSelectors: [],
    groupingReason: "Ink colour, line spacing and brush width style the same streamlines.",
    id: "ink", targets: [INKWELL_TARGETS.ink, INKWELL_TARGETS.spacing, INKWELL_TARGETS.brush], title: "Ink",
  },
  {
    entity: "Raster image output", entityId: "image-export",
    finiteSelectors: [
      { reason: "Selects PNG alpha support or opaque JPEG encoding.", role: "parameter", target: "export.image.format" },
      { reason: "Selects the output long-edge pixel size.", role: "parameter", target: "export.image.resolution" },
    ],
    groupingReason: "Runtime-owned image format and resolution govern one exported artifact.",
    id: "runtime.image-export", targets: ["export.image.format", "export.image.resolution"], title: "Image Export",
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];

const edit = (id: string, target: string, detail: string) => ({
  alternative: { reason: "Persistent value controls on the poster would cover it.", surface: "canvas" as const },
  capability: "property-edit" as const, evidence: { detail, source: "usability-analysis" as const }, id,
  reason: "A global setting of the whole poster with no spatial handle.", selectionScope: { mode: "global" as const }, surface: "panel" as const, target,
});

export const inkwellReadiness: ToolcraftProductReadiness = {
  exportIntent: { image: { mode: "toolcraft-default" }, svg: { mode: "not-requested" }, video: { mode: "not-requested" } },
  interactionOwnership: [
    edit("latitude-property", INKWELL_TARGETS.latitude, "Latitude is the centre of the whole map."),
    edit("longitude-property", INKWELL_TARGETS.longitude, "Longitude is the centre of the whole map."),
    edit("area-property", INKWELL_TARGETS.area, "Area applies to the whole field."),
    edit("hour-property", INKWELL_TARGETS.hour, "The forecast hour applies to the whole field and figures."),
    edit("ink-property", INKWELL_TARGETS.ink, "The ink colour applies to every line."),
    edit("spacing-property", INKWELL_TARGETS.spacing, "Line spacing applies to the whole field."),
    edit("brush-property", INKWELL_TARGETS.brush, "Brush width applies to every line."),
    edit("background-color-property", INKWELL_TARGETS.background, "Runtime places the background color in Settings."),
    edit("background-include-property", INKWELL_TARGETS.includeBackground, "Runtime places the Background switch in Settings."),
    {
      alternative: { reason: "A shortcut command has no position on the poster.", surface: "canvas" },
      capability: "command", evidence: { detail: "City buttons set latitude and longitude.", source: "usability-analysis" },
      id: "city-command", reason: "Shortcuts sit beside the sliders they set.", surface: "panel", target: INKWELL_TARGETS.cityPreset,
    },
  ],
  mode: "product",
  productName: "Inkwell",
  productSummary: "A wind map in ink: evenly spaced brush streamlines follow the live Open-Meteo wind field around a place, thickening where it blows harder, with speed, direction, Beaufort force, gusts and the next 24 hours.",
  requestedBehavior: "Rebuild Inkwell on the current Toolcraft with a much better design: choose a place (sliders or cities), an area and a forecast hour, style the ink, see the wind drawn as brush lines on a poster, and export it as an image.",
  viewInteraction: { mode: "non-spatial", reason: "The output is a two-dimensional poster, not a three-dimensional scene." },
};
