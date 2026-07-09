# inkwell — Creative Brief

## Concept
Interactive ink/fluid particle simulation where live San Francisco wind data drives the flow. Drag across the canvas to release colored ink drops. The wind pushes them like real pigment diffusing in water. You control the ink color, viscosity, gravity, and particle behavior through sliders.

**Metaphor family:** fluid / ink
**Narrative Pattern:** Feature-action (wind data drives flow, user drag releases ink)
**Render tier:** toolcraft — Pixel Point Toolcraft, Vite build, deploy dist/

## Data Source
- API: `https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current_weather=true`
- Poll interval: 60s (wind speed/direction update every 15 min on API but poll to check)
- Fields used: `windspeed` (km/h), `winddirection` (degrees, meteorological: 0=N, 90=E)
- Fallback: calm conditions (windspeed 5.0, winddirection 270) if API fails
- Wind vector conversion: `vx = -Math.sin(dir * Math.PI / 180) * speed; vy = Math.cos(dir * Math.PI / 180) * speed`

### CORS
Open-Meteo is CORS-friendly and returns `Access-Control-Allow-Origin: *`. No key needed.

## Visual Style
**Preset:** Sumi — Black Ink (adapted for colored ink)
- bg: '#f5f0e6' (warm rice paper cream)
- ink colors: user-selectable via hue slider (0-360)
- structure: '#4a4a4a' (dark grey for controls)
- text: 'rgba(0,0,0,0.7)'

Adapted: The Sumi ink-on-paper aesthetic becomes a canvas where colored ink drops bloom and flow. The cream background gives it a natural art feel. Variable-width particle trails mimic brush strokes.

**Three Dials:**
- DESIGN_VARIANCE: 7 (organic flow, semi-chaotic particle diffusion)
- MOTION_INTENSITY: 6 (continuous fluid motion, wind-driven)
- VISUAL_DENSITY: 4 (moderate particles, clean canvas with visible trails)

## Encoding Contract
| Data Field | Visual Channel | Range | Inverse Function | "Bigger means..." | Legend? |
|---|---|---|---|---|---|
| wind.speed | baseline particle velocity (px/s) | 0-30 px/s | invertScale(px, 0,30, 0,100) | stronger wind drives ink faster | no (physical) |
| wind.direction | particle flow angle | 0-360 deg → canvas angle | invertAngle(deg) | ink flows in the wind's direction | no (physical) |
| N/A | ink color (hue) | 0-360 | user slider | user's chosen color | yes (slider shows color) |
| N/A | viscosity (trail length) | 1-200px | user slider | longer trails = more viscous ink | no (demonstrated) |

## Toolcraft Controls / Scene
- **Primary metaphor:** Ink drops diffusing in water, pushed by wind
- **Canvas:** 2D Canvas via Toolcraft patterns
- **Controls (Toolcraft right-sidebar):**
  1. Ink Color: hue slider (0-360) with color preview
  2. Saturation: slider (0-100%)
  3. Viscosity: slider (1-200) — controls particle trail length
  4. Gravity: slider (0-2) — downward pull on particles
  5. Particle Size: slider (2-20px)
  6. Flow Strength: slider (0-5x) — wind multiplier
  7. Particle Count: slider (50-500)
  8. Clear Canvas: button
  9. Export PNG: button
- **Interaction:** Drag on canvas to release ink particles at cursor position. Particles drift with wind + gravity + viscosity physics.
- **Auto-behavior:** Particles spawn with a gentle initial burst at page load so canvas isn't empty.

## UX Chrome
- **Hero number:** wind speed km/h + direction compass icon, top-left, 36px
- **Stamp:** bottom-left — "Open-Meteo SF wind · [speed] km/h · live · Xs ago"
- **Desc:** bottom-center — "Drag to release ink · wind pushes pigment across the canvas"
- **Legend:** bottom-center (below desc) — thin arrow showing wind direction
- **All chrome uses system-ui, sans-serif font, no backgrounds or boxes**

## Canvas Code Requirements (MANDATORY for toolcraft)
1. Use Toolcraft starter scaffold (npx @pixel-point/toolcraft create)
2. Do NOT modify Toolcraft control components unless they're broken
3. Data fetch in a useEffect with 60s poll interval
4. Fallback wind data embedded: {speed: 5.0, direction: 270}
5. DPR-aware canvas sizing
6. First frame never blank — pre-spawn a few ink drops
7. Touch guard pattern for mobile
8. No em-dashes in any user-visible text — use hyphens

## Interaction Affordances
- Gentle visual cue on drag (cursor changes to a small colored circle preview)
- Ink drops appear immediately at touch point with initial velocity
- Particle trails fade naturally (alpha decay proportional to viscosity)
- Clear canvas refreshes instantly
- Export PNG saves the current canvas state

## Build Instructions
1. FIRST: Read ~/projects/stellar/src/App.tsx for the overlay chrome positioning pattern (stamp, desc, legend positions)
2. Scaffold with: npx @pixel-point/toolcraft create inkwell (use nvm node 20.19.2 if needed)
3. Implement data fetching, particle physics, and controls
4. npm run build must produce dist/
5. Deploy: ship-creative-daily.sh ~/projects/inkwell dist
