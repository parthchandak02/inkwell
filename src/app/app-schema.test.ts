import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the inkwell product canvas contract", () => {
    expect(appSchema.canvas.draggable).toBe(false);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.renderScale).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      zoom: true,
    });
  });

  it("exposes ink controls, background, image export, and export actions", () => {
    const titles =
      appSchema.panels.controls?.sections
        .filter((section) => section.title !== "Setup")
        .map((section) => section.title) ?? [];

    expect(titles).toEqual(["Ink", "Background", "Image Export", "Export"]);
    expect(appSchema.panels.controls?.sections.find((section) => section.title === "Ink")?.controls.inkHue).toMatchObject({
      target: "ink.hue",
      type: "slider",
    });
    expect(appSchema.panels.controls?.sections.find((section) => section.title === "Export")?.controls.exportActions).toMatchObject({
      target: "panel.actions",
      type: "panelActions",
    });
  });

  it("declares product performance workload coverage", () => {
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.scenarios.length).toBeGreaterThan(0);
    expect(appPerformance.workloadTargets).toContain("ink.particleCount");
  });
});
