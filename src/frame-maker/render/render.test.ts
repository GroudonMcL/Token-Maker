// @vitest-environment node
// Pixel checks of the renderer, drawn with @napi-rs/canvas (as in token-maker).
import { createCanvas } from '@napi-rs/canvas';
import { FRAME_PRESETS, SHAPES } from '../engine/legacy/catalog';
import { drawFrame } from '../engine/legacy/frames';
import { sampleArt } from '../engine/legacy/sampleArt';
import { bandFillLayer, createProject, legacyFrameLayer, lineLayer, projectFromFrame, repeatLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { ELEMENT_KINDS, type FrameProject, type Layer, type Paint } from '../project/types';
import { bandGeometry, bandInsets, acrossOfPoint } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { repeatPlacements } from './layers';
import { renderProject } from './renderProject';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const noArt = (layers: Layer[]): FrameProject => {
  const p = createProject(layers);
  p.stage.showArt = false;
  return p;
};

function draw(project: FrameProject, size = 200, art = false): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, project, size, { art: art ? sampleArt(make, 200) : null });
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}

const opaque = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);
const differs = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.some((v, i) => v !== b[i]);
const pixel = (d: Uint8ClampedArray, size: number, x: number, y: number) => Array.from(d.slice((y * size + x) * 4, (y * size + x) * 4 + 4));

describe('legacy frames (token-maker templates)', () => {
  it('has all 26 frames (Cleric was removed in the frame review)', () => {
    expect(FRAME_PRESETS).toHaveLength(26);
  });

  it.each(FRAME_PRESETS.filter((p) => p.style !== 'none').map((p) => p.id))('%s draws pixel for pixel what token-maker draws', (id) => {
    const size = 160;
    const project = noArt([legacyFrameLayer(id)]);
    const ours = draw(project, size);
    // token-maker's own path: drawFrame on the band, origin at the centre.
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d') as unknown as Ctx;
    ctx.translate(size / 2, size / 2);
    const preset = FRAME_PRESETS.find((p) => p.id === id)!;
    drawFrame(ctx, preset.style, bandGeometry(project.stage, size, preset.color));
    const theirs = ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
    expect(opaque(ours)).toBeGreaterThan(500);
    expect(differs(ours, theirs)).toBe(false);
  });

  it.each(SHAPES.map((s) => s.id))('every frame draws on the %s shape', (shape) => {
    for (const preset of FRAME_PRESETS) {
      const project = noArt([legacyFrameLayer(preset.id)]);
      project.stage.shape = shape;
      const n = opaque(draw(project, 96));
      if (preset.style === 'none') expect(n).toBe(0);
      else expect(n).toBeGreaterThan(300);
    }
  });

  it('colour and highlights colour change the picture', () => {
    const layer = legacyFrameLayer('monk');
    const before = draw(noArt([layer]));
    expect(differs(before, draw(noArt([{ ...layer, color: '#2050c0' }])))).toBe(true);
    expect(differs(before, draw(noArt([{ ...layer, accent: '#ff0000' }])))).toBe(true);
  });
});

describe('editable layers', () => {
  it('a band fill covers the band and nothing inside or outside it', () => {
    const size = 200;
    const d = draw(noArt([{ ...bandFillLayer(), paint: { kind: 'solid', color: '#ff0000' } }]), size);
    const { outer, inner } = bandInsets(createProject().stage);
    const mid = Math.round(((outer + inner) / 2) * 100);
    expect(pixel(d, size, 100, mid)).toEqual([255, 0, 0, 255]);
    expect(pixel(d, size, 100, 100)[3]).toBe(0);
    expect(pixel(d, size, 100, 2)[3]).toBe(0);
  });

  it.each(['solid', 'lit', 'linear', 'acrossBand'] as const)('band fill paint %s draws', (kind) => {
    const paints = {
      solid: { kind: 'solid' as const, color: '#336699' },
      lit: { kind: 'lit' as const, color: '#336699', light: 0.8, dark: 0.8, pressed: false, highlight: null },
      linear: { kind: 'linear' as const, angle: 30, stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }], followLight: false },
      acrossBand: { kind: 'acrossBand' as const, stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }] },
    } satisfies Record<string, Paint>;
    expect(opaque(draw(noArt([{ ...bandFillLayer(), paint: paints[kind] }])))).toBeGreaterThan(3000);
  });

  it('a line sits where it is told across the band', () => {
    const size = 200;
    const g = bandGeometry(createProject().stage, size);
    const at = 0.25;
    const d = draw(noArt([{ ...lineLayer(), at, width: 0.2, paint: { kind: 'solid', color: '#00ff00' } }]), size);
    const y = Math.round(100 - (g.R - (g.outer + (g.inner - g.outer) * at)));
    expect(pixel(d, size, 100, y)).toEqual([0, 255, 0, 255]);
    expect(pixel(d, size, 100, Math.round(100 - (g.R - g.inner)) + 1)[3]).toBe(0);
  });

  it.each(['dashed', 'dotted'] as const)('%s lines leave gaps', (dash) => {
    const solid = opaque(draw(noArt([{ ...lineLayer(), width: 0.3 }])));
    expect(opaque(draw(noArt([{ ...lineLayer(), width: 0.3, dash }])))).toBeLessThan(solid * 0.9);
  });

  it.each(ELEMENT_KINDS)('repeated %s draws', (element) => {
    expect(opaque(draw(noArt([{ ...repeatLayer(), element }])))).toBeGreaterThan(100);
  });

  it('count, size, offset and rotation change a repeat without editing elements one by one', () => {
    const layer = { ...repeatLayer(), element: 'square' as const, raised: false };
    const before = draw(noArt([layer]));
    for (const change of [{ count: 20 }, { size: 0.5 }, { offset: 0.5 }, { rotation: 30 }, { fill: '#00ffff' }, { at: 0.2 }]) {
      expect(differs(before, draw(noArt([{ ...layer, ...change }])))).toBe(true);
    }
  });

  it('places exactly `count` elements, or as many as fit at a spacing', () => {
    const g = bandGeometry(createProject().stage, 400);
    expect(repeatPlacements({ ...repeatLayer(), count: 10, snapToCorners: false }, g)).toHaveLength(10);
    // Snapping on a hexagon rounds to a multiple of 6.
    const hex = bandGeometry({ ...createProject().stage, shape: 'hexagon' }, 400);
    expect(repeatPlacements({ ...repeatLayer(), count: 10, snapToCorners: true }, hex)).toHaveLength(12);
    const few = repeatPlacements({ ...repeatLayer(), mode: 'spacing', spacing: 4 }, g).length;
    const many = repeatPlacements({ ...repeatLayer(), mode: 'spacing', spacing: 1 }, g).length;
    expect(many).toBeGreaterThan(few * 3);
  });

  it('elements sit at their across position', () => {
    const g = bandGeometry(createProject().stage, 400);
    for (const at of [0, 0.3, 1]) {
      for (const { p } of repeatPlacements({ ...repeatLayer(), at }, g)) expect(acrossOfPoint(g, p)).toBeCloseTo(at, 1);
    }
  });

  it('every accent element is bigger', () => {
    const g = bandGeometry(createProject().stage, 400);
    const placed = repeatPlacements({ ...repeatLayer(), count: 12, accentEvery: 3, accentScale: 2 }, g);
    expect(placed.filter((e) => e.accent)).toHaveLength(4);
    expect(placed[0].h).toBeCloseTo(placed[1].h * 2);
  });

  it('the layered templates draw', () => {
    for (const t of LAYERED_TEMPLATES) expect(opaque(draw(noArt(t.make())))).toBeGreaterThan(3000);
  });
});

describe('layer stack', () => {
  const red = { ...bandFillLayer(), paint: { kind: 'solid', color: '#ff0000' } as const };
  const blue = { ...bandFillLayer(), paint: { kind: 'solid', color: '#0000ff' } as const };
  const size = 200;
  const at = (d: Uint8ClampedArray) => pixel(d, size, 100, 15);

  it('later layers are drawn on top, so reordering changes the picture', () => {
    expect(at(draw(noArt([red, blue]), size))).toEqual([0, 0, 255, 255]);
    expect(at(draw(noArt([blue, red]), size))).toEqual([255, 0, 0, 255]);
  });

  it('hidden layers are not drawn', () => {
    expect(at(draw(noArt([red, { ...blue, visible: false }]), size))).toEqual([255, 0, 0, 255]);
  });

  it('opacity and blend mode apply to the whole layer', () => {
    const half = at(draw(noArt([red, { ...blue, opacity: 0.5 }]), size));
    expect(half[0]).toBeGreaterThan(100);
    expect(half[2]).toBeGreaterThan(100);
    const multiplied = at(draw(noArt([red, { ...blue, blend: 'multiply' }]), size));
    expect(multiplied.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('an unsupported layer draws nothing', () => {
    const d = draw(noArt([{ ...red, type: 'unsupported', originalType: 'future', data: {}, reason: '' } as Layer]));
    expect(opaque(d)).toBe(0);
  });

  it('shows the sample picture and backing inside the frame when asked', () => {
    const p = projectFromFrame('gilded');
    expect(pixel(draw(p, size, true), size, 100, 100)[3]).toBe(255);
    p.stage.showArt = false;
    expect(pixel(draw(p, size, true), size, 100, 100)[3]).toBe(0);
  });

  it('draws the same at every size (scaled)', () => {
    const p = noArt(LAYERED_TEMPLATES[0].make());
    const coverage = (d: Uint8ClampedArray, size: number) => d.reduce((n, v, i) => (i % 4 === 3 ? n + v / 255 : n), 0) / size ** 2;
    expect(Math.abs(coverage(draw(p, 200), 200) - coverage(draw(p, 400), 400))).toBeLessThan(0.01);
  });

  it('draws the same twice', () => {
    const p = noArt(LAYERED_TEMPLATES[1].make());
    expect(differs(draw(p), draw(p))).toBe(false);
  });
});
