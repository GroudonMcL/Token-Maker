// @vitest-environment node
// Phase 8 renderer checks: the generators (growth, cracks and lightning,
// plates and cells, knotwork, gears, chains) draw repeatably, from their
// seeds, on every token shape, inside their part of the band, following
// paths; the distortion effect and scratches; lines whose waves fit the band.
import { createCanvas } from '@napi-rs/canvas';
import { SHAPES } from '../engine/legacy/catalog';
import { bandFillLayer, cellsLayer, chainLayer, createProject, fractureLayer, gearsLayer, growthLayer, knotworkLayer, lineLayer, NEW_EFFECT, pathLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { CELL_PATTERNS, GROWTH_KINDS, type Effect, type FrameProject, type Layer } from '../project/types';
import { acrossOfPoint, bandGeometry, bandWidthPx, outlineAt } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { cellShapes, chainLinks, fractureStrands, gearPlacements, growthShape, knotArcs } from './generators';
import { finder, pickLayer } from './hitTest';
import { renderProject } from './renderProject';
import { lineWaves, tracksOf } from './track';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = 240;
const project = (layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject => {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.25, ...stage };
  return p;
};
function draw(p: FrameProject, size = SIZE): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, p, size, { cache: false });
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
const painted = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);
const g = (p: FrameProject, size = SIZE) => bandGeometry(p.stage, size);

const GENERATORS: [string, () => Layer][] = [
  ...GROWTH_KINDS.map((k): [string, () => Layer] => [`growth (${k})`, () => growthLayer(k)]),
  ['cracks', fractureLayer],
  ['lightning', () => ({ ...fractureLayer(), kind: 'lightning' as const, length: 5 })],
  ...CELL_PATTERNS.map((pattern): [string, () => Layer] => [`cells (${pattern})`, () => ({ ...cellsLayer(), pattern })]),
  ['knotwork', knotworkLayer],
  ['gears', gearsLayer],
  ['chain', chainLayer],
];

describe('every generator', () => {
  it.each(GENERATORS)('%s draws the same picture every time, and a different one for another seed', (_n, make) => {
    const layer = make();
    const d = draw(project([layer]));
    expect(painted(d)).toBeGreaterThan(200);
    expect(same(draw(project([layer])), d)).toBe(true);
    if ('seed' in layer) expect(same(draw(project([{ ...layer, seed: layer.seed + 1 } as Layer])), d)).toBe(false);
  });

  it.each(GENERATORS)('%s draws on every token shape and scales with the band', (_n, make) => {
    const layer = make();
    for (const shape of SHAPES) {
      const thin = painted(draw(project([layer], { shape: shape.id, thickness: 0.15 })));
      const thick = painted(draw(project([layer], { shape: shape.id, thickness: 0.3 })));
      expect(thin).toBeGreaterThan(50);
      expect(thick).toBeGreaterThan(thin);
    }
  });

  it.each(GENERATORS)('%s can be picked on the canvas, and effects work on it', (_n, make) => {
    const layer = make();
    const p = project([layer]);
    const geo = g(p);
    const r = SIZE / 2 - geo.outer - bandWidthPx(geo) * ('at' in layer ? layer.at : 0.5);
    const hits = [0, 1, 2, 3, 4, 5, 6, 7].some((k) => pickLayer(p, SIZE, { x: Math.cos((k * Math.PI) / 4) * r, y: Math.sin((k * Math.PI) / 4) * r })?.id === layer.id);
    expect(hits).toBe(true);
    expect(same(draw(project([{ ...layer, effects: [NEW_EFFECT.bevel()] } as Layer])), draw(p))).toBe(false);
  });
});

describe('growth', () => {
  it('a wavy vine has waves fitted to the band, leaves on alternate sides, and branches that come from the stem', () => {
    const vine = growthLayer('vine');
    const p = project([vine]);
    const { strands, extras } = growthShape(vine, g(p));
    expect(strands[0].closed).toBe(true);
    expect(extras.length).toBeGreaterThan(8);
    expect(extras.slice(0, 4).map((e) => e.side)).toEqual([-1, 1, -1, 1]);
    // Branches start on the stem.
    for (const b of strands.slice(1)) {
      const d = Math.min(...strands[0].points.map((q) => Math.hypot(q.x - b.points[0].x, q.y - b.points[0].y)));
      expect(d).toBeLessThan(bandWidthPx(g(p)) * 0.2);
    }
    // No branching: the stem alone (and leaves).
    expect(growthShape({ ...vine, branching: 0 }, g(p)).strands).toHaveLength(1);
  });

  it('branches taper towards their tips and grow more levels with depth', () => {
    const roots = growthLayer('roots');
    const p = project([roots]);
    const one = growthShape({ ...roots, depth: 1 }, g(p)).strands;
    const three = growthShape(roots, g(p)).strands;
    expect(three.length).toBeGreaterThan(one.length);
    const branch = one[1];
    expect(branch.widths.at(-1)!).toBeLessThan(branch.widths[0] * 0.3);
  });

  it('antlers grow outwards from evenly spaced points', () => {
    const a = growthLayer('antlers');
    const p = project([a]);
    const { strands } = growthShape(a, g(p));
    const beams = strands.filter((s) => s.widths[0] === a.thickness * bandWidthPx(g(p)));
    expect(beams).toHaveLength(6);
    for (const b of beams) expect(Math.hypot(b.points.at(-1)!.x, b.points.at(-1)!.y)).toBeGreaterThan(Math.hypot(b.points[0].x, b.points[0].y));
  });

  it('can follow a path', () => {
    const path = { ...pathLayer([{ x: -3, y: 0, handle: null }, { x: 3, y: 0, handle: null }]), place: 'free' as const, x: 0, y: 0, size: 0.2, closed: false };
    const vine = { ...growthLayer('vine'), follow: path.id, branching: 0 };
    const p = project([path, vine]);
    const [stem] = growthShape(vine, g(p), finder(p)).strands;
    expect(stem.closed).toBe(false);
    const [track] = tracksOf(path, g(p));
    expect(stem.points[0].x).toBeCloseTo(track.points[0].x, 0);
  });
});

describe('cracks and lightning', () => {
  it('cracks stay in their part of the band and fork', () => {
    const f = { ...fractureLayer(), from: 0.3, to: 0.7, branching: 1, count: 10 };
    const p = project([f]);
    const strands = fractureStrands(f, g(p));
    expect(strands.length).toBeGreaterThan(10);
    for (const s of strands) for (const q of s.points) {
      const a = acrossOfPoint(g(p), q);
      expect(a).toBeGreaterThan(0.25);
      expect(a).toBeLessThan(0.75);
    }
  });

  it('lightning runs along the band', () => {
    const f = { ...fractureLayer(), kind: 'lightning' as const, count: 2, length: 6, branching: 0 };
    const p = project([f]);
    const [bolt] = fractureStrands(f, g(p));
    const start = Math.atan2(bolt.points[0].y, bolt.points[0].x);
    const end = Math.atan2(bolt.points.at(-1)!.y, bolt.points.at(-1)!.x);
    expect(Math.abs(Math.atan2(Math.sin(end - start), Math.cos(end - start)))).toBeGreaterThan(0.5);
  });
});

describe('plates and cells', () => {
  it('divide their part of the band into separate plates', () => {
    const c = { ...cellsLayer(), from: 0.2, to: 0.8 };
    const p = project([c]);
    const cells = cellShapes(c, g(p));
    expect(cells.length).toBeGreaterThan(20);
    for (const cell of cells) for (const q of cell.points) {
      const a = acrossOfPoint(g(p), q);
      expect(a).toBeGreaterThan(0.15);
      expect(a).toBeLessThan(0.85);
    }
  });

  it('leave pieces out and vary their colour by the seed', () => {
    const c = cellsLayer();
    const p = project([c]);
    const all = cellShapes({ ...c, missing: 0 }, g(p)).length;
    const some = cellShapes({ ...c, missing: 0.5 }, g(p)).length;
    expect(some).toBeLessThan(all * 0.7);
    expect(some).toBeGreaterThan(all * 0.3);
    expect(new Set(cellShapes({ ...c, vary: 1 }, g(p)).map((x) => x.color)).size).toBeGreaterThan(5);
  });

  it('a bevel on plates bevels each one: the gaps stay empty', () => {
    const c = { ...cellsLayer(), pattern: 'grid' as const, gap: 0.1, effects: [NEW_EFFECT.bevel()] };
    const p = project([c]);
    expect(painted(draw(p))).toBeLessThan(painted(draw(project([bandFillLayer()]))) * 0.9);
  });
});

describe('knotwork', () => {
  it('two strands take turns going over: each arc runs from one under-crossing to the next', () => {
    const k = knotworkLayer();
    const p = project([k]);
    const arcs = knotArcs(k, g(p));
    const outline = outlineAt(g(p), 0.5);
    const waves = Math.max(2, Math.round(outlineLength(outline) / (k.waveLength * bandWidthPx(g(p)))));
    // One arc per wave per strand.
    expect(arcs.length).toBe(waves * 2);
    // Swapping over and under gives other arcs.
    expect(knotArcs({ ...k, flip: true }, g(p))[0].points[0]).not.toEqual(arcs[0].points[0]);
  });
});

function outlineLength(points: { x: number; y: number }[]): number {
  return points.reduce((s, q, i) => s + Math.hypot(points[(i + 1) % points.length].x - q.x, points[(i + 1) % points.length].y - q.y), 0);
}

describe('gears and chains', () => {
  it('gears go round the band, every other one a different size and turned to mesh', () => {
    const gears = { ...gearsLayer(), altSize: 0.6, interlock: true };
    const p = project([gears]);
    const placed = gearPlacements(gears, g(p));
    expect(placed).toHaveLength(6);
    expect(placed[1].r / placed[0].r).toBeCloseTo(0.6, 6);
    expect(placed[1].turn - placed[0].turn).toBeCloseTo(Math.PI / gears.teeth, 6);
  });

  it('a chain alternates face-on and edge-on links, an even number all the way round', () => {
    const c = chainLayer();
    for (const shape of SHAPES) {
      const links = chainLinks(c, g(project([c], { shape: shape.id })));
      expect(links.length % 2).toBe(0);
      expect(links.filter((l) => l.face).length).toBe(links.length / 2);
    }
  });
});

describe('effects and lines (Phase 8)', () => {
  const grey = (effects: Effect[]) => ({ ...bandFillLayer(), paint: { kind: 'solid' as const, color: '#808080' }, effects });

  it('distortion warps the edges, repeatably', () => {
    const base = draw(project([grey([])]));
    const a = draw(project([grey([{ ...NEW_EFFECT.distort(), amount: 0.1 } as Effect])]));
    expect(same(a, base)).toBe(false);
    expect(same(a, draw(project([grey([{ ...NEW_EFFECT.distort(), amount: 0.1 } as Effect])])))).toBe(true);
    expect(same(draw(project([grey([{ ...NEW_EFFECT.distort(), amount: 0 } as Effect])])), base)).toBe(true);
  });

  it('wear can scratch, and without scratches draws as before', () => {
    const wear = NEW_EFFECT.wear() as Extract<Effect, { kind: 'wear' }>;
    const plain = draw(project([grey([wear])]));
    expect(same(draw(project([grey([{ ...wear, scratches: 1 }])])), plain)).toBe(false);
  });

  it('a wavy line can fit its waves to the band', () => {
    const line = { ...lineLayer(), waveAmplitude: 0.2, waveFit: 1 };
    const thin = bandGeometry({ ...project([]).stage, thickness: 0.1 }, SIZE);
    const thick = bandGeometry({ ...project([]).stage, thickness: 0.3 }, SIZE);
    expect(lineWaves(line, outlineAt(thin, 0.5), thin)).toBeGreaterThan(lineWaves(line, outlineAt(thick, 0.5), thick));
    expect(lineWaves({ ...line, waveFit: 0 }, outlineAt(thin, 0.5), thin)).toBe(12);
  });
});

describe('done when (renderer)', () => {
  it('the Overgrown ruin is made only from generators and styles, and draws on every shape', () => {
    const t = LAYERED_TEMPLATES.find((x) => x.id === 'overgrown-ruin')!;
    const layers = t.make();
    expect(new Set(layers.map((l) => l.type))).toEqual(new Set(['cells', 'fracture', 'knotwork', 'growth']));
    const plates = layers.find((l) => l.type === 'cells')!;
    expect(plates.type === 'cells' && plates.missing).toBeGreaterThan(0);
    for (const shape of SHAPES) expect(painted(draw(project(t.make(), { shape: shape.id })))).toBeGreaterThan(5000);
  });
});
