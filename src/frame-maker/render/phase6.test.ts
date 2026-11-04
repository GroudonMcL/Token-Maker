// @vitest-environment node
// Phase 6 renderer checks: effects (the bevel's height map and lighting,
// shadows, glows, material colour, colour adjust, wear), how they are cached
// and clipped, faceted shapes and elements, and the new blend modes.
import { createCanvas } from '@napi-rs/canvas';
import { SHAPES } from '../engine/legacy/catalog';
import { bandFillLayer, createProject, groupLayer, NEW_EFFECT, repeatLayer, shapeLayer } from '../project/defaults';
import { BLEND_MODES, EFFECT_KINDS, SURFACES, type BandFillLayer, type Effect, type FrameProject, type Layer } from '../project/types';
import { bandGeometry, bandWidthPx } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { compareFrames } from './compare';
import { blur, fbm, gradientTable, insideDistance } from './effects';
import { clearLayerCache, renderStats } from './layerCache';
import { renderProject } from './renderProject';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const SIZE = 200;
const project = (layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject => {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.3, ...stage };
  return p;
};
function draw(p: FrameProject, size = SIZE, cache = true): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, p, size, { cache });
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const at = (_d: Uint8ClampedArray, x: number, y: number, size = SIZE) => (Math.round(y) * size + Math.round(x)) * 4;
const brightness = (d: Uint8ClampedArray, x: number, y: number, size = SIZE) => d[at(d, x, y, size)] + d[at(d, x, y, size) + 1] + d[at(d, x, y, size) + 2];
const alphaAt = (d: Uint8ClampedArray, x: number, y: number, size = SIZE) => d[at(d, x, y, size) + 3];
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
const opaque = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);

const fx = <K extends Effect['kind']>(kind: K, patch: Partial<Extract<Effect, { kind: K }>> = {}) => ({ ...NEW_EFFECT[kind](), ...patch }) as Effect;
const grey = (effects: Effect[] = []): BandFillLayer => ({ ...bandFillLayer(), paint: { kind: 'solid', color: '#808080' }, effects });

/** The band's outer edge region at an angle (degrees, 0 right, 90 below), a little way in. */
function onBand(p: FrameProject, angleDeg: number, across = 0.15, size = SIZE) {
  const g = bandGeometry(p.stage, size);
  const r = size / 2 - g.outer - bandWidthPx(g) * across;
  const a = (angleDeg * Math.PI) / 180;
  return { x: size / 2 + Math.cos(a) * r, y: size / 2 + Math.sin(a) * r };
}

beforeEach(() => clearLayerCache());

describe('effects', () => {
  it('a layer whose effects are all off draws exactly as one without effects', () => {
    const off = EFFECT_KINDS.map((k) => ({ ...NEW_EFFECT[k](), on: false }));
    expect(same(draw(project([grey(off)])), draw(project([grey()])))).toBe(true);
  });

  it.each(EFFECT_KINDS)('%s changes the picture, the same way every time', (kind) => {
    const before = draw(project([grey()]));
    const a = draw(project([grey([fx(kind, kind === 'adjust' ? { hue: 90, brightness: 0.3 } : {})])]), SIZE, false);
    const b = draw(project([grey([fx(kind, kind === 'adjust' ? { hue: 90, brightness: 0.3 } : {})])]), SIZE, false);
    expect(same(a, before)).toBe(false);
    expect(same(a, b)).toBe(true);
  });

  it('a raised bevel is lit on the side facing the light and shaded on the other, and turns with the light', () => {
    const p = project([grey([fx('bevel', { gloss: 0 })])]);
    const d = draw(p);
    // The outer edge at the top left faces the light (225°); at the bottom right it faces away.
    const lit = onBand(p, 225, 0.08);
    const away = onBand(p, 45, 0.08);
    expect(brightness(d, lit.x, lit.y)).toBeGreaterThan(3 * 128 + 30);
    expect(brightness(d, away.x, away.y)).toBeLessThan(3 * 128 - 30);
    // Light from the bottom right: the other way round.
    const turned = draw({ ...p, stage: { ...p.stage, light: 45 } });
    expect(brightness(turned, away.x, away.y)).toBeGreaterThan(brightness(turned, lit.x, lit.y) + 60);
  });

  it('a sunken bevel is lit the other way', () => {
    const p = project([grey([fx('bevel', { direction: 'sunken', gloss: 0 })])]);
    const d = draw(p);
    const near = onBand(p, 225, 0.08);
    const far = onBand(p, 45, 0.08);
    expect(brightness(d, far.x, far.y)).toBeGreaterThan(brightness(d, near.x, near.y) + 60);
  });

  it('the middle of a wide band, beyond the bevel, keeps its colour', () => {
    const p = project([grey([fx('bevel', { size: 0.1, gloss: 0 })])]);
    const mid = onBand(p, 300, 0.5);
    expect(Math.abs(brightness(draw(p), mid.x, mid.y) - 3 * 128)).toBeLessThan(6);
  });

  it.each(SURFACES.filter((s) => s !== 'smooth'))('the %s surface textures the middle of the band too', (surface) => {
    const flat = draw(project([grey([fx('bevel', { size: 0.1 })])]));
    const textured = draw(project([grey([fx('bevel', { size: 0.1, surface, surfaceDepth: 1 })])]));
    expect(compareFrames(flat, textured).over).toBeGreaterThan(0.01);
  });

  it('bevels, glows and shadows are measured in band widths, so they look the same at every size', () => {
    const p = project([grey([fx('bevel', { surface: 'hammered' }), fx('glow'), fx('shadow')])]);
    const small = draw(p, 200, false);
    // Drawn twice as big and halved.
    const big = createCanvas(400, 400);
    renderProject(big.getContext('2d') as unknown as Ctx, p, 400, { cache: false });
    const halved = createCanvas(200, 200);
    halved.getContext('2d').drawImage(big, 0, 0, 200, 200);
    const d = halved.getContext('2d').getImageData(0, 0, 200, 200).data as unknown as Uint8ClampedArray;
    expect(compareFrames(small, d).mean).toBeLessThan(4);
  });

  it('an outer shadow falls away from the light, outside the shape', () => {
    const p = project([grey([fx('shadow', { distance: 0.2, blur: 0.05, opacity: 1 })])], { outerSpacing: 0.15 });
    const d = draw(p);
    const outsideAway = onBand(p, 45, -0.12);
    const outsideNear = onBand(p, 225, -0.12);
    expect(alphaAt(d, outsideAway.x, outsideAway.y)).toBeGreaterThan(60);
    expect(alphaAt(d, outsideNear.x, outsideNear.y)).toBe(0);
  });

  it('an inner shadow darkens the edge facing the light, inside the shape only', () => {
    const p = project([grey([fx('shadow', { inner: true, distance: 0.1, blur: 0.05, opacity: 1 })])]);
    const d = draw(p);
    const near = onBand(p, 225, 0.04);
    const far = onBand(p, 45, 0.04);
    expect(brightness(d, near.x, near.y)).toBeLessThan(brightness(d, far.x, far.y) - 60);
    expect(opaque(d)).toBe(opaque(draw(project([grey()]))));
  });

  it('an outer glow spreads round the shape but not from the edge of the picture', () => {
    const p = project([grey([fx('glow', { size: 0.3, opacity: 1 })])], { outerSpacing: 0.2 });
    const d = draw(p);
    const out = onBand(p, 300, -0.1);
    expect(alphaAt(d, out.x, out.y)).toBeGreaterThan(40);
    expect(alphaAt(d, 1, 1)).toBe(0);
    expect(alphaAt(d, SIZE / 2, 1)).toBe(0);
  });

  it('a glow is as bright round thin runes as round a band', () => {
    const runes: Layer = { ...repeatLayer(), element: 'rune', raised: false, size: 0.5, fill: '#ffffff', effects: [fx('glow', { size: 0.15, opacity: 1, color: '#ff0000' })] };
    const d = draw(project([runes]));
    let strongest = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i - 3] > 200 && d[i - 2] < 80) strongest = Math.max(strongest, d[i]);
    expect(strongest).toBeGreaterThan(200);
  });

  it('material colour maps dark to its first colour and light to its last', () => {
    const stops = [
      { at: 0, color: '#ff0000', opacity: 1 },
      { at: 1, color: '#0000ff', opacity: 1 },
    ];
    const black = draw(project([{ ...grey([fx('recolour', { stops })]), paint: { kind: 'solid', color: '#000000' } }]));
    const white = draw(project([{ ...grey([fx('recolour', { stops })]), paint: { kind: 'solid', color: '#ffffff' } }]));
    const p = onBand(project([]), 300, 0.5);
    expect(Array.from(black.slice(at(black, p.x, p.y), at(black, p.x, p.y) + 3))).toEqual([255, 0, 0]);
    expect(Array.from(white.slice(at(white, p.x, p.y), at(white, p.x, p.y) + 3))).toEqual([0, 0, 255]);
    // Half the amount: half way.
    const half = draw(project([{ ...grey([fx('recolour', { stops, amount: 0.5 })]), paint: { kind: 'solid', color: '#000000' } }]));
    expect(half[at(half, p.x, p.y)]).toBeGreaterThan(120);
    expect(half[at(half, p.x, p.y)]).toBeLessThan(135);
  });

  it('colour adjust turns the hue, takes the colour out and brightens', () => {
    const red = (effects: Effect[]) => draw(project([{ ...grey(effects), paint: { kind: 'solid', color: '#ff0000' } }]));
    const p = onBand(project([]), 300, 0.5);
    const rgb = (d: Uint8ClampedArray) => Array.from(d.slice(at(d, p.x, p.y), at(d, p.x, p.y) + 3));
    const [r, g, b] = rgb(red([fx('adjust', { hue: 180 })]));
    expect(r).toBeLessThan(g);
    expect(r).toBeLessThan(b);
    const [gr, gg, gb] = rgb(red([fx('adjust', { saturation: -1 })]));
    expect(Math.max(gr, gg, gb) - Math.min(gr, gg, gb)).toBeLessThan(2);
    expect(rgb(red([fx('adjust', { brightness: 0.5 })]))[1]).toBeGreaterThan(50);
  });

  it('wear chips the edges (a different pattern for another variation) and leaves the middle', () => {
    const plain = opaque(draw(project([grey()])));
    const chipped = draw(project([grey([fx('wear', { chips: 0.8, grime: 0, polish: 0 })])]));
    const other = draw(project([grey([fx('wear', { chips: 0.8, grime: 0, polish: 0, seed: 2 })])]));
    expect(opaque(chipped)).toBeLessThan(plain * 0.97);
    expect(same(chipped, other)).toBe(false);
    const p = onBand(project([]), 300, 0.5);
    expect(alphaAt(chipped, p.x, p.y)).toBe(255);
  });

  it('effects apply to a group as one picture', () => {
    const shapes = [{ ...shapeLayer(), raised: false, outline: null }, { ...shapeLayer(), raised: false, outline: null, along: 0.5 }];
    const group = { ...groupLayer(shapes), effects: [fx('shadow', { distance: 0.3, opacity: 1 })] };
    const d = draw(project([group]));
    expect(same(d, draw(project([groupLayer(shapes)])))).toBe(false);
    expect(opaque(d)).toBeGreaterThan(opaque(draw(project([groupLayer(shapes)]))));
  });

  it('a layer clipped to the band clips its effects too', () => {
    const d = draw(project([{ ...grey([fx('glow', { size: 0.4, opacity: 1 })]), clip: 'band' }], { outerSpacing: 0.2 }));
    const out = onBand(project([], { outerSpacing: 0.2 }), 300, -0.1);
    expect(alphaAt(d, out.x, out.y)).toBe(0);
  });

  it('a layer clipped to one with a shadow is clipped to its shape, not its shadow', () => {
    const base = grey([fx('shadow', { distance: 0.4, opacity: 1 })]);
    const over: Layer = { ...bandFillLayer(), from: -0.5, to: 1.5, paint: { kind: 'solid', color: '#ff0000' }, clip: 'below' };
    const d = draw(project([base, over], { outerSpacing: 0.2 }));
    const shadowOnly = onBand(project([], { outerSpacing: 0.2 }), 45, -0.15);
    expect(d[at(d, shadowOnly.x, shadowOnly.y)]).toBeLessThan(40);
  });

  it('is cached: changing an effect redraws only its layer, and not its picture without effects', () => {
    const a = grey([fx('bevel')]);
    const b = { ...grey(), from: 0.4, to: 0.6 };
    const p = project([a, b]);
    draw(p);
    draw({ ...p, layers: [{ ...a, effects: [fx('bevel', { depth: 2 })] }, b] });
    // The bevelled picture is made again from the kept picture; the other layer is reused.
    expect(renderStats.drawn).toBe(1);
    expect(renderStats.reused).toBe(2);
    expect(same(draw(p), draw(p, SIZE, false))).toBe(true);
  });

  it.each(SHAPES.map((s) => s.id))('effects draw on a %s token', (shape) => {
    const d = draw(project([grey([fx('bevel', { surface: 'cracked' }), fx('recolour'), fx('wear'), fx('glow'), fx('shadow')])], { shape }));
    expect(opaque(d)).toBeGreaterThan(1000);
  });

  it('a heavy effects stack keeps to the time budget at 512 px', () => {
    const p = project([grey([fx('wear'), fx('bevel', { surface: 'hammered' }), fx('recolour'), fx('glow', { inner: true }), fx('shadow')])]);
    const t0 = performance.now();
    draw(p, 512, false);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1500);
  });
});

describe('effect helpers', () => {
  it('the distance from the edge is exact for a square', () => {
    const size = 21;
    const a = new Float32Array(size * size);
    for (let y = 5; y < 16; y++) for (let x = 5; x < 16; x++) a[y * size + x] = 1;
    const d = insideDistance(a, size);
    expect(d[10 * size + 10]).toBeCloseTo(6, 5);
    expect(d[5 * size + 10]).toBeCloseTo(1, 5);
    expect(d[0]).toBe(0);
  });

  it('blurring keeps the total and spreads it', () => {
    const size = 41;
    const a = new Float32Array(size * size);
    a[20 * size + 20] = 1;
    const b = blur(a, size, 6);
    expect(b.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 4);
    expect(b[20 * size + 20]).toBeLessThan(0.1);
    expect(b[20 * size + 24]).toBeGreaterThan(0);
  });

  it('noise is repeatable and varies with the seed', () => {
    expect(fbm(1.3, 2.7, 5)).toBe(fbm(1.3, 2.7, 5));
    expect(fbm(1.3, 2.7, 5)).not.toBe(fbm(1.3, 2.7, 6));
  });

  it('a gradient table runs from its first colour to its last', () => {
    const t = gradientTable([
      { at: 0, color: '#000000', opacity: 1 },
      { at: 1, color: '#ffffff', opacity: 0.5 },
    ]);
    expect(t[0]).toBe(0);
    expect(t[255 * 4]).toBe(255);
    expect(t[128 * 4]).toBeCloseTo(128, 0);
    expect(t[255 * 4 + 3]).toBe(0.5);
  });
});

describe('faceted shapes and elements', () => {
  const faceted = (patch: Partial<Layer> = {}): Layer => ({ ...shapeLayer(), raised: false, outline: null, faceted: true, size: 1.5, fill: '#808080', ...patch }) as Layer;

  it.each(['circle', 'rectangle', 'polygon', 'star'] as const)('a faceted %s differs from a smooth one and keeps its outline', (shape) => {
    const smooth = draw(project([{ ...faceted({ shape } as Partial<Layer>), faceted: false } as Layer]));
    const cut = draw(project([faceted({ shape } as Partial<Layer>)]));
    expect(same(smooth, cut)).toBe(false);
    expect(Math.abs(opaque(smooth) - opaque(cut))).toBeLessThan(opaque(smooth) * 0.1);
  });

  it('faces towards the light are lighter, and they turn with the light', () => {
    const layer = faceted({ place: 'free', x: 0, y: 0, size: 1, shape: 'polygon', sides: 4 } as Partial<Layer>);
    const p = project([layer]);
    const d = draw(p);
    // A diamond: the upper-left face against the lower-right one.
    const ul = { x: SIZE / 2 - 14, y: SIZE / 2 - 14 };
    const lr = { x: SIZE / 2 + 14, y: SIZE / 2 + 14 };
    expect(brightness(d, ul.x, ul.y)).toBeGreaterThan(brightness(d, lr.x, lr.y) + 60);
    const turned = draw({ ...p, stage: { ...p.stage, light: 45 } });
    expect(brightness(turned, lr.x, lr.y)).toBeGreaterThan(brightness(turned, ul.x, ul.y) + 60);
  });

  it('a faceted path is cut too', () => {
    const path: Layer = {
      ...shapeLayer(),
      type: 'path',
      points: [
        { x: -1, y: -1, handle: null },
        { x: 1, y: -1, handle: null },
        { x: 0, y: 1, handle: { x: 0.4, y: 0 } },
      ],
      closed: true,
      raised: false,
      outline: null,
      fill: '#808080',
      size: 1.5,
    } as unknown as Layer;
    expect(same(draw(project([path])), draw(project([{ ...path, faceted: true } as Layer])))).toBe(false);
  });

  it.each(['gem', 'plate', 'shard'] as const)('the %s element is faceted, and flat when not shaded', (element) => {
    const layer: Layer = { ...repeatLayer(), element, raised: false, size: 0.6, count: 6, fill: '#808080' };
    const shaded = draw(project([layer]));
    const flat = draw(project([{ ...layer, shaded: false }]));
    expect(opaque(shaded)).toBeGreaterThan(200);
    expect(same(shaded, flat)).toBe(false);
    // Flat is one colour.
    const colours = new Set<number>();
    for (let i = 0; i < flat.length; i += 4) if (flat[i + 3] === 255) colours.add(flat[i]);
    expect(colours.size).toBe(1);
  });
});

describe('blend modes', () => {
  it.each(BLEND_MODES.filter((b) => b !== 'source-over'))('%s draws differently from Normal', (blend) => {
    const under: Layer = { ...bandFillLayer(), paint: { kind: 'solid', color: '#4060a0' } };
    const over: Layer = { ...bandFillLayer(), from: 0.3, to: 0.7, paint: { kind: 'solid', color: '#c08040' } };
    const normal = draw(project([under, over]));
    expect(same(draw(project([under, { ...over, blend }])), normal)).toBe(false);
  });

  it('a knockout cuts a hole through the layers below', () => {
    const under: Layer = { ...bandFillLayer(), paint: { kind: 'solid', color: '#4060a0' } };
    const hole: Layer = { ...bandFillLayer(), from: 0.3, to: 0.7, paint: { kind: 'solid', color: '#000000' }, blend: 'destination-out' };
    const p = onBand(project([]), 300, 0.5);
    expect(alphaAt(draw(project([under, hole])), p.x, p.y)).toBe(0);
  });
});
