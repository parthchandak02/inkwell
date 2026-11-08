import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { assessToolcraftRenderPlan, compileToolcraftPerformanceFixturePlan } from "@/toolcraft/runtime";

import { inkwellPerformancePaths, appPerformance } from "../app/app-performance";
import { appSchema } from "../app/app-schema";
import { handleInkwellAction } from "./inkwell-actions";
import { beaufort, drawInkwell, fromName, inkFor, sampleWind, SEAL_COLOR, traceStreamlines } from "./inkwell-draw";
import { inkwellExport } from "./inkwell-export";
import { inkwellPerformanceModel } from "./inkwell-performance-model";
import { inkwellPipeline } from "./inkwell-pipeline";
import { AREAS, CITY_PRESETS, INKWELL_TARGETS, readInkwellSettings, windView } from "./inkwell-settings";
import { clearWindCache, fallbackWind, gridPoints, loadWind, parseWindResponse, WIND_COLS, WIND_ROWS, windUrl, type WindData } from "./wind-data";

type Call = unknown[];

function recordingContext(calls: Call[]): CanvasRenderingContext2D {
  let font = "10px sans-serif";
  return new Proxy({}, {
    get: (_target, key) => {
      if (key === "font") return font;
      if (key === "measureText") return (text: string) => ({ width: text.length * parseFloat(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? "10") * 0.55 });
      return (...args: unknown[]) => calls.push([key, ...args]);
    },
    set: (_target, key, value) => {
      if (key === "font") font = value;
      calls.push([key, value]);
      return true;
    },
  }) as CanvasRenderingContext2D;
}

const dataFor = (values: Record<string, unknown>): WindData => fallbackWind(windView(readInkwellSettings(values)));

function draw(values: Record<string, unknown> = {}, width = 1920, height = 1080): Call[] {
  const calls: Call[] = [];
  drawInkwell(recordingContext(calls), width, height, readInkwellSettings(values), dataFor(values));
  return calls;
}
const signature = (calls: Call[]) => createHash("sha256").update(JSON.stringify(calls)).digest("hex");
const texts = (calls: Call[]) => calls.filter((call) => call[0] === "fillText").map((call) => String(call[1]));
const DEFAULT = signature(draw());

function uniform(direction: number, speed: number): WindData {
  const n = WIND_COLS * WIND_ROWS;
  const hours = Array.from({ length: 24 }, (_, h) => `2026-11-08T${String(h).padStart(2, "0")}:00`);
  return { direction: hours.map(() => new Array(n).fill(direction)), gust: hours.map(() => new Array(n).fill(speed * 1.4)), hours, key: "u", source: "live", speed: hours.map(() => new Array(n).fill(speed)), timezone: "UTC" };
}

describe("wind", () => {
  it("asks Open-Meteo for a 7x5 grid of points", () => {
    const view = windView(readInkwellSettings({}));
    expect(gridPoints(view)).toHaveLength(WIND_COLS * WIND_ROWS);
    expect(windUrl(view)).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=[-\d.,]+&longitude=[-\d.,]+&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_hours=24/);
  });

  it("parses the multi-location response", () => {
    const view = windView(readInkwellSettings({}));
    const entry = { hourly: { time: ["2026-11-08T14:00"], wind_direction_10m: [270], wind_gusts_10m: [30], wind_speed_10m: [20] }, timezone: "America/Los_Angeles" };
    const parsed = parseWindResponse(new Array(WIND_COLS * WIND_ROWS).fill(entry), view);
    expect(parsed?.speed[0][0]).toBe(20);
    expect(parsed?.timezone).toBe("America/Los_Angeles");
    expect(parseWindResponse({}, view)).toBeNull();
  });

  it("falls back to a labelled offline sample", async () => {
    clearWindCache();
    const data = await loadWind(windView(readInkwellSettings({})), (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch);
    expect(data.source).toBe("fallback");
    expect(texts(draw()).join("")).toContain("offline sample");
  });

  it("turns a west wind into an eastward vector and names it", () => {
    const vector = sampleWind(uniform(270, 20), 0, 3, 2);
    expect(vector.u).toBeCloseTo(20, 5);
    expect(vector.v).toBeCloseTo(0, 5);
    expect(fromName(vector)).toBe("west");
    expect(beaufort(20).name).toBe("Moderate breeze");
  });

  it("traces evenly spaced streamlines along the wind", () => {
    const lines = traceStreamlines(uniform(270, 20), 0, 600, 400, 30);
    expect(lines.length).toBeGreaterThan(8);
    const line = lines[0];
    expect(Math.abs(line.points[1] - line.points[line.points.length - 1])).toBeLessThan(1e-6);
  });
});

describe("Inkwell controls", () => {
  it("inkwell control place.city", () => {
    for (const city of CITY_PRESETS) {
      const dispatch = vi.fn();
      handleInkwellAction({ action: { value: city.value }, dispatch });
      expect(dispatch.mock.calls.map(([command]) => command)).toEqual([
        expect.objectContaining({ target: INKWELL_TARGETS.latitude, value: city.latitude }),
        expect.objectContaining({ target: INKWELL_TARGETS.longitude, value: city.longitude }),
      ]);
      const values = { [INKWELL_TARGETS.latitude]: city.latitude, [INKWELL_TARGETS.longitude]: city.longitude };
      expect(texts(draw(values))).toContain(city.label);
    }
  });

  it("inkwell control place.latitude", () => {
    expect(signature(draw({ [INKWELL_TARGETS.latitude]: 10 }))).not.toBe(DEFAULT);
  });

  it("inkwell control place.longitude", () => {
    expect(signature(draw({ [INKWELL_TARGETS.longitude]: 10 }))).not.toBe(DEFAULT);
  });

  it("inkwell control wind.area", () => {
    expect(new Set(AREAS.map((area) => signature(draw({ [INKWELL_TARGETS.area]: area.value })))).size).toBe(AREAS.length);
  });

  it("inkwell control wind.hour", () => {
    expect(signature(draw({ [INKWELL_TARGETS.hour]: 6 }))).not.toBe(DEFAULT);
    expect(texts(draw({ [INKWELL_TARGETS.hour]: 6 })).join("")).toContain("in 6 h");
  });

  it("inkwell control ink.color", () => {
    const calls = draw({ [INKWELL_TARGETS.ink]: "#1F3A68" });
    expect(calls.some((call) => call[0] === "strokeStyle" && String(call[1]).startsWith("rgba(31, 58, 104"))).toBe(true);
  });

  it("inkwell control ink.spacing", () => {
    const count = (calls: Call[]) => calls.filter((call) => call[0] === "lineTo").length;
    expect(count(draw({ [INKWELL_TARGETS.spacing]: 14 }))).toBeGreaterThan(count(draw({ [INKWELL_TARGETS.spacing]: 40 })));
  });

  it("inkwell control ink.brush", () => {
    expect(signature(draw({ [INKWELL_TARGETS.brush]: 2.5 }))).not.toBe(DEFAULT);
  });
});

describe("Inkwell contracts", () => {
  it("inkwell contract appearance.background", () => {
    expect(inkFor({ background: "#F2EDE3", includeBackground: true, ink: "#1E1C1A" })).toBe("#1E1C1A");
    expect(inkFor({ background: "#14181F", includeBackground: true, ink: "#1E1C1A" })).toBe("#EFE8DA");
    expect(signature(draw({ [INKWELL_TARGETS.background]: "#14181F" }))).not.toBe(DEFAULT);
  });

  it("inkwell contract background.output", () => {
    const fullFills = (calls: Call[]) => calls.filter((call) => call[0] === "fillRect" && call[3] === 1920 && call[4] === 1080);
    expect(fullFills(draw())).toHaveLength(0);
    expect(fullFills(draw({ [INKWELL_TARGETS.includeBackground]: false }))).toHaveLength(0);
  });

  it("inkwell contract export.image.format", () => {
    const control = appSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)).find((entry) => entry.target === "export.image.format");
    expect(control?.options?.map((option) => option.value)).toEqual(["png", "jpg"]);
  });

  it("inkwell contract export.image.resolution", () => {
    const control = appSchema.panels.controls?.sections.flatMap((section) => Object.values(section.controls)).find((entry) => entry.target === "export.image.resolution");
    expect(control?.options?.map((option) => option.value)).toEqual(["2k", "4k", "8k"]);
  });

  it("inkwell contract export.image", async () => {
    clearWindCache();
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });
    const calls: Call[] = [];
    await inkwellExport.renderFrame({ context: recordingContext(calls), frame: { height: 1080, width: 1920, x: -960, y: -540 }, signal: new AbortController().signal, state: { values: {} } } as unknown as Parameters<typeof inkwellExport.renderFrame>[0]);
    vi.unstubAllGlobals();
    expect(calls[1]).toEqual(["translate", -960, -540]);
    expect(texts(calls)).toContain("San Francisco");
    expect(calls.some((call) => call[0] === "fillStyle" && call[1] === SEAL_COLOR)).toBe(true);
  });

  it("inkwell contract export.infinity", () => {
    expect(inkwellPipeline.passes.find((pass) => pass.id === "raster")?.sceneBounds?.kind).toBe("intrinsic");
  });

  it("inkwell contract canvas.size", () => {
    expect(signature(draw({}, 960, 540))).not.toBe(DEFAULT);
  });

  it("inkwell contract canvas.scale", () => {
    const raster = inkwellPipeline.passes.find((pass) => pass.id === "raster");
    expect(raster?.invalidatedBy).toContain("canvas.renderScale");
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
  });

  it("inkwell contract canvas.infinity", () => {
    expect(inkwellPipeline.interactionInvalidation.find((entry) => entry.targets.includes("canvas.infinity"))?.invalidates).toEqual([]);
  });

  it("inkwell render plan has valid derived paths and fixtures", () => {
    expect(assessToolcraftRenderPlan(appSchema, inkwellPerformanceModel).errors ?? []).toEqual([]);
    expect(inkwellPerformancePaths.length).toBe(appPerformance.scenarios.length);
    for (const path of inkwellPerformancePaths) {
      if (path.workloadDimensions.length) expect(() => compileToolcraftPerformanceFixturePlan(inkwellPerformanceModel, path)).not.toThrow();
    }
  });
});
