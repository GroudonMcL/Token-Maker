// Every effect (DESIGN.md §6.8) as a function of (settings, size, seed,
// time): a painter takes an EffectScene — the effect's settings, the token's
// geometry in pixels, seeded random numbers and the time — and returns the
// passes to draw. Nothing here reads anything else, so an effect looks the
// same every time and at every size. Time is always 0 for now; it is used
// where animation would move things (flames flicker, embers rise, sparkles
// twinkle, lightning re-strikes), so animation can be added later without
// rewriting these.

import { OVERLAY_BASE_SIZE } from '../document/defaults';
import type { EffectKind, EffectLayer } from '../document/types';
import { newCanvas } from '../image/processedArt';
import { rgba, shade } from './color';
import type { EdgePoint, EffectScene } from './effects';
import { paintOverlay, type OverlayKind, type OverlayParams } from './overlays';
import { effectPicture } from './pictureLibrary';
import type { RenderSource } from './render';
import { tracePolygon, type Ctx } from './frameKit';
import { shapePolygon, type Point } from './shapes';
import { shadowOnly, traceBeyond } from './effectKit';
import { EFFECT_STYLES } from './effectStyles';

/** One drawing step of an effect. */
export interface Pass {
  paint: (ctx: Ctx) => void;
  /** How it mixes with what's under it (default: normal). */
  op?: GlobalCompositeOperation;
  /** Multiplies the effect's Intensity. */
  alpha?: number;
  /**
   * 'area': kept inside the area it tints (the opening, or the frame band on
   * the border). Otherwise inside the opening, or anywhere in the square on
   * the border.
   */
  clip?: 'area';
  /** Draw straight onto the token instead of through a cached layer (cheap flat fills). */
  direct?: boolean;
}

export type Painter = (s: EffectScene) => Pass[];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const UP: Point = { x: 0, y: -1 };

/**
 * How much of an edge point an effect covers, 0…1. Spread 100 % goes all
 * the way round; less keeps to the bottom, as rising things (fire, mist)
 * would.
 */
function coverage(s: EffectScene, low: number): number {
  const threshold = 1 - s.spread * 1.1;
  return clamp01((low - threshold) / 0.25 + 0.5);
}

/** Points on the edge with how much each is covered, skipping uncovered ones. */
function coveredEdge(s: EffectScene, spacing: number): (EdgePoint & { w: number })[] {
  return s
    .edge(s.edgeLength / Math.max(1, spacing))
    .map((p) => ({ ...p, w: coverage(s, p.low) }))
    .filter((p) => p.w > 0.04);
}

function normalize(v: Point): Point {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** The way flames, mist and smoke go: out from the edge, bent upwards. */
function rising(s: EffectScene, p: EdgePoint, lift: number): Point {
  return normalize({ x: p.nx * (s.border ? 1 : 0.45) + UP.x * lift, y: p.ny * (s.border ? 1 : 0.45) + UP.y * lift });
}

/** A soft round blob, stretched sideways by `stretch`. */
function puff(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number, stretch = 1, angle = 0): void {
  if (r <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(stretch, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.6));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- Glows ----

const outerGlow: Painter = (s) => {
  const { fx, reach, spread } = s;
  const blur = reach * (1 - spread * 0.6);
  const choke = reach * spread * 0.55;
  return [
    {
      paint: (ctx) => {
        if (s.border) {
          const outline = shapePolygon(s.area.shape, s.area.R, s.area.bandOuter);
          for (let i = 0; i < 2; i++) {
            shadowOnly(ctx, s, fx.color, blur, (c) => {
              tracePolygon(c, outline);
              c.fillStyle = '#000';
              c.fill();
              if (choke > 0) {
                c.lineWidth = choke * 2;
                c.lineJoin = 'round';
                c.strokeStyle = '#000';
                c.stroke();
              }
            });
          }
          // Only outside the token.
          ctx.globalCompositeOperation = 'destination-out';
          tracePolygon(ctx, outline);
          ctx.fill();
          return;
        }
        // Inside the opening: a halo round the art's own outline (a cut-out creature).
        const subject = s.subject;
        if (!subject) return;
        const R = s.area.R;
        const around = (c: Ctx) => {
          c.drawImage(subject, -R, -R, R * 2, R * 2);
          if (choke > 0) {
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2;
              c.drawImage(subject, -R + Math.cos(a) * choke, -R + Math.sin(a) * choke, R * 2, R * 2);
            }
          }
        };
        for (let i = 0; i < 2; i++) {
          // The colour comes from the shadow; the art's own colours are drawn far away.
          shadowOnly(ctx, s, fx.color, blur, around);
        }
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(subject, -R, -R, R * 2, R * 2);
      },
    },
  ];
};

const innerGlow: Painter = (s) => [
  {
    clip: 'area',
    paint: (ctx) => {
      const blur = s.reach * (1 - s.spread * 0.6);
      const choke = s.reach * s.spread * 0.55;
      for (let i = 0; i < 2; i++) {
        shadowOnly(ctx, s, s.fx.color, blur, (c) => {
          c.beginPath();
          traceBeyond(c, s);
          s.traceArea(c);
          c.fillStyle = '#000';
          c.fill('evenodd');
          if (choke > 0) {
            c.beginPath();
            s.traceArea(c);
            c.lineWidth = choke * 2;
            c.lineJoin = 'round';
            c.strokeStyle = '#000';
            c.stroke();
          }
        });
      }
    },
  },
];

// ---- Atmosphere ----

const mist: Painter = (s) => {
  const { fx, reach } = s;
  return [
    {
      paint: (ctx) => {
        const random = s.random(1);
        // On the border it wreathes the band rather than filling the square.
        const k0 = s.border ? 0.45 : 1;
        for (const p of coveredEdge(s, reach * 0.18 * k0)) {
          for (let k = 0; k < 2; k++) {
            const d = reach * k0 * (random() - (s.border ? 0.5 : 0)) * 0.8;
            const dir = rising(s, p, s.border ? 0 : 0.6);
            const r = reach * k0 * (0.3 + random() * 0.35) * (0.5 + 0.5 * p.w);
            const angle = Math.atan2(p.ny, p.nx) + Math.PI / 2;
            puff(ctx, p.x + dir.x * d + s.time * reach * 0.25, p.y + dir.y * d, r, fx.color, 0.32 * p.w, 2.2, s.border ? angle : 0);
          }
        }
      },
    },
  ];
};

const smoke: Painter = (s) => {
  const { fx, reach } = s;
  return [
    {
      paint: (ctx) => {
        const random = s.random(1);
        const k0 = s.border ? 0.5 : 1;
        for (const p of coveredEdge(s, reach * 0.45 * k0)) {
          const dir = rising(s, p, s.border ? 0.5 : 1);
          const d = reach * k0 * random() * 0.9;
          const x = p.x + dir.x * d;
          const y = p.y + dir.y * d - s.time * reach * 0.4;
          const r = reach * k0 * (0.3 + random() * 0.3) * (0.5 + 0.5 * p.w);
          for (let k = 0; k < 4; k++) {
            const a = random() * Math.PI * 2;
            const tone = shade(fx.color, (random() - 0.5) * 0.35);
            puff(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.4, r * (0.6 + random() * 0.5), tone, 0.3 * p.w);
          }
          // A wisp curling up from it.
          if (random() < 0.4) {
            ctx.strokeStyle = rgba(fx.color, 0.22);
            ctx.lineWidth = Math.max(0.5, reach * 0.05);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + reach * 0.3, y - reach * 0.4, x - reach * 0.25, y - reach * 0.7, x + reach * 0.1, y - reach);
            ctx.stroke();
          }
        }
      },
    },
  ];
};

// ---- Overlays (the Foreground section until v8) ----

/** An overlay effect's settings in the overlay painters' terms: Spread is how far it reaches, Size its scale. */
export function overlayParams(fx: EffectLayer, kind: OverlayKind): OverlayParams {
  return {
    kind,
    color: fx.color,
    size: fx.spread,
    softness: fx.softness,
    angle: fx.angle,
    scale: Math.min(400, Math.max(25, (fx.size / OVERLAY_BASE_SIZE) * 100)),
    seed: fx.seed,
    gradient: fx.gradient,
  };
}

const overlay =
  (kind: OverlayKind): Painter =>
  (s) => [{ paint: (ctx) => paintOverlay(ctx, overlayParams(s.fx, kind), s.box), clip: 'area' }];

// ---- Pictures (v8) ----

const tinted = new WeakMap<object, Map<string, CanvasImageSource>>();

/** The picture coloured with `color` (multiplied, so dark outlines stay dark), cached. */
function tintedPicture(pic: RenderSource, color: string): CanvasImageSource {
  let byColor = tinted.get(pic.image as object);
  if (!byColor) tinted.set(pic.image as object, (byColor = new Map()));
  const hit = byColor.get(color);
  if (hit) return hit;
  const c = newCanvas(pic.width, pic.height);
  const ctx = c.getContext('2d') as Ctx;
  ctx.drawImage(pic.image, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, pic.width, pic.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(pic.image, 0, 0);
  if (byColor.size > 8) byColor.clear();
  byColor.set(color, c as CanvasImageSource);
  return c as CanvasImageSource;
}

/**
 * A picture effect: one copy filling the area, or copies scattered round it
 * (Spread sets how many; 0 = one in the middle). Built-in sprites say how
 * their copies turn: any way, upright, or pointing out of the edge.
 */
const picture: Painter = (s) => {
  const pic = s.picture;
  if (!pic) return [];
  const { fx, box } = s;
  const image = fx.tint ? tintedPicture(pic, fx.color) : pic.image;
  const aspect = pic.width / Math.max(1, pic.height);
  const orient = (fx.image?.type === 'library' && effectPicture(fx.image.id)?.orient) || 'upright';
  return [
    {
      // On the border, pictures (flames, frost, lightning) reach out past the band, like the old drawn fire did.
      clip: s.border && fx.layout !== 'fill' ? undefined : 'area',
      paint: (ctx) => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const cx = (box.minX + box.maxX) / 2;
        const cy = (box.minY + box.maxY) / 2;
        if (fx.layout === 'fill') {
          // Covers the area, like a background picture.
          const bw = box.maxX - box.minX;
          const bh = box.maxY - box.minY;
          const k = Math.max(bw / pic.width, bh / pic.height);
          ctx.drawImage(image, cx - (pic.width * k) / 2, cy - (pic.height * k) / 2, pic.width * k, pic.height * k);
          return;
        }
        const h = Math.max(2, fx.size * s.area.unit * 2);
        const draw = (x: number, y: number, size: number, turn: number, alpha: number) => {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(x, y);
          ctx.rotate(turn);
          ctx.drawImage(image, (-size * aspect) / 2, -size / 2, size * aspect, size);
          ctx.restore();
        };
        const count = Math.round((s.spread * 100) / 4);
        if (count === 0) {
          draw(cx, cy, h, 0, 1);
          return;
        }
        const random = s.random(31);
        for (let i = 0; i < count; i++) {
          const size = h * (0.65 + random() * 0.7);
          const alpha = 0.7 + random() * 0.3;
          if (orient === 'outward') {
            // Along the edge, pointing away from it (out of the token on the border, in from the edge inside).
            const p = s.at((i + random() * 0.6) / count);
            draw(p.x + p.nx * size * 0.3, p.y + p.ny * size * 0.3, size, Math.atan2(p.ny, p.nx) + Math.PI / 2, alpha);
          } else {
            const p = s.scatter(random);
            draw(p.x, p.y, size, orient === 'random' ? random() * Math.PI * 2 : 0, alpha);
          }
        }
      },
    },
  ];
};

/**
 * An effect with several looks (effectStyles.ts): draws the one its Style
 * picks, or the classic look for the first style, an unknown one, or where
 * the picked look doesn't apply.
 */
function styled(kind: EffectKind, classic: Painter): Painter {
  const styles = EFFECT_STYLES[kind];
  if (!styles) return classic;
  return (s) => styles.find((x) => x.id === s.fx.style)?.paint?.(s) ?? classic(s);
}

export const PAINTERS: Record<EffectKind, Painter> = {
  innerGlow: styled('innerGlow', innerGlow),
  outerGlow: styled('outerGlow', outerGlow),
  mist: styled('mist', mist),
  smoke: styled('smoke', smoke),
  vignette: overlay('vignette'),
  gradient: overlay('gradient'),
  edgeShadow: styled('edgeShadow', overlay('shadow')),
  picture,
};
