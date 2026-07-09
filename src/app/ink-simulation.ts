import { mapWindSpeedToPixelsPerSecond, type WindSnapshot, windVectorFromSnapshot } from "./wind-data";

export type InkSettings = {
  flowStrength: number;
  gravity: number;
  hue: number;
  maxParticles: number;
  particleSize: number;
  saturation: number;
  viscosity: number;
  wind: WindSnapshot;
};

export type InkPointer = {
  active: boolean;
  x: number;
  y: number;
};

type TrailPoint = {
  alpha: number;
  x: number;
  y: number;
};

type InkParticle = {
  life: number;
  size: number;
  trail: TrailPoint[];
  vx: number;
  vy: number;
  x: number;
  y: number;
};

export type InkSimulation = {
  clear: () => void;
  draw: (context: CanvasRenderingContext2D, settings: InkSettings, includeBackground: boolean, background: string) => void;
  resize: (width: number, height: number, pixelRatio: number) => void;
  spawnAt: (x: number, y: number, settings: InkSettings, burst?: number) => void;
  update: (deltaSeconds: number, settings: InkSettings) => void;
  warmup: (settings: InkSettings) => void;
};

function hslToCss(hue: number, saturation: number, lightness = 42): string {
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function createParticle(
  x: number,
  y: number,
  settings: InkSettings,
  windPxPerSecond: { vx: number; vy: number },
): InkParticle {
  const spread = settings.particleSize * 0.35;
  const angle = Math.random() * Math.PI * 2;
  const impulse = 8 + Math.random() * 18;

  return {
    life: 1,
    size: settings.particleSize * (0.7 + Math.random() * 0.6),
    trail: [{ alpha: 0.85, x, y }],
    vx:
      windPxPerSecond.vx * settings.flowStrength * 0.08 +
      Math.cos(angle) * impulse +
      (Math.random() - 0.5) * 6,
    vy:
      windPxPerSecond.vy * settings.flowStrength * 0.08 +
      Math.sin(angle) * impulse +
      (Math.random() - 0.5) * 6,
    x,
    y,
  };
}

export function createInkSimulation(): InkSimulation {
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  const particles: InkParticle[] = [];

  const resize = (nextWidth: number, nextHeight: number, nextPixelRatio: number): void => {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    pixelRatio = Math.max(1, nextPixelRatio);
  };

  const clear = (): void => {
    particles.length = 0;
  };

  const spawnAt = (x: number, y: number, settings: InkSettings, burst = 3): void => {
    const windPxPerSecond = getWindPixels(settings.wind, settings.flowStrength);
    const count = Math.max(1, burst);

    for (let index = 0; index < count; index += 1) {
      if (particles.length >= settings.maxParticles) {
        particles.shift();
      }

      const jitterX = (Math.random() - 0.5) * settings.particleSize;
      const jitterY = (Math.random() - 0.5) * settings.particleSize;
      particles.push(
        createParticle(x + jitterX, y + jitterY, settings, windPxPerSecond),
      );
    }
  };

  const warmup = (settings: InkSettings): void => {
    const count = Math.min(24, Math.max(8, Math.floor(settings.maxParticles * 0.06)));
    for (let index = 0; index < count; index += 1) {
      spawnAt(
        width * (0.2 + Math.random() * 0.6),
        height * (0.2 + Math.random() * 0.6),
        settings,
        1,
      );
    }
  };

  const update = (deltaSeconds: number, settings: InkSettings): void => {
    const windPxPerSecond = getWindPixels(settings.wind, settings.flowStrength);
    const trailLimit = Math.max(4, Math.round(settings.viscosity * 0.35));
    const fadeRate = 0.35 + 120 / Math.max(20, settings.viscosity);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index]!;
      particle.vx += windPxPerSecond.vx * deltaSeconds * 0.65;
      particle.vy += windPxPerSecond.vy * deltaSeconds * 0.65 + settings.gravity * 28 * deltaSeconds;
      particle.vx *= 0.985;
      particle.vy *= 0.985;

      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.life -= deltaSeconds * fadeRate * 0.08;

      const lastTrail = particle.trail[particle.trail.length - 1];
      const moved =
        !lastTrail ||
        Math.hypot(particle.x - lastTrail.x, particle.y - lastTrail.y) >
          Math.max(1.2, particle.size * 0.22);

      if (moved) {
        particle.trail.push({
          alpha: 0.82,
          x: particle.x,
          y: particle.y,
        });
      }

      if (particle.trail.length > trailLimit) {
        particle.trail.splice(0, particle.trail.length - trailLimit);
      }

      for (const point of particle.trail) {
        point.alpha -= deltaSeconds * fadeRate * 0.55;
      }

      particle.trail = particle.trail.filter((point) => point.alpha > 0.02);

      const outOfBounds =
        particle.x < -40 ||
        particle.x > width + 40 ||
        particle.y < -40 ||
        particle.y > height + 40;

      if (particle.life <= 0 || particle.trail.length === 0 || outOfBounds) {
        particles.splice(index, 1);
      }
    }

    while (particles.length > settings.maxParticles) {
      particles.shift();
    }
  };

  const draw = (
    context: CanvasRenderingContext2D,
    settings: InkSettings,
    includeBackground: boolean,
    background: string,
  ): void => {
    context.save();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    if (includeBackground) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }

    const inkColor = hslToCss(settings.hue, settings.saturation);

    for (const particle of particles) {
      if (particle.trail.length < 2) {
        continue;
      }

      context.beginPath();
      context.moveTo(particle.trail[0]!.x, particle.trail[0]!.y);

      for (let index = 1; index < particle.trail.length; index += 1) {
        const point = particle.trail[index]!;
        const previous = particle.trail[index - 1]!;
        const midX = (previous.x + point.x) * 0.5;
        const midY = (previous.y + point.y) * 0.5;
        context.quadraticCurveTo(previous.x, previous.y, midX, midY);
      }

      const head = particle.trail[particle.trail.length - 1]!;
      context.lineTo(head.x, head.y);
      context.strokeStyle = inkColor;
      context.lineWidth = particle.size;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.globalAlpha = Math.max(0.08, head.alpha * particle.life);
      context.stroke();

      context.beginPath();
      context.arc(head.x, head.y, particle.size * 0.35, 0, Math.PI * 2);
      context.fillStyle = inkColor;
      context.globalAlpha = Math.max(0.12, head.alpha * particle.life * 0.9);
      context.fill();
    }

    context.restore();
  };

  return {
    clear,
    draw,
    resize,
    spawnAt,
    update,
    warmup,
  };
}

function getWindPixels(
  wind: WindSnapshot,
  flowStrength: number,
): { vx: number; vy: number } {
  const base = mapWindSpeedToPixelsPerSecond(wind.speed);
  const vector = windVectorFromSnapshot(wind);
  const scale = (base / Math.max(0.001, Math.hypot(vector.vx, vector.vy))) * flowStrength;
  return {
    vx: vector.vx * scale,
    vy: vector.vy * scale,
  };
}

export function inkColorFromSettings(settings: Pick<InkSettings, "hue" | "saturation">): string {
  return hslToCss(settings.hue, settings.saturation);
}

export type { InkParticle };
