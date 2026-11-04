// Every frame the frame picker lists (drawn frames and built-in designs), in
// the owner's order (config/frameOrder.json), with their tags and thumbnails.

import frameOrder from '../config/frameOrder.json';
import { categoryOf, categoryRank } from '../frameMaker/project/frameCategories';
import { loadFrameDesignPictures } from '../frameMaker/share/frameDesign';
import { BUILT_IN_DESIGNS, builtInDesignFrame } from '../render/builtInDesigns';
import { FRAME_PRESETS, type ShapeId } from '../render/catalog';
import type { FrameTile } from './FramePicker';
import { clearDesignThumbnails, designThumbnail, frameThumbnail } from './frameThumbs';

/** Each frame's place in the owner's ranking (0 = best). */
const RANK = new Map(frameOrder.order.map((id, i) => [id, i]));
export const rankOf = (id: string) => RANK.get(id) ?? Infinity;

/** Each frame's tags (config/frameTags.ts), as the owner gave them. */
export const FRAME_TAGS: Readonly<Record<string, readonly string[]>> = frameOrder.tags;

/**
 * Every frame in the picker, by category (frameCategories.ts): the drawn
 * frames and built-in designs, each a frame of its own in its own category
 * (no versions stacked behind another frame). Within a category, frames are
 * in the owner's ranking, best first; any frame not ranked yet goes after
 * them, next to frames made from the same one.
 */
function frameTiles(): FrameTile[] {
  const tiles: (FrameTile & { from: string })[] = [
    ...FRAME_PRESETS.map((p) => ({ id: p.id, label: p.name, group: categoryOf(p.id), from: p.id })),
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

/** The built-in designs, made once each (their thumbnails and photo textures are cached by id). */
export const builtInFrames = new Map(BUILT_IN_DESIGNS.map((b) => [b.id, builtInDesignFrame(b.id)!]));
export const TILES = frameTiles();

/** One frame's thumbnail (a drawn frame or a built-in design), `px` across. */
export const thumbOf = (id: string, shape: ShapeId, px = 96) => {
  const design = builtInFrames.get(id);
  return design ? designThumbnail(id, design.project, shape, px) : frameThumbnail(id, shape, px);
};

/**
 * Loads the photo textures and fonts of these frames (the built-in designs
 * among them) and forgets their thumbnails drawn without them. Resolves true
 * if any were drawn without them, so they should be drawn again.
 */
export async function loadFramePictures(ids: readonly string[]): Promise<boolean> {
  const designs = ids.flatMap((id) => (builtInFrames.has(id) ? [[id, builtInFrames.get(id)!] as const] : []));
  if (!designs.length) return false;
  const loaded = await Promise.all(designs.map(([, d]) => loadFrameDesignPictures(d.project).then(() => true, () => false)));
  if (!loaded.some(Boolean)) return false;
  clearDesignThumbnails(designs.map(([id]) => id));
  return true;
}
