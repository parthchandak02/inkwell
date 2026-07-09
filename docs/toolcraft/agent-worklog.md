# Implementation Worklog

## Status

Mode: product

Inkwell is a Sumi-inspired ink particle board driven by live San Francisco wind from Open-Meteo. Users drag to release colored ink while sliders control hue, saturation, viscosity, gravity, size, flow strength, and particle count.

## Decision Trail

### Iteration 1 — Inkwell fluid board

- Request: Build the inkwell interactive fluid/ink simulation board from `brief.md` on the Toolcraft scaffold.
- Task type: App assembly, schema/controls, custom Canvas 2D renderer, export, acceptance, performance.
- User-visible result: Live wind-driven ink canvas with drag release, Sumi chrome overlays, ink controls, clear canvas, and Export PNG.
- Source/reference checked: `brief.md`, `~/projects/stellar/src/App.tsx` overlay positioning, `skyline-toolcraft` Toolcraft product wiring.
- Docs/contracts read: `docs/toolcraft/workflow.md`, `schema-reference.md`, `core/setup-export.md`, `core/runtime-boundary.md`, `renderer-technique.md`, `acceptance-testing.md`, `performance.md`.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`.
- Decision: Canvas 2D particle trails with Open-Meteo polling, Toolcraft schema controls, sticky Export PNG, and `actions` Clear Canvas handled through `onPanelAction`.
- Alternatives rejected: WebGL renderer and video export timeline because the brief targets a still Canvas 2D board without video export.
- State/output mapping: `ink.*` controls map to particle color/physics; `scene.background` and `export.includeBackground` map to rice-paper backdrop; wind API maps to particle force and chrome overlays; `panel.actions` export-png captures the live canvas buffer.
- Files changed: `src/app/app-schema.ts`, `src/app/wind-data.ts`, `src/app/ink-simulation.ts`, `src/app/inkwell-product.tsx`, `src/app/inkwell-chrome.tsx`, `src/app/inkwell-export.ts`, `src/routes/index.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `e2e/app-controls.spec.ts`.
- Verification: `npm run verify:quick`, targeted browser acceptance, browser performance checkpoint with agent-browser when available.
- Skipped checks: none for first working product delivery.
- Risks: Live Open-Meteo availability affects source label only; fallback wind keeps the board usable.

## Decisions

### Renderer

- Decision: Canvas 2D particle trails with DPR-aware `setTransform`, warm-start particles, touch guard, and viewport wheel coalescing.
- Reason: Brief requires 2D ink diffusion with variable-width trails and moderate particle counts.
- Evidence: `src/app/ink-simulation.ts`, `src/app/inkwell-product.tsx`.

### Timeline

- Decision: No timeline.
- Reason: Still autonomous ink motion with PNG export only.
- Evidence: `panels.timeline` omitted.

### Layers

- Decision: No layers.
- Reason: Single ink canvas with no layer workflow.
- Evidence: `panels.layers` omitted.

### Controls

- Decision: One Ink section for hue, saturation, viscosity, gravity, size, flow strength, particle count, and Clear Canvas; runtime Background and Image Export sections; sticky Export PNG.
- Reason: Matches brief control list and Toolcraft export contract.
- Evidence: `src/app/app-schema.ts`.

### Export

- Decision: Sticky Export PNG via `createToolcraftPngExportCanvas`, capturing the live canvas buffer.
- Reason: Brief requires current-canvas PNG export and Toolcraft mandates standard PNG helpers.
- Evidence: `src/app/inkwell-export.ts`, `src/routes/index.tsx`.

### Performance

- Decision: Canvas 2D workload scenarios for preview render, particle count drag, viscosity drag, viewport stability, and export PNG.
- Reason: Particle count and trail length are the primary workload levers.
- Evidence: `src/app/app-performance.ts`.

## Evidence

- Source reviewed: `brief.md`, Open-Meteo CORS-friendly forecast endpoint, stellar overlay placement, skyline Toolcraft product wiring.
- Contract applied: product schema controls, `canvasContent` renderer only, sticky export action, background section, image export section, acceptance and performance matrices.

## Verification

- Run: `npm run verify:final`
- Run: browser performance checkpoint after final gate, runner `agent-browser` when available
- Run: `npm run dev`

## Risks

- Risk: Very high particle counts on low-end mobile devices may still stress stroke rendering despite workload coverage.
