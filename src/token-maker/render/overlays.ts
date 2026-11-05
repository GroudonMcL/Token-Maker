// The overlay effects (once the Foreground section, merged into Effects in
// v8): gradient, vignette and edge shadow, plus the old
// overlay mist and smoke. Each is drawn by code with a seeded random layout,
// so a token looks the same every time and at every size. effectPainters.ts
// turns an effect's settings into these and draws them as one pass.

import type { BlendMode, Gradient } from '../document/types';
import { rgba } from './color';
import { seededRandom, type Ctx } from './frameKit';
import { makeGradient } from './background';

export const BLEND_OPS: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  'soft-light': 'soft-light',
};

type Box = { minX: number; maxX: number; minY: number; maxY: number };

export type OverlayKind = 'gradient' | 'vignette' | 'smoke' | 'mist' | 'shadow';

/** What an overlay painter reads. */
export interface OverlayParams {
  kind: OverlayKind;
  color: string;
  /** 0…100: how far it reaches in (vignette, mist, shadow, foliage, cobwebs) or how much there is (smoke). */
  size: number;
  /** 0…100 */
  softness: number;
  /** Degrees: which side it sits on (shadow, foliage, mist, cobwebs). 90 = bottom, 270 = top. */
  angle: number;
  /** 50…200 %: size of the leaves, puffs or webs. */
  scale: number;
  seed: number;
  gradient: Gradient;
}

/** Draws one overlay with the token centre at the origin. Exported for tests. */
export function paintOverlay(ctx: Ctx, o: OverlayParams, box: Box): void {
  const rr = Math.max(box.maxX - box.minX, box.maxY - box.minY) / 2;
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const fillBox = () => ctx.fillRect(box.minX - 1, box.minY - 1, w + 2, h + 2);
  const random = seededRandom(0x9e37 + o.seed * 7919);
  const scale = o.scale / 100;
  /** Turns the canvas so "down" points at the overlay's side. */
  const faceSide = () => ctx.rotate(((o.angle - 90) * Math.PI) / 180);

  switch (o.kind) {
    case 'gradient': {
      ctx.fillStyle = makeGradient(ctx, o.gradient, box);
      fillBox();
      break;
    }
    case 'vignette': {
      const start = Math.max(0, rr * (1.05 - (o.size / 100) * 0.85));
      const end = start + rr * (0.08 + (o.softness / 100) * 0.9);
      const g = ctx.createRadialGradient(0, 0, start, 0, 0, end);
      g.addColorStop(0, rgba(o.color, 0));
      g.addColorStop(1, rgba(o.color, 1));
      ctx.fillStyle = g;
      fillBox();
      break;
    }
    case 'shadow': {
      faceSide();
      const depth = Math.max(1, 2 * rr * (o.size / 100));
      const g = ctx.createLinearGradient(0, rr * 1.42, 0, rr - depth);
      g.addColorStop(0, rgba(o.color, 1));
      g.addColorStop(Math.min(0.95, (1 - o.softness / 100) * 0.9 + 0.02), rgba(o.color, 1));
      g.addColorStop(1, rgba(o.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-rr * 1.5, -rr * 1.5, rr * 3, rr * 3);
      break;
    }
    case 'mist': {
      faceSide();
      const band = Math.max(1, 2 * rr * (o.size / 100));
      const base = ctx.createLinearGradient(0, rr * 1.42, 0, rr - band);
      base.addColorStop(0, rgba(o.color, 0.85));
      base.addColorStop(1, rgba(o.color, 0));
      ctx.fillStyle = base;
      ctx.fillRect(-rr * 1.5, -rr * 1.5, rr * 3, rr * 3);
      // Soft drifting banks along the band.
      for (let i = 0; i < 26; i++) {
        const x = (random() * 2.6 - 1.3) * rr;
        const y = rr - random() * band * 0.85;
        puff(ctx, x, y, rr * (0.12 + random() * 0.2) * scale, o.color, 0.35, o.softness, 2.4);
      }
      break;
    }
    case 'smoke': {
      const count = Math.round(4 + (o.size / 100) * 26);
      for (let i = 0; i < count; i++) {
        const x = (random() * 2 - 1) * rr;
        const y = (random() * 2 - 1) * rr;
        const r = rr * (0.12 + random() * 0.22) * scale;
        // A billow: a few puffs around one point.
        for (let k = 0; k < 4; k++) {
          const a = random() * Math.PI * 2;
          puff(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.4, r * (0.6 + random() * 0.5), o.color, 0.32, o.softness, 1.3);
        }
      }
      // Wisps.
      ctx.lineCap = 'round';
      for (let i = 0; i < Math.round(count / 3); i++) {
        const x = (random() * 2 - 1) * rr;
        const y = (random() * 2 - 1) * rr;
        ctx.strokeStyle = rgba(o.color, 0.18);
        ctx.lineWidth = rr * 0.035 * scale;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + rr * 0.2, y - rr * 0.25, x - rr * 0.15, y - rr * 0.4, x + rr * 0.1, y - rr * 0.6);
        ctx.stroke();
      }
      break;
    }
  }
}

/** A soft round (or wide, with `stretch`) blob of colour. */
function puff(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number, softness: number, stretch: number): void {
  if (r <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(stretch, 1);
  const g = ctx.createRadialGradient(0, 0, r * (1 - Math.max(0.05, softness / 100)) * 0.9, 0, 0, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

