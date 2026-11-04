// Small copies of the built-in effect and decoration pictures
// (public/pictures/thumbs/), for the pickers' tiles: the full pictures are up
// to 1024 px and load only once one is used.
//   npm run tm:picture-thumbs
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DECORATION_PICTURES, EFFECT_PICTURES, pictureThumbUrl, pictureUrl } from '../../src/token-maker/render/pictureLibrary';

const SIDE = 96;
mkdirSync('public/pictures/thumbs', { recursive: true });
for (const p of [...EFFECT_PICTURES, ...DECORATION_PICTURES]) {
  const img = await loadImage(readFileSync(`public${pictureUrl(p.id)}`));
  const k = SIDE / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * k));
  const h = Math.max(1, Math.round(img.height * k));
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  writeFileSync(`public${pictureThumbUrl(p.id)}`, await c.encode('webp', 85));
}
console.log(`Wrote ${EFFECT_PICTURES.length + DECORATION_PICTURES.length} thumbnails`);
