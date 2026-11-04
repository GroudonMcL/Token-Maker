// Picture (PNG) frames (DESIGN.md §6.9): the user's own, kept in IndexedDB
// (src/state/frameLibrary.ts). The picture is held in the asset store under
// frameAssetId(), and it fills the token's square, so it scales with the
// token. The built-in picture frames became Frame Maker designs in v11
// (render/builtInDesigns.ts).

import type { ImageFrame, ImageFrameSource } from '../document/types';
import type { Ctx } from './frameKit';

/** The asset-store key of a picture frame. */
export const frameAssetId = (source: ImageFrameSource) => `frame:${source.type}:${source.id}`;

/** The picture frame the document uses, or null for a code-drawn frame. */
export const activeImageFrame = (frame: { kind: string; image: ImageFrame | null }): ImageFrame | null =>
  frame.kind === 'image' ? frame.image : null;

/** Draws a frame picture filling the token's square (fitted, keeping its shape), centred on the origin. */
export function drawImageFrame(ctx: Ctx, image: { image: CanvasImageSource; width: number; height: number }, R: number): void {
  const k = (2 * R) / Math.max(image.width, image.height);
  const w = image.width * k;
  const h = image.height * k;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image.image, -w / 2, -h / 2, w, h);
}
