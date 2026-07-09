import {
  createToolcraftPngExportCanvas,
  type ToolcraftPngRenderContext,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { createInkSimulation, type InkSettings } from "./ink-simulation";
import { FALLBACK_WIND } from "./wind-data";

function getRenderScale(state: ToolcraftState): number {
  const value = Number(state.values["canvas.renderScale"]);
  return Number.isFinite(value) ? Math.min(2, Math.max(1, value)) : 2;
}

function createSettingsFromState(state: ToolcraftState): InkSettings {
  return {
    flowStrength: Number(state.values["ink.flowStrength"] ?? 1.4),
    gravity: Number(state.values["ink.gravity"] ?? 0.45),
    hue: Number(state.values["ink.hue"] ?? 220),
    maxParticles: Number(state.values["ink.particleCount"] ?? 180),
    particleSize: Number(state.values["ink.particleSize"] ?? 8),
    saturation: Number(state.values["ink.saturation"] ?? 68),
    viscosity: Number(state.values["ink.viscosity"] ?? 90),
    wind: FALLBACK_WIND,
  };
}

function renderInkToContext(
  context: ToolcraftPngRenderContext,
  state: ToolcraftState,
): void {
  const includeBackground = Boolean(state.values["export.includeBackground"] ?? true);
  const background = String(state.values["scene.background"] ?? "#f5f0e6");
  const settings = createSettingsFromState(state);
  const simulation = createInkSimulation();

  simulation.resize(context.pixelWidth, context.pixelHeight, 1);
  simulation.warmup(settings);

  for (let step = 0; step < 24; step += 1) {
    simulation.update(1 / 30, settings);
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = context.pixelWidth;
  exportCanvas.height = context.pixelHeight;
  const exportContext = exportCanvas.getContext("2d");

  if (!exportContext) {
    return;
  }

  simulation.draw(exportContext, settings, includeBackground, background);
  context.context.drawImage(exportCanvas, 0, 0, context.pixelWidth, context.pixelHeight);
}

export async function exportInkwellPng(
  state: ToolcraftState,
  getLiveCanvas?: () => HTMLCanvasElement | null,
): Promise<Blob> {
  const includeBackground = Boolean(state.values["export.includeBackground"] ?? true);
  const background = String(state.values["scene.background"] ?? "#f5f0e6");
  const imageFormat = String(state.values["export.image.format"] ?? "png");
  const imageResolution = String(state.values["export.image.resolution"] ?? "4k");

  const exportCanvas = createToolcraftPngExportCanvas({
    background,
    devicePixelRatio: getRenderScale(state),
    includeBackground,
    render: (context) => {
      const liveCanvas = getLiveCanvas?.();
      if (liveCanvas) {
        context.context.drawImage(liveCanvas, 0, 0, context.pixelWidth, context.pixelHeight);
        return;
      }

      renderInkToContext(context, state);
    },
    resolution: imageResolution,
    state,
  });

  const mimeType = imageFormat === "jpg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => {
    exportCanvas.toBlob(resolve, mimeType, imageFormat === "jpg" ? 0.92 : undefined);
  });

  if (!blob) {
    throw new Error("PNG export failed.");
  }

  return blob;
}
