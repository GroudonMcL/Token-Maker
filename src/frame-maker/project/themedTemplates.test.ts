// @vitest-environment node
// The themed borders: every one is ordinary editable data that survives a
// file round trip, draws on every token shape (and the same every time),
// and only uses layers, generators and styles (no Token Maker frame).
import { createCanvas } from '@napi-rs/canvas';
import { registerShippedFonts } from '../../../scripts/frame-maker/nodeFonts';
import { SHAPES } from '../engine/legacy/catalog';
import { setCanvasFactory, type Ctx } from '../render/canvas';
import { renderProject } from '../render/renderProject';
import { LAYERED_TEMPLATES } from './defaults';
import { parseProject, serializeProject } from './migrate';
import { THEMED_TEMPLATES, themedProject } from './themedTemplates';
import { flatten } from './tree';
import type { FrameProject } from './types';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();

const SIZE = 140;
function draw(p: FrameProject): Uint8ClampedArray {
  const c = createCanvas(SIZE, SIZE);
  renderProject(c.getContext('2d') as unknown as Ctx, { ...p, stage: { ...p.stage, showArt: false } }, SIZE, { cache: false });
  return c.getContext('2d').getImageData(0, 0, SIZE, SIZE).data as unknown as Uint8ClampedArray;
}
const painted = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);

describe('themed borders', () => {
  it('are a varied set with their own ids, distinct from the other templates', () => {
    expect(THEMED_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    const ids = [...THEMED_TEMPLATES, ...LAYERED_TEMPLATES].map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Between them they use the generators, gems, text and the lighting rig.
    const types = new Set(THEMED_TEMPLATES.flatMap((t) => flatten(t.make()).map((l) => l.type)));
    for (const type of ['cells', 'growth', 'fracture', 'knotwork', 'gears', 'chain', 'text', 'contours', 'repeat', 'texture']) expect(types).toContain(type);
    expect(THEMED_TEMPLATES.some((t) => t.stage?.lights?.length)).toBe(true);
  });

  it.each(THEMED_TEMPLATES.map((t) => [t.name, t] as const))('%s is editable data that survives a file round trip', (_n, t) => {
    const p = themedProject(t);
    expect(flatten(p.layers).some((l) => l.type === 'legacyFrame' || l.type === 'unsupported')).toBe(false);
    const r = parseProject(serializeProject(p));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project).toEqual(p);
  });

  it.each(THEMED_TEMPLATES.map((t) => [t.name, t] as const))('%s draws on every token shape, the same every time', (_n, t) => {
    for (const shape of SHAPES) {
      const p = themedProject(t);
      p.stage = { ...p.stage, shape: shape.id };
      const d = draw(p);
      expect(painted(d)).toBeGreaterThan(SIZE * SIZE * 0.12);
      expect(draw(p).every((v, i) => v === d[i])).toBe(true);
    }
  });
});
