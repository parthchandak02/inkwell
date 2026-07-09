import * as React from "react";

import { ToolcraftApp, type ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import { exportInkwellPng } from "../app/inkwell-export";
import { InkwellProduct, type InkwellProductHandle } from "../app/inkwell-product";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AppHome(): React.JSX.Element {
  const productRef = React.useRef<InkwellProductHandle | null>(null);

  const handlePanelAction: ToolcraftPanelActionHandler = async ({
    action,
    reportProgress,
    state,
  }) => {
    if (action.value === "clear-canvas") {
      productRef.current?.clear();
      return;
    }

    if (action.value === "export-png") {
      reportProgress?.(0.1);
      const blob = await exportInkwellPng(state, () => productRef.current?.getCanvas() ?? null);
      reportProgress?.(0.85);
      const format = String(state.values["export.image.format"] ?? "png");
      downloadBlob(blob, `inkwell.${format}`);
      reportProgress?.(1);
    }
  };

  return (
    <ToolcraftApp
      canvasContent={
        <InkwellProduct
          onReady={(handle) => {
            productRef.current = handle;
          }}
        />
      }
      className="h-dvh min-h-dvh"
      onPanelAction={handlePanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
