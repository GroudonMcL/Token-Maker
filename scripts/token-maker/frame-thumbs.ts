// Draws every frame in the frame picker (drawn frames and built-in designs)
// once per shape into one picture per shape, public/frame-thumbs/<shape>.webp,
// with the list of frames in src/token-maker/config/frameThumbSheet.json.
// The picker shows its thumbnails from these, so the gallery opens with every
// thumbnail at once instead of drawing them one by one (owner request). Run it
// again after adding or changing a frame; frames missing from the sheet are
// still drawn in the browser.
//   npm run tm:frame-thumbs
import { createCanvas, loadImage, Path2D } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { createDocument } from '../../src/token-maker/document/defaults';
import { setCanvasFactory as setFrameMakerCanvas } from '../../src/token-maker/frameMaker/render/canvas';
import { setPictureDecoder } from '../../src/token-maker/frameMaker/render/pictures';
import { loadFrameDesignPictures } from '../../src/token-maker/frameMaker/share/frameDesign';
import { setCanvasFactory } from '../../src/token-maker/image/processedArt';
import { FRAME_PRESETS, SHAPES } from '../../src/token-maker/render/catalog';
import type { Ctx } from '../../src/token-maker/render/frameKit';
import { renderToken } from '../../src/token-maker/render/render';
import { sampleArt } from '../../src/token-maker/render/sampleArt';
import { builtInFrames, TILES } from '../../src/token-maker/sections/frameTiles';
import { THUMB_CELL, THUMB_COLS } from '../../src/token-maker/sections/frameThumbSheet';
import { registerBundledFonts } from './nodeFonts';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);
setFrameMakerCanvas(make);
(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
setPictureDecoder(async (url) => loadImage(url.startsWith('data:') ? Buffer.from(url.slice(url.indexOf(',') + 1), 'base64') : readFileSync(`public${url}`)));
registerBundledFonts();

const ids = TILES.map((t) => t.id);
for (const d of builtInFrames.values()) await loadFrameDesignPictures(d.project);
const assets = new Map([['asset:sample', sampleArt(make, 128)]]);
const rows = Math.ceil(ids.length / THUMB_COLS);

for (const shape of SHAPES.map((s) => s.id)) {
  const sheet = createCanvas(THUMB_COLS * THUMB_CELL, rows * THUMB_CELL);
  const sctx = sheet.getContext('2d');
  ids.forEach((id, i) => {
    const doc = createDocument();
    doc.shape = shape;
    doc.art.assetId = 'asset:sample';
    const p = FRAME_PRESETS.find((x) => x.id === id);
    const design = builtInFrames.get(id);
    if (p) doc.frame = { ...doc.frame, presetId: p.id, style: p.style, color: p.color };
    else if (design) doc.frame = { ...doc.frame, kind: 'design', design };
    else throw new Error(`Unknown frame ${id}`);
    const c = createCanvas(THUMB_CELL, THUMB_CELL);
    renderToken(c.getContext('2d') as unknown as Ctx, doc, assets, THUMB_CELL);
    sctx.drawImage(c, (i % THUMB_COLS) * THUMB_CELL, Math.floor(i / THUMB_COLS) * THUMB_CELL);
  });
  const file = `public/frame-thumbs/${shape}.webp`;
  writeFileSync(file, await sheet.encode('webp', 80));
  console.log(`Wrote ${file}`);
}
writeFileSync('src/token-maker/config/frameThumbSheet.json', JSON.stringify({ ids }, null, 1) + '\n');
console.log(`Wrote src/token-maker/config/frameThumbSheet.json (${ids.length} frames)`);
