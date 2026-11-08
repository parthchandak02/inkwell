import { registerToolcraftRendererPipeline, type ToolcraftRendererPipelinePassContract } from "@/toolcraft/runtime";

import type { InkwellRasterClient } from "./inkwell-raster-client";
import { INKWELL_TARGETS } from "./inkwell-settings";

const productTargets = [INKWELL_TARGETS.latitude, INKWELL_TARGETS.longitude, INKWELL_TARGETS.area, INKWELL_TARGETS.hour, INKWELL_TARGETS.ink, INKWELL_TARGETS.spacing, INKWELL_TARGETS.brush, INKWELL_TARGETS.background, INKWELL_TARGETS.includeBackground];
const rasterInputs = [...productTargets, "canvas.size.width", "canvas.size.height", "canvas.renderScale", "canvas.zoom"];

export const inkwellPipeline = registerToolcraftRendererPipeline<{
  export: ToolcraftRendererPipelinePassContract<void>;
  raster: ToolcraftRendererPipelinePassContract<string | null, InkwellRasterClient, readonly ["inkwell"]>;
}>()({
  interactionInvalidation: [
    { interaction: "initial-render", invalidates: ["raster"], targets: ["canvas"] },
    { interaction: "control-drag", invalidates: ["raster"], targets: [INKWELL_TARGETS.latitude, INKWELL_TARGETS.longitude, INKWELL_TARGETS.hour, INKWELL_TARGETS.spacing, INKWELL_TARGETS.brush, "canvas.renderScale"] },
    { interaction: "control-change", invalidates: ["raster"], targets: [INKWELL_TARGETS.cityPreset, INKWELL_TARGETS.area, INKWELL_TARGETS.ink, INKWELL_TARGETS.background, INKWELL_TARGETS.includeBackground, "canvas.size.width", "canvas.size.height"] },
    { interaction: "control-change", invalidates: [], mustNotInvalidate: ["raster"], targets: ["canvas.infinity", "canvas.workspaceBackground", "export.image.format", "export.image.resolution"] },
    { interaction: "viewport-drag", invalidates: [], mustNotInvalidate: ["raster"], targets: ["canvas"] },
    { interaction: "viewport-zoom", invalidates: ["raster"], targets: ["canvas"] },
    { interaction: "export", invalidates: ["export"], mustNotInvalidate: ["raster"], targets: ["export.image"] },
  ],
  passes: [
    {
      cacheKey: ["request"],
      cost: { dimensions: ["width", "height", "scale", "zoom"], frequency: "interaction", relationship: "product" },
      id: "raster",
      inputs: rasterInputs,
      invalidatedBy: rasterInputs,
      kind: "rasterize",
      lifecycle: { cache: "retained-resource", resourceScope: "renderer" },
      output: "preview",
      quality: "retina",
      runsOn: "worker",
      sceneBounds: { kind: "intrinsic", reason: "Inkwell is a poster laid out inside its artboard; streamlines stop at the map frame and every element is positioned from the frame size, so nothing is drawn outside it." },
    },
    {
      cost: { dimensions: ["resolution"], frequency: "batch", relationship: "product" },
      id: "export",
      inputs: [...productTargets, "export.image.resolution"],
      invalidatedBy: ["export.image"],
      kind: "export",
      lifecycle: { cache: "none", resourceScope: "call" },
      output: "export",
      quality: "export",
      runsOn: "export-only",
    },
  ],
  runtimeId: "inkwell-wind-poster-v1",
});

export const rasterPass = inkwellPipeline.getPass("raster");
export const exportPass = inkwellPipeline.getPass("export");
