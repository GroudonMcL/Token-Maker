// Picture (PNG) frames (DESIGN.md §6.9): the user's own, kept in IndexedDB
// (src/state/frameLibrary.ts). The picture is held in the asset store under
// frameAssetId(), and it fills the token's square, so it scales with the
// token. The built-in picture frames became Frame Maker designs in v11
// (render/builtInDesigns.ts).

import type { ImageFrame, ImageFrameSource, TokenDocument } from '../document/types';
import type { Ctx } from './frameKit';

/** The asset-store key of a picture frame. */
export const frameAssetId = (source: ImageFrameSource) => `frame:${source.type}:${source.id}`;

/** The picture frame the document uses, or null for a code-drawn frame. */
export const activeImageFrame = (frame: { kind: string; image: ImageFrame | null }): ImageFrame | null =>
  frame.kind === 'image' ? frame.image : null;

/** Most of the token's half-size the outer spacing may take from a picture frame. */
const MAX_PICTURE_MARGIN = 0.6;

/**
 * How big a picture frame is drawn, as a share of the token's square (v13):
 * the outer spacing is room round it, as it is round every other frame.
 * Its hole and its outer edge shrink with it.
 */
export function imageFrameScale(doc: Pick<TokenDocument, 'frame' | 'size'>): number {
  return 1 - Math.min(MAX_PICTURE_MARGIN, Math.max(0, doc.frame.outerSpacing / doc.size.squares));
}

/** Draws a frame picture filling the token's square (fitted, keeping its shape), centred on the origin; pass R × imageFrameScale(). */
export function drawImageFrame(ctx: Ctx, image: { image: CanvasImageSource; width: number; height: number }, R: number): void {
  const k = (2 * R) / Math.max(image.width, image.height);
  const w = image.width * k;
  const h = image.height * k;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image.image, -w / 2, -h / 2, w, h);
}
