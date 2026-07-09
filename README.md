# inkwell

Interactive ink/fluid particle simulation driven by live San Francisco wind data. Drag across the canvas to release colored ink drops that drift and flow like real pigment in water.

**Visual Style:** Bold — Sumi (cream rice paper background, user-colored ink particles, dark grey chrome)

**Data Source:** Open-Meteo SF wind API

**How it works:**
- Wind speed and direction from Open-Meteo drive the baseline particle flow
- Drag on the canvas to release colored ink drops at the cursor position
- Sliders control: ink color (hue 0-360), saturation, viscosity/trail length, gravity, particle size, flow strength multiplier, and maximum particle count
- Export your creation as a PNG at 2K, 4K, or 8K resolution
- Clear the canvas with a single button

**GitHub:** https://github.com/parthchandak02/inkwell

**Live:** https://inkwell.parthchandak.info

**Tech:** Pixel Point Toolcraft + Vite + React. Hosted on Cloudflare Pages.
