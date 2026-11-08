// Draws one Inkwell frame in scene coordinates. The runtime paints the Background; this is foreground.

import type { InkwellSettings } from "./inkwell-settings";
import { WIND_COLS, WIND_ROWS, type WindData } from "./wind-data";

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const SANS = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
export const SEAL_COLOR = "#B8352A";
const WIDTH_BUCKETS = 10;

function rgb(hex: string): [number, number, number] {
  const v = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1] ?? "000000";
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Ink actually used: the chosen ink, or paper-light ink when it would vanish on a dark background. */
export function inkFor(settings: Pick<InkwellSettings, "background" | "includeBackground" | "ink">): string {
  const lum = (hex: string) => {
    const [r, g, b] = rgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  if (settings.includeBackground && lum(settings.background) < 0.4 && lum(settings.ink) < 0.4) return "#EFE8DA";
  return settings.ink;
}

export type Vector = { speed: number; u: number; v: number };

/** Wind toward-vector in screen space (x east, y south) at fractional grid coordinates. */
export function sampleWind(data: WindData, hour: number, gx: number, gy: number): Vector {
  const x = Math.max(0, Math.min(WIND_COLS - 1.0001, gx));
  const y = Math.max(0, Math.min(WIND_ROWS - 1.0001, gy));
  const c0 = Math.floor(x);
  const r0 = Math.floor(y);
  const fx = x - c0;
  const fy = y - r0;
  let u = 0;
  let v = 0;
  for (const [dc, dr, weight] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
    const index = (r0 + dr) * WIND_COLS + c0 + dc;
    const speed = data.speed[hour]?.[index] ?? 0;
    const from = ((data.direction[hour]?.[index] ?? 0) * Math.PI) / 180;
    u += -Math.sin(from) * speed * weight;
    v += Math.cos(from) * speed * weight;
  }
  return { speed: Math.hypot(u, v), u, v };
}

const POINTS = ["north", "north-north-east", "north-east", "east-north-east", "east", "east-south-east", "south-east", "south-south-east", "south", "south-south-west", "south-west", "west-south-west", "west", "west-north-west", "north-west", "north-north-west"];

/** Compass name of the direction the wind blows FROM, given its toward-vector. */
export function fromName(vector: Vector): string {
  const toward = (Math.atan2(vector.u, -vector.v) * 180) / Math.PI;
  const from = (toward + 180 + 360) % 360;
  return POINTS[Math.round(from / 22.5) % 16];
}

const BEAUFORT = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
const BEAUFORT_NAMES = ["Calm", "Light air", "Light breeze", "Gentle breeze", "Moderate breeze", "Fresh breeze", "Strong breeze", "Near gale", "Gale", "Strong gale", "Storm", "Violent storm", "Hurricane force"];
export function beaufort(kmh: number): { force: number; name: string } {
  const force = BEAUFORT.findIndex((limit) => kmh < limit);
  const value = force === -1 ? 12 : force;
  return { force: value, name: BEAUFORT_NAMES[value] };
}

export type Streamline = { points: number[]; speeds: number[] };

/** Evenly spaced streamlines (Jobard-Lefer style) in map units for a width x height map. */
export function traceStreamlines(data: WindData, hour: number, width: number, height: number, spacing: number): Streamline[] {
  const cell = spacing * 0.5;
  const gridW = Math.ceil(width / cell);
  const gridH = Math.ceil(height / cell);
  const owner: number[] = new Array(gridW * gridH).fill(-1);
  const toGrid = (x: number, y: number) => Math.floor(y / cell) * gridW + Math.floor(x / cell);
  const step = spacing * 0.22;
  const lines: Streamline[] = [];
  let seedState = 0x9e3779b9;
  const random = () => {
    seedState = (seedState + 0x6d2b79f5) >>> 0;
    let t = seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let sy = spacing / 2; sy < height; sy += spacing) {
    for (let sx = spacing / 2; sx < width; sx += spacing) {
      const x0 = sx + (random() - 0.5) * spacing * 0.8;
      const y0 = sy + (random() - 0.5) * spacing * 0.8;
      if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height || owner[toGrid(x0, y0)] !== -1) continue;
      const id = lines.length;
      const halves: { points: number[]; speeds: number[] }[] = [];
      for (const direction of [1, -1]) {
        const points: number[] = [];
        const speeds: number[] = [];
        let x = x0;
        let y = y0;
        for (let i = 0; i < 260; i += 1) {
          const at = sampleWind(data, hour, (x / width) * (WIND_COLS - 1), (y / height) * (WIND_ROWS - 1));
          if (at.speed < 0.05) break;
          const midX = x + (at.u / at.speed) * step * 0.5 * direction;
          const midY = y + (at.v / at.speed) * step * 0.5 * direction;
          const mid = sampleWind(data, hour, (midX / width) * (WIND_COLS - 1), (midY / height) * (WIND_ROWS - 1));
          if (mid.speed < 0.05) break;
          const nx = x + (mid.u / mid.speed) * step * direction;
          const ny = y + (mid.v / mid.speed) * step * direction;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) break;
          const g = toGrid(nx, ny);
          if (owner[g] !== -1 && owner[g] !== id) break;
          points.push(nx, ny);
          speeds.push(mid.speed);
          x = nx;
          y = ny;
        }
        halves.push({ points, speeds });
      }
      const back = halves[1];
      const points: number[] = [];
      const speeds: number[] = [];
      for (let i = back.speeds.length - 1; i >= 0; i -= 1) {
        points.push(back.points[i * 2], back.points[i * 2 + 1]);
        speeds.push(back.speeds[i]);
      }
      points.push(x0, y0);
      speeds.push(sampleWind(data, hour, (x0 / width) * (WIND_COLS - 1), (y0 / height) * (WIND_ROWS - 1)).speed);
      points.push(...halves[0].points);
      speeds.push(...halves[0].speeds);
      if (speeds.length < 6) continue;
      for (let i = 0; i < points.length; i += 2) {
        const g = toGrid(points[i], points[i + 1]);
        if (owner[g] === -1) owner[g] = id;
      }
      lines.push({ points, speeds });
    }
  }
  return lines;
}

const traced = new Map<string, Streamline[]>();
function streamlinesFor(data: WindData, hour: number, width: number, height: number, spacing: number): Streamline[] {
  const key = `${data.key}|${data.source}|${hour}|${Math.round(width)}|${Math.round(height)}|${spacing}`;
  const hit = traced.get(key);
  if (hit) return hit;
  const lines = traceStreamlines(data, hour, width, height, spacing);
  if (traced.size > 8) traced.delete(traced.keys().next().value!);
  traced.set(key, lines);
  return lines;
}

/** Scene-unit layout shared with tests. */
export function inkwellLayout(width: number, height: number) {
  const u = Math.min(width / 1920, height / 1080);
  const offsetX = (width - 1920 * u) / 2;
  const offsetY = (height - 1080 * u) / 2;
  const left = offsetX + 96 * u;
  const map = { height: 888 * u, width: 1224 * u, x: offsetX + 600 * u, y: offsetY + 96 * u };
  const seal = { r: 46 * u, x: left + 46 * u, y: offsetY + 892 * u };
  return { left, map, offsetY, seal, u };
}

type Frame = { data: WindData; ink: string; layout: ReturnType<typeof inkwellLayout>; muted: string; settings: InkwellSettings };

function tracked(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, x: number, y: number, spacing: number): void {
  let cursor = x;
  for (const char of text) {
    context.fillText(char, cursor, y);
    cursor += context.measureText(char).width + spacing;
  }
}

function drawField(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, ink, settings } = frame;
  const { map, u } = frame.layout;
  const lines = streamlinesFor(data, settings.hour, map.width / u, map.height / u, settings.spacing);
  const paths: number[][] = Array.from({ length: WIDTH_BUCKETS }, () => []);
  for (const line of lines) {
    const n = line.speeds.length;
    for (let i = 1; i < n; i += 1) {
      const t = i / (n - 1);
      const taper = Math.pow(Math.sin(Math.PI * t), 0.55);
      const strength = Math.min(1, 0.28 + line.speeds[i] / 45);
      const bucket = Math.min(WIDTH_BUCKETS - 1, Math.floor(taper * strength * WIDTH_BUCKETS));
      paths[bucket].push(line.points[(i - 1) * 2], line.points[(i - 1) * 2 + 1], line.points[i * 2], line.points[i * 2 + 1]);
    }
  }
  context.save();
  context.lineCap = "round";
  context.strokeStyle = withAlpha(ink, 0.86);
  paths.forEach((segments, bucket) => {
    if (!segments.length) return;
    context.beginPath();
    for (let i = 0; i < segments.length; i += 4) {
      context.moveTo(map.x + segments[i] * u, map.y + segments[i + 1] * u);
      context.lineTo(map.x + segments[i + 2] * u, map.y + segments[i + 3] * u);
    }
    context.lineWidth = (0.25 + ((bucket + 0.5) / WIDTH_BUCKETS) * 3.2) * settings.brush * u;
    context.stroke();
  });
  context.restore();
}

function drawFrameMarks(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { ink, muted, settings } = frame;
  const { map, u } = frame.layout;
  context.strokeStyle = withAlpha(ink, 0.5);
  context.lineWidth = 1 * u;
  context.strokeRect(map.x, map.y, map.width, map.height);
  // Centre cross marks the place the figures describe
  const cx = map.x + map.width / 2;
  const cy = map.y + map.height / 2;
  context.strokeStyle = SEAL_COLOR;
  context.lineWidth = 2 * u;
  context.beginPath();
  context.moveTo(cx - 12 * u, cy);
  context.lineTo(cx + 12 * u, cy);
  context.moveTo(cx, cy - 12 * u);
  context.lineTo(cx, cy + 12 * u);
  context.stroke();
  context.fillStyle = muted;
  context.font = `${14 * u}px ${SANS}`;
  context.textAlign = "right";
  context.fillText(`${(settings.latitude >= 0 ? "N" : "S")} ${Math.abs(settings.latitude).toFixed(2)}°  ${(settings.longitude >= 0 ? "E" : "W")} ${Math.abs(settings.longitude).toFixed(2)}°`, map.x + map.width, map.y + map.height + 24 * u);
  context.textAlign = "left";
}

function localTime(data: WindData, hour: number): string {
  const stamp = data.hours[hour] ?? data.hours[0] ?? "";
  const date = new Date(`${stamp}:00Z`);
  if (Number.isNaN(date.getTime())) return stamp;
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" });
  return `${day} · ${stamp.slice(11, 16)} local`;
}

function drawColumn(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, ink, muted, settings } = frame;
  const { left, offsetY, u } = frame.layout;
  const centre = sampleWind(data, settings.hour, (WIND_COLS - 1) / 2, (WIND_ROWS - 1) / 2);
  const centreIndex = ((WIND_ROWS - 1) / 2) * WIND_COLS + (WIND_COLS - 1) / 2;
  const gust = data.gust[settings.hour]?.[centreIndex] ?? centre.speed;
  context.fillStyle = muted;
  context.font = `600 ${17 * u}px ${SANS}`;
  tracked(context, "WIND STUDY", left, offsetY + 118 * u, 3.4 * u);
  const title = settings.placeName ?? "Open water";
  let size = 84;
  context.font = `${size * u}px ${SERIF}`;
  while (context.measureText(title).width > 450 * u && size > 44) {
    size -= 4;
    context.font = `${size * u}px ${SERIF}`;
  }
  context.fillStyle = ink;
  context.fillText(title, left - 3 * u, offsetY + 208 * u);
  context.fillStyle = muted;
  context.font = `${20 * u}px ${SANS}`;
  context.fillText(`${localTime(data, settings.hour)}${settings.hour === 0 ? " · now" : ` · in ${settings.hour} h`}`, left, offsetY + 252 * u);
  context.fillText(data.timezone, left, offsetY + 282 * u);

  context.fillStyle = ink;
  context.font = `300 ${150 * u}px ${SERIF}`;
  const speedText = String(Math.round(centre.speed));
  context.fillText(speedText, left - 6 * u, offsetY + 468 * u);
  const numberWidth = context.measureText(speedText).width;
  context.font = `${30 * u}px ${SERIF}`;
  context.fillText("km/h", left + numberWidth + 10 * u, offsetY + 468 * u);
  context.font = `italic ${28 * u}px ${SERIF}`;
  context.fillText(`from the ${fromName(centre)}`, left, offsetY + 516 * u);
  const force = beaufort(centre.speed);
  context.fillStyle = muted;
  context.font = `${19 * u}px ${SANS}`;
  context.fillText(`${force.name} · Beaufort ${force.force} · gusts ${Math.round(gust)} km/h`, left, offsetY + 552 * u);
}

function drawDay(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, ink, muted, settings } = frame;
  const { left, offsetY, u } = frame.layout;
  const top = offsetY + 640 * u;
  const bottom = offsetY + 770 * u;
  const hours = Math.min(24, data.hours.length);
  const speeds = Array.from({ length: hours }, (_, hour) => sampleWind(data, hour, (WIND_COLS - 1) / 2, (WIND_ROWS - 1) / 2));
  const max = Math.max(30, ...speeds.map((s) => s.speed));
  const slot = (450 * u) / hours;
  context.fillStyle = muted;
  context.font = `600 ${15 * u}px ${SANS}`;
  tracked(context, "NEXT 24 HOURS", left, top - 26 * u, 2.6 * u);
  speeds.forEach((vector, hour) => {
    const h = (vector.speed / max) * (bottom - top - 26 * u);
    const x = left + hour * slot;
    context.fillStyle = withAlpha(ink, hour === settings.hour ? 0.95 : 0.28);
    context.fillRect(x + slot * 0.18, bottom - h, slot * 0.64, h);
    // Tick pointing downwind
    if (vector.speed > 0.05) {
      const cx = x + slot / 2;
      const cy = top + 4 * u;
      const len = 8 * u;
      context.strokeStyle = withAlpha(ink, hour === settings.hour ? 0.95 : 0.45);
      context.lineWidth = 1.4 * u;
      context.beginPath();
      context.moveTo(cx - (vector.u / vector.speed) * len, cy - (vector.v / vector.speed) * len);
      context.lineTo(cx + (vector.u / vector.speed) * len, cy + (vector.v / vector.speed) * len);
      context.stroke();
    }
  });
  context.fillStyle = muted;
  context.font = `${14 * u}px ${SANS}`;
  context.fillText("now", left, bottom + 22 * u);
  context.textAlign = "right";
  context.fillText("+23 h", left + 450 * u, bottom + 22 * u);
  context.textAlign = "left";
}

function drawSeal(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame): void {
  const { data, ink, settings } = frame;
  const { left, offsetY, seal, u } = frame.layout;
  context.fillStyle = SEAL_COLOR;
  context.beginPath();
  context.arc(seal.x, seal.y, seal.r, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = settings.includeBackground ? settings.background : "#F2EDE3";
  context.lineWidth = 2 * u;
  context.beginPath();
  context.arc(seal.x, seal.y, seal.r - 7 * u, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = withAlpha(ink, 0.62);
  context.font = `${16 * u}px ${SANS}`;
  context.fillText("Each line follows the wind;", left + 114 * u, seal.y - 6 * u);
  context.fillText("it thickens where the wind is stronger.", left + 114 * u, seal.y + 18 * u);
  context.fillStyle = withAlpha(ink, 0.45);
  context.font = `${14 * u}px ${SANS}`;
  context.fillText(`Wind at 10 m: Open-Meteo forecast · ${data.source === "live" ? "live" : "offline sample"}`, left, offsetY + 984 * u);
}

export function drawInkwell(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, settings: InkwellSettings, data: WindData): void {
  const ink = inkFor(settings);
  const frame: Frame = { data, ink, layout: inkwellLayout(width, height), muted: withAlpha(ink, 0.62), settings };
  context.save();
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  drawField(context, frame);
  drawFrameMarks(context, frame);
  drawColumn(context, frame);
  drawDay(context, frame);
  drawSeal(context, frame);
  context.restore();
}
