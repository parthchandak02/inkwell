import { getToolcraftFiniteArtboardRect } from "@/toolcraft/runtime";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { handleInkwellAction } from "../inkwell/inkwell-actions";
import { InkwellCanvas } from "../inkwell/InkwellCanvas";
import { inkwellExport } from "../inkwell/inkwell-export";
import { inkwellPipeline } from "../inkwell/inkwell-pipeline";
import { appSchema } from "./app-schema";

export const appComposition = composeToolcraftApp(appSchema, {
  actions: { onPanelAction: handleInkwellAction },
  renderer: { pipelineRegistration: inkwellPipeline },
  scene: {
    canvasContent: <InkwellCanvas />,
    rasterFrameRenderer: inkwellExport,
    renderDefaultCanvasMedia: false,
    sceneBoundsProvider: ({ state }) => [getToolcraftFiniteArtboardRect(state.canvas.size)],
  },
});
