// The outlines of the shape layer's shapes added in version 11, as points
// in a −1…1 box (x along, y in; "up", −y, points outwards on the band).
// The renderer scales them to the layer's width and height. Curves are
// sampled finely, so the same points serve for drawing, faceting and
// "Turn into a path".

import { seededRandom } from '../engine/legacy/frameKit';
import type { Point } from '../engine/legacy/shapes';
import type { ShapeKind, ShapeLayer } from '../project/types';

/** The shapes drawn from the outlines in this file. */
export type OutlinedShape = Exclude<ShapeKind, 'circle' | 'rectangle' | 'polygon' | 'star' | 'ornament'>;

const TAU = Math.PI * 2;

/** Points round a curve, `n` of them, from `f(t)` for t in 0…1 (the last left out on a closed curve). */
const curve = (n: number, f: (t: number) => Point, closed = true): Point[] => Array.from({ length: closed ? n : n + 1 }, (_v, i) => f(i / n));

/** A circle (or arc) of radius `r` round (cx, cy), from angle a0 to a1 (radians, 0 = right, clockwise on screen). */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): Point[] =>
  curve(n, (t) => ({ x: cx + Math.cos(a0 + (a1 - a0) * t) * r, y: cy + Math.sin(a0 + (a1 - a0) * t) * r }), false);

/** Fits points into the −1…1 box (keeping their proportions when `keep`), centred. */
function fit(points: Point[], keep = false): Point[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let kx = 2 / (x1 - x0 || 1);
  let ky = 2 / (y1 - y0 || 1);
  if (keep) kx = ky = Math.min(kx, ky);
  return points.map((p) => ({ x: (p.x - (x0 + x1) / 2) * kx, y: (p.y - (y0 + y1) / 2) * ky }));
}

/** The outline of a version-11 shape in the −1…1 box (a ring's outer edge; its hole is `ringHole`). */
export function unitOutline(layer: Pick<ShapeLayer, 'shape' | 'sides' | 'innerRatio' | 'corner' | 'seed'>): Point[] {
  const t = Math.max(0.05, Math.min(0.95, layer.innerRatio));
  const n = Math.max(3, Math.round(layer.sides));
  switch (layer.shape as OutlinedShape) {
    case 'ring':
      return arc(0, 0, 1, -Math.PI / 2, -Math.PI / 2 + TAU, 64).slice(0, -1);
    case 'crescent': {
      // A disc with a disc of the same size cut from it, the cut moved outwards: the horns point out.
      const shift = 0.3 + t * 1.5;
      const h = Math.sqrt(Math.max(0, 1 - (shift / 2) ** 2));
      const a = Math.atan2(-shift / 2, h);
      const outer = arc(0, 0, 1, a, Math.PI - a, 40);
      const inner = arc(0, -shift, 1, Math.PI - Math.atan2(shift / 2, h), Math.atan2(shift / 2, h), 40);
      return fit([...outer, ...inner.slice(1, -1)], true);
    }
    case 'semicircle':
      return fit([...arc(0, 0, 1, Math.PI, TAU, 40)], true);
    case 'teardrop':
      // Rounded at the bottom, coming to a point outwards.
      return fit(curve(64, (u) => ({ x: Math.sin(u * TAU) * Math.sin((u * TAU) / 2) ** (0.6 + t), y: -Math.cos(u * TAU) })));
    case 'lens': {
      // Two arcs meeting in points at the top and bottom (a vesica, an almond).
      const w = 0.55;
      const cx = (w * w - 1) / (2 * w);
      const r = w - cx;
      const a = Math.atan2(1, -cx);
      const right = arc(cx, 0, r, -a, a, 32);
      const left = right.map((p) => ({ x: -p.x, y: -p.y }));
      return fit([...right, ...left.slice(1, -1)], true);
    }
    case 'cross': {
      const k = t * 0.9;
      return [
        [-k, -1], [k, -1], [k, -k], [1, -k], [1, k], [k, k], [k, 1], [-k, 1], [-k, k], [-1, k], [-1, -k], [-k, -k],
      ].map(([x, y]) => ({ x, y }));
    }
    case 'arch': {
      // Upright sides and a round top; `corner` sharpens the top into a pointed (Gothic) arch.
      const rho = 1 + layer.corner * 2;
      const apex = -Math.sqrt(rho * rho - (rho - 1) ** 2);
      const a0 = Math.PI;
      const a1 = Math.atan2(apex, 1 - rho);
      const left = arc(rho - 1, 0, rho, a0, a1 < 0 ? a1 + TAU : a1, 24);
      const right = left.map((p) => ({ x: -p.x, y: p.y })).reverse();
      const top = [...left, ...right.slice(1)];
      const k = 1 / -apex;
      return [{ x: -1, y: 1 }, ...top.map((p) => ({ x: p.x, y: -1 + (p.y - apex) * k })), { x: 1, y: 1 }];
    }
    case 'trapezoid':
      return [{ x: -t, y: -1 }, { x: t, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
    case 'chevron': {
      const k = Math.min(1.6, t * 1.6);
      return [{ x: 0, y: -1 }, { x: 1, y: 1 - k }, { x: 1, y: 1 }, { x: 0, y: -1 + k }, { x: -1, y: 1 }, { x: -1, y: 1 - k }];
    }
    case 'flower':
      return curve(n * 24, (u) => {
        const a = -Math.PI / 2 + u * TAU;
        const r = 1 - t + t * Math.abs(Math.cos((n * (a + Math.PI / 2)) / 2)) ** 0.7;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      });
    case 'squircle': {
      const p = 2.5 + (1 - layer.corner) * 5.5;
      return curve(72, (u) => {
        const a = u * TAU;
        const c = Math.cos(a);
        const s = Math.sin(a);
        return { x: Math.sign(c) * Math.abs(c) ** (2 / p), y: Math.sign(s) * Math.abs(s) ** (2 / p) };
      });
    }
    case 'burst': {
      // A star whose points are each a different length and a little off true.
      const random = seededRandom(layer.seed * 7919 + 17);
      const pts = Array.from({ length: n * 2 }, (_v, i) => {
        const a = -Math.PI / 2 + ((i + (random() - 0.5) * 0.5) * TAU) / (n * 2);
        const r = i % 2 ? t * (0.7 + random() * 0.6) : 0.6 + random() * 0.4;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      });
      return fit(pts, true);
    }
    case 'blob': {
      // A smooth lumpy outline: a few waves of seeded sizes added round a circle.
      const random = seededRandom(layer.seed * 104729 + 3);
      const waves = Array.from({ length: Math.min(8, n) }, (_v, k) => ({ k: k + 2, a: ((0.4 + random() * 0.6) * 0.45 * t) / (k + 2), p: random() * TAU }));
      return fit(
        curve(96, (u) => {
          const a = -Math.PI / 2 + u * TAU;
          const r = 1 + waves.reduce((sum, w) => sum + w.a * Math.sin(w.k * a + w.p), 0);
          return { x: Math.cos(a) * r, y: Math.sin(a) * r };
        }),
        true,
      );
    }
  }
}

/** A ring's hole, wound the other way so a non-zero fill leaves it empty. */
export function ringHole(layer: Pick<ShapeLayer, 'innerRatio'>): Point[] {
  const r = Math.max(0.05, Math.min(0.95, layer.innerRatio));
  return arc(0, 0, r, -Math.PI / 2 + TAU, -Math.PI / 2, 64).slice(0, -1);
}

/** Is it one of the shapes in this file? */
export const isOutlined = (shape: ShapeKind): shape is OutlinedShape => !['circle', 'rectangle', 'polygon', 'star', 'ornament'].includes(shape);
