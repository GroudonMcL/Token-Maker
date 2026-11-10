// Every frame the frame picker lists (drawn frames and built-in designs), in
// the owner's order (config/frameOrder.json), with their tags and thumbnails.
// This file brings the whole catalogue of built-in designs with it, so the
// editor only loads it through render/frameCatalogue.ts, when it is needed.

import { categoryOf, categoryRank } from '../frameMaker/project/frameCategories';
import { loadFrameDesignPictures } from '../frameMaker/share/frameDesign';
import type { FrameTile } from './frameOrder';
import type { DesignFrame } from '../document/types';
import { BUILT_IN_DESIGNS, builtInDesignFrame } from '../render/builtInDesigns';
import { FRAME_PRESETS, type ShapeId } from '../render/catalog';
import { rankOf } from './frameOrder';
import { clearDesignThumbnails, designThumbnail, frameThumbnail } from './frameThumbs';

/**
 * Drawn frames no longer offered, though tokens made with them still draw
 * them: the ones the frame review replaced with a Frame Maker remake
 * (owner's pick, version 13), and the ones the owner removed as too like
 * other frames (the look-alike review).
 */
const REPLACED = new Set(['cobblestone', 'druid', 'paladin', 'warlock', 'fighter', 'artificer', 'engraved', 'ranger', 'magma', 'sorcerer', 'monk', 'barbarian']);

/**
 * Every frame in the picker, by category (frameCategories.ts): the drawn
 * frames and built-in designs, each a frame of its own in its own category
 * (no versions stacked behind another frame). Within a category, frames are
 * in the owner's order; any frame not ranked yet goes after
 * them, next to frames made from the same one.
 */
function frameTiles(): FrameTile[] {
  const tiles: (FrameTile & { from: string })[] = [
    ...FRAME_PRESETS.filter((p) => !REPLACED.has(p.id)).map((p) => ({ id: p.id, label: p.name, group: categoryOf(p.id), from: p.id })),
    ...BUILT_IN_DESIGNS.map((b) => ({ id: b.id, label: b.name, group: b.group, from: b.after ?? b.id.replace(/^builtin:/, '') })),
  ];
  const essentials = (t: FrameTile) => Number(t.group !== 'Essentials' || !t.id.startsWith('builtin:'));
  const first = new Map<string, number>();
  tiles.forEach((t, i) => first.has(t.from) || first.set(t.from, i));
  return tiles
    .map((t, i) => ({ t, i }))
    .sort((a, b) => categoryRank(a.t.group) - categoryRank(b.t.group) || rankOf(a.t.id) - rankOf(b.t.id) || essentials(a.t) - essentials(b.t) || first.get(a.t.from)! - first.get(b.t.from)! || a.i - b.i)
    .map(({ t }) => ({ id: t.id, label: t.label, group: t.group }));
}

/** The built-in designs, each made the first time it is drawn (their thumbnails and photo textures are cached by id). */
const made = new Map<string, DesignFrame | null>();
export const builtInFrame = (id: string): DesignFrame | null => {
  if (!id.startsWith('builtin:')) return null;
  if (!made.has(id)) made.set(id, builtInDesignFrame(id));
  return made.get(id) ?? null;
};
export const TILES = frameTiles();
export { FRAME_TAGS, rankOf, type FrameTile } from './frameOrder';
export { builtInBand, builtInDesignById, builtInDesignFrame } from '../render/builtInDesigns';

/** One frame's thumbnail (a drawn frame or a built-in design), `px` across. */
export const thumbOf = (id: string, shape: ShapeId, px = 96) => {
  const design = builtInFrame(id);
  return design ? designThumbnail(id, design.project, shape, px) : frameThumbnail(id, shape, px);
};

/**
 * Loads the photo textures and fonts of these frames (the built-in designs
 * among them) and forgets their thumbnails drawn without them. Resolves true
 * if any were drawn without them, so they should be drawn again.
 */
export async function loadFramePictures(ids: readonly string[]): Promise<boolean> {
  const designs = ids.flatMap((id) => {
    const design = builtInFrame(id);
    return design ? [[id, design] as const] : [];
  });
  if (!designs.length) return false;
  const loaded = await Promise.all(designs.map(([, d]) => loadFrameDesignPictures(d.project).then(() => true, () => false)));
  if (!loaded.some(Boolean)) return false;
  clearDesignThumbnails(designs.map(([id]) => id));
  return true;
}
