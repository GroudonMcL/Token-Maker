// @vitest-environment node
// Version 11: the blur effect (soft, spin, zoom), the natural and strange
// textures, the new shapes, and the crafted borders made with them.
import { createCanvas } from '@napi-rs/canvas';
import { SHAPES } from '../engine/legacy/catalog';
import { shapePolygon } from '../engine/legacy/shapes';
import { CRAFTED_TEMPLATES } from '../project/craftedTemplates';
import { PICTURE_FRAME_TEMPLATES } from '../project/pictureFrameTemplates';
import { bandFillLayer, createProject, NEW_EFFECT, shapeLayer, textureLayer, TEXTURES } from '../project/defaults';
import { parseProject, serializeProject } from '../project/migrate';
import { themedProject } from '../project/themedTemplates';
import { flatten } from '../project/tree';
import { SCHEMA_VERSION, SHAPE_KINDS, TEXTURE_KINDS, type BlurEffect, type Effect, type FrameProject, type Layer, type TextureKind } from '../project/types';
import { bandGeometry, bandWidthPx } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { clearLayerCache } from './layerCache';
import { insetOf } from './naturalTextures';
import { renderProject } from './renderProject';
import { isOutlined, unitOutline } from './shapeOutlines';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = 200;
const project = (layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject => {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.3, ...stage };
  return p;
};
function draw(p: FrameProject, size = SIZE): Uint8ClampedArray {
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, p, size, { cache: false });
  return c.getContext('2d').getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const alphaAt = (d: Uint8ClampedArray, x: number, y: number) => d[(Math.round(y) * SIZE + Math.round(x)) * 4 + 3];
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
const opaque = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);
const blur = (patch: Partial<BlurEffect>): Effect => ({ ...(NEW_EFFECT.blur() as BlurEffect), ...patch });

beforeEach(() => clearLayerCache());

describe('the blur effect', () => {
  // A small square at the top of the band, so smearing it round or out shows.
  const dot = (effects: Effect[]) => ({ ...shapeLayer(), shape: 'rectangle' as const, along: 0, across: 0.5, size: 0.3, fill: '#ffffff', shaded: false, raised: false, outline: null, effects });
  const p = project([]);
  const g = bandGeometry(p.stage, SIZE);
  const r = SIZE / 2 - g.outer - bandWidthPx(g) * 0.5;
  // Along the band a little to the right of the dot, and further out from the middle above it.
  const along = { x: SIZE / 2 + Math.sin(0.22) * r, y: SIZE / 2 - Math.cos(0.22) * r };
  const outward = { x: SIZE / 2, y: SIZE / 2 - r - bandWidthPx(g) * 0.33 };

  it('soft spreads it all round and fades its middle; spin smears it round the token; zoom in and out', () => {
    const sharp = draw(project([dot([])]));
    expect(alphaAt(sharp, along.x, along.y)).toBe(0);
    expect(alphaAt(sharp, outward.x, outward.y)).toBe(0);
    const soft = draw(project([dot([blur({ mode: 'soft', amount: 0.3 })])]));
    expect(opaque(soft)).toBeGreaterThan(opaque(sharp) * 1.5);
    const spin = draw(project([dot([blur({ mode: 'spin', amount: 0.8 })])]));
    expect(alphaAt(spin, along.x, along.y)).toBeGreaterThan(0);
    expect(alphaAt(spin, outward.x, outward.y)).toBe(0);
    const zoom = draw(project([dot([blur({ mode: 'zoom', amount: 0.8 })])]));
    expect(alphaAt(zoom, along.x, along.y)).toBe(0);
    expect(alphaAt(zoom, outward.x, outward.y)).toBeGreaterThan(0);
  });

  it('keeping its shape leaves the edges where they were', () => {
    const band = { ...bandFillLayer(), paint: { kind: 'linear' as const, angle: 0, followLight: false, stops: [{ at: 0, color: '#000000', opacity: 1 }, { at: 1, color: '#ffffff', opacity: 1 }] } };
    const sharp = draw(project([band]));
    const kept = draw(project([{ ...band, effects: [blur({ amount: 0.3, keepShape: true })] }]));
    for (let i = 3; i < sharp.length; i += 4) expect(kept[i]).toBe(sharp[i]);
    expect(same(kept, sharp)).toBe(false);
  });

  it('nothing to blur, or no amount, changes nothing', () => {
    const band = bandFillLayer();
    expect(same(draw(project([{ ...band, effects: [blur({ amount: 0 })] }])), draw(project([band])))).toBe(true);
  });

  it('a file keeps it, and a bad one falls back', () => {
    const p = project([{ ...bandFillLayer(), effects: [blur({ mode: 'spin', amount: 0.4, keepShape: true })] }]);
    const r = parseProject(serializeProject(p));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers[0].effects).toEqual([blur({ mode: 'spin', amount: 0.4, keepShape: true })]);
    const bad = JSON.parse(serializeProject(p));
    bad.layers[0].effects = [{ kind: 'blur', mode: 'sideways', amount: 9 }];
    const r2 = parseProject(bad);
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.project.layers[0].effects).toEqual([blur({ amount: 2 })]);
  });
});

const NEW_TEXTURES: TextureKind[] = ['crystal', 'lava', 'smoke', 'feathers', 'filigree', 'mottled', 'lichen', 'caustics', 'nebula', 'circuit', 'bubbles', 'eyes'];

describe('the natural and strange textures', () => {
  it('are all in the library, with a preset each', () => {
    for (const kind of NEW_TEXTURES) {
      expect(TEXTURE_KINDS).toContain(kind);
      expect(TEXTURES.some((t) => t.layer.kind === kind)).toBe(true);
    }
  });

  it.each(NEW_TEXTURES)('%s draws only inside its part of the band, by its seed, the same every time, on every shape', (kind) => {
    for (const shape of SHAPES) {
      const layer = { ...textureLayer(kind), from: 0.2, to: 0.8 };
      const p = project([layer], { shape: shape.id });
      const d = draw(p);
      expect(opaque(d)).toBeGreaterThan(300);
      expect(same(d, draw(p))).toBe(true);
      // Nothing outside its part of the band (a pixel's worth of edge allowed).
      const g = bandGeometry(p.stage, SIZE);
      const w = bandWidthPx(g);
      for (let y = 0; y < SIZE; y += 3)
        for (let x = 0; x < SIZE; x += 3) {
          const v = (insetOf(shape.id, SIZE / 2, x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2) - g.outer) / w;
          if (v < 0.2 - 2 / w || v > 0.8 + 2 / w) expect(alphaAt(d, x, y)).toBe(0);
        }
      if (shape.id === 'circle') expect(same(d, draw(project([{ ...layer, seed: layer.seed + 1 }], { shape: shape.id })))).toBe(false);
    }
  });

  it.each(['lava', 'smoke', 'mottled', 'caustics'] as const)('%s meets itself without a seam at the top', (kind) => {
    const p = project([{ ...textureLayer(kind), strength: 1 }]);
    const d = draw(p, SIZE);
    const g = bandGeometry(p.stage, SIZE);
    // Neighbouring columns just either side of the top, against neighbours at the bottom.
    const diff = (x: number, top: boolean) => {
      let sum = 0;
      for (let k = 0; k < bandWidthPx(g) - 2; k++) {
        const y = top ? g.outer + 1 + k : SIZE - g.outer - 2 - k;
        const a = (y * SIZE + x) * 4;
        const b = (y * SIZE + x + 1) * 4;
        for (let c = 0; c < 3; c++) sum += Math.abs(d[a + c] - d[b + c]);
      }
      return sum;
    };
    const seam = diff(SIZE / 2 - 1, true);
    const elsewhere = (diff(SIZE / 2 - 1, false) + diff(SIZE / 2 - 4, true) + diff(SIZE / 2 + 3, true)) / 3;
    expect(seam).toBeLessThan(elsewhere * 2.5 + 60);
  });

  it('where a pixel is across the band agrees with the band on every shape', () => {
    for (const shape of SHAPES) {
      const g = bandGeometry(project([], { shape: shape.id }).stage, SIZE);
      // Every corner of the band's outlines (and the middle of their edges) is at that outline's inset.
      for (const inset of [g.outer, g.inner, (g.outer + g.inner) / 2]) {
        const poly = shapePolygon(shape.id, SIZE / 2, inset);
        poly.forEach((p, i) => {
          const q = poly[(i + 1) % poly.length];
          expect(insetOf(shape.id, SIZE / 2, p.x, p.y)).toBeCloseTo(inset, 1);
          expect(insetOf(shape.id, SIZE / 2, (p.x + q.x) / 2, (p.y + q.y) / 2)).toBeCloseTo(inset, 0);
        });
      }
    }
  });
});

describe('the new shapes', () => {
  const NEW_SHAPES = SHAPE_KINDS.filter(isOutlined);

  it('there are thirteen of them', () => expect(NEW_SHAPES).toHaveLength(13));

  it.each(NEW_SHAPES)('a %s fits its box and draws', (shape) => {
    const layer = { ...shapeLayer(), shape, size: 1.4, raised: false, outline: null };
    const pts = unitOutline(layer);
    expect(pts.length).toBeGreaterThan(3);
    for (const p of pts) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.0001);
    }
    expect(opaque(draw(project([layer])))).toBeGreaterThan(40);
  });

  it('a burst and a blob change with their seed; the others do not use it', () => {
    for (const shape of ['burst', 'blob'] as const) expect(unitOutline({ ...shapeLayer(), shape, seed: 1 })).not.toEqual(unitOutline({ ...shapeLayer(), shape, seed: 2 }));
    expect(unitOutline({ ...shapeLayer(), shape: 'flower', seed: 1 })).toEqual(unitOutline({ ...shapeLayer(), shape: 'flower', seed: 2 }));
  });

  it('a ring has a hole as big as its hole size says', () => {
    const big = { ...shapeLayer(), shape: 'ring' as const, place: 'free' as const, x: 0, y: 0, size: 1.4, innerRatio: 0.7, fill: '#ffffff', shaded: false, raised: false, outline: null };
    const d = draw(project([big]));
    expect(alphaAt(d, SIZE / 2, SIZE / 2)).toBe(0);
    expect(alphaAt(d, SIZE / 2, SIZE / 2 - SIZE * 0.3)).toBe(255);
  });
});

describe('the crafted borders', () => {
  it('use blend modes, blur and the new textures', () => {
    const all = CRAFTED_TEMPLATES.flatMap((t) => flatten(t.make()));
    expect(all.some((l) => l.blend !== 'source-over')).toBe(true);
    expect(all.some((l) => l.effects.some((e) => e.kind === 'blur'))).toBe(true);
    for (const kind of ['crystal', 'lava', 'smoke', 'filigree', 'mottled'] as const) expect(all.some((l) => l.type === 'texture' && l.kind === kind)).toBe(true);
  });

  it.each(CRAFTED_TEMPLATES.map((t) => [t.name, t] as const))('%s survives a file round trip and draws on every shape', (_n, t) => {
    const p = themedProject(t);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    const r = parseProject(serializeProject(p));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project).toEqual(p);
    for (const shape of SHAPES) {
      const d = draw({ ...p, stage: { ...p.stage, shape: shape.id, showArt: false } }, 120);
      expect(opaque(d)).toBeGreaterThan(120 * 120 * 0.1);
    }
  });
});

describe("Token Maker's built-in frames (once picture frames)", () => {
  it('are the seven kept of the eight Token Maker had as pictures, and most use photo textures', () => {
    expect(PICTURE_FRAME_TEMPLATES.map((t) => t.id)).toEqual(['gilded-laurel', 'iron-rivets', 'runestone', 'thorns', 'celestial', 'rope', 'shield-rim']);
    const photos = PICTURE_FRAME_TEMPLATES.filter((t) => JSON.stringify(t.make()).includes('"kind":"picture"'));
    expect(photos.length).toBeGreaterThanOrEqual(5);
  });

  it.each(PICTURE_FRAME_TEMPLATES.map((t) => [t.name, t] as const))('%s survives a file round trip and draws on every shape', (_n, t) => {
    const p = themedProject(t);
    const r = parseProject(serializeProject(p));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project).toEqual(p);
    for (const shape of SHAPES) {
      const d = draw({ ...p, stage: { ...p.stage, shape: shape.id, showArt: false } }, 120);
      expect(opaque(d)).toBeGreaterThan(120 * 120 * 0.05);
    }
  });
});
