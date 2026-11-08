# Toolcraft App Agent Worklog

## Status

Mode: product

Inkwell is a wind map in ink: evenly spaced brush streamlines follow the live wind field around a place and thicken where it blows harder, beside the wind speed, the direction it comes from, the Beaufort force, gusts and the next 24 hours at the centre. Detailed requests and results belong in `docs/agent-journal/changes`; command attempts live in `.toolcraft/journal/runs`.

Active change: inkwell-rebuild-0026

## Decision Trail

### Change inkwell-rebuild-0026 — Rebuild Inkwell on Toolcraft 0.0.26 with a new design

- Change ID: inkwell-rebuild-0026
- Request: "Yes do it for those and all others to make it consistent and the sites are too old and not well designed so we want to avoid that in the future make it much better ok?" The user then chose: all seven Toolcraft apps; each keeps its own look; rethink freely; no check-ins.
- Task type: Generated app porting plus substantial product redesign (renderer, data, controls, export).
- User-visible result: Instead of dragging blots of ink that drift with one point's wind, Inkwell now draws the whole wind field: a 7x5 grid of forecast points around a place, interpolated and traced into brush streamlines that taper at both ends and thicken with speed. A serif title, local time, a large speed with its compass direction, Beaufort force and gusts, a 24-hour strip with downwind ticks, and a vermilion seal complete the poster.
- Source/reference checked: The previous Inkwell (github.com/parthchandak02/inkwell, local folder inkwell-toolcraft, Toolcraft template from July 2026); the Open-Meteo forecast API with multiple coordinates; the Sol, Aria and Contour rebuilds on 0.0.26 for wiring.
- Reference inputs: None (no motion, video, Figma or screenshot reference).
- Docs/contracts read: AGENTS.md, workflow.md, core/runtime-boundary.md, assembly-workflow.md, core/control-selection.md, core/layout.md, core/performance.md, core/setup-export.md, core/media-upload.md, core/development-files.md, core/app-cover.md, core/slider-ranges.md, decision-contract.md, schema-reference.md, component-rules.md, renderer-technique.md, performance.md, acceptance-testing.md (read for the Sol rebuild in the same session on the same 0.0.26 contract).
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, canvas-surface-preserved, infinity-canvas-scene-bounds (intrinsic poster bounds), output-export-required (image only), controls-section-inventory-required, acceptance-product-observable, persistence-policy-explicit (default local persistence), discrete slider markers for Hours ahead.
- View interaction intent: non-spatial; a flat poster.
- Interaction ownership: panel only; latitude, longitude, area, hour, ink, spacing, brush and background are global property edits, cities are panel commands.
- Decision: Replace the drawing toy with a still wind poster; fetch 35 forecast points in one request; interpolate wind vectors bilinearly; trace evenly spaced streamlines with an occupancy grid and midpoint integration; batch segments into ten width paths; cache per view, hour, spacing and frame size; read the local time zone from the centre point.
- Alternatives rejected: Keeping freehand ink blots (one point of wind cannot show a field); animated particles (needs autonomous-animation proof and adds nothing to a still export); per-segment strokes (tens of thousands of stroke calls).
- State/output mapping: `place.latitude`, `place.longitude` and `wind.area` choose the grid and trigger a cached load; `place.city` sets both sliders; `wind.hour` picks the forecast hour for lines, figures and the highlighted bar; `ink.color`, `ink.spacing` and `ink.brush` style the lines (dark ink flips to paper-light on dark backgrounds); `appearance.background` sets the runtime background; `export.includeBackground` removes the runtime fill; `canvas.size.*`, `canvas.renderScale` and `canvas.zoom` set the worker raster backing; the runtime image export calls the same `drawInkwell` after loading the same wind.
- Verification: Unit tests in `src/inkwell/inkwell.test.ts` (23 passed: request shape, multi-location parsing, offline fallback, vector maths and compass names, streamline tracing, every control). 16 product browser specs passed with a deterministic Open-Meteo stub. Agent screenshots of San Francisco and Punta Arenas with live data inspected. The first-delivery gate result is recorded by its protected receipt.
- Risks: See Risks.

## Decisions

### Renderer

- Decision: Canvas 2D in a worker through one `raster` pipeline pass; export reuses `drawInkwell`.
- Reason: A few hundred streamlines batched into ten paths plus text; one drawing function keeps preview and export identical.
- Evidence: `src/inkwell/inkwell-pipeline.ts`, `src/inkwell/InkwellCanvas.tsx`, `src/inkwell/inkwell-export.ts`; `browser: inkwell backing preserves selected render scale`.

### View Interaction

- Decision: Mode `non-spatial`.
- Reason: The poster is flat.
- Evidence: `src/inkwell/inkwell-inventory.ts`.

### Interaction Ownership

- Decision: Panel only, ten entries.
- Reason: Every input is a global value or shortcut.
- Evidence: `src/inkwell/inkwell-inventory.ts` `interactionOwnership`.

### Timeline

- Decision: No timeline.
- Reason: A still poster; the forecast hour is a slider, not playback, and video was not requested.
- Evidence: No timeline module; `animationIntent: none`.

### Layers

- Decision: No layers.
- Reason: No layer workflow was requested.
- Evidence: No layers module.

### Controls

- Decision: Settings (runtime background), Place (Cities, Latitude, Longitude), Wind (Area, Hours ahead), Ink (Ink color, Line spacing, Brush), Image Export (runtime).
- Reason: Where and when the wind is read, and how the ink looks, are three separate choices.
- Evidence: `src/inkwell/inkwell-controls.ts`, `appControlSectionInventory`; browser specs click every city, choose every area and drag every slider while held.

### Export

- Decision: Image export only (PNG/JPG, 2K/4K/8K) via `imageExportModule()` and `scene.rasterFrameRenderer`.
- Reason: Toolcraft default; SVG and video were not requested.
- Evidence: `browser: inkwell image export delivers every format and size` decodes every format and size and checks the seal colour and content bounds.

### Performance

- Decision: Workload envelope from runtime state (canvas width/height, render scale, zoom) plus export resolution; derived paths; adapters stub the API.
- Reason: Line spacing has a 10 px floor that caps the line count, and streamlines are cached, so cost follows the backing size.
- Evidence: `src/inkwell/inkwell-performance-model.ts`; `inkwell render plan has valid derived paths and fixtures`. First delivery runs no measured performance by contract.

Canonical control values and selected-entity isolation follow runtime representations; render scale has functional `renderScaleCoverage` with backing-pixel proof.

## Evidence

- Source reviewed: previous Inkwell, Open-Meteo multi-location forecast, earlier 0.0.26 rebuilds.
- Contract applied: product modules under `src/inkwell`, registered browser scenarios in `e2e/product-inkwell-*.spec.ts`, cover at `public/toolcraft/cover.png` with `app-cover.json` and `app-cover-state.json`.

## Verification

Protected receipts own initial proof. Development checks: `src/inkwell/inkwell.test.ts` 23 passed; 16 product browser specs passed (two Playwright workers on the dev server); screenshots inspected. Cover captured with the app's own Export PNG at 4K.

## Risks

- Risk: 35 forecast points are interpolated bilinearly, so the field is smoother than real local gusts around hills and buildings; the poster says the wind is the 10 m model forecast.
- Risk: When Open-Meteo cannot be reached the poster shows a labelled offline sample breeze.
