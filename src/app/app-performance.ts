import { defineToolcraftPerformance, deriveToolcraftPerformancePaths, type ToolcraftPerformanceScenario } from "@/toolcraft/runtime";

import { inkwellPerformanceModel } from "../inkwell/inkwell-performance-model";
import { appSchema } from "./app-schema";

export const inkwellPerformancePaths = deriveToolcraftPerformancePaths(appSchema, inkwellPerformanceModel);

export const appPerformance = defineToolcraftPerformance({
  ...inkwellPerformanceModel,
  scenarios: inkwellPerformancePaths.map(
    (path, index): ToolcraftPerformanceScenario =>
      ({
        automated: true,
        automatedTestName: "inkwell render plan has valid derived paths and fixtures",
        browser: true,
        browserTestName: `browser perf: toolcraft path ${path.id}`,
        coversTargets: path.targets,
        expectedObservable: "The wind poster, viewport or decoded artifact reflects the exact applied operation.",
        fixture: "Compiled reachable inkwell workload",
        id: `inkwell-path-${index}`,
        interaction: path.interaction,
        pathId: path.id,
        uiSelector: '[data-testid="inkwell-output"]',
        ...(path.interaction === "export" ? { actionValue: "export.png", completionEvidence: "download" as const, controlLabel: "Export PNG" } : {}),
      }) as ToolcraftPerformanceScenario,
  ),
});
