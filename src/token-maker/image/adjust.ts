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

/** Recolour is on: at least one recolour changes something. */
export const hasRecolor = (a: Pick<ImageAdjustments, 'recolors'>) => a.recolors.some((r) => r.from.toLowerCase() !== r.to.toLowerCase());

/** How far from the chosen colour (CIE Lab distance, lightness counted half) a breadth of 0–100 reaches. */
export const recolorReach = (breadth: number) => 6 + (Math.min(100, Math.max(0, breadth)) / 100) * 94;

// ---- CIE Lab (D65), so a recolour can move lightness as well as hue ----

const srgbToLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const linearToSrgb = (c: number) => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);
const LIN = new Float32Array(256).map((_, v) => srgbToLinear(v));
const labF = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const labFInv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
const XN = 0.95047;
const ZN = 1.08883;

/** sRGB (0–255) → Lab, written into `out`. */
export function rgbToLab(r: number, g: number, b: number, out: number[] = [0, 0, 0]): number[] {
  const lr = LIN[r | 0]!;
  const lg = LIN[g | 0]!;
  const lb = LIN[b | 0]!;
  const fx = labF((0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / XN);
  const fy = labF(0.2126 * lr + 0.7152 * lg + 0.0722 * lb);
  const fz = labF((0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / ZN);
  out[0] = 116 * fy - 16;
  out[1] = 500 * (fx - fy);
  out[2] = 200 * (fy - fz);
  return out;
}

/** Lab → sRGB (0–255, unclamped), written into `out`. */
export function labToRgb(L: number, A: number, B: number, out: number[] = [0, 0, 0]): number[] {
  const fy = (L + 16) / 116;
  const x = XN * labFInv(fy + A / 500);
  const y = labFInv(fy);
  const z = ZN * labFInv(fy - B / 200);
  out[0] = linearToSrgb(3.2406 * x - 1.5372 * y - 0.4986 * z);
  out[1] = linearToSrgb(-0.9689 * x + 1.8758 * y + 0.0415 * z);
  out[2] = linearToSrgb(0.0557 * x - 0.204 * y + 1.057 * z);
  return out;
}

const hexLab = (hex: string) => {
  const t = parseInt(hex.slice(1), 16);
  return rgbToLab((t >> 16) & 255, (t >> 8) & 255, t & 255);
};

/**
 * Recolour (owner request, v13): pixels near a recolour's `from` colour take
 * on its `to` colour, keeping their own shading. Lightness is remapped so
 * black stays black and white stays white except where `from` sits (so
 * white can become red, its shadows a darker red), and the colour moves by
 * the difference between the two. Pixels within half the reach change
 * fully, fading out to its edge.
 */
function recolor(d: Uint8ClampedArray, a: ImageAdjustments): void {
  const lab = [0, 0, 0];
  const rgb = [0, 0, 0];
  for (const rc of a.recolors) {
    if (rc.from.toLowerCase() === rc.to.toLowerCase()) continue;
    const [fL, fA, fB] = hexLab(rc.from) as [number, number, number];
    const [tL, tA, tB] = hexLab(rc.to) as [number, number, number];
    const reach = recolorReach(rc.breadth);
    const full = reach / 2;
    /** Lightness with `from`'s moved to `to`'s, black and white staying put. */
    const mapL = (L: number) => (L <= fL ? (fL > 0 ? (L / fL) * tL : tL) : fL < 100 ? tL + ((L - fL) / (100 - fL)) * (100 - tL) : tL);
    // Pictures repeat colours a lot (flat art especially), so results are kept by colour.
    const seen = new Map<number, number>();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const key = (d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!;
      let out = seen.get(key);
      if (out === undefined) {
        rgbToLab(d[i]!, d[i + 1]!, d[i + 2]!, lab);
        const dl = (lab[0]! - fL) * 0.5;
        const da = lab[1]! - fA;
        const db = lab[2]! - fB;
        const dist = Math.sqrt(dl * dl + da * da + db * db);
        if (dist >= reach) out = -1;
        else {
          let w = dist <= full ? 1 : 1 - (dist - full) / (reach - full);
          w = w * w * (3 - 2 * w); // smooth edge
          const L = lab[0]! + (mapL(lab[0]!) - lab[0]!) * w;
          labToRgb(L, lab[1]! + (tA - fA) * w, lab[2]! + (tB - fB) * w, rgb);
          out = (clamp255(Math.round(rgb[0]!)) << 16) | (clamp255(Math.round(rgb[1]!)) << 8) | clamp255(Math.round(rgb[2]!));
        }
        if (seen.size < 1 << 18) seen.set(key, out);
      }
      if (out < 0) continue;
      d[i] = (out >> 16) & 255;
      d[i + 1] = (out >> 8) & 255;
      d[i + 2] = out & 255;
    }
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
