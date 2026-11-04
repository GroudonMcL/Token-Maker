// @vitest-environment node
// Project files saved by earlier versions (fixtures/v1/ by Phase 1,
// fixtures/v2/ by Phase 2, fixtures/v3/ by Phase 3, fixtures/v4/ by Phase 5, fixtures/v5/ by Phase 6, fixtures/v6/ by Phase 7, fixtures/v7/ by Phase 8, fixtures/v8/ by Phase 9, fixtures/v9/ by Phase 10, fixtures/v10/ before version 11) must still open and draw
// as they did then. Each
// .png beside a file is that picture as its version rendered it at 160 px.
// Since Phase 3 every layer is drawn on its own canvas and then composited
// (so it can be cached), which can change the rounding of a few edge pixels
// by a few 255ths; anything more than that is a real change.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sampleArt } from '../engine/legacy/sampleArt';
import { setCanvasFactory, type Ctx } from '../render/canvas';
import { renderProject } from '../render/renderProject';
import { registerShippedFonts } from '../../../scripts/frame-maker/nodeFonts';
import { parseProject } from './migrate';
import { DEFAULT_LIGHT, SCHEMA_VERSION } from './types';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);
// Version-6 files have text in Frame Maker's fonts.
registerShippedFonts();

const SIZE = 160;
const fixtures = (version: string) => {
  const dir = join(__dirname, 'fixtures', version);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.framemaker.json'))
    .map((f) => ({ file: f, path: join(dir, f), png: join(dir, f.replace('.framemaker.json', '.png')) }));
};
const v1 = fixtures('v1');
const v2 = fixtures('v2');
const v3 = fixtures('v3');
const v4 = fixtures('v4');
const v5 = fixtures('v5');
const v6 = fixtures('v6');
const v7 = fixtures('v7');
const v8 = fixtures('v8');
const v9 = fixtures('v9');
const v10 = fixtures('v10');

/** The largest difference between two pictures, per premultiplied channel (0–255), and the mean. */
function difference(a: Uint8ClampedArray, b: Uint8ClampedArray): { max: number; mean: number } {
  let max = 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const alpha = i - (i % 4) + 3;
    const d = i % 4 === 3 ? Math.abs(a[i] - b[i]) : Math.abs(a[i] * a[alpha] - b[i] * b[alpha]) / 255;
    max = Math.max(max, d);
    sum += d;
  }
  return { max, mean: sum / a.length };
}

async function drawsAsBefore(fixture: { path: string; png: string }) {
  const r = parseProject(readFileSync(fixture.path, 'utf8'));
  if (!r.ok) throw new Error(r.error);
  const c = createCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, r.project, SIZE, { art: r.project.stage.showArt ? sampleArt(make, 200) : null });
  const before = createCanvas(SIZE, SIZE);
  const bctx = before.getContext('2d');
  bctx.drawImage(await loadImage(readFileSync(fixture.png)), 0, 0);
  const d = difference(ctx.getImageData(0, 0, SIZE, SIZE).data as unknown as Uint8ClampedArray, bctx.getImageData(0, 0, SIZE, SIZE).data as unknown as Uint8ClampedArray);
  expect(d.max).toBeLessThanOrEqual(8);
  expect(d.mean).toBeLessThan(0.5);
}

describe.each([
  ['version-1', v1],
  ['version-2', v2],
  ['version-3', v3],
  ['version-4', v4],
  ['version-5', v5],
  ['version-6', v6],
  ['version-7', v7],
  ['version-8', v8],
  ['version-9', v9],
  ['version-10', v10],
])('%s project files', (_name, files) => {
  it('there are fixtures, each with its picture', () => {
    expect(files.length).toBeGreaterThan(1);
    for (const f of files) expect(existsSync(f.png)).toBe(true);
  });

  it.each(files)('$file opens as the current version without warnings', ({ path }) => {
    const r = parseProject(readFileSync(path, 'utf8'));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it.each(files)('$file draws as it did', drawsAsBefore);
});

describe('version-1 files', () => {
  it.each(v1)('$file gets the light at the top left and no clipping', ({ path }) => {
    const text = readFileSync(path, 'utf8');
    expect(JSON.parse(text).schemaVersion).toBe(1);
    const r = parseProject(text);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.stage.light).toBe(DEFAULT_LIGHT);
    for (const l of r.project.layers) expect(l.clip).toBe('none');
  });
});

describe('version-2 files', () => {
  it.each(v2)('$file is a version-2 file', ({ path }) => {
    expect(JSON.parse(readFileSync(path, 'utf8')).schemaVersion).toBe(2);
  });
});

describe('version-3 files', () => {
  it.each(v3)('$file is a version-3 file whose paints get the version-4 settings switched off', ({ path }) => {
    const text = readFileSync(path, 'utf8');
    expect(JSON.parse(text).schemaVersion).toBe(3);
    const r = parseProject(text);
    if (!r.ok) throw new Error(r.error);
    for (const l of r.project.layers) {
      if (l.type !== 'bandFill' && l.type !== 'line') continue;
      const paint = l.paint;
      if (paint.kind === 'lit') expect(paint.highlight).toBeNull();
      if (paint.kind === 'linear') expect(paint.followLight).toBe(false);
      if (paint.kind === 'linear' || paint.kind === 'acrossBand') for (const s of paint.stops) expect(s.opacity).toBe(1);
    }
  });
});

describe('files from before version 11', () => {
  it.each([...v9, ...v10])('$file gets shapes with the first variation', ({ path }) => {
    const r = parseProject(readFileSync(path, 'utf8'));
    if (!r.ok) throw new Error(r.error);
    const all = (layers: typeof r.project.layers): typeof r.project.layers => layers.flatMap((l) => (l.type === 'group' ? [l, ...all(l.children)] : [l]));
    for (const l of all(r.project.layers)) if (l.type === 'shape') expect(l.seed).toBe(1);
    expect(JSON.parse(readFileSync(path, 'utf8')).schemaVersion).toBeLessThan(11);
  });
});

describe('files from before version 10', () => {
  it.each([...v4, ...v5, ...v6, ...v7, ...v8, ...v9])('$file gets the version-10 settings switched off', ({ path }) => {
    const r = parseProject(readFileSync(path, 'utf8'));
    if (!r.ok) throw new Error(r.error);
    const all = (layers: typeof r.project.layers): typeof r.project.layers => layers.flatMap((l) => (l.type === 'group' ? [l, ...all(l.children)] : [l]));
    for (const l of all(r.project.layers)) {
      if (l.type === 'line') expect(l).toMatchObject({ waveShape: 'sine', raised: false });
      if (l.type === 'repeat') expect(l).toMatchObject({ detail: null, multipleOf: 1, wander: 0, fillPaint: null, paintEach: false });
      if (l.type === 'shape') expect(l).toMatchObject({ element: 'heart', detail: null });
      if (l.type === 'shape' || l.type === 'path') expect(l).toMatchObject({ fillPaint: null, paintEach: false });
    }
  });
});

describe('version-5 files', () => {
  it.each(v5)('$file is a version-5 file whose repeats, shapes and paths get no fill paint', ({ path }) => {
    const text = readFileSync(path, 'utf8');
    expect(JSON.parse(text).schemaVersion).toBe(5);
    const r = parseProject(text);
    if (!r.ok) throw new Error(r.error);
    const all = (layers: typeof r.project.layers): typeof r.project.layers => layers.flatMap((l) => (l.type === 'group' ? [l, ...all(l.children)] : [l]));
    const filled = all(r.project.layers).filter((l) => l.type === 'repeat' || l.type === 'shape' || l.type === 'path');
    expect(filled.length).toBeGreaterThan(0);
    for (const l of filled) expect(l).toMatchObject({ fillPaint: null, paintEach: false });
  });
});
