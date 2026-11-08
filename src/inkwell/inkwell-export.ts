import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { drawInkwell } from "./inkwell-draw";
import { exportPass } from "./inkwell-pipeline";
import { readInkwellSettings, windView } from "./inkwell-settings";
import { loadWind } from "./wind-data";

export const inkwellExport: ToolcraftProductExportRenderer = {
  baseFileName: "inkwell",
  async renderFrame({ context, frame, rendererPipeline, signal, state }) {
    const settings = readInkwellSettings(state.values);
    const data = await loadWind(windView(settings));
    const render = () => {
      signal.throwIfAborted();
      context.save();
      context.translate(frame.x, frame.y);
      drawInkwell(context, frame.width, frame.height, settings, data);
      context.restore();
      signal.throwIfAborted();
    };
    if (rendererPipeline) await rendererPipeline.runPass(exportPass, undefined, render);
    else render();
  },
};
