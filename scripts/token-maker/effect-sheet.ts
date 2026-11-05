// Renders every effect in each placement on one sheet for checking by eye
// (like the frame sheet). Uses the same renderer as the site.
//   npm run effect-sheet -- out.png [circle|rounded|square|hexagon|flatHex] [size] [squares]
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { createDocument, EFFECTS, newEffect, newPictureEffect } from '../../src/token-maker/document/defaults';
import type { EffectLayer, EffectPlacement } from '../../src/token-maker/document/types';
import { EFFECT_PICTURES, pictureAssetId, pictureUrl } from '../../src/token-maker/render/pictureLibrary';
import type { RenderSource } from '../../src/token-maker/render/render';
import { setCanvasFactory } from '../../src/token-maker/image/processedArt';
import type { ShapeId } from '../../src/token-maker/render/catalog';
import type { Ctx } from '../../src/token-maker/render/frameKit';
import { renderToken } from '../../src/token-maker/render/render';
import { cutOutArt } from '../../src/token-maker/render/sampleArt';

const out = process.argv[2] ?? 'effect-sheet.png';
const shape = (process.argv[3] ?? 'circle') as ShapeId;
const size = Number(process.argv[4] ?? 200);
const squares = Number(process.argv[5] ?? 1);
const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const PLACEMENTS: [EffectPlacement, string][] = [
  ['behind', 'Behind art'],
  ['over', 'Over art'],
  ['border', 'On border'],
];
// The drawn effects, then every built-in picture (with its own starting settings).
const ROWS: { name: string; make: () => EffectLayer }[] = [
  ...EFFECTS.filter((e) => e.kind !== 'picture').map((e) => ({ name: e.name, make: () => newEffect(e.kind, 'fx') })),
  ...EFFECT_PICTURES.map((p) => ({ name: p.name, make: () => newPictureEffect({ type: 'library', id: p.id }, 'fx') })),
];
const name = 150;
const head = 30;
const sheet = createCanvas(name + PLACEMENTS.length * size, head + ROWS.length * size);
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#3a3d46';
ctx.fillRect(0, 0, sheet.width, sheet.height);
ctx.fillStyle = '#f0e6cc';
ctx.font = 'bold 18px sans-serif';
PLACEMENTS.forEach(([, label], i) => ctx.fillText(label, name + i * size + 10, 21));
const assets = new Map<string, RenderSource>([['asset:sample', cutOutArt(make)]]);
for (const p of EFFECT_PICTURES) {
  const img = await loadImage(readFileSync(`public${pictureUrl(p.id)}`));
  assets.set(pictureAssetId({ type: 'library', id: p.id }), { image: img as unknown as CanvasImageSource, width: img.width, height: img.height });
}

ROWS.forEach((info, row) => {
  const y = head + row * size;
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText(info.name, 10, y + size / 2);
  PLACEMENTS.forEach(([placement], col) => {
    const doc = createDocument();
    doc.shape = shape;
    doc.size = { preset: 'custom', squares };
    doc.art.assetId = 'asset:sample';
    doc.background = { ...doc.background, kind: 'color', color: '#41566e' };
    doc.effects = [{ ...info.make(), placement }];
    const c = createCanvas(size, size);
    renderToken(c.getContext('2d') as unknown as Ctx, doc, assets, size);
    ctx.drawImage(c, name + col * size, y);
  });
});
writeFileSync(out, sheet.toBuffer('image/png'));
console.log(`Wrote ${out}`);
