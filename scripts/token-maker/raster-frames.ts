import { readFileSync } from 'node:fs';
// Renders every Essentials frame (drawn frames and built-in designs) as a
// picture frame: a round PNG ring with a see-through middle, saved to
// public/frames/ for Frame → Picture (owner request). Uses the site's own
// renderer, with a new token's band, so each looks as it does drawn.
//   npm run tm:raster-frames
import { createCanvas, loadImage, Path2D } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createDocument } from '../../src/token-maker/document/defaults';
import { setCanvasFactory as setFrameMakerCanvas } from '../../src/token-maker/frameMaker/render/canvas';
import { setPictureDecoder } from '../../src/token-maker/frameMaker/render/pictures';
import { loadFrameDesignPictures } from '../../src/token-maker/frameMaker/share/frameDesign';
import { setCanvasFactory } from '../../src/token-maker/image/processedArt';
import { builtInDesignById } from '../../src/token-maker/render/builtInDesigns';
import { framePresetById } from '../../src/token-maker/render/catalog';
import type { Ctx } from '../../src/token-maker/render/frameKit';
import { renderToken } from '../../src/token-maker/render/render';
import { builtInFrames, TILES } from '../../src/token-maker/sections/frameTiles';
import { LIBRARY_FRAMES } from '../../src/token-maker/render/libraryFrames';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);
setFrameMakerCanvas(make);
(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
setPictureDecoder(async (url) => loadImage(url.startsWith('data:') ? Buffer.from(url.slice(url.indexOf(',') + 1), 'base64') : readFileSync(`public${url}`)));

const SIZE = 1024;
const THUMB = 96;
mkdirSync('public/frames/thumbs', { recursive: true });

for (const lib of LIBRARY_FRAMES) {
  const tile = TILES.find((t) => t.id === lib.from);
  if (!tile) throw new Error(`No frame ${lib.from}`);
  const doc = createDocument();
  doc.frame = { ...doc.frame, backingOpacity: 0 };
  doc.shadows = { ...doc.shadows, outer: { ...doc.shadows.outer, enabled: false }, inner: { ...doc.shadows.inner, enabled: false } };
  const preset = framePresetById(tile.id);
  if (preset) {
    doc.frame = { ...doc.frame, kind: 'code', presetId: preset.id, style: preset.style, color: preset.color, highlightColor: null };
  } else {
    const design = builtInFrames.get(tile.id)!;
    await loadFrameDesignPictures(design.project);
    const band = builtInDesignById(tile.id)!.band;
    doc.frame = { ...doc.frame, kind: 'design', design, thickness: band.thickness, outerSpacing: doc.frame.outerSpacing };
  }
  const c = createCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d');
  // A new token's room round the frame is kept, so it sits in the square as the drawn one does.
  renderToken(ctx as unknown as Ctx, doc, new Map(), SIZE);
  const file = `public/frames/${lib.id}.webp`;
  writeFileSync(file, await c.encode('webp', 90));
  // A small copy for the panel's tiles.
  const thumb = createCanvas(THUMB, THUMB);
  const tctx = thumb.getContext('2d');
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(c, 0, 0, THUMB, THUMB);
  writeFileSync(`public/frames/thumbs/${lib.id}.webp`, await thumb.encode('webp', 85));
  console.log(`Wrote ${file} and its thumbnail`);
}
