"use client";

import * as React from "react";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime";
import { useToolcraft, useToolcraftValue } from "@/toolcraft/runtime/react";

import {
  createInkSimulation,
  inkColorFromSettings,
  type InkSettings,
} from "./ink-simulation";
import { InkwellChrome } from "./inkwell-chrome";
import {
  FALLBACK_WIND,
  fetchWindSnapshot,
  WIND_POLL_MS,
  type WindSnapshot,
} from "./wind-data";

const TOUCH_GUARD_MS = 300;

function getRenderScale(values: Record<string, unknown>): number {
  const value = Number(values["canvas.renderScale"]);
  return Number.isFinite(value) ? Math.min(2, Math.max(1, value)) : 2;
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export type InkwellProductHandle = {
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
};

type InkwellProductProps = {
  onReady?: (handle: InkwellProductHandle) => void;
};

export function InkwellProduct({ onReady }: InkwellProductProps): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const hue = Number(useToolcraftValue("ink.hue") ?? 220);
  const saturation = Number(useToolcraftValue("ink.saturation") ?? 68);
  const viscosity = Number(useToolcraftValue("ink.viscosity") ?? 90);
  const gravity = Number(useToolcraftValue("ink.gravity") ?? 0.45);
  const particleSize = Number(useToolcraftValue("ink.particleSize") ?? 8);
  const flowStrength = Number(useToolcraftValue("ink.flowStrength") ?? 1.4);
  const particleCount = Number(useToolcraftValue("ink.particleCount") ?? 180);
  const productBackground = String(useToolcraftValue("scene.background") ?? "#f5f0e6");
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const reducedMotion = useReducedMotion();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const simulationRef = React.useRef(createInkSimulation());
  const frameRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number | null>(null);
  const pointerRef = React.useRef({ active: false, x: 0, y: 0 });
  const lastTouchRef = React.useRef(0);
  const viewportPausedRef = React.useRef(false);
  const warmedRef = React.useRef(false);
  const [pointerPreview, setPointerPreview] = React.useState<{
    active: boolean;
    x: number;
    y: number;
  }>({ active: false, x: 0, y: 0 });

  const [wind, setWind] = React.useState<WindSnapshot>(() => ({
    ...FALLBACK_WIND,
    fetchedAt: Date.now(),
  }));

  const settings = React.useMemo<InkSettings>(
    () => ({
      flowStrength,
      gravity,
      hue,
      maxParticles: particleCount,
      particleSize,
      saturation,
      viscosity,
      wind,
    }),
    [flowStrength, gravity, hue, particleCount, particleSize, saturation, viscosity, wind],
  );

  // Fit the whole output frame into the visible window, left of the controls panel when
  // there is room, so the wind readout in the top-left corner is never cut off
  const frameWidth = state.canvas.size.width;
  const frameHeight = state.canvas.size.height;
  React.useEffect(() => {
    const fit = (): void => {
      const viewport = containerRef.current?.closest<HTMLElement>("[data-slot='toolcraft-runtime-canvas']");
      if (!viewport || !frameWidth || !frameHeight) return;
      const r = viewport.getBoundingClientRect();
      const left = Math.max(r.left, 0);
      const top = Math.max(r.top, 0);
      let right = Math.min(r.right, window.innerWidth);
      const bottom = Math.min(r.bottom, window.innerHeight);
      const panel = document.querySelector<HTMLElement>("[data-slot='toolcraft-runtime-panel-host']");
      const panelLeft = panel?.getBoundingClientRect().left ?? right;
      if (panelLeft < right && panelLeft - left > 600) right = panelLeft - 12;
      const visW = right - left;
      const visH = bottom - top;
      if (visW <= 0 || visH <= 0) return;
      const zoom = Math.max(25, Math.min(100, Math.floor(Math.min(visW / frameWidth, visH / frameHeight) * 100)));
      dispatch({
        type: "canvas.setViewport",
        offset: { x: left + visW / 2 - (r.left + r.width / 2), y: top + visH / 2 - (r.top + r.height / 2) },
        zoom,
      });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [dispatch, frameWidth, frameHeight]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      const snapshot = await fetchWindSnapshot();
      if (!cancelled) {
        setWind(snapshot);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, WIND_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return undefined;
    }

    const resize = (): void => {
      // Layout size of the output frame, unaffected by the viewport zoom transform
      const rect = { width: container.clientWidth, height: container.clientHeight };
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * (getRenderScale(state.values) / 2);
      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
      simulationRef.current.resize(rect.width, rect.height, pixelRatio);

      if (!warmedRef.current && rect.width > 0 && rect.height > 0) {
        simulationRef.current.warmup(settings);
        warmedRef.current = true;
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [settings, state.values]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const pauseViewport = (): void => {
      viewportPausedRef.current = true;
      window.setTimeout(() => {
        viewportPausedRef.current = false;
      }, 180);
    };

    container.addEventListener("wheel", pauseViewport, { passive: true });
    return () => container.removeEventListener("wheel", pauseViewport);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const drawFrame = (timestamp: number): void => {
      const last = lastFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - last) / 1000);
      lastFrameRef.current = timestamp;

      if (!viewportPausedRef.current && !reducedMotion) {
        simulationRef.current.update(deltaSeconds, settings);

        if (pointerRef.current.active) {
          simulationRef.current.spawnAt(
            pointerRef.current.x,
            pointerRef.current.y,
            settings,
            2,
          );
        }
      }

      const context = canvas.getContext("2d");
      if (context) {
        simulationRef.current.draw(context, settings, includeBackground, productBackground);
      }

      frameRef.current = window.requestAnimationFrame(drawFrame);
    };

    frameRef.current = window.requestAnimationFrame(drawFrame);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [includeBackground, productBackground, reducedMotion, settings]);

  const mapClientToCanvas = React.useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    // The frame may be zoomed to fit the window; convert screen pixels to canvas units
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / (canvas.clientWidth || rect.width) || 1;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, []);

  const beginPointer = (clientX: number, clientY: number): void => {
    const now = Date.now();
    if (now - lastTouchRef.current < TOUCH_GUARD_MS) {
      return;
    }
    lastTouchRef.current = now;

    const point = mapClientToCanvas(clientX, clientY);
    pointerRef.current = { active: true, x: point.x, y: point.y };
    setPointerPreview({ active: true, x: point.x, y: point.y });
    simulationRef.current.spawnAt(point.x, point.y, settings, 4);
  };

  const movePointer = (clientX: number, clientY: number): void => {
    if (!pointerRef.current.active) {
      return;
    }

    const point = mapClientToCanvas(clientX, clientY);
    pointerRef.current = { active: true, x: point.x, y: point.y };
    setPointerPreview({ active: true, x: point.x, y: point.y });
  };

  const endPointer = (): void => {
    pointerRef.current.active = false;
    setPointerPreview((current) => ({ ...current, active: false }));
  };

  React.useEffect(() => {
    onReady?.({
      clear: () => {
        simulationRef.current.clear();
        simulationRef.current.warmup(settings);
      },
      getCanvas: () => canvasRef.current,
    });
  }, [onReady, settings]);

  const inkPreview = inkColorFromSettings(settings);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      data-toolcraft-product-output
      onPointerCancel={endPointer}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        beginPointer(event.clientX, event.clientY);
      }}
      onPointerLeave={endPointer}
      onPointerMove={(event) => movePointer(event.clientX, event.clientY)}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        endPointer();
      }}
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        if (!touch) {
          return;
        }
        event.preventDefault();
        beginPointer(touch.clientX, touch.clientY);
      }}
      style={{
        background: includeBackground ? productBackground : "transparent",
        cursor: pointerPreview.active ? "none" : "crosshair",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        touchAction: "none",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      <InkwellChrome wind={wind} />
      {pointerPreview.active ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10"
          style={{
            background: inkPreview,
            height: particleSize * 2,
            left: pointerPreview.x,
            opacity: 0.45,
            top: pointerPreview.y,
            width: particleSize * 2,
          }}
        />
      ) : null}
    </div>
  );
}
