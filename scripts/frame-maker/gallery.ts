// Draws every frame Token Maker lists (built-in designs and drawn frames, minus the retired ones) as
// labelled contact sheets: one sheet per frame with its new versions beside it, for the frame review.
//   npx tsx scripts/frame-maker/gallery.ts <outDir>
import './napi';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FRAME_PRESETS } from '../../src/frame-maker/engine/legacy/catalog';
import { BUILT_IN_FRAMES, builtInFramesByCategory } from '../../src/frame-maker/project/builtInFrames';
import { categoryOf, categoryRank } from '../../src/frame-maker/project/frameCategories';
import { projectFromFrame } from '../../src/frame-maker/project/defaults';
import type { FrameProject } from '../../src/frame-maker/project/types';
import type { Ctx } from '../../src/frame-maker/render/canvas';
import { loadPictures } from '../../src/frame-maker/render/pictures';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { sampleArt } from '../../src/frame-maker/engine/legacy/sampleArt';
import { registerShippedFonts } from './nodeFonts';

registerShippedFonts();
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const art = sampleArt((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement, 600);
const TILE = 200, LABEL = 34, PER_ROW = 6;

interface Item { name: string; project: () => FrameProject; original?: boolean }
interface Sheet { id: string; group: string; title: string; items: Item[] }
// One sheet per stack, like Token Maker's picker: a drawn frame or design and its versions,
// in category order; versions whose frame was removed are stacked behind the first of them.
const sheets: Sheet[] = [];
const versionsOf = (key: string) => BUILT_IN_FRAMES.filter((f) => f.after === key);
for (const p of FRAME_PRESETS) {
  if (p.id === 'none') continue;
  sheets.push({ id: p.id, group: categoryOf(p.id), title: p.name, items: [{ name: p.name, project: () => projectFromFrame(p.id), original: true }, ...versionsOf(p.id).map((f) => ({ name: f.name, project: f.project }))] });
}
for (const { frames } of builtInFramesByCategory()) {
  for (const f of frames.filter((x) => !x.after)) sheets.push({ id: f.id, group: f.group, title: f.name, items: [{ name: f.name, project: f.project, original: f.group !== 'Essentials' }, ...versionsOf(f.id).map((v) => ({ name: v.name, project: v.project }))] });
}
const placed = new Set(sheets.map((s) => s.id));
const orphans = new Map<string, Item[]>();
for (const v of BUILT_IN_FRAMES) if (v.after && !placed.has(v.after)) orphans.set(v.after, [...(orphans.get(v.after) ?? []), { name: v.name, project: v.project }]);
for (const [key, items] of orphans) sheets.push({ id: key, group: categoryOf(key), title: items[0].name, items });
// Essentials as one sheet.
const ess = sheets.filter((s) => s.group === 'Essentials');
const merged: Sheet[] = ess.length ? [{ id: 'essentials', group: 'Essentials', title: 'Essentials', items: ess.flatMap((s) => s.items) }] : [];
sheets.splice(0, sheets.length, ...merged, ...sheets.filter((s) => s.group !== 'Essentials').sort((a, b) => categoryRank(a.group) - categoryRank(b.group)));

for (const s of sheets) {
  const cols = Math.min(PER_ROW, s.items.length), rows = Math.ceil(s.items.length / PER_ROW);
  const c = createCanvas(cols * TILE, rows * (TILE + LABEL));
  const ctx = c.getContext('2d');
  for (const [i, it] of s.items.entries()) {
    const p = it.project();
    await loadPictures(p);
    const t = createCanvas(TILE, TILE);
    renderProject(t.getContext('2d') as unknown as Ctx, { ...p, stage: { ...p.stage, showArt: true } }, TILE, { cache: false, clear: true, art });
    const x = (i % PER_ROW) * TILE, y = Math.floor(i / PER_ROW) * (TILE + LABEL);
    ctx.drawImage(t, x, y);
    ctx.fillStyle = it.original ? '#e8c87a' : '#e6e8ee';
    ctx.font = '600 15px "Atkinson Hyperlegible", sans-serif';
    ctx.textAlign = 'center';
    const label = it.name.length > 24 ? it.name.slice(0, 23) + '…' : it.name;
    ctx.fillText(label, x + TILE / 2, y + TILE + 22);
  }
  writeFileSync(join(out, `${s.id}.png`), c.toBuffer('image/png'));
}
writeFileSync(join(out, 'index.json'), JSON.stringify(sheets.map((s) => ({ id: s.id, group: s.group, title: s.title, count: s.items.length, names: s.items.map((i) => i.name) })), null, 1));
console.log(sheets.length, 'sheets,', sheets.reduce((n, s) => n + s.items.length, 0), 'frames');
