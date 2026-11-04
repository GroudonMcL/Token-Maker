// @vitest-environment node
// Version 10: the ornaments, textures and options the last four Token Maker
// conversions are made of, and more to build with.
import { createCanvas } from '@napi-rs/canvas';
import { bandFillLayer, createProject, lineLayer, repeatLayer, shapeLayer, textureLayer } from '../project/defaults';
import { ELEMENT_KINDS, WAVE_SHAPES, type FrameProject, type Layer, type RepeatLayer } from '../project/types';
import { bandGeometry, outlineAt } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { DETAIL_NAMES } from './elements';
import { GLYPHS } from './glyphs';
import { lineOutline, repeatPlacements } from './layers';
import { lineWaves } from './track';
import { renderProject } from './renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = 200;

function project(layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, ...stage };
  return p;
}

function draw(p: FrameProject, size = SIZE): Uint8ClampedArray {
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, p, size, { cache: false });
  return c.getContext('2d').getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}

const ink = (d: Uint8ClampedArray) => d.reduce((n, v, i) => (i % 4 === 3 && v > 0 ? n + 1 : n), 0);
const differs = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.some((v, i) => v !== b[i]);

describe('ornaments', () => {
  it('every path-drawn ornament is written in its own box, -1 to 1 (with a little room for curves)', () => {
    for (const [kind, glyph] of Object.entries(GLYPHS)) {
      for (const subs of [glyph.body, glyph.detail, glyph.detailLines, glyph.lines]) {
        for (const s of subs ?? []) for (const v of [...s.start, ...s.segs.flat()]) expect(Math.abs(v), kind).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it.each(ELEMENT_KINDS)('%s can be a shape of its own, on the band or mirrored', (element) => {
    const one = draw(project([{ ...shapeLayer(), shape: 'ornament', element, size: 1.2 }], { thickness: 0.3 }));
    expect(ink(one)).toBeGreaterThan(40);
    const pair = draw(project([{ ...shapeLayer(), shape: 'ornament', element, size: 1.2, along: 0.2, mirror: 'leftRight' }], { thickness: 0.3 }));
    expect(ink(pair)).toBeGreaterThan(ink(one) * 1.5);
  });

  it.each(Object.keys(DETAIL_NAMES))('%s has a second colour that changes it', (element) => {
    const layer = { ...repeatLayer(), element: element as RepeatLayer['element'], count: 6, size: 0.8, fill: '#c08040' };
    const a = draw(project([layer], { thickness: 0.3 }));
    expect(differs(a, draw(project([{ ...layer, detail: '#00ff00' }], { thickness: 0.3 })))).toBe(true);
  });

  it('the overlapping parts of a fleur-de-lis join up instead of cutting holes', () => {
    const d = draw(project([{ ...shapeLayer(), shape: 'ornament', element: 'fleur', place: 'free', x: 0, y: 0, size: 1, outline: null, raised: false, shaded: false, fill: '#ff0000' }]));
    // Where the middle petal crosses the band of the fleur-de-lis (y = 0.28 of its half-height): solid.
    const at = (x: number, y: number) => d[(Math.round(SIZE / 2 + y * SIZE / 4) * SIZE + Math.round(SIZE / 2 + x * SIZE / 4)) * 4 + 3];
    expect(at(0, 0.28)).toBe(255);
    expect(at(0.15, 0.1)).toBe(255);
  });
});

describe('repeats: random variation, even counts', () => {
  const g = bandGeometry(project([]).stage, SIZE);
  const base: RepeatLayer = { ...repeatLayer(), element: 'circle', mode: 'spacing', spacing: 0.9, snapToCorners: false };

  it('switched off, the elements are placed exactly as before', () => {
    const before = repeatPlacements(base, g);
    expect(before.every((p) => p.spin === 0 && p.variant === undefined)).toBe(true);
    expect(before.every((p) => p.h === base.size * (g.inner - g.outer))).toBe(true);
  });

  it('wander, size and turn vary each element within their limits, the same for a seed and different for another', () => {
    const varied = { ...base, wander: 0.5, jitterSize: 0.2, jitterAngle: 15, seed: 5 };
    const a = repeatPlacements(varied, g);
    const plain = repeatPlacements(base, g);
    const w = g.inner - g.outer;
    a.forEach((p, i) => {
      expect(Math.hypot(p.p.x - plain[i].p.x, p.p.y - plain[i].p.y)).toBeLessThanOrEqual(0.25 * w + 1e-6);
      expect(p.h / plain[i].h).toBeGreaterThanOrEqual(0.8 - 1e-9);
      expect(p.h / plain[i].h).toBeLessThanOrEqual(1.2 + 1e-9);
      expect(Math.abs(p.spin)).toBeLessThanOrEqual((15 * Math.PI) / 180 + 1e-9);
    });
    expect(new Set(a.map((p) => p.h)).size).toBeGreaterThan(3);
    expect(repeatPlacements(varied, g)).toEqual(a);
    expect(repeatPlacements({ ...varied, seed: 6 }, g)).not.toEqual(a);
  });

  it('Bard’s notes come single and paired, at random', () => {
    const notes = repeatPlacements({ ...base, element: 'bardNote', seed: 0xba7e }, g);
    expect(notes.some((n) => n.variant! < 0.4)).toBe(true);
    expect(notes.some((n) => n.variant! >= 0.4)).toBe(true);
  });

  it('"a multiple of" rounds the number, so alternating patterns meet up', () => {
    for (const thickness of [0.1, 0.13, 0.17, 0.22, 0.3]) {
      const gg = bandGeometry({ ...project([]).stage, thickness }, SIZE);
      expect(repeatPlacements({ ...base, multipleOf: 2 }, gg).length % 2).toBe(0);
      expect(repeatPlacements({ ...base, multipleOf: 3 }, gg).length % 3).toBe(0);
    }
    expect(repeatPlacements({ ...base, mode: 'count', count: 7, multipleOf: 2 }, g).length).toBe(8);
  });
});

describe('lines: fitted, shaped and raised waves', () => {
  const wavy = { ...lineLayer(), waveAmplitude: 0.2, width: 0.06 };

  it('fitted waves follow the size of the band: a thinner band gets more of them', () => {
    const count = (thickness: number) => {
      const g = bandGeometry({ ...project([]).stage, thickness }, SIZE);
      const layer = { ...wavy, waveFit: 1.5 };
      return lineWaves(layer, outlineAt(g, layer.at), g);
    };
    expect(count(0.1)).toBeGreaterThan(count(0.2));
    // Off, the line keeps its own number.
    const g = bandGeometry(project([]).stage, SIZE);
    expect(lineWaves({ ...wavy, waves: 9 }, outlineAt(g, 0.5), g)).toBe(9);
  });

  it.each(WAVE_SHAPES.filter((s) => s !== 'sine'))('%s waves draw, differently from smooth ones, within their height', (waveShape) => {
    const g = bandGeometry(project([]).stage, SIZE);
    const sine = draw(project([wavy]));
    const shaped = draw(project([{ ...wavy, waveShape }]));
    expect(ink(shaped)).toBeGreaterThan(200);
    expect(differs(sine, shaped)).toBe(true);
    const plain = outlineAt(g, 0.5);
    const r0 = Math.hypot(plain[0].x, plain[0].y);
    for (const p of lineOutline({ ...wavy, waveShape }, g)) expect(Math.abs(Math.hypot(p.x, p.y) - r0)).toBeLessThanOrEqual(0.2 * (g.inner - g.outer) + 0.5);
  });

  it('a raised line casts a shadow', () => {
    const flat = draw(project([wavy]));
    expect(ink(draw(project([{ ...wavy, raised: true }])))).toBeGreaterThan(ink(flat));
  });
});

describe('the new textures', () => {
  it('veined marble keeps to the shaded side, and the light dial moves it', () => {
    const veins = { ...textureLayer('veins'), where: 'shaded' as const };
    const d = draw(project([veins], { thickness: 0.3 }));
    // The bottom right (away from the top-left light) has more of it than the top left.
    const quarter = (fx: number, fy: number) => {
      let n = 0;
      for (let y = fy * SIZE / 2; y < (fy + 1) * SIZE / 2; y++) for (let x = fx * SIZE / 2; x < (fx + 1) * SIZE / 2; x++) if (d[(y * SIZE + x) * 4 + 3] > 0) n++;
      return n;
    };
    expect(quarter(1, 1)).toBeGreaterThan(quarter(0, 0) * 3);
    expect(differs(d, draw(project([veins], { thickness: 0.3, light: 45 })))).toBe(true);
  });

  it('every new texture sits on a band without spilling over it', () => {
    for (const kind of ['veins', 'brushed', 'woven', 'chainmail', 'rust', 'frost', 'bark', 'sparkle', 'crackle', 'knurl'] as const) {
      const d = draw(project([{ ...bandFillLayer(), paint: { kind: 'solid', color: '#000000' }, opacity: 0 }, { ...textureLayer(kind), where: 'everywhere' }]));
      expect(ink(d), kind).toBeGreaterThan(100);
      // The middle of the token (inside the band) is empty.
      expect(d[(SIZE / 2 * SIZE + SIZE / 2) * 4 + 3], kind).toBe(0);
    }
  });
});
