// @vitest-environment node
// Phase 3: texture layers and the ring paint. The painters are checked pixel
// for pixel against token-maker's own textures (the finishes' texture
// functions, called directly), then as layers: every kind, the seed, sizes,
// the light and where they keep to.
import { createCanvas } from '@napi-rs/canvas';
import { SHAPES } from '../engine/legacy/catalog';
import { rgba, shade } from '../engine/legacy/color';
import { FINISHES, type Finish } from '../engine/legacy/finishes';
import { angleTable, clipToBand, litTables, type FrameGeometry } from '../engine/legacy/frameKit';
import { bandFillLayer, createProject, lineLayer, TEXTURES, textureFromPreset, textureLayer } from '../project/defaults';
import { TEXTURE_KINDS, type FrameProject, type Layer, type Paint, type TextureLayer } from '../project/types';
import { bandGeometry, insetAt } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { ringTable } from './paint';
import { renderProject } from './renderProject';
import { cracks, darknessOf, hammered, marble, rope, scales, scatter, stoneBlocks, wear, woodGrain } from './textures';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const SIZE = 200;
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
const ink = (d: Uint8ClampedArray, keep: (x: number, y: number) => boolean = () => true, size = SIZE) => {
  let n = 0;
  for (let i = 3; i < d.length; i += 4) {
    const p = (i - 3) / 4;
    if (keep(p % size, Math.floor(p / size))) n += d[i];
  }
  return n / 255;
};
const differs = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.some((v, i) => v !== b[i]);

/** Paints on a blank canvas with the origin at the centre, clipped to the band as token-maker's drawFinish clips its textures. */
function paint(g: FrameGeometry, fn: (ctx: Ctx) => void): Uint8ClampedArray {
  const c = createCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d') as unknown as Ctx;
  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.save();
  clipToBand(ctx, g);
  fn(ctx);
  ctx.restore();
  return ctx.getImageData(0, 0, SIZE, SIZE).data as unknown as Uint8ClampedArray;
}

describe('the painters draw exactly what token-maker draws', () => {
  /** A finish's own texture, and the setup drawFinish gives it. */
  function original(finish: Finish, g: FrameGeometry) {
    const base = finish.base ? finish.base(g.color) : g.color;
    const tables = litTables(base, { light: 0.85, dark: 0.8, ...finish.lighting });
    return { base, tables, pixels: paint(g, (ctx) => finish.texture!(ctx, g, tables, base)) };
  }
  const plain = { amount: 1, scale: 1, strength: 1 };
  const L = 225;

  const cases: [string, Finish, string, (ctx: Ctx, g: FrameGeometry, base: string, tables: ReturnType<typeof litTables>) => void][] = [
    ['Gilded marble', FINISHES.gilded, '#c9a24a', (ctx, g, base, t) => marble(ctx, g, { base, seed: 0x9e1d, amount: 0.6, scale: 1, strength: 1, weight: darknessOf(t.band) })],
    ['Warlock heavy marble', FINISHES.eyes, '#5a4a6a', (ctx, g, base, t) => marble(ctx, g, { base, seed: 0xe7e, amount: 1.4, scale: 1, strength: 1, weight: darknessOf(t.band) })],
    [
      'Fighter hammered metal and battle wear',
      FINISHES.riveted,
      '#8a8f99',
      (ctx, g, base) => {
        hammered(ctx, g, { dark: rgba(shade(base, -0.6), 0.25), bright: rgba(shade(base, 0.6), 0.25), density: 4, grain: 1, seed: 0x1f2e3d, light: L });
        wear(ctx, g, { base, seed: 0xf16, ...plain, light: L });
      },
    ],
    ['Oak wood grain', FINISHES.wood, '#7a5230', (ctx, g, base) => woodGrain(ctx, g, { base, seed: 0x0a4, ...plain })],
    ['Cobblestone stone blocks', FINISHES.stone, '#7d7a72', (ctx, g, base) => stoneBlocks(ctx, g, { base, seed: 0x570e, ...plain, light: L })],
    ['Starfield stars', FINISHES.starfield, '#3a3c7a', (ctx, g) => scatter(ctx, g, { color: '#ffffff', haze: g.color, seed: 0x57a2, ...plain })],
    ['Monk rope', FINISHES.beads, '#a07a48', (ctx, g, base) => rope(ctx, g, { base, seed: 0xbead, ...plain, light: L })],
    ['Sorcerer scales', FINISHES.sorcerer, '#3f8a5a', (ctx, g, base) => scales(ctx, g, { base, size: 0.3, amount: 1, strength: 1 })],
    [
      'Magma pitting and cracks',
      FINISHES.magma,
      '#ff5a1a',
      (ctx, g, base) => {
        hammered(ctx, g, { dark: rgba(shade(base, -0.6), 0.5), bright: rgba(shade(base, 0.4), 0.25), density: 8, grain: 1, seed: 0x1f2e3d, light: L });
        cracks(ctx, g, { color: g.color, seed: 0x1a7a, ...plain });
      },
    ],
  ];

  describe.each(['circle', 'hexagon', 'rounded'] as const)('on the %s shape', (shape) => {
    it.each(cases)('%s', (_name, finish, color, ours) => {
      const g = bandGeometry({ ...createProject().stage, shape, thickness: 0.25 }, SIZE, color);
      const { base, tables, pixels } = original(finish, g);
      expect(ink(pixels)).toBeGreaterThan(20);
      expect(differs(paint(g, (ctx) => ours(ctx, g, base, tables)), pixels)).toBe(false);
    });
  });
});

describe('texture layers', () => {
  const tex = (patch: Partial<TextureLayer> = {}): TextureLayer => ({ ...textureLayer('hammered'), color: '#888888', strength: 2, ...patch });

  it.each(TEXTURE_KINDS)('%s draws, only between its start and end', (kind) => {
    const layer = { ...textureLayer(kind), where: 'everywhere' as const, from: 0.3, to: 0.7 };
    const d = draw(project([layer]));
    expect(ink(d)).toBeGreaterThan(10);
    const g = bandGeometry(project([]).stage, SIZE);
    // Straight down the middle of the top of the band: nothing outside 30–70 % across.
    const yAt = (across: number) => Math.round(insetAt(g, across));
    for (let y = 0; y < SIZE / 2; y++) {
      if (y >= yAt(0.3) - 1 && y <= yAt(0.7) + 1) continue;
      expect(d[(y * SIZE + SIZE / 2) * 4 + 3]).toBe(0);
    }
  });

  it.each(TEXTURES.map((t) => t.id))('library texture %s draws', (id) => {
    expect(ink(draw(project([textureFromPreset(TEXTURES.find((t) => t.id === id)!)])))).toBeGreaterThan(10);
  });

  it.each(TEXTURE_KINDS)('%s is the same every time for a seed, and different for another seed', (kind) => {
    const layer = { ...textureLayer(kind), where: 'everywhere' as const, seed: 7 };
    const a = draw(project([layer]));
    expect(differs(a, draw(project([layer])))).toBe(false);
    // Scales have no randomness.
    if (kind !== 'scales') expect(differs(a, draw(project([{ ...layer, seed: 8 }])))).toBe(true);
  });

  it.each(TEXTURE_KINDS)('%s looks the same at every size (scaled)', (kind) => {
    const layer = { ...textureLayer(kind), where: 'everywhere' as const };
    const coverage = (size: number) => ink(draw(project([layer]), size), undefined, size) / size ** 2;
    // Hairlines have a minimum width in pixels, so compare sizes big enough for that not to matter.
    const small = coverage(300);
    const big = coverage(600);
    expect(Math.abs(small - big)).toBeLessThan(Math.max(0.004, small * 0.15));
  });

  it.each(SHAPES.map((s) => s.id))('draws on the %s shape', (shape) => {
    for (const kind of TEXTURE_KINDS) expect(ink(draw(project([{ ...textureLayer(kind), where: 'everywhere' }], { shape })))).toBeGreaterThan(10);
  });

  it('amount, size and strength change it; no strength or amount draws nothing', () => {
    const base = draw(project([tex()]));
    expect(ink(draw(project([tex({ amount: 2 })])))).toBeGreaterThan(ink(base) * 1.4);
    expect(differs(base, draw(project([tex({ scale: 1.5 })])))).toBe(true);
    expect(ink(draw(project([tex({ strength: 1 })])))).toBeLessThan(ink(base));
    expect(ink(draw(project([tex({ strength: 0 })])))).toBe(0);
    expect(ink(draw(project([tex({ amount: 0 })])))).toBe(0);
  });

  it('a scatter can have haze behind its stars, without the stars moving', () => {
    const stars = { ...textureLayer('scatter'), color2: null };
    const withHaze = draw(project([{ ...stars, color2: '#6a5acd' }]));
    const without = draw(project([stars]));
    expect(ink(withHaze)).toBeGreaterThan(ink(without));
    // A bright star pixel is in both.
    const bright = without.findIndex((v, i) => i % 4 === 0 && v > 240 && without[i + 3] > 240);
    expect(bright).toBeGreaterThan(0);
    expect(withHaze[bright]).toBeGreaterThan(200);
  });

  describe('the light', () => {
    // Light from the top left: the shaded side is the bottom right.
    const topLeft = (x: number, y: number) => x + y < SIZE * 0.8;
    const bottomRight = (x: number, y: number) => x + y > SIZE * 1.2;

    it.each(['marble', 'hammered', 'scatter'] as const)('%s keeps to the shaded or the lit side when asked', (kind) => {
      const layer = { ...textureLayer(kind), color: '#a08040', strength: 2 };
      const shaded = draw(project([{ ...layer, where: 'shaded' }]));
      const lit = draw(project([{ ...layer, where: 'lit' }]));
      expect(ink(shaded, bottomRight)).toBeGreaterThan(ink(shaded, topLeft) * 2);
      expect(ink(lit, topLeft)).toBeGreaterThan(ink(lit, bottomRight) * 2);
    });

    it('the side follows the light', () => {
      const layer = { ...textureLayer('marble'), color: '#a08040', where: 'shaded' as const };
      const d = draw(project([layer], { light: 45 }));
      expect(ink(d, topLeft)).toBeGreaterThan(ink(d, bottomRight) * 2);
    });

    it.each(['hammered', 'wear', 'stone', 'rope'] as const)('%s is lit from the stage light', (kind) => {
      const layer = { ...textureLayer(kind), where: 'everywhere' as const };
      expect(differs(draw(project([layer])), draw(project([layer], { light: 45 })))).toBe(true);
    });
  });
});

describe('colours round the ring', () => {
  const ring = (stops: { angle: number; color: string }[], followLight = true): Paint => ({ kind: 'ring', stops, followLight });
  const rgbAt = (d: Uint8ClampedArray, x: number, y: number) => Array.from(d.slice((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 3));

  it('blends between stops like the engine’s angle tables', () => {
    const stops: [number, string][] = [
      [0, '#ff0000'],
      [90, '#00ff00'],
      [200, '#0000ff'],
      [300, '#ffff00'],
    ];
    expect(ringTable(stops.map(([angle, color]) => ({ angle, color })))).toEqual(angleTable(stops));
  });

  it('goes round past 360° when the first stop is not at 0°', () => {
    const t = ringTable([
      { angle: 90, color: '#000000' },
      { angle: 270, color: '#ffffff' },
    ]);
    expect(t[90]).toBe('#000000');
    expect(t[270]).toBe('#ffffff');
    expect(t[0]).toBe(t[180]);
  });

  const stops = [
    { angle: 0, color: '#ff0000' },
    { angle: 90, color: '#00ff00' },
    { angle: 180, color: '#0000ff' },
    { angle: 270, color: '#ffffff' },
  ];
  // Points in the middle of the band to the right of, below, left of and above the centre.
  const mid = (p: FrameProject) => Math.round(SIZE / 2 - insetAt(bandGeometry(p.stage, SIZE), 0.5));
  // Rounded to steps of 16: the wedges are 1.5° wide, so a point exactly at a stop gets a colour a degree or so away.
  const near = (c: number[]) => c.map((v) => Math.round(v / 16) * 16).map((v) => Math.min(255, v));
  const around = (d: Uint8ClampedArray, r: number) => [rgbAt(d, 100 + r, 100), rgbAt(d, 100, 100 + r), rgbAt(d, 100 - r, 100), rgbAt(d, 100, 100 - r)].map(near);

  it('a band fill takes each colour at its angle', () => {
    const p = project([{ ...bandFillLayer(), paint: ring(stops) }]);
    expect(around(draw(p), mid(p))).toEqual([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
    ]);
  });

  it('turns with the light, unless told not to', () => {
    const p = project([{ ...bandFillLayer(), paint: ring(stops) }], { light: 315 });
    const r = mid(p);
    // Turned a quarter clockwise: right now has what was at the top.
    expect(around(draw(p), r)[0]).toEqual([255, 255, 255]);
    const still = project([{ ...bandFillLayer(), paint: ring(stops, false) }], { light: 315 });
    expect(around(draw(still), r)[0]).toEqual([255, 0, 0]);
  });

  it('a line takes the colours too, and keeps its shape', () => {
    const line = { ...lineLayer(), width: 0.3 };
    const p = project([{ ...line, paint: ring(stops) }]);
    const d = draw(p);
    expect(around(d, mid(p))).toEqual([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
    ]);
    const solid = draw(project([line]));
    for (let i = 3; i < d.length; i += 4) expect(Math.abs(d[i] - solid[i])).toBeLessThanOrEqual(1);
  });
});
