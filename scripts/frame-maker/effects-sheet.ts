// Draws every style and every effects template on one sheet for checking by
// eye, with the same renderer as the editor (like npm run frame-sheet).
//   npm run effects-sheet -- out.png [size] [circle|rounded|square|hexagon|flatHex]
// Styles are shown on a thick grey band with a ring of gems over it, so a
// style that recolours (metal, stone) and one that keeps the colour both show.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import type { ShapeId } from '../../src/frame-maker/engine/legacy/catalog';
import { sampleArt } from '../../src/frame-maker/engine/legacy/sampleArt';
import { bandFillLayer, createProject, LAYERED_TEMPLATES, repeatLayer } from '../../src/frame-maker/project/defaults';
import { STYLES } from '../../src/frame-maker/project/styles';
import type { FrameProject, Layer } from '../../src/frame-maker/project/types';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { renderProject } from '../../src/frame-maker/render/renderProject';

const out = process.argv[2] ?? 'effects-sheet.png';
const size = Number(process.argv[3] ?? 240);
const shape = (process.argv[4] ?? 'circle') as ShapeId;
const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);
const art = sampleArt(make, 400);

const withEffects = (layers: Layer[]): boolean => layers.some((l) => l.effects.length > 0 || (l.type === 'group' && withEffects(l.children)));
const sample = (effects: Layer['effects']): Layer[] => [
  { ...bandFillLayer(), name: 'Band', paint: { kind: 'solid', color: '#8a7a6a' }, effects },
  { ...repeatLayer(), name: 'Gems', element: 'gem', count: 8, size: 0.4, fill: '#6a5ad0', raised: false, effects },
];
const items: { name: string; project: FrameProject }[] = [
  ...LAYERED_TEMPLATES.filter((t) => withEffects(t.make())).map((t) => {
    const project = createProject(t.make());
    project.stage = { ...project.stage, shape };
    return { name: t.name, project };
  }),
  ...STYLES.map((s) => {
    const project = createProject(sample(s.effects()));
    project.stage = { ...project.stage, shape, showArt: false, thickness: 0.3, outerSpacing: 0.05 };
    return { name: s.name, project };
  }),
];
const cols = 6;
const label = 24;
const sheet = createCanvas(cols * size, Math.ceil(items.length / cols) * (size + label));
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#3a3d46';
ctx.fillRect(0, 0, sheet.width, sheet.height);
items.forEach(({ name, project }, i) => {
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, project, size, { art, cache: false });
  const x = (i % cols) * size;
  const y = Math.floor(i / cols) * (size + label);
  ctx.drawImage(c, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(name, x + 8, y + size + 17);
});
writeFileSync(out, sheet.toBuffer('image/png'));
console.log(`Wrote ${out}`);
