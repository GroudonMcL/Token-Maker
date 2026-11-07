// Drawing helpers shared by the effect painters (effectPainters.ts) and their
// styles (effectStyles.ts): blurred shadow-only fills, seeded noise and a
// low-resolution texture painter for mist and smoke.

import type { EffectScene } from './effects';
import type { Ctx } from './frameKit';
import { newCanvas } from '../image/processedArt';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0 below `a`, 1 above `b`, smooth in between. */
export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Draws only the blurred shadow of `draw`: the shape itself is drawn far off the canvas. */
export function shadowOnly(ctx: Ctx, s: EffectScene, color: string, blur: number, draw: (c: Ctx) => void, offsetX = 0, offsetY = 0): void {
  const far = s.area.R * 8 + blur * 4;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(0.5, blur);
  ctx.shadowOffsetX = far + offsetX;
  ctx.shadowOffsetY = offsetY;
  ctx.translate(-far, 0);
  draw(ctx);
  ctx.restore();
}

/** Traces a rectangle well beyond the token (for "everything but" fills). */
export function traceBeyond(ctx: Ctx, s: EffectScene): void {
  const r = s.area.R * 3;
  ctx.moveTo(-r, -r);
  ctx.lineTo(r, -r);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
}

export interface Noise {
  /** Smooth value noise, 0…1, one feature per unit. */
  noise: (x: number, y: number) => number;
  /** Fractal noise: `octaves` layers of finer and fainter noise, 0…1. */
  fbm: (x: number, y: number, octaves?: number) => number;
}

/** Seeded value noise: the same seed always gives the same pattern. */
export function makeNoise(seed: number): Noise {
  let a = Math.imul(seed | 0, 2654435761) >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;
  const vals = Float32Array.from({ length: 256 }, () => rnd());
  const lat = (x: number, y: number) => vals[perm[(x & 255) + perm[y & 255]!]!]!;
  const ease = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = ease(x - xi);
    const ty = ease(y - yi);
    const a0 = lat(xi, yi) + (lat(xi + 1, yi) - lat(xi, yi)) * tx;
    const a1 = lat(xi, yi + 1) + (lat(xi + 1, yi + 1) - lat(xi, yi + 1)) * tx;
    return a0 + (a1 - a0) * ty;
  };
  const fbm = (x: number, y: number, octaves = 5) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x, y) * amp;
      norm += amp;
      amp *= 0.5;
      x = x * 2.03 + 17.1;
      y = y * 2.03 + 9.7;
    }
    return sum / norm;
  };
  return { noise, fbm };
}

type Box = EffectScene['box'];
type Rgb = [number, number, number];

export function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Paints a soft texture over the box, about `res` texels across, scaled up
 * smoothly. `alpha(u, v)` gives the coverage (0…1) at a point, in pixels from
 * the box's top-left; `tone` an optional colour there (called right after
 * `alpha` for the same point), otherwise everything is `color`.
 */
export function textureOver(ctx: Ctx, box: Box, color: string, alpha: (u: number, v: number) => number, res = 200, tone?: (u: number, v: number) => Rgb): void {
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  if (w <= 0 || h <= 0) return;
  const k = res / Math.max(w, h);
  const tw = Math.max(2, Math.round(w * k));
  const th = Math.max(2, Math.round(h * k));
  const c = newCanvas(tw, th);
  const cx = c.getContext('2d') as Ctx | null;
  if (!cx) return;
  const img = cx.createImageData(tw, th);
  const base = hexRgb(color);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const u = (x + 0.5) / k;
      const v = (y + 0.5) / k;
      const al = clamp01(alpha(u, v));
      const rgb = tone ? tone(u, v) : base;
      const i = (y * tw + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = Math.round(al * 255);
    }
  }
  cx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c as CanvasImageSource, box.minX, box.minY, w, h);
  ctx.restore();
}
