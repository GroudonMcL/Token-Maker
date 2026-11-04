// Draws frames in a labelled grid, with the sample art, for comparing by eye:
//   npx tsx scripts/frame-maker/render-sheet.ts out.png [--cols N] [--size S] [--shapes circle,hexagon] item…
// An item is a .framemaker.json file, `tm:<preset>` (a Token Maker drawn
// frame), `pf:<id>` (a built-in picture-frame design), `th:<id>` (themed),
// `cr:<id>` (crafted), `ly:<id>` (layered template), or `<label>=<item>`.
import './napi';
import { createCanvas } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createProject, LAYERED_TEMPLATES, projectFromFrame } from '../../src/frame-maker/project/defaults';
import { CRAFTED_TEMPLATES } from '../../src/frame-maker/project/craftedTemplates';
import { PICTURE_FRAME_TEMPLATES } from '../../src/frame-maker/project/pictureFrameTemplates';
import { THEMED_TEMPLATES, themedProject } from '../../src/frame-maker/project/themedTemplates';
import { parseProject } from '../../src/frame-maker/project/migrate';
import type { FrameProject } from '../../src/frame-maker/project/types';
import type { Ctx } from '../../src/frame-maker/render/canvas';
import { loadPictures } from '../../src/frame-maker/render/pictures';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { sampleArt } from '../../src/frame-maker/engine/legacy/sampleArt';
import { framePresetById } from '../../src/frame-maker/engine/legacy/catalog';
import { registerShippedFonts } from './nodeFonts';

registerShippedFonts();
const argv = process.argv.slice(2);
const out = argv.shift() ?? 'sheet.png';
let cols = 4;
let size = 300;
let shapes = ['circle'];
let bg = '#2a2a30';
const items: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--cols') cols = Number(argv[++i]);
  else if (a === '--size') size = Number(argv[++i]);
  else if (a === '--shapes') shapes = argv[++i].split(',');
  else if (a === '--bg') bg = argv[++i];
  else items.push(a);
}

function load(item: string): { label: string; project: FrameProject } {
  let label: string | null = null;
  const eq = item.indexOf('=');
  if (eq > 0 && !item.slice(0, eq).includes('/')) {
    label = item.slice(0, eq);
    item = item.slice(eq + 1);
  }
  const [kind, id] = item.includes(':') ? item.split(/:(.*)/s) : ['file', item];
  if (kind === 'file') {
    const r = parseProject(JSON.parse(readFileSync(item, 'utf8')));
    if (!r.ok) throw new Error(`${item}: ${r.error}`);
    return { label: label ?? basename(item).replace('.framemaker.json', ''), project: r.project };
  }
  if (kind === 'tm') {
    const p = projectFromFrame(id);
    return { label: label ?? `${framePresetById(id)?.name ?? id}`, project: p };
  }
  const sets: Record<string, { id: string; name: string; stage?: object; make: () => never[] }[]> = {
    pf: PICTURE_FRAME_TEMPLATES as never,
    th: THEMED_TEMPLATES as never,
    cr: CRAFTED_TEMPLATES as never,
    ly: LAYERED_TEMPLATES as never,
  };
  const t = sets[kind]?.find((x) => x.id === id);
  if (!t) throw new Error(`No ${kind} template ${id}`);
  const p = kind === 'ly' ? createProject(t.make(), t.name) : themedProject(t as never);
  return { label: label ?? t.name, project: p };
}

const loaded = items.map(load);
const per = loaded.length * shapes.length;
const c = Math.min(cols, per);
const rows = Math.ceil(per / c);
const LABEL = 26;
const canvas = createCanvas(c * size, rows * (size + LABEL));
const ctx = canvas.getContext('2d');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, canvas.width, canvas.height);
const art = sampleArt((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement, 400);
let k = 0;
for (const { label, project } of loaded) {
  await loadPictures(project);
  for (const shape of shapes) {
    const x = (k % c) * size;
    const y = Math.floor(k / c) * (size + LABEL);
    const p: FrameProject = { ...project, stage: { ...project.stage, shape: shape as never, showArt: true } };
    ctx.save();
    ctx.translate(x, y + LABEL);
    renderProject(ctx as unknown as Ctx, p, size, { cache: false, clear: false, art });
    ctx.restore();
    ctx.fillStyle = '#e8e8ee';
    ctx.font = '15px sans-serif';
    ctx.fillText(shapes.length > 1 ? `${label} (${shape})` : label, x + 8, y + 18);
    k++;
  }
}
writeFileSync(out, canvas.toBuffer('image/png'));
console.log(`${k} cells → ${out}`);
