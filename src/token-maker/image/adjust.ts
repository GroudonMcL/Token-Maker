// Colour adjustments (DESIGN.md §6.2), as plain pixel maths so they look the
// same in every browser (canvas `filter` is missing in Safari), in a Web
// Worker and in tests. Brightness, contrast and saturation use the
// extension's formulas, so its tokens look the same here.

import type { ImageAdjustments } from '../document/types';

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Adjustments that work pixel by pixel (blur and sharpness are in filters.ts). */
const COLOUR_KEYS = [
  'brightness',
  'contrast',
  'saturation',
  'hue',
  'temperature',
  'tint',
  'exposure',
  'highlights',
  'shadows',
  'vibrance',
  'grayscale',
  'sepia',
] as const;

export function hasColourAdjustments(a: ImageAdjustments): boolean {
  return a.invert || COLOUR_KEYS.some((k) => a[k] !== 0) || hasRecolor(a);
}

/** Recolour is on: a colour is chosen and turned. */
export const hasRecolor = (a: Pick<ImageAdjustments, 'recolorColor' | 'recolorShift'>) => !!a.recolorColor && a.recolorShift !== 0;

/** How far either side of the chosen hue (in degrees) a breadth of 0–100 reaches. */
export const recolorReach = (breadth: number) => 6 + (Math.min(100, Math.max(0, breadth)) / 100) * 84;

/** Hue in degrees (0–360) of an RGB colour, and its chroma (0–255). */
function hueOf(r: number, g: number, b: number): [number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;
  if (c === 0) return [0, 0];
  let h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
  h *= 60;
  return [h < 0 ? h + 360 : h, c];
}

/**
 * Recolour (owner request): colours near the chosen one turn round the
 * colour wheel by `recolorShift`, keeping their lightness and strength.
 * Colours within half the reach change fully, fading out to the edge of
 * it; greys and nearly grey colours barely change, as they have no colour
 * to turn.
 */
function recolor(d: Uint8ClampedArray, a: ImageAdjustments): void {
  const t = parseInt(a.recolorColor!.slice(1), 16);
  const [h0, c0] = hueOf((t >> 16) & 255, (t >> 8) & 255, t & 255);
  if (c0 === 0) return; // a grey has no hue to match
  const reach = recolorReach(a.recolorBreadth);
  const full = reach / 2;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const [h, c] = hueOf(r, g, b);
    if (c < 6) continue;
    let dist = Math.abs(h - h0);
    if (dist > 180) dist = 360 - dist;
    if (dist >= reach) continue;
    let w = dist <= full ? 1 : 1 - (dist - full) / (reach - full);
    w = w * w * (3 - 2 * w); // smooth edge
    w *= Math.min(1, c / 48);
    // Turn the hue, keeping value (max) and chroma.
    let nh = (h + a.recolorShift * w) % 360;
    if (nh < 0) nh += 360;
    const max = Math.max(r, g, b);
    const x = c * (1 - Math.abs(((nh / 60) % 2) - 1));
    const m = max - c;
    const k = Math.floor(nh / 60);
    const [rr, gg, bb] = k === 0 ? [c, x, 0] : k === 1 ? [x, c, 0] : k === 2 ? [0, c, x] : k === 3 ? [0, x, c] : k === 4 ? [x, 0, c] : [c, 0, x];
    d[i] = rr + m;
    d[i + 1] = gg + m;
    d[i + 2] = bb + m;
  }
}

// sRGB ↔ linear light, for exposure (which works like a camera's: in stops).
const TO_LINEAR = new Float32Array(256);
for (let v = 0; v < 256; v++) {
  const c = v / 255;
  TO_LINEAR[v] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const LIN_STEPS = 4096;
const FROM_LINEAR = new Float32Array(LIN_STEPS + 1);
for (let i = 0; i <= LIN_STEPS; i++) {
  const c = i / LIN_STEPS;
  FROM_LINEAR[i] = 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
}

/** The CSS hue-rotate matrix. */
function hueMatrix(degrees: number): number[] {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Applies the colour adjustments in place, in this order: recolour, exposure,
 * brightness/contrast, highlights/shadows, temperature/tint, hue,
 * saturation, vibrance, sepia, grayscale, invert.
 */
export function adjustColours(buffer: PixelBuffer, a: ImageAdjustments): void {
  if (!hasColourAdjustments(a)) return;
  const d = buffer.data;
  // Recolour first, so it matches the colours as picked from the picture.
  if (hasRecolor(a)) recolor(d, a);
  if (!a.invert && COLOUR_KEYS.every((k) => a[k] === 0)) return;

  const gain = 2 ** (a.exposure / 50); // ±2 stops
  const bright = (a.brightness / 100) * 255 * 0.5;
  const c = (a.contrast / 100) * 255 * 0.9;
  const contrast = (259 * (c + 255)) / (255 * (259 - c));
  const doBC = a.brightness !== 0 || a.contrast !== 0;
  const sh = (a.shadows / 100) * 0.5 * 255;
  const hl = (a.highlights / 100) * 0.5 * 255;
  const warm = (a.temperature / 100) * 30;
  const tint = (a.tint / 100) * 30;
  const m = a.hue !== 0 ? hueMatrix(a.hue) : null;
  const sat = 1 + a.saturation / 100;
  const vib = a.vibrance / 100;
  const sepia = a.sepia / 100;
  const gray = a.grayscale / 100;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]!;
    let g = d[i + 1]!;
    let b = d[i + 2]!;

    if (gain !== 1) {
      r = FROM_LINEAR[Math.min(LIN_STEPS, Math.round(TO_LINEAR[r]! * gain * LIN_STEPS))]!;
      g = FROM_LINEAR[Math.min(LIN_STEPS, Math.round(TO_LINEAR[g]! * gain * LIN_STEPS))]!;
      b = FROM_LINEAR[Math.min(LIN_STEPS, Math.round(TO_LINEAR[b]! * gain * LIN_STEPS))]!;
    }
    if (doBC) {
      r = contrast * (r + bright - 128) + 128;
      g = contrast * (g + bright - 128) + 128;
      b = contrast * (b + bright - 128) + 128;
    }
    if (sh !== 0 || hl !== 0) {
      // Shadows move the dark tones, highlights the bright ones.
      const L = clamp255(0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const delta = sh * (1 - L) * (1 - L) + hl * L * L;
      r += delta;
      g += delta;
      b += delta;
    }
    if (warm !== 0 || tint !== 0) {
      r += warm + tint / 2;
      g -= tint;
      b += -warm + tint / 2;
    }
    if (m) {
      const r0 = r;
      const g0 = g;
      r = m[0]! * r0 + m[1]! * g0 + m[2]! * b;
      g = m[3]! * r0 + m[4]! * g0 + m[5]! * b;
      b = m[6]! * r0 + m[7]! * g0 + m[8]! * b;
    }
    if (sat !== 1) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = y + (r - y) * sat;
      g = y + (g - y) * sat;
      b = y + (b - y) * sat;
    }
    if (vib !== 0) {
      // Like saturation, but mostly on dull colours, so skin and bright colours don't go garish.
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const amount = 1 + vib * (1 - clamp255(max - min) / 255) * (vib > 0 ? 1.5 : 1);
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = y + (r - y) * amount;
      g = y + (g - y) * amount;
      b = y + (b - y) * amount;
    }
    if (sepia !== 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r += (sr - r) * sepia;
      g += (sg - g) * sepia;
      b += (sb - b) * sepia;
    }
    if (gray !== 0) {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r += (y - r) * gray;
      g += (y - g) * gray;
      b += (y - b) * gray;
    }
    if (a.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    d[i] = r; // Uint8ClampedArray rounds and clamps
    d[i + 1] = g;
    d[i + 2] = b;
  }
}
