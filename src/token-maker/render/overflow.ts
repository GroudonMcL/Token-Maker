// What would be cut off at the edge of the exported square (owner request).
// Nothing is ever drawn outside the square (DESIGN.md §5), so a drop shadow,
// decoration, pop-out or label that reaches past it ends in a hard straight
// edge. This draws the token small with room round it, looks for anything
// past the square, then switches each part off in turn to see which one
// reaches out, so the warning can say what to change.

import type { TokenDocument } from '../document/types';
import { hasPopOut } from '../image/popOut';
import { newCanvas } from '../image/processedArt';
import type { Ctx } from './frameKit';
import { renderToken, type AssetMap, type RenderSource } from './render';

/** A part of the token that can reach past the square. */
export type OverflowSource = 'shadow' | 'decorations' | 'popout' | 'label';

/** What reaches past the square, most to least; empty when nothing is cut off. */
export type OverflowReport = OverflowSource[];

/** The square is checked at this size (big enough for a few pixels of shadow to show up)… */
const CHECK_SIZE = 160;
/** …with this much room on each side (a quarter of the square). */
const CHECK_BLEED = 40;
/** Pixels fainter than this (out of 255, about 8 %) don't make a visible edge: the default drop shadow just fades out before the edge. */
const MIN_ALPHA = 20;

/** How much (summed alpha) is drawn outside the square for `doc`. */
function spill(doc: TokenDocument, assets: AssetMap, processedArt?: RenderSource): number {
  const full = CHECK_SIZE + 2 * CHECK_BLEED;
  const canvas = newCanvas(full, full);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.translate(CHECK_BLEED, CHECK_BLEED);
  renderToken(ctx, doc, assets, CHECK_SIZE, { processedArt, bleed: CHECK_BLEED });
  const data = (ctx as CanvasRenderingContext2D).getImageData(0, 0, full, full).data;
  const lo = CHECK_BLEED;
  const hi = CHECK_BLEED + CHECK_SIZE;
  let total = 0;
  for (let y = 0; y < full; y++) {
    const inRows = y >= lo && y < hi;
    for (let x = 0; x < full; x++) {
      // Skip the square itself.
      if (inRows && x === lo) x = hi;
      if (x >= full) break;
      const a = data[(y * full + x) * 4 + 3]!;
      if (a > MIN_ALPHA) total += a;
    }
  }
  return total;
}

/** The token with one part switched off, or null when it doesn't have that part. */
function without(doc: TokenDocument, source: OverflowSource): TokenDocument | null {
  switch (source) {
    case 'shadow':
      return doc.shadows.outer.enabled ? { ...doc, shadows: { ...doc.shadows, outer: { ...doc.shadows.outer, enabled: false } } } : null;
    case 'decorations':
      return doc.decorations.some((d) => d.visible) ? { ...doc, decorations: [] } : null;
    case 'popout':
      return doc.art.assetId && hasPopOut(doc.art.popOut) ? { ...doc, art: { ...doc.art, popOut: { ...doc.art.popOut, enabled: false } } } : null;
    case 'label':
      return doc.label ? { ...doc, label: null } : null;
  }
}

const SOURCES: readonly OverflowSource[] = ['shadow', 'decorations', 'popout', 'label'];

/**
 * Which parts of the token would be cut off at the edge of the square, most
 * first. A part counts when switching it off makes noticeably less reach
 * past the edge (a decoration's own shadow counts for the decoration too).
 */
export function findOverflow(doc: TokenDocument, assets: AssetMap, processedArt?: RenderSource): OverflowReport {
  const all = spill(doc, assets, processedArt);
  if (all <= 0) return [];
  const found: { source: OverflowSource; share: number }[] = [];
  for (const source of SOURCES) {
    const d = without(doc, source);
    if (!d) continue;
    const share = (all - spill(d, assets, processedArt)) / all;
    if (share > 0.05) found.push({ source, share });
  }
  found.sort((a, b) => b.share - a.share);
  // Something reaches out but no one part explains it (two parts overlapping): name them all.
  if (!found.length) return SOURCES.filter((s) => without(doc, s));
  return found.map((f) => f.source);
}

/** What to say about each part, and how to fix it. */
export const OVERFLOW_ADVICE: Record<OverflowSource, { what: string; fix: string }> = {
  shadow: {
    what: 'The drop shadow',
    fix: 'Give it more room in the Export tab (Outer spacing, or drag the red square’s corners), or make the shadow shorter or less blurred (Shadow → Drop shadow).',
  },
  decorations: {
    what: 'A decoration',
    fix: 'Give it more room in the Export tab (Outer spacing, or drag the red square’s corners), or make the decoration smaller or move it in (Decor).',
  },
  popout: {
    what: 'The pop-out art',
    fix: 'Give it more room in the Export tab (Outer spacing, or drag the red square’s corners), or zoom the art out a little so the pop-out parts stay inside.',
  },
  label: {
    what: 'The label',
    fix: 'Give it more room in the Export tab (Outer spacing, or drag the red square’s corners), or make the label narrower or the text smaller (Label).',
  },
};
