import * as React from "react";

import { secondsSince, type WindSnapshot } from "./wind-data";

const CHROME_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const ACCENT = "#4a4a4a";
const TEXT = "rgba(0,0,0,0.7)";

type InkwellChromeProps = {
  wind: WindSnapshot;
};

function compassRotation(direction: number): number {
  return direction;
}

function formatDirection(direction: number): string {
  const normalized = ((direction % 360) + 360) % 360;
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % labels.length;
  return labels[index] ?? "N";
}

export function InkwellChrome({ wind }: InkwellChromeProps): React.JSX.Element {
  const [secondsAgo, setSecondsAgo] = React.useState(() => secondsSince(wind.fetchedAt));

  React.useEffect(() => {
    setSecondsAgo(secondsSince(wind.fetchedAt));
    const tick = window.setInterval(() => {
      setSecondsAgo(secondsSince(wind.fetchedAt));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [wind.fetchedAt]);

  const sourceLabel = wind.source === "live" ? "live" : "fallback";

  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-toolcraft-product-output>
      <div
        className="absolute left-5 top-5"
        data-toolcraft-product-output
        style={{ color: TEXT, fontFamily: CHROME_FONT }}
      >
        <div
          className="flex items-center gap-3"
          style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: ACCENT }}
        >
          <span>{wind.speed.toFixed(1)}</span>
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.08em" }}>km/h</span>
          <span
            aria-hidden
            style={{
              color: ACCENT,
              display: "inline-flex",
              fontSize: 22,
              transform: `rotate(${compassRotation(wind.direction)}deg)`,
            }}
          >
            ↑
          </span>
        </div>
        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>
          {formatDirection(wind.direction)} wind over San Francisco
        </div>
      </div>

      <div
        className="absolute bottom-5 left-5"
        data-toolcraft-product-output
        style={{ color: TEXT, fontFamily: CHROME_FONT, fontSize: 11, opacity: 0.65 }}
      >
        Open-Meteo SF wind · {wind.speed.toFixed(1)} km/h · {sourceLabel} · {secondsAgo}s ago
      </div>

      <div
        className="absolute bottom-14 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-center"
        data-toolcraft-product-output
        style={{ color: TEXT, fontFamily: CHROME_FONT }}
      >
        <div style={{ fontSize: 13, maxWidth: "min(72vw, 520px)", opacity: 0.8 }}>
          Drag to release ink · wind pushes pigment across the canvas
        </div>
        <div
          aria-hidden
          className="flex items-center gap-2"
          style={{ color: ACCENT, fontSize: 11, letterSpacing: "0.08em", opacity: 0.75 }}
        >
          <span
            style={{
              borderBottom: "6px solid transparent",
              borderLeft: `14px solid ${ACCENT}`,
              borderTop: "6px solid transparent",
              display: "inline-block",
              height: 0,
              transform: `rotate(${wind.direction + 90}deg)`,
              width: 0,
            }}
          />
          wind flow
        </div>
      </div>
    </div>
  );
}
