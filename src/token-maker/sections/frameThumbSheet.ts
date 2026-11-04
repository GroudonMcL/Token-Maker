// The frame picker's ready-made thumbnails (owner request: they loaded
// slowly): every frame drawn once per shape into one picture,
// public/frame-thumbs/<shape>.webp, by scripts/token-maker/frame-thumbs.ts.
// A frame missing from the sheet (added since it was made) is drawn in the
// browser as before.

import sheet from '../config/frameThumbSheet.json';
import type { ShapeId } from '../render/catalog';

/** Each thumbnail's size on the sheet, and how many are in a row. */
export const THUMB_CELL = 96;
export const THUMB_COLS = 20;

const INDEX = new Map((sheet.ids as string[]).map((id, i) => [id, i]));
const ROWS = Math.ceil(INDEX.size / THUMB_COLS);

export const sheetUrl = (shape: ShapeId) => `/frame-thumbs/${shape}.webp`;

/** Whether this frame is on the sheet. */
export const onSheet = (id: string) => INDEX.has(id);

/** CSS showing this frame's thumbnail from the sheet at `size` px, or null when it isn't on it. */
export function sheetStyle(id: string, shape: ShapeId, size: number): { backgroundImage: string; backgroundSize: string; backgroundPosition: string } | null {
  const i = INDEX.get(id);
  if (i === undefined) return null;
  return {
    backgroundImage: `url(${sheetUrl(shape)})`,
    backgroundSize: `${THUMB_COLS * size}px ${ROWS * size}px`,
    backgroundPosition: `${-(i % THUMB_COLS) * size}px ${-Math.floor(i / THUMB_COLS) * size}px`,
  };
}

const preloaded = new Set<string>();
/** Starts fetching a shape's sheet (when the Frame tab opens), so the gallery's thumbnails are ready. */
export function preloadSheet(shape: ShapeId): void {
  if (preloaded.has(shape) || typeof Image === 'undefined') return;
  preloaded.add(shape);
  const img = new Image();
  img.src = sheetUrl(shape);
}
