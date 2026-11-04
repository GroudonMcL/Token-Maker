// Draws templates beside reference pictures (any PNG, JPEG or WebP), for
// matching a design to a frame by eye:
//   npm run fm:compare-pictures -- out.png template-id=picture.png[@x,y,w,h][#background] …
// Each row is the picture (cropped to x,y,w,h if given) and the template at
// the same size, on a checkerboard or on #background (black, white or any
// colour) when the picture has one baked in.
import './napi';
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { createProject, LAYERED_TEMPLATES } from '../../src/frame-maker/project/defaults';
import { CRAFTED_TEMPLATES } from '../../src/frame-maker/project/craftedTemplates';
import { THEMED_TEMPLATES } from '../../src/frame-maker/project/themedTemplates';
import type { Ctx } from '../../src/frame-maker/render/canvas';
import { loadPictures } from '../../src/frame-maker/render/pictures';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { registerShippedFonts } from './nodeFonts';

registerShippedFonts();
const [out = 'compare.png', ...pairs] = process.argv.slice(2);
const SIZE = Number(process.env.S ?? 360);
const GAP = 16;
const LABEL = 28;

function checker(ctx: SKRSContext2D, x: number, y: number, size: number) {
  const cell = 12;
  for (let j = 0; j < size / cell; j++)
    for (let i = 0; i < size / cell; i++) {
      ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#d6d6d6';
      ctx.fillRect(x + i * cell, y + j * cell, Math.min(cell, size - i * cell), Math.min(cell, size - j * cell));
    }
}

const rows = pairs.map((p) => {
  const [id, rest] = p.split('=');
  const [file, bg] = rest.split('#');
  const [path, crop] = file.split('@');
  return { id, path, crop: crop?.split(',').map(Number), bg: bg ? (bg.startsWith('#') || !/^[0-9a-f]{3,6}$/i.test(bg) ? bg : `#${bg}`) : null };
});
const c = createCanvas(SIZE * 2 + GAP * 3, rows.length * (SIZE + LABEL + GAP) + GAP);
const ctx = c.getContext('2d');
ctx.fillStyle = '#26262c';
ctx.fillRect(0, 0, c.width, c.height);
for (const [r, row] of rows.entries()) {
  const t = [...CRAFTED_TEMPLATES, ...THEMED_TEMPLATES].find((x) => x.id === row.id) ?? LAYERED_TEMPLATES.find((x) => x.id === row.id);
  if (!t) throw new Error(`No template ${row.id}`);
  const y = GAP + r * (SIZE + LABEL + GAP);
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '16px sans-serif';
  ctx.fillText('Original', GAP, y + 18);
  ctx.fillText(`Frame Maker: ${t.name}`, GAP * 2 + SIZE, y + 18);
  const img = await loadImage(readFileSync(row.path));
  const [sx, sy, sw, sh] = row.crop ?? [0, 0, img.width, img.height];
  for (const x of [GAP, GAP * 2 + SIZE]) {
    if (row.bg) {
      ctx.fillStyle = row.bg;
      ctx.fillRect(x, y + LABEL, SIZE, SIZE);
    } else checker(ctx, x, y + LABEL, SIZE);
  }
  ctx.drawImage(img, sx, sy, sw, sh, GAP, y + LABEL, SIZE, SIZE);
  const project = createProject(t.make(), t.name);
  project.stage = { ...project.stage, ...('stage' in t ? (t.stage ?? {}) : {}), showArt: false };
  await loadPictures(project);
  ctx.save();
  ctx.translate(GAP * 2 + SIZE, y + LABEL);
  renderProject(ctx as unknown as Ctx, project, SIZE, { cache: false, clear: false });
  ctx.restore();
}
writeFileSync(out, c.toBuffer('image/png'));
console.log(`${rows.length} rows → ${out}`);
