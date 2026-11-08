// Web Worker: draws a Frame Maker design at the editor's big view size
// (frameWorker.ts) off the main thread. A heavy design's blurs, bevels and
// shadows can take seconds at 2048 px; drawn on the main thread they froze
// the page, so zooming and dragging stuttered just after a frame was picked.
// The worker loads the design's photo textures and fonts first, so each
// design is drawn once, with its real pictures, not once with stand-in
// colours and again when they arrive.

import type { FrameWorkerRequest, FrameWorkerResponse } from './frameWorker';
import { setPictureDecoder } from '../frameMaker/render/pictures';
import { drawFrameDesign, loadFrameDesignPictures } from '../frameMaker/share/frameDesign';
import { FONT_FAMILIES } from '../frameMaker/render/text';
import grenze from '@fontsource/grenze/files/grenze-latin-600-normal.woff2?url';
import atkinson from '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2?url';

const scope = self as unknown as { fonts?: FontFaceSet; postMessage(msg: FrameWorkerResponse, transfer?: Transferable[]): void };

// Frame Maker's text code loads its fonts through document.fonts; a worker's canvases use the worker's own font set.
if (typeof document === 'undefined' && scope.fonts) {
  (globalThis as { document?: unknown }).document = { fonts: scope.fonts };
  // The page gets these two from its stylesheets (main.tsx), which a worker doesn't have; the others are font files text.ts adds itself.
  for (const [f, url] of [[FONT_FAMILIES.grenze, grenze], [FONT_FAMILIES.atkinson, atkinson]] as const) {
    (scope.fonts as unknown as { add(f: FontFace): void }).add(new FontFace(f.family, `url("${url}")`, { weight: String(f.weight) }));
  }
}
// A worker has no Image: pictures are fetched and decoded to bitmaps.
setPictureDecoder(async (url) => createImageBitmap(await (await fetch(url)).blob()));

self.onmessage = async (e: MessageEvent<FrameWorkerRequest>) => {
  const { id, project, g, size } = e.data;
  try {
    await loadFrameDesignPictures(project).catch(() => {});
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    ctx.translate(size / 2, size / 2);
    drawFrameDesign(ctx, project, g);
    const bitmap = canvas.transferToImageBitmap();
    scope.postMessage({ id, bitmap }, [bitmap]);
  } catch (err) {
    scope.postMessage({ id, failed: err instanceof Error ? err.message : String(err) });
  }
};
