// @vitest-environment node
// Phase 3: each layer's picture is kept between renders (layerCache.ts), so
// editing one layer redraws only that one, and the cached picture is the
// same as drawing afresh. Also the performance budget for a heavy design.
import { createCanvas } from '@napi-rs/canvas';
import { bandFillLayer, createProject, groupLayer, legacyFrameLayer, lineLayer, repeatLayer, shapeLayer, textureLayer } from '../project/defaults';
import type { FrameProject, Layer } from '../project/types';
import { setCanvasFactory, type Ctx } from './canvas';
import { cacheSize, clearLayerCache, renderStats } from './layerCache';
import { renderProject } from './renderProject';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

function draw(p: FrameProject, size = 200, cache = true): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, p, size, { cache });
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);

/** The "done when" design: marble, hammered metal and stars over a band, with a frame and rims. */
function heavy(): FrameProject {
  const p = createProject([
    { ...bandFillLayer(), name: 'Band', paint: { kind: 'lit', color: '#3a3c5a', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
    { ...textureLayer('marble'), name: 'Marble', color: '#5a5c7a', where: 'everywhere' },
    { ...textureLayer('hammered'), name: 'Hammered', color: '#8a8f99', from: 0.55, to: 1 },
    { ...textureLayer('scatter'), name: 'Stars', color2: '#6a5acd', to: 0.55 },
    { ...lineLayer(), name: 'Rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#e0e4f0' } },
  ]);
  p.stage.showArt = false;
  return p;
}

/** Ten heavy layers: the budget design. */
function tenLayers(): FrameProject {
  const kinds = ['marble', 'hammered', 'wear', 'wood', 'stone', 'scatter', 'rope', 'scales', 'cracks'] as const;
  const p = createProject([{ ...bandFillLayer(), paint: { kind: 'lit', color: '#806040', light: 0.8, dark: 0.8, pressed: false, highlight: null } }, ...kinds.map((k) => ({ ...textureLayer(k), where: 'everywhere' as const }))]);
  p.stage.showArt = false;
  return p;
}

beforeEach(() => clearLayerCache());

describe('the layer cache', () => {
  it('a cached picture is exactly what drawing afresh gives', () => {
    const p = heavy();
    const fresh = draw(p, 300, false);
    expect(same(draw(p, 300), fresh)).toBe(true);
    // And again, this time from the cache.
    expect(same(draw(p, 300), fresh)).toBe(true);
    expect(renderStats).toEqual({ drawn: 0, reused: 5 });
  });

  it('editing one layer redraws only that layer', () => {
    const p = heavy();
    draw(p);
    expect(renderStats.drawn).toBe(5);
    const edited = { ...p, layers: p.layers.map((l) => (l.name === 'Hammered' ? { ...l, amount: 1.5 } : l)) } as FrameProject;
    const picture = draw(edited);
    expect(renderStats).toEqual({ drawn: 1, reused: 4 });
    expect(same(picture, draw(edited, 200, false))).toBe(true);
  });

  it('opacity, blend mode, renaming, hiding and locking redraw nothing', () => {
    const p = heavy();
    draw(p);
    for (const patch of [{ opacity: 0.5 }, { blend: 'multiply' as const }, { name: 'Renamed' }, { visible: false }, { locked: true }]) {
      draw({ ...p, layers: p.layers.map((l, i) => (i === 1 ? { ...l, ...patch } : l)) as Layer[] });
      expect(renderStats.drawn).toBe(0);
    }
  });

  it('changing the stage or the size redraws every layer', () => {
    const p = heavy();
    draw(p);
    draw({ ...p, stage: { ...p.stage, shape: 'hexagon' } });
    expect(renderStats.drawn).toBe(5);
    draw({ ...p, stage: { ...p.stage, light: 45 } });
    expect(renderStats.drawn).toBe(5);
    draw(p, 240);
    expect(renderStats.drawn).toBe(5);
  });

  it('a layer clipped to the one below reuses that layer’s picture as its mask', () => {
    const p = createProject([{ ...bandFillLayer(), to: 0.5 }, { ...textureLayer('hammered'), clip: 'below' }]);
    p.stage.showArt = false;
    const fresh = draw(p, 200, false);
    draw(p);
    expect(renderStats).toEqual({ drawn: 2, reused: 1 });
    expect(same(draw(p), fresh)).toBe(true);
  });

  it('groups, legacy frames and every other layer give the same picture cached or not', () => {
    const p = createProject([
      legacyFrameLayer('paladin'),
      { ...groupLayer([{ ...repeatLayer(), glow: '#80ffcc' }, { ...shapeLayer(), mirror: 'four' }]), opacity: 0.8 },
      { ...groupLayer([textureLayer('wood'), { ...lineLayer(), clip: 'below' }]), clip: 'band' },
    ]);
    const fresh = draw(p, 200, false);
    draw(p);
    expect(same(draw(p), fresh)).toBe(true);
  });

  it('keeps one picture per layer: a replaced picture is let go at once', () => {
    let p = heavy();
    for (let i = 0; i < 30; i++) {
      p = { ...p, layers: p.layers.map((l, k) => (k === 1 ? { ...l, amount: 1 + i / 100 } : l)) } as FrameProject;
      draw(p);
    }
    expect(cacheSize()).toBe(5);
  });

  it('big exports are never cached', () => {
    const p = createProject([bandFillLayer()]);
    p.stage.showArt = false;
    const c = createCanvas(2100, 2100);
    renderProject(c.getContext('2d') as unknown as Ctx, p, 2100);
    expect(cacheSize()).toBe(0);
    expect(renderStats.drawn).toBe(0);
  });
});

describe('performance budget', () => {
  it('a 10-layer textured design draws in time, and an edit to one layer is much quicker', () => {
    const p = tenLayers();
    const time = (fn: () => void) => {
      const t = performance.now();
      fn();
      return performance.now() - t;
    };
    const cold = time(() => draw(p, 512));
    // Generous for slow test machines: the editor preview is about this size.
    expect(cold).toBeLessThan(2500);
    const edited = { ...p, layers: p.layers.map((l, i) => (i === 3 ? { ...l, seed: 99 } : l)) } as FrameProject;
    const warm = time(() => draw(edited, 512));
    expect(renderStats.drawn).toBe(1);
    expect(warm).toBeLessThan(cold / 2);
    process.stderr.write(`10-layer design at 512 px: ${cold.toFixed(0)} ms from scratch, ${warm.toFixed(0)} ms after one edit\n`);
  });
});
