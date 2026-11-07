// The extra looks (styles) of the drawn effects, picked by the owner in
// round 1 of the effects redesign. Each effect's first style is its classic
// look, drawn by effectPainters.ts; these are the others. A style painter
// returns null where it doesn't apply (for example mist styles on the
// border), and the effect's classic look is drawn instead.

import { mix, rgba, shade } from './color';
import type { EffectKind } from '../document/types';
import type { EdgePoint, EffectScene } from './effects';
import { clamp01, hexRgb, makeNoise, shadowOnly, smoothstep, textureOver, traceBeyond } from './effectKit';
import type { Painter, Pass } from './effectPainters';
import { tracePolygon, type Ctx } from './frameKit';
import { shapePolygon, type Point } from './shapes';

export type StylePainter = (s: EffectScene) => Pass[] | null;

/** A lighter, hotter version of a colour (towards white). */
const hot = (c: string, t = 0.65) => shade(c, t);

/** The token's outer outline. */
const outline = (s: EffectScene) => shapePolygon(s.area.shape, s.area.R, s.area.bandOuter);
/** Half the frame band's width (edge points on the border sit in its middle). */
const halfBand = (s: EffectScene) => (s.area.bandInner - s.area.bandOuter) / 2;

/**
 * What a glow glows round: the token's outline on the border, or the art's
 * own outline (a cut-out creature) inside the opening. Null when there's
 * nothing to glow round.
 */
function silhouette(s: EffectScene): ((c: Ctx, choke: number) => void) | null {
  if (s.border) {
    const poly = outline(s);
    return (c, choke) => {
      tracePolygon(c, poly);
      c.fillStyle = '#000';
      c.fill();
      if (choke > 0) {
        c.lineWidth = choke * 2;
        c.lineJoin = 'round';
        c.strokeStyle = '#000';
        c.stroke();
      }
    };
  }
  const subject = s.subject;
  if (!subject) return null;
  const R = s.area.R;
  return (c, choke) => {
    c.drawImage(subject, -R, -R, R * 2, R * 2);
    if (choke > 0) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        c.drawImage(subject, -R + Math.cos(a) * choke, -R + Math.sin(a) * choke, R * 2, R * 2);
      }
    }
  };
}

/** Removes the glowing thing itself, so the glow is only round it. */
function cutOut(ctx: Ctx, s: EffectScene): void {
  ctx.globalCompositeOperation = 'destination-out';
  if (s.border) {
    tracePolygon(ctx, outline(s));
    ctx.fill();
  } else if (s.subject) {
    ctx.drawImage(s.subject, -s.area.R, -s.area.R, s.area.R * 2, s.area.R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** A blurred halo round the silhouette, drawn `times` times to make it denser. */
function halo(ctx: Ctx, s: EffectScene, shape: (c: Ctx, choke: number) => void, color: string, blur: number, choke: number, times: number): void {
  for (let i = 0; i < times; i++) shadowOnly(ctx, s, color, blur, (c) => shape(c, choke));
}

/** A glow cast inwards from the edge of the area. */
function innerHalo(ctx: Ctx, s: EffectScene, color: string, blur: number, choke: number, times: number): void {
  for (let i = 0; i < times; i++) {
    shadowOnly(ctx, s, color, blur, (c) => {
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
}

// ---- Outer glow ----

/** Radiant: a hot, bright rim inside a wide, soft bloom. */
const outerRadiant: StylePainter = (s) => {
  const shape = silhouette(s);
  if (!shape) return [];
  const { reach } = s;
  const c = s.fx.color;
  const choke = reach * s.spread * 0.35;
  const layer = (color: string, blur: number, k: number, times: number) => (ctx: Ctx) => {
    halo(ctx, s, shape, color, blur, k, times);
    cutOut(ctx, s);
  };
  return [
    { alpha: 0.7, paint: layer(c, reach * 1.5, choke, 2) },
    { alpha: 0.9, paint: layer(c, reach * 0.55, choke, 2) },
    { paint: layer(hot(c, 0.8), reach * 0.18, reach * 0.04, 4) },
  ];
};

/** Rays: a soft halo with rays of light fanning out. On the border only; elsewhere it's Radiant. */
const outerRays: StylePainter = (s) => {
  if (!s.border) return outerRadiant(s);
  const shape = silhouette(s)!;
  const { reach, spread } = s;
  const c = s.fx.color;
  return [
    {
      alpha: 0.85,
      paint: (ctx) => {
        halo(ctx, s, shape, c, reach * 0.5, reach * spread * 0.3, 2);
        cutOut(ctx, s);
      },
    },
    {
      paint: (ctx) => {
        const random = s.random(7);
        const out = halfBand(s);
        for (const p of s.edge(Math.round(28 + spread * 40))) {
          const len = reach * (0.6 + random() * 1.2) * (random() < 0.25 ? 1.4 : 1);
          const wid = reach * (0.05 + random() * 0.09);
          const turn = Math.atan2(p.ny, p.nx) + (random() - 0.5) * 0.12;
          ctx.save();
          ctx.translate(p.x + p.nx * out, p.y + p.ny * out);
          ctx.rotate(turn);
          // Three widths, faint and wide to bright and narrow, make a soft ray.
          for (const [wk, ak] of [
            [4, 0.1],
            [2, 0.2],
            [0.8, 0.45],
          ] as const) {
            const g = ctx.createLinearGradient(0, 0, len, 0);
            g.addColorStop(0, rgba(hot(c, 0.4), ak));
            g.addColorStop(0.35, rgba(c, ak * 0.6));
            g.addColorStop(1, rgba(c, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(-reach * 0.1, -wid * wk);
            ctx.lineTo(len, 0);
            ctx.lineTo(-reach * 0.1, wid * wk);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        cutOut(ctx, s);
      },
    },
  ];
};

/** Tongues of light round the edge points: `amp` how far they reach, `freq` how many, `sharp` how pointed. */
function tongues(s: EffectScene, pts: EdgePoint[], fbm: (x: number, y: number, o?: number) => number, amp: number, freq: number, sharp: number, base: number, sign = 1, least = 0.15, perSpread = 0.35): Point[] {
  const count = pts.length;
  return pts.map((p, i) => {
    const v = fbm((i / count) * freq, 3.3, 4);
    const peak = Math.pow(clamp01((v - 0.25) / 0.6), sharp);
    const d = base + sign * amp * (least + s.spread * perSpread + peak);
    return { x: p.x + p.nx * d, y: p.y + p.ny * d };
  });
}

/** Aura: flickering, uneven tongues of light. On the border only; elsewhere it's Radiant. */
const outerAura: StylePainter = (s) => {
  if (!s.border) return outerRadiant(s);
  const shape = silhouette(s)!;
  const { reach } = s;
  const c = s.fx.color;
  const { fbm } = makeNoise(s.fx.seed * 7919 + 3);
  const pts = s.edge(220);
  const out = halfBand(s);
  const fillShape = (ctx: Ctx, poly: Point[], color: string, blur: number) =>
    shadowOnly(ctx, s, color, blur, (cc) => {
      tracePolygon(cc, poly);
      cc.fillStyle = '#000';
      cc.fill();
    });
  return [
    {
      alpha: 0.6,
      paint: (ctx) => {
        fillShape(ctx, tongues(s, pts, fbm, reach * 1.1, 14, 1.6, out), c, reach * 0.35);
        cutOut(ctx, s);
      },
    },
    {
      alpha: 0.9,
      paint: (ctx) => {
        fillShape(ctx, tongues(s, pts, fbm, reach * 0.6, 23, 2.2, out), mix(c, hot(c), 0.4), reach * 0.16);
        cutOut(ctx, s);
      },
    },
    {
      alpha: 0.9,
      paint: (ctx) => {
        halo(ctx, s, shape, hot(c, 0.75), reach * 0.08, 0, 2);
        cutOut(ctx, s);
      },
    },
  ];
};

// ---- Inner glow ----

/** Bright rim: Radiant turned inwards — a hot line at the edge inside a wide, soft bloom. */
const innerBrightRim: StylePainter = (s) => {
  const { reach } = s;
  const c = s.fx.color;
  const choke = reach * s.spread * 0.35;
  return [
    { clip: 'area', alpha: 0.7, paint: (ctx) => innerHalo(ctx, s, c, reach * 1.5, choke, 2) },
    { clip: 'area', alpha: 0.9, paint: (ctx) => innerHalo(ctx, s, c, reach * 0.55, choke, 2) },
    { clip: 'area', paint: (ctx) => innerHalo(ctx, s, hot(c, 0.8), reach * 0.18, reach * 0.04, 4) },
  ];
};

/** Aura: flickering tongues of light reaching in from the edge (Outer glow's Aura, inwards). Inside the opening only. */
const innerAura: StylePainter = (s) => {
  if (s.border) return null;
  const { reach } = s;
  const c = s.fx.color;
  const { fbm } = makeNoise(s.fx.seed * 7919 + 9);
  const pts = s.edge(220); // inside the opening, these point inwards
  // The area between its edge and a line of tongues.
  const ring = (ctx: Ctx, poly: Point[], color: string, blur: number) =>
    shadowOnly(ctx, s, color, blur, (cc) => {
      cc.beginPath();
      s.traceArea(cc);
      cc.moveTo(poly[0]!.x, poly[0]!.y);
      for (let i = poly.length - 1; i >= 0; i--) cc.lineTo(poly[i]!.x, poly[i]!.y);
      cc.closePath();
      cc.fillStyle = '#000';
      cc.fill('evenodd');
    });
  return [
    { clip: 'area', alpha: 0.6, paint: (ctx) => ring(ctx, tongues(s, pts, fbm, reach, 14, 1.6, 0, 1, 0.1, 0.3), c, reach * 0.3) },
    { clip: 'area', alpha: 0.9, paint: (ctx) => ring(ctx, tongues(s, pts, fbm, reach * 0.55, 23, 2.2, 0, 1, 0.1, 0.3), mix(c, hot(c), 0.4), reach * 0.14) },
    { clip: 'area', alpha: 0.9, paint: (ctx) => innerHalo(ctx, s, hot(c, 0.75), reach * 0.08, reach * 0.02, 2) },
  ];
};

/** Wisps: swirling wisps of light curling in from the edge, thickest there. Inside the opening only. */
const innerWisps: StylePainter = (s) => {
  if (s.border) return null;
  const { reach, box } = s;
  const c = s.fx.color;
  const { fbm } = makeNoise(s.fx.seed * 7919 + 10);
  const edgeR = s.area.R - s.area.opening;
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const base = hexRgb(c);
  const bright = hexRgb(hot(c, 0.7));
  return [
    { clip: 'area', alpha: 0.5, paint: (ctx) => innerHalo(ctx, s, c, reach * 0.5, 0, 2) },
    {
      clip: 'area',
      paint: (ctx) => {
        let heat = 0;
        textureOver(
          ctx,
          box,
          c,
          (u, v) => {
            const x = box.minX + u - cx;
            const y = box.minY + v - cy;
            // How far in from the edge, in units of the glow's reach (round-ish openings).
            const depth = (edgeR - Math.hypot(x, y)) / (reach * (1.6 + s.spread * 1.5));
            const a = Math.atan2(y, x);
            const fx = Math.cos(a) * 2.2;
            const fy = Math.sin(a) * 2.2;
            const w = fbm(fx + 4, fy + depth * 1.5, 4);
            const val = fbm(fx * 1.6 + w * 2, fy * 1.6 + depth * 2.5 - w, 5);
            const ridge = 1 - Math.abs(val - 0.5) * 2;
            const fall = 1 - smoothstep(0, 1, depth);
            heat = Math.pow(ridge, 3);
            return (Math.pow(ridge, 4) * 1.2 + 0.25) * fall * fall;
          },
          220,
          () => [base[0] + (bright[0] - base[0]) * heat, base[1] + (bright[1] - base[1]) * heat, base[2] + (bright[2] - base[2]) * heat],
        );
      },
    },
  ];
};

// ---- Mist and smoke (inside the opening; on the border they fall back to the classic look) ----

/** How high mist and smoke rise, as a fraction of the area's height: Spread 0…1. */
const riseTo = (s: EffectScene) => 0.3 + s.spread * 0.6;

/** Strata: thin, layered bands streaked sideways, low to the ground. */
const mistStrata: StylePainter = (s) => {
  if (s.border) return null;
  const c = s.fx.color;
  const { fbm } = makeNoise(s.fx.seed * 7919 + 1);
  const { box } = s;
  const h = box.maxY - box.minY;
  const top = riseTo(s);
  const feat = s.area.R * Math.max(0.3, s.reach / s.area.R) * 1.6;
  return [
    {
      paint: (ctx) =>
        textureOver(ctx, box, c, (u, v) => {
          const fall = 1 - smoothstep(top * 0.25, top, 1 - v / h);
          const x = u / feat;
          const y = v / (feat * 0.16);
          const warp = fbm(x * 0.7 + 3, y * 0.15, 3) * 2.2;
          const streak = smoothstep(0.38, 0.8, fbm(x * 0.6 + warp, y, 5));
          return 0.3 * fall + 0.95 * streak * fall;
        }),
    },
  ];
};

/** Veil: curling tendrils over the whole picture, thickest low down. */
const mistVeil: StylePainter = (s) => {
  if (s.border) return null;
  const c = s.fx.color;
  const { fbm } = makeNoise(s.fx.seed * 7919 + 6);
  const { box } = s;
  const h = box.maxY - box.minY;
  const top = riseTo(s);
  const feat = s.area.R * Math.max(0.3, s.reach / s.area.R) * 2.2;
  return [
    {
      paint: (ctx) =>
        textureOver(ctx, box, c, (u, v) => {
          const fall = 0.25 + 0.75 * (1 - smoothstep(0, top * 1.2, 1 - v / h));
          const x = u / feat;
          const y = v / (feat * 0.5);
          const wx = fbm(x + 5.2, y + 1.3, 4);
          const wy = fbm(x + 1.7, y + 9.2, 4);
          const val = fbm(x + wx * 1.8, y + wy * 1.8, 5);
          // The ridges of the warped noise make thin, curling strands.
          const ridge = 1 - Math.abs(val - 0.5) * 2;
          return (Math.pow(ridge, 2.5) * 1.1 + smoothstep(0.45, 0.8, val) * 0.5) * fall;
        }),
    },
  ];
};

/** Thick: dense, turbulent smoke with dark and light swirls, rising from the bottom. */
const smokeThick: StylePainter = (s) => {
  if (s.border) return null;
  const c = s.fx.color;
  const { fbm } = makeNoise(s.fx.seed * 7919 + 4);
  const { box } = s;
  const h = box.maxY - box.minY;
  const top = riseTo(s);
  const feat = s.area.R * Math.max(0.3, s.reach / s.area.R) * 0.9;
  const mid = hexRgb(c);
  const light = hexRgb(hot(c, 0.4));
  const dark = hexRgb(shade(c, -0.6));
  const lerp = (a: number[], b: number[], t: number): [number, number, number] => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t];
  return [
    {
      paint: (ctx) => {
        let tone = 0.5;
        textureOver(
          ctx,
          box,
          c,
          (u, v) => {
            const fall = 1 - smoothstep(top * 0.35, top * 1.05, 1 - v / h);
            const x = u / feat;
            const y = v / feat;
            const wx = fbm(x * 1.2 + 2.1, y * 0.8 + 7.7, 4);
            const wy = fbm(x * 1.2 + 8.3, y * 0.8 + 1.1, 4);
            const val = fbm(x + wx * 2.2, y * 0.8 + wy * 2.2, 5);
            tone = smoothstep(0.25, 0.75, fbm(x * 2 + wy, y * 2 + wx, 3));
            return smoothstep(0.3 + (1 - fall) * 0.3, 0.6, val) * fall;
          },
          220,
          () => (tone > 0.5 ? lerp(mid, light, (tone - 0.5) * 2) : lerp(dark, mid, tone * 2)),
        );
      },
    },
  ];
};

// ---- Edge shadow ----

/** Depth: a light darkening all round the rim, deeper on the chosen side. */
const edgeDepth: StylePainter = (s) => {
  const fx = s.fx;
  const reach = (fx.spread / 100) * s.area.R;
  const soft = 0.2 + (fx.softness / 100) * 0.8;
  const a = (fx.angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  return [
    { clip: 'area', alpha: 0.55, paint: (ctx) => innerHalo(ctx, s, fx.color, reach * 0.35 * soft + 1, 0, 2) },
    {
      clip: 'area',
      paint: (ctx) =>
        shadowOnly(
          ctx,
          s,
          fx.color,
          reach * soft * 1.2,
          (c) => {
            c.beginPath();
            traceBeyond(c, s);
            s.traceArea(c);
            c.fillStyle = '#000';
            c.fill('evenodd');
          },
          -dx * reach * 1.1,
          -dy * reach * 1.1,
        ),
    },
  ];
};

/** One look an effect can have. */
export interface EffectStyle {
  id: string;
  name: string;
  /** Absent for the classic look. */
  paint?: StylePainter;
}

/** The looks of each drawn effect that has more than one, classic first (its default). */
export const EFFECT_STYLES: Partial<Record<EffectKind, EffectStyle[]>> = {
  outerGlow: [
    { id: 'soft', name: 'Soft' },
    { id: 'radiant', name: 'Radiant', paint: outerRadiant },
    { id: 'rays', name: 'Rays', paint: outerRays },
    { id: 'aura', name: 'Aura', paint: outerAura },
  ],
  innerGlow: [
    { id: 'soft', name: 'Soft' },
    { id: 'brightRim', name: 'Bright rim', paint: innerBrightRim },
    { id: 'aura', name: 'Aura', paint: innerAura },
    { id: 'wisps', name: 'Wisps', paint: innerWisps },
  ],
  mist: [
    { id: 'haze', name: 'Haze' },
    { id: 'strata', name: 'Strata', paint: mistStrata },
    { id: 'veil', name: 'Veil', paint: mistVeil },
  ],
  smoke: [
    { id: 'puffs', name: 'Puffs' },
    { id: 'thick', name: 'Thick', paint: smokeThick },
  ],
  edgeShadow: [
    { id: 'flat', name: 'Flat' },
    { id: 'depth', name: 'Depth', paint: edgeDepth },
  ],
};

// ---- Light (round 2: the opposites of Edge shadow) ----

/** The unit vector towards the effect's Side (angle; 90 = bottom). */
function towards(s: EffectScene): { x: number; y: number } {
  const a = (s.fx.angle * Math.PI) / 180;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Edge light: a band of light coming in from one side (the classic edge shadow, lit). */
export const edgeLight: Painter = (s) => {
  const rr = Math.max(s.box.maxX - s.box.minX, s.box.maxY - s.box.minY) / 2;
  const d = towards(s);
  const depth = Math.max(1, 2 * rr * (s.fx.spread / 100));
  const soft = s.fx.softness / 100;
  return [
    {
      clip: 'area',
      paint: (ctx) => {
        ctx.rotate(Math.atan2(d.y, d.x) - Math.PI / 2);
        const g = ctx.createLinearGradient(0, rr * 1.42, 0, rr - depth);
        g.addColorStop(0, rgba(s.fx.color, 1));
        g.addColorStop(Math.min(0.95, (1 - soft) * 0.9 + 0.02), rgba(s.fx.color, 0.95));
        g.addColorStop(1, rgba(s.fx.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-rr * 1.5, -rr * 1.5, rr * 3, rr * 3);
      },
    },
  ];
};

/** Spotlight: a soft round pool of light, off towards one side; Spread sets its size. */
export const spotlight: Painter = (s) => {
  const rr = s.area.R;
  const d = towards(s);
  const size = 0.35 + (s.fx.spread / 100) * 0.7;
  const soft = s.fx.softness / 100;
  return [
    {
      clip: 'area',
      paint: (ctx) => {
        const cx = d.x * rr * 0.3;
        const cy = d.y * rr * 0.3;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr * size);
        g.addColorStop(0, rgba(s.fx.color, 0.95));
        g.addColorStop(Math.max(0.05, 0.6 - soft * 0.55), rgba(s.fx.color, 0.7));
        g.addColorStop(1, rgba(s.fx.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-rr * 2, -rr * 2, rr * 4, rr * 4);
      },
    },
  ];
};
