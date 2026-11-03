// Every frame the frame picker lists (drawn frames and built-in designs), and
// their thumbnails. Shared by the picker (FrameSection.tsx) and the ranker
// (FrameRanker.tsx).

import { categoryOf, categoryRank } from '../frameStudio/project/frameCategories';
import { loadFrameDesignPictures } from '../frameStudio/share/frameDesign';
import { BUILT_IN_DESIGNS, builtInDesignFrame } from '../render/builtInDesigns';
import { FRAME_PRESETS, type ShapeId } from '../render/catalog';
import type { FrameTile } from './FramePicker';
import { clearDesignThumbnails, designThumbnail, frameThumbnail } from './frameThumbs';

/**
 * Every frame in the picker, by category (frameCategories.ts): the drawn
 * frames and built-in designs, each a frame of its own in its own category
 * (no versions stacked behind another frame). Within a category, frames made
 * from the same one stay next to each other.
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
    .sort((a, b) => categoryRank(a.t.group) - categoryRank(b.t.group) || essentials(a.t) - essentials(b.t) || first.get(a.t.from)! - first.get(b.t.from)! || a.i - b.i)
    .map(({ t }) => ({ id: t.id, label: t.label, group: t.group }));
}

/** The built-in designs, made once each (their thumbnails and photo textures are cached by id). */
export const builtInFrames = new Map(BUILT_IN_DESIGNS.map((b) => [b.id, builtInDesignFrame(b.id)!]));
export const TILES = frameTiles();
export const tileById = new Map(TILES.map((t) => [t.id, t]));

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
