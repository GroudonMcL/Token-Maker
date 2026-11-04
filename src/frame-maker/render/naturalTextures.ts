// The textures added in version 11 (DESIGN.md §4.12): natural ones
// (crystal facets, lava, smoke, feathers, filigree, mottling, lichen, water
// caustics) and strange ones (nebula, arcane circuits, bubbles, eyes).
//
// Some are worked out pixel by pixel from where each pixel is on the band:
// how far along it (in band widths, wrapping seamlessly all the way round)
// and how far across (0 outer edge, 1 inner edge). The rest are drawn with
// strokes along the band like the older textures. All are seeded, sized in
// band widths and, where they have a lit side, lit by the stage's light.

import { mix, rgba, shade } from '../engine/legacy/color';
import { alongBand, atPoint, countFor, seededRandom, type FrameGeometry } from '../engine/legacy/frameKit';
import { ROUNDED_CORNER, type Point } from '../engine/legacy/shapes';
import { bandWidthPx } from './band';
import { context2d, newCanvas, type Ctx } from './canvas';
import { lightAt, lightVector } from './light';

/** What every texture here is drawn from (TextureLayer's settings). */
export interface NatureOptions {
  color: string;
  color2: string | null;
  seed: number;
  amount: number;
  scale: number;
  strength: number;
  light: number;
}

// ---------------------------------------------------------------- where a pixel is on the band

const SQRT3 = Math.sqrt(3);

/** How far a point (pixels from the centre) is in from the token's edge: the inset whose outline passes through it. */
export function insetOf(shape: FrameGeometry['shape'], R: number, x: number, y: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  switch (shape) {
    case 'circle':
      return R - Math.hypot(x, y);
    case 'square':
      return R - Math.max(ax, ay);
    case 'rounded': {
      const k = R * (1 - ROUNDED_CORNER);
      if (ax > k && ay > k) return R * ROUNDED_CORNER - Math.hypot(ax - k, ay - k);
      return R - Math.max(ax, ay);
    }
    case 'hexagon':
      return (R * SQRT3) / 2 - Math.max(ax, Math.abs(x * 0.5 + y * (SQRT3 / 2)), Math.abs(x * 0.5 - y * (SQRT3 / 2)));
    case 'flatHex':
      return (R * SQRT3) / 2 - Math.max(ay, Math.abs(y * 0.5 + x * (SQRT3 / 2)), Math.abs(y * 0.5 - x * (SQRT3 / 2)));
  }
}

const BINS = 2048;

/**
 * Distance along the middle of the band for each direction from the centre
 * (`BINS` directions clockwise from the top), so a pixel's "along" follows
 * the band's own length on every shape. `total` is the length all round.
 */
function alongTable(g: FrameGeometry): { table: Float32Array; total: number } {
  const mid = (g.outer + g.inner) / 2;
  const table = new Float32Array(BINS + 1);
  let prev: Point | null = null;
  let total = 0;
  for (let k = 0; k <= BINS; k++) {
    const a = -Math.PI / 2 + (k / BINS) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    // The middle outline along this direction (the inset falls as the radius grows).
    let lo = 0;
    let hi = g.R * 1.2;
    for (let i = 0; i < 24; i++) {
      const r = (lo + hi) / 2;
      if (insetOf(g.shape, g.R, dx * r, dy * r) > mid) lo = r;
      else hi = r;
    }
    const p = { x: dx * lo, y: dy * lo };
    if (prev) total += Math.hypot(p.x - prev.x, p.y - prev.y);
    table[k] = total;
    prev = p;
  }
  return { table, total };
}

/** Fills each pixel of the band a shader paints: `u` along (band widths, wrapping at `period`), `v` across (0–1). */
type Shader = (u: number, v: number, out: Float32Array, x: number, y: number) => void;

/** Paints the part of the band in `g` pixel by pixel, over what `ctx` already has (which is clipped to that part). */
function pixels(ctx: Ctx, g: FrameGeometry, size: number, shader: (period: number) => Shader): void {
  const w = bandWidthPx(g);
  if (w <= 0.5) return;
  const { table, total } = alongTable(g);
  const period = total / w;
  const shade = shader(period);
  const own = newCanvas(size, size);
  const octx = context2d(own);
  const image = octx.getImageData(0, 0, size, size);
  const d = image.data;
  const out = new Float32Array(4);
  const c = size / 2;
  const reach = g.R - g.outer + 2;
  const y0 = Math.max(0, Math.floor(c - reach));
  const y1 = Math.min(size, Math.ceil(c + reach));
  for (let py = y0; py < y1; py++) {
    const y = py + 0.5 - c;
    for (let px = y0; px < y1; px++) {
      const x = px + 0.5 - c;
      const v = (insetOf(g.shape, g.R, x, y) - g.outer) / w;
      if (v < -0.03 || v > 1.03) continue;
      let t = (Math.atan2(y, x) + Math.PI / 2) / (Math.PI * 2);
      if (t < 0) t += 1;
      const f = t * BINS;
      const i = Math.min(BINS - 1, Math.floor(f));
      const u = (table[i] + (table[i + 1] - table[i]) * (f - i)) / w;
      out[0] = out[1] = out[2] = out[3] = 0;
      shade(u, v, out, x / w, y / w);
      if (out[3] <= 0) continue;
      const p = (py * size + px) * 4;
      d[p] = out[0];
      d[p + 1] = out[1];
      d[p + 2] = out[2];
      d[p + 3] = Math.min(1, out[3]) * 255;
    }
  }
  octx.putImageData(image, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(own as CanvasImageSource, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- noise that wraps round the band

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Value noise (0–1) whose lattice repeats every `n` cells along x, so it meets itself all the way round. */
function noise(x: number, y: number, n: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = wrap(ix, n);
  const b = wrap(ix + 1, n);
  const top = hash(a, iy, seed) * (1 - fx) + hash(b, iy, seed) * fx;
  const bottom = hash(a, iy + 1, seed) * (1 - fx) + hash(b, iy + 1, seed) * fx;
  return top * (1 - fy) + bottom * fy;
}

/**
 * Fractal noise (0–1) over `u` along and `v` across, both in band widths,
 * at a feature size of `cell` band widths along (and `cellAcross` across),
 * wrapping at `period` along.
 */
function makeFbm(period: number, cell: number, seed: number, octaves = 4, cellAcross = cell) {
  const n = Math.max(1, Math.round(period / cell));
  const k = n / period;
  const kv = 1 / cellAcross;
  return (u: number, v: number) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += noise(u * k * f, v * kv * f, n * f, seed + o * 1013) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

/**
 * Cells round seeded points (one per lattice cell, wrapping along):
 * the nearest point's distance (f1), the second's (f2), and the nearest
 * cell's id, at a cell size of `cell` band widths.
 */
function makeCells(period: number, cell: number, seed: number, jitter = 0.9) {
  const n = Math.max(2, Math.round(period / cell));
  const k = n / period;
  const res = { f1: 0, f2: 0, id: 0, cx: 0, cy: 0 };
  return (u: number, v: number) => {
    const x = u * k;
    const y = v * k;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    res.f1 = res.f2 = 9;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const gx = wrap(ix + i, n);
        const gy = iy + j;
        const px = ix + i + 0.5 + (hash(gx, gy, seed) - 0.5) * jitter;
        const py = gy + 0.5 + (hash(gx, gy, seed + 77) - 0.5) * jitter;
        const d = Math.hypot(px - x, py - y);
        if (d < res.f1) {
          res.f2 = res.f1;
          res.f1 = d;
          res.id = gx * 7919 + gy * 104729;
          res.cx = px;
          res.cy = py;
        } else if (d < res.f2) res.f2 = d;
      }
    return res;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => fade(clamp01((v - a) / (b - a)));

function rgbOf(hex: string): [number, number, number] {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A colour ramp: `t` (0–1) picks between colour stops. */
function ramp(stops: [number, [number, number, number]][]) {
  return (t: number, out: Float32Array) => {
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    const k = clamp01((t - a) / (b - a || 1));
    out[0] = ca[0] + (cb[0] - ca[0]) * k;
    out[1] = ca[1] + (cb[1] - ca[1]) * k;
    out[2] = ca[2] + (cb[2] - ca[2]) * k;
  };
}

/** The light in the band's own frame at a pixel (x along the band at the top), from its position in band widths. */
function lightFrom(light: number): [number, number, number] {
  const v = lightVector(light);
  const el = (40 * Math.PI) / 180;
  return [v.x * Math.cos(el), v.y * Math.cos(el), Math.sin(el)];
}

// ---------------------------------------------------------------- pixel textures

/**
 * Crystal facets: the band broken into flat crystal faces, each tilted its
 * own way and lit by the stage's light, with bright edges and a few glints.
 * `color` is the crystal's colour.
 */
export function crystal(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const base = rgbOf(o.color);
  const deep = rgbOf(shade(o.color, -0.55));
  const L = lightFrom(o.light);
  pixels(ctx, g, size, (period) => {
    const cells = makeCells(period, 0.42 * o.scale, o.seed, 1);
    const fine = makeCells(period, 0.12 * o.scale, o.seed + 9);
    return (u, v, out) => {
      const c = cells(u, v);
      const id = c.id;
      // Each face's slope: a random tilt in screen directions (x, y are band widths from the centre).
      const tx = (hash(id, 1, o.seed) - 0.5) * 2.2;
      const ty = (hash(id, 2, o.seed) - 0.5) * 2.2;
      const nl = Math.hypot(tx, ty, 1);
      const lit = (tx * L[0] + ty * L[1] + L[2]) / nl;
      const spec = Math.max(0, lit) ** 18;
      const depth = hash(id, 3, o.seed);
      const edge = 1 - smooth(0, 0.07, c.f2 - c.f1);
      const k = clamp01(0.1 + lit * 1.05);
      for (let i = 0; i < 3; i++) out[i] = deep[i] + (base[i] - deep[i]) * k * (0.8 + depth * 0.4);
      // Bright edges where faces meet, and a sparkle off faces that face the light.
      const f = fine(u, v);
      const glint = spec * 1.2 + edge * 0.55 + (1 - smooth(0, 0.05, f.f2 - f.f1)) * 0.12;
      for (let i = 0; i < 3; i++) out[i] = out[i] + (255 - out[i]) * clamp01(glint);
      out[3] = clamp01((0.78 + edge * 0.2 + spec * 0.2) * o.strength) * edgeFade(v);
    };
  });
}

/** Softens a pixel texture where it meets the edge of its part of the band. */
const edgeFade = (v: number) => smooth(-0.03, 0.02, v) * smooth(1.03, 0.98, v);

/**
 * Molten lava: slow swirls of glowing rock under a cooling crust. `color`
 * is the glow; `color2` the crust (null: nearly black).
 */
export function lava(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const hot = rgbOf(o.color);
  const crust = rgbOf(o.color2 ?? shade(o.color, -0.92));
  const colour = ramp([
    [0, crust],
    [0.35, rgbOf(mix(o.color2 ?? '#120404', o.color, 0.35))],
    [0.6, hot],
    [0.85, rgbOf(mix(o.color, '#ffe070', 0.7))],
    [1, [255, 250, 220]],
  ]);
  pixels(ctx, g, size, (period) => {
    const warp = makeFbm(period, 0.9 * o.scale, o.seed + 5, 3);
    const heat = makeFbm(period, 0.45 * o.scale, o.seed, 5);
    const cells = makeCells(period, 0.35 * o.scale, o.seed + 31);
    return (u, v, out) => {
      const wu = u + (warp(u, v) - 0.5) * 1.2 * o.scale;
      const wv = v + (warp(u + 31.7, v) - 0.5) * 0.6 * o.scale;
      // Hot rivers between crusted plates, brighter where the noise is high.
      const c = cells(wu, wv);
      const river = 1 - smooth(0, 0.18 * o.amount, c.f2 - c.f1);
      const h = clamp01((heat(wu, wv) - 0.3) * 1.6) * 0.55 + river * 0.6;
      colour(clamp01(h), out);
      out[3] = clamp01(o.strength) * edgeFade(v);
    };
  });
}

/**
 * Smoke and wisps: thin streams curling along the band, brightest along
 * their middles. `color` is the wisps; `color2` a soft haze behind them.
 */
export function smoke(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const wisp = rgbOf(o.color);
  const haze = o.color2 ? rgbOf(o.color2) : null;
  pixels(ctx, g, size, (period) => {
    const warp = makeFbm(period, 1.2 * o.scale, o.seed + 3, 3);
    // Long along the band, thin across it.
    const flow = makeFbm(period, 1.8 * o.scale, o.seed, 4, 0.36 * o.scale);
    const cloud = makeFbm(period, 0.5 * o.scale, o.seed + 11, 4);
    const mist = makeFbm(period, 0.7 * o.scale, o.seed + 13, 4);
    return (u, v, out) => {
      const bend = (warp(u, v) - 0.5) * 2.5;
      const s = flow(u, v + bend * 0.36 * o.scale);
      // Thin bright lines where the flow crosses each level: the wisps.
      const lines = 3 * o.amount;
      const f = s * lines;
      const ridge = 1 - Math.abs(f - Math.round(f)) * 2;
      const w = ridge ** 6 * smooth(0.25, 0.7, cloud(u, v));
      let a = w * 0.9;
      out[0] = wisp[0];
      out[1] = wisp[1];
      out[2] = wisp[2];
      if (haze) {
        const h = smooth(0.35, 0.8, mist(u, v)) * 0.6;
        const k = w / (w + h * (1 - w) || 1);
        for (let i = 0; i < 3; i++) out[i] = haze[i] + (wisp[i] - haze[i]) * k;
        a = w + h * (1 - w);
      }
      out[3] = clamp01(a * o.strength) * edgeFade(v);
    };
  });
}

/**
 * Mottling: blotches of a second colour with flecks, like old gilding,
 * patina or leaf over enamel. `color` is the blotches; `color2` their
 * flecks (null: a lighter shade).
 */
export function mottled(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const blot = rgbOf(o.color);
  const fleck = rgbOf(o.color2 ?? shade(o.color, 0.6));
  const dark = rgbOf(shade(o.color, -0.6));
  pixels(ctx, g, size, (period) => {
    const big = makeFbm(period, 0.35 * o.scale, o.seed, 5);
    const small = makeFbm(period, 0.06 * o.scale, o.seed + 7, 3);
    return (u, v, out) => {
      const m = big(u, v);
      const t = 0.62 - o.amount * 0.12;
      const inside = smooth(t - 0.02, t + 0.04, m);
      const rim = inside * (1 - smooth(t + 0.04, t + 0.12, m));
      const fl = smooth(0.62, 0.72, small(u, v)) * inside;
      for (let i = 0; i < 3; i++) out[i] = blot[i] + (dark[i] - blot[i]) * rim * 0.6 + (fleck[i] - blot[i]) * fl;
      out[3] = clamp01(inside * 0.95 * o.strength) * edgeFade(v);
    };
  });
}

/**
 * Lichen: round colonies with crinkled, paler rims and dark spores, as on
 * old stone. `color` is the lichen.
 */
export function lichen(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const body = rgbOf(o.color);
  const rim = rgbOf(shade(o.color, 0.45));
  const spore = rgbOf(shade(o.color, -0.6));
  pixels(ctx, g, size, (period) => {
    const cells = makeCells(period, 0.4 * o.scale, o.seed, 1);
    const crinkle = makeFbm(period, 0.05 * o.scale, o.seed + 3, 3);
    return (u, v, out) => {
      const c = cells(u, v);
      const keep = hash(c.id, 5, o.seed) < 0.35 + 0.3 * o.amount;
      if (!keep) return;
      const r = (0.25 + hash(c.id, 6, o.seed) * 0.3) + (crinkle(u, v) - 0.5) * 0.18;
      const d = c.f1 / r;
      if (d > 1) return;
      const ring = smooth(0.7, 0.95, d) * (1 - smooth(0.95, 1, d));
      const sp = smooth(0.66, 0.7, crinkle(u * 2, v * 2)) * (1 - ring);
      for (let i = 0; i < 3; i++) out[i] = body[i] + (rim[i] - body[i]) * ring + (spore[i] - body[i]) * sp * 0.8;
      out[3] = clamp01((0.75 + ring * 0.2) * o.strength) * (1 - smooth(0.96, 1, d)) * edgeFade(v);
    };
  });
}

/** Water caustics: a shimmering net of bright lines, as light through rippling water. `color` is the light. */
export function caustics(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const lightC = rgbOf(o.color);
  pixels(ctx, g, size, (period) => {
    const a = makeCells(period, 0.3 * o.scale, o.seed, 1);
    const b = makeCells(period, 0.21 * o.scale, o.seed + 19, 1);
    const warp = makeFbm(period, 0.6 * o.scale, o.seed + 4, 2);
    return (u, v, out) => {
      const wu = u + (warp(u, v) - 0.5) * 0.3;
      const wv = v + (warp(u + 9.1, v) - 0.5) * 0.3;
      const ca = a(wu, wv);
      const l1 = 1 - smooth(0, 0.12 * o.amount, ca.f2 - ca.f1);
      const cb = b(wu + 0.37, wv);
      const l2 = 1 - smooth(0, 0.1 * o.amount, cb.f2 - cb.f1);
      const l = clamp01(l1 * 0.8 + l2 * 0.55);
      out[0] = lightC[0];
      out[1] = lightC[1];
      out[2] = lightC[2];
      out[3] = clamp01(l ** 1.5 * o.strength) * edgeFade(v);
    };
  });
}

/**
 * A nebula: clouds of two colours in deep space, glowing where they are
 * thickest, sprinkled with stars. `color` and `color2` are the clouds'.
 */
export function nebula(ctx: Ctx, g: FrameGeometry, size: number, o: NatureOptions): void {
  const c1 = rgbOf(o.color);
  const c2 = rgbOf(o.color2 ?? '#3a6aff');
  pixels(ctx, g, size, (period) => {
    const warp = makeFbm(period, 0.8 * o.scale, o.seed + 2, 4);
    const dens = makeFbm(period, 0.5 * o.scale, o.seed, 5);
    const hue = makeFbm(period, 1.1 * o.scale, o.seed + 8, 3);
    const stars = makeCells(period, 0.09, o.seed + 40);
    return (u, v, out) => {
      const wu = u + (warp(u, v) - 0.5) * 1.6;
      const wv = v + (warp(u + 5.2, v + 1.3) - 0.5) * 1.6;
      const d = smooth(0.38 - 0.08 * o.amount, 0.8, dens(wu, wv));
      const h = smooth(0.35, 0.65, hue(wu, wv));
      const core = smooth(0.55, 0.95, d);
      for (let i = 0; i < 3; i++) out[i] = c1[i] + (c2[i] - c1[i]) * h + (255 - (c1[i] + (c2[i] - c1[i]) * h)) * core * 0.6;
      let a = d * 0.9;
      const s = stars(u, v);
      if (hash(s.id, 4, o.seed) < 0.3) {
        const star = 1 - smooth(0.02, 0.07, s.f1);
        if (star > 0) {
          for (let i = 0; i < 3; i++) out[i] = out[i] + (255 - out[i]) * star;
          a = a + star * (1 - a);
        }
      }
      out[3] = clamp01(a * o.strength) * edgeFade(v);
    };
  });
}

// ---------------------------------------------------------------- drawn textures

/** A point `across` pixels in from a point on the band. */
const inward = (p: { x: number; y: number; angle: number }, across: number) => ({ x: p.x - Math.sin(p.angle) * across, y: p.y + Math.cos(p.angle) * across });

/**
 * Feathers: plumes lying diagonally across the band, overlapping like
 * fletching or a raven's wing, each a curved quill with fine barbs. `color`
 * is the feathers'; they are lit on the side facing the light.
 */
export function feathers(ctx: Ctx, g: FrameGeometry, o: NatureOptions): void {
  const w = bandWidthPx(g);
  const random = seededRandom(o.seed);
  ctx.lineCap = 'round';
  const pts = alongBand(g, countFor(g, (w * 0.28) / o.amount));
  for (const p of pts) {
    const l = lightAt(p, o.light);
    atPoint(ctx, p, () => {
      const len = w * (0.75 + random() * 0.5) * o.scale;
      const lean = (0.6 + (random() - 0.5) * 0.7) * (random() < 0.2 ? -1 : 1);
      const bow = (random() - 0.5) * 0.9;
      const start = { x: -Math.cos(lean) * len * 0.5, y: (random() - 0.5) * w * 0.4 + Math.sin(lean) * len * 0.45 };
      const dir = { x: Math.cos(lean), y: -Math.sin(lean) };
      const at = (t: number) => ({
        x: start.x + dir.x * len * t - dir.y * bow * len * t * (1 - t),
        y: start.y + dir.y * len * t + dir.x * bow * len * t * (1 - t),
      });
      const tone = 0.75 + random() * 0.5;
      // Lit or shaded as a whole: plumes facing the light are lighter.
      const facing = -l.y * 0.5 + 0.5;
      const barbs = Math.round(20 * o.scale + 8);
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 2; i < barbs; i++) {
          const t = i / barbs;
          const q = at(t);
          const q2 = at(Math.min(1, t + 0.01));
          const ta = Math.atan2(q2.y - q.y, q2.x - q.x);
          const width = len * 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8;
          const a = ta + side * (2.35 + (random() - 0.5) * 0.25);
          const bend = side * 0.25;
          const ex = q.x + Math.cos(a) * width;
          const ey = q.y + Math.sin(a) * width;
          const light = side === (l.x > 0 ? 1 : -1) ? 0.25 : -0.15;
          ctx.strokeStyle = rgba(shade(o.color, (light + facing * 0.3 - 0.15) * tone), Math.min(1, 0.4 * o.strength * tone));
          ctx.lineWidth = Math.max(0.35, w * 0.016 * Math.sqrt(o.scale));
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.quadraticCurveTo((q.x + ex) / 2 + Math.cos(a + bend) * width * 0.15, (q.y + ey) / 2 + Math.sin(a + bend) * width * 0.15, ex, ey);
          ctx.stroke();
        }
      }
      // The quill.
      ctx.strokeStyle = rgba(shade(o.color, 0.45 * tone), Math.min(1, 0.6 * o.strength));
      ctx.lineWidth = Math.max(0.5, w * 0.014);
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const q = at(i / 12);
        if (i) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      }
      ctx.stroke();
    });
  }
}

/**
 * Filigree: scrolling tendrils that curl into spirals, chased into metal
 * with a dark groove and a lit edge. `color` is the metal's colour.
 */
export function filigree(ctx: Ctx, g: FrameGeometry, o: NatureOptions): void {
  const w = bandWidthPx(g);
  const random = seededRandom(o.seed);
  const v = lightVector(o.light);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const step = w * 0.7 * o.scale;
  const n = countFor(g, step / o.amount);
  const centres = alongBand(g, n);
  // Each scroll: a spiral curling one way, the next the other way, joined by an S-curve stem.
  const groove = (draw: () => void) => {
    for (const [dx, dy, colour, width] of [
      [-v.x * w * 0.02, -v.y * w * 0.02, rgba(shade(o.color, 0.6), Math.min(1, 0.55 * o.strength)), 0.045],
      [0, 0, rgba(shade(o.color, -0.7), Math.min(1, 0.6 * o.strength)), 0.035],
    ] as const) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.strokeStyle = colour;
      ctx.lineWidth = Math.max(0.5, w * width * Math.sqrt(o.scale));
      draw();
      ctx.restore();
    }
  };
  centres.forEach((p, i) => {
    const flip = i % 2 ? 1 : -1;
    const s = step / o.amount;
    const turns = 1.4 + random() * 0.5;
    const r0 = Math.min(w * 0.36, s * 0.42) * (0.85 + random() * 0.3);
    atPoint(ctx, p, () => {
      groove(() => {
        // The spiral, centred a little to one side of the middle.
        ctx.beginPath();
        const cy = flip * w * 0.08;
        for (let k = 0; k <= 60; k++) {
          const t = k / 60;
          const a = flip * t * turns * Math.PI * 2;
          const r = r0 * (1 - t * 0.85);
          const x = Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * 0.9;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
        // The stem on to the next scroll, crossing the band.
        ctx.beginPath();
        ctx.moveTo(r0, cy);
        ctx.bezierCurveTo(r0 + s * 0.3, cy, s - r0 - s * 0.3, -cy, s - r0, -cy);
        ctx.stroke();
        // A small leaf curling off the stem.
        ctx.beginPath();
        ctx.moveTo(s * 0.5, 0);
        ctx.quadraticCurveTo(s * 0.55, -flip * w * 0.3, s * 0.4, -flip * w * 0.36);
        ctx.stroke();
      });
    });
  });
}

/**
 * Arcane circuitry: glowing traces running along the band in lanes,
 * stepping between lanes at 45°, ending in round nodes. `color` is the glow.
 */
export function circuit(ctx: Ctx, g: FrameGeometry, o: NatureOptions): void {
  const w = bandWidthPx(g);
  const random = seededRandom(o.seed);
  const lanes = Math.max(2, Math.round(4 / o.scale));
  const lane = (k: number) => (k + 0.5) / lanes;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const unit = w / lanes;
  const steps = countFor(g, unit);
  const rows = Array.from({ length: lanes }, (_v, k) => alongBand(g, steps, lane(k)));
  const tracks = Math.round((countFor(g, w * 1.2) * lanes * o.amount) / 2);
  for (let t = 0; t < tracks; t++) {
    let k = Math.floor(random() * lanes);
    const start = Math.floor(random() * steps);
    const length = 3 + Math.floor(random() * 10);
    const pts: Point[] = [];
    for (let s = 0; s < length; s++) {
      const p = rows[k][(start + s) % steps];
      pts.push(p);
      if (random() < 0.25) k = Math.max(0, Math.min(lanes - 1, k + (random() < 0.5 ? -1 : 1)));
    }
    for (const [width, alpha] of [
      [0.16, 0.18],
      [0.07, 0.9],
    ] as const) {
      ctx.strokeStyle = rgba(o.color, Math.min(1, alpha * o.strength));
      ctx.lineWidth = Math.max(0.5, unit * width);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    for (const p of [pts[0], pts[pts.length - 1]]) {
      ctx.fillStyle = rgba(o.color, Math.min(1, 0.95 * o.strength));
      ctx.beginPath();
      ctx.arc(p.x, p.y, unit * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(shade(o.color, -0.8), Math.min(1, o.strength));
      ctx.beginPath();
      ctx.arc(p.x, p.y, unit * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Bubbles: round cells of every size crowded together, each with a rim, a
 * soft inside and a glint on the side facing the light, like foam, spawn
 * or something alive. `color` is the bubbles'.
 */
export function bubbles(ctx: Ctx, g: FrameGeometry, o: NatureOptions): void {
  const w = bandWidthPx(g);
  const random = seededRandom(o.seed);
  const v = lightVector(o.light);
  for (const p of alongBand(g, countFor(g, (w * 0.14) / o.amount))) {
    const c = inward(p, (random() - 0.5) * w * 0.95);
    const r = w * (0.04 + random() ** 2 * 0.16) * o.scale;
    const inside = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r);
    inside.addColorStop(0, rgba(o.color, 0.08 * o.strength));
    inside.addColorStop(0.8, rgba(o.color, 0.3 * o.strength));
    inside.addColorStop(1, rgba(shade(o.color, 0.4), Math.min(1, 0.75 * o.strength)));
    ctx.fillStyle = inside;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(o.color, -0.5), Math.min(1, 0.5 * o.strength));
    ctx.lineWidth = Math.max(0.4, r * 0.08);
    ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', Math.min(1, 0.7 * o.strength));
    ctx.beginPath();
    ctx.ellipse(c.x + v.x * r * 0.45, c.y + v.y * r * 0.45, r * 0.22, r * 0.12, Math.atan2(v.y, v.x) + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Eyes: watching eyes of every size scattered over the band, some half
 * shut, each turned a little. `color` is their irises; the whites are a
 * pale shade of `color2` (null: bone).
 */
export function eyes(ctx: Ctx, g: FrameGeometry, o: NatureOptions): void {
  const w = bandWidthPx(g);
  const random = seededRandom(o.seed);
  const white = o.color2 ?? '#efe6d0';
  for (const p of alongBand(g, countFor(g, (w * 0.55) / o.amount))) {
    const across = (random() - 0.5) * w * 0.6;
    const q = inward(p, across);
    const size = w * (0.12 + random() ** 1.5 * 0.2) * o.scale;
    const open = 0.35 + random() * 0.65;
    const lookX = (random() - 0.5) * 0.5;
    const lookY = (random() - 0.5) * 0.3;
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(p.angle + (random() - 0.5) * 0.6);
    const lid = () => {
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.quadraticCurveTo(0, -size * open * 1.1, size, 0);
      ctx.quadraticCurveTo(0, size * open * 1.1, -size, 0);
      ctx.closePath();
    };
    // A dark socket round it.
    ctx.fillStyle = rgba('#000000', Math.min(1, 0.4 * o.strength));
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.25, size * (open * 0.75 + 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
    lid();
    ctx.fillStyle = rgba(white, Math.min(1, o.strength));
    ctx.fill();
    ctx.save();
    lid();
    ctx.clip();
    const ix = lookX * size;
    const iy = lookY * size * open;
    const ir = size * 0.48;
    const iris = ctx.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir);
    iris.addColorStop(0, rgba(shade(o.color, 0.5), Math.min(1, o.strength)));
    iris.addColorStop(1, rgba(shade(o.color, -0.35), Math.min(1, o.strength)));
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#050505', Math.min(1, o.strength));
    ctx.beginPath();
    ctx.ellipse(ix, iy, ir * 0.18, ir * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', Math.min(1, 0.8 * o.strength));
    ctx.beginPath();
    ctx.arc(ix - ir * 0.3, iy - ir * 0.35, ir * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    lid();
    ctx.strokeStyle = rgba(shade(white, -0.75), Math.min(1, 0.8 * o.strength));
    ctx.lineWidth = Math.max(0.5, size * 0.1);
    ctx.stroke();
    ctx.restore();
  }
}
