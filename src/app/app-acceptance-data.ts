import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema } from "./app-schema";
import { inkwellReadiness, inkwellSectionInventory } from "../inkwell/inkwell-inventory";
import { AREAS, CITY_PRESETS, INKWELL_TARGETS } from "../inkwell/inkwell-settings";

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = inkwellReadiness;

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = inkwellSectionInventory;

type Budget = "extended-io" | "standard";
const browser = (testName: string, file: `e2e/${string}.spec.ts`, budget: Budget = "standard") => ({ budget, file, testName });

const domainFile = (id: string) => `e2e/product-inkwell-${id.split(".")[0]}.spec.ts` as const;

const sliderRow = (id: string, target: string, label: string, observable: string, interactionId: string): ToolcraftComponentAcceptance => ({
  automated: true,
  automatedTestName: `inkwell control ${target}`,
  browser: browser(`browser: inkwell control ${target}`, domainFile(id)),
  componentType: "slider",
  evidence: "product-output",
  expectedObservable: observable,
  fixture: "Default San Francisco with stubbed Open-Meteo wind",
  id,
  interactionId,
  kind: "control",
  target,
  userAction: `Drag the ${label} slider.`,
});

const actionRow = (id: string, target: string, values: readonly string[], observable: string, interactionId: string): ToolcraftComponentAcceptance => ({
  actionCoverage: values,
  automated: true,
  automatedTestName: `inkwell control ${target}`,
  browser: browser(`browser: inkwell control ${target}`, domainFile(id)),
  componentType: "actions",
  evidence: "product-output",
  expectedObservable: observable,
  fixture: "Default San Francisco with stubbed Open-Meteo wind",
  id,
  interactionId,
  kind: "control",
  target,
  userAction: "Click every button.",
});

const runtimeRow = (id: string, target: string, evidence: ToolcraftComponentAcceptance["evidence"], testName: string, file: `e2e/${string}.spec.ts`, budget: Budget = "standard"): ToolcraftComponentAcceptance => ({
  automated: true,
  automatedTestName: `inkwell contract ${id}`,
  browser: browser(testName, file, budget),
  componentType: id,
  evidence,
  expectedObservable: `The real product output and runtime workspace implement ${id}.`,
  fixture: "Default settings and real Toolcraft controls",
  id,
  kind: "runtime",
  target,
  userAction: `Exercise ${id} through its visible controls.`,
});

const exportTest = "browser: inkwell image export delivers every format and size";

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  actionRow("place.city", INKWELL_TARGETS.cityPreset, CITY_PRESETS.map((city) => city.value), "Each city recentres the map, names it and redraws its own wind.", "city-command"),
  sliderRow("place.latitude", INKWELL_TARGETS.latitude, "Latitude", "The map recentres: new wind loads and the lines and figures change.", "latitude-property"),
  sliderRow("place.longitude", INKWELL_TARGETS.longitude, "Longitude", "The map recentres: new wind loads and the poster changes.", "longitude-property"),
  {
    ...sliderRow("wind.area", INKWELL_TARGETS.area, "Area", "Each area samples the wind over a different span, so the lines change.", "area-property"),
    componentType: "segmented",
    optionCoverage: AREAS.map((area) => area.value),
    userAction: "Choose every Area option.",
  },
  sliderRow("wind.hour", INKWELL_TARGETS.hour, "Hours ahead", "The lines, speed, direction and highlighted hour change to that forecast hour.", "hour-property"),
  {
    ...sliderRow("ink.color", INKWELL_TARGETS.ink, "Ink color", "Every brush line and figure takes the new ink colour.", "ink-property"),
    componentType: "color",
    userAction: "Enter a new ink colour.",
  },
  sliderRow("ink.spacing", INKWELL_TARGETS.spacing, "Line spacing", "Lines get denser or sparser.", "spacing-property"),
  sliderRow("ink.brush", INKWELL_TARGETS.brush, "Brush", "Every line gets thicker or thinner.", "brush-property"),
  {
    ...runtimeRow("appearance.background", INKWELL_TARGETS.background, "product-output", "browser: inkwell background color changes output", "e2e/product-inkwell-appearance.spec.ts"),
    componentType: "color",
    interactionId: "background-color-property",
    kind: "control",
  },
  {
    ...runtimeRow("background.output", INKWELL_TARGETS.includeBackground, "product-output", "browser: inkwell background output follows runtime semantics", "e2e/product-inkwell-background.spec.ts"),
    backgroundOutputCoverage: "all-required-background-output",
    componentType: "switch",
    interactionId: "background-include-property",
    kind: "control",
  },
  ...(["format", "resolution"] as const).map(
    (key): ToolcraftComponentAcceptance => ({
      ...runtimeRow(`export.image.${key}`, `export.image.${key}`, "exported-bytes", exportTest, "e2e/product-inkwell-export.spec.ts", "extended-io"),
      componentType: "select",
      kind: "control",
      optionCoverage: key === "format" ? ["png", "jpg"] : ["2k", "4k", "8k"],
    }),
  ),
  {
    ...runtimeRow("export.image", "actions.output", "exported-bytes", exportTest, "e2e/product-inkwell-export.spec.ts", "extended-io"),
    actionCoverage: ["export.png"],
    componentType: "panelActions",
    kind: "control",
    exportArtifactCoverage: "all-required-image-export-behavior",
  },
  {
    ...runtimeRow("export.infinity", "actions.output", "exported-bytes", exportTest, "e2e/product-inkwell-export.spec.ts", "extended-io"),
    infinityCanvasCoverage: "scene-bounds-image-export",
  },
  {
    ...runtimeRow("canvas.size", "canvas.size.width", "product-output", "browser: inkwell canvas sizing changes output", "e2e/product-inkwell-canvas.spec.ts"),
  },
  {
    ...runtimeRow("canvas.scale", "canvas.renderScale", "product-output", "browser: inkwell backing preserves selected render scale", "e2e/product-inkwell-canvas.spec.ts"),
    renderScaleCoverage: { kind: "selected-backing-pixels", states: ["interaction", "steady"] },
  },
  {
    ...runtimeRow("canvas.infinity", "canvas.infinity", "viewport-side-effect", "browser: inkwell infinity preserves scene and viewport", "e2e/product-inkwell-canvas.spec.ts"),
    infinityCanvasCoverage: "mode-continuity-and-restoration",
  },
  {
    automated: true,
    automatedTestName: "declares production reload coverage for the starter schema",
    browser: {
      budget: "extended-io",
      file: "e2e/product-inkwell-persistence.spec.ts",
      testName: "browser: inkwell restores poster and workspace after reload",
    },
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable: "Canvas size, zoom, the chosen city and the moved, collapsed Controls panel are restored after a real reload, and the poster matches its pre-reload pixels.",
    fixture: "Inkwell persisted workspace",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices: appSchema.persistence.storage === "localStorage" ? appSchema.persistence.include : [],
    target: "canvas.size.width",
    userAction: "Change Canvas width, pick Wellington, zoom in, move and collapse Controls, wait for persistence, and reload the page.",
  },
];
