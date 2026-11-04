// Draws every template on one sheet for checking by eye, with the same
// renderer as the editor (like token-maker's npm run frame-sheet).
//   npm run frame-sheet -- out.png [circle|rounded|square|hexagon|flatHex] [size]
import './napi';
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import type { ShapeId } from '../../src/frame-maker/engine/legacy/catalog';
import { FRAME_PRESETS } from '../../src/frame-maker/engine/legacy/catalog';
import { sampleArt } from '../../src/frame-maker/engine/legacy/sampleArt';
import { createProject, LAYERED_TEMPLATES, projectFromFrame } from '../../src/frame-maker/project/defaults';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { renderProject } from '../../src/frame-maker/render/renderProject';

const out = process.argv[2] ?? 'frame-sheet.png';
const shape = (process.argv[3] ?? 'circle') as ShapeId;
const size = Number(process.argv[4] ?? 200);
const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);
const art = sampleArt(make, 400);

const items = [
  ...FRAME_PRESETS.map((p) => ({ name: p.name, project: projectFromFrame(p.id) })),
  ...LAYERED_TEMPLATES.map((t) => ({ name: `${t.name} (layers)`, project: createProject(t.make()) })),
];
const cols = 6;
const label = 24;
const sheet = createCanvas(cols * size, Math.ceil(items.length / cols) * (size + label));
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#3a3d46';
ctx.fillRect(0, 0, sheet.width, sheet.height);
items.forEach(({ name, project }, i) => {
  project.stage.shape = shape;
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, project, size, { art });
  const x = (i % cols) * size;
  const y = Math.floor(i / cols) * (size + label);
  ctx.drawImage(c, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(name, x + 8, y + size + 17);
});
writeFileSync(out, sheet.toBuffer('image/png'));
console.log(`Wrote ${out}`);
