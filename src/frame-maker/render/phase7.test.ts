// @vitest-environment node
// Phase 7 renderer checks: repeats along paths and lines (spacing, facing,
// size along the way, random variation), radial arrays, gem cuts and
// settings, text on the band and on a path (fonts and runes), contours, and
// that a followed layer's changes redraw the layers following it.
import { createCanvas } from '@napi-rs/canvas';
import { registerShippedFonts } from '../../../scripts/frame-maker/nodeFonts';
import { SHAPES } from '../engine/legacy/catalog';
import { contoursLayer, createProject, GEM_POINTS, lineLayer, NEW_EFFECT, pathLayer, repeatLayer, shapeLayer, textLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { cloneAllWithNewIds } from '../project/tree';
import { GEM_CUTS, GEM_SETTINGS, type FrameProject, type Layer, type PathLayer, type RepeatLayer } from '../project/types';
import { acrossOfPoint, bandGeometry, bandWidthPx } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { finder, pickLayer } from './hitTest';
import { clearLayerCache, renderStats } from './layerCache';
import { contourLines, repeatPlacements } from './layers';
import { placements } from './placed';
import { renderProject } from './renderProject';
import { runesOf, textGlyphs } from './text';
import { tracksOf, trackLength } from './track';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();

const SIZE = 240;
const project = (layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject => {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.25, ...stage };
  return p;
};
function draw(p: FrameProject, size = SIZE, cache = false): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, p, size, { cache });
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
const painted = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);
const g = (p: FrameProject, size = SIZE) => bandGeometry(p.stage, size);

/** An open wavy path across the top of the token, placed freely. */
const wavy = (): PathLayer => ({
  ...pathLayer([
    { x: -3, y: 0, handle: { x: 0.5, y: -0.6 } },
    { x: -1, y: 0, handle: { x: 0.5, y: 0.6 } },
    { x: 1, y: 0, handle: { x: 0.5, y: -0.6 } },
    { x: 3, y: 0, handle: null },
  ]),
  place: 'free',
  x: 0,
  y: -0.3,
  size: 0.2,
  closed: false,
  fill: null,
  outline: '#ffffff',
});

beforeEach(() => clearLayerCache());

describe('repeats along a path or line', () => {
  it('without the Phase 7 options a repeat is placed exactly as before (on the band)', () => {
    const r = repeatLayer();
    const p = project([r]);
    const before = repeatPlacements(r, g(p));
    expect(before).toHaveLength(12);
    expect(repeatPlacements({ ...r, follow: 'nothing-here' }, g(p), finder(p))).toEqual(before);
    for (const e of before) expect(e.spin).toBe(0);
  });

  it('follows an open path from end to end, both ends included', () => {
    const path = wavy();
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, count: 7 };
    const p = project([path, r]);
    const placed = repeatPlacements(r, g(p), finder(p));
    expect(placed).toHaveLength(7);
    const [track] = tracksOf(path, g(p));
    expect(placed[0].p.x).toBeCloseTo(track.points[0].x, 3);
    expect(placed[6].p.x).toBeCloseTo(track.points.at(-1)!.x, 3);
    // Evenly spaced along it: equal steps along x for a path that is even in x.
    const gaps = placed.slice(1).map((e, i) => Math.hypot(e.p.x - placed[i].p.x, e.p.y - placed[i].p.y));
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.6);
  });

  it('with "as many as fit", the number depends on the path length', () => {
    const path = wavy();
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, mode: 'spacing', spacing: 0.5 };
    const p = project([path, r]);
    const [track] = tracksOf(path, g(p));
    const n = repeatPlacements(r, g(p), finder(p)).length;
    expect(n).toBe(Math.round(trackLength(track) / (0.5 * bandWidthPx(g(p)))) + 1);
  });

  it('follows a wavy line all the way round, wandering in and out', () => {
    const line = { ...lineLayer(), waveAmplitude: 0.3, waves: 6 };
    const r: RepeatLayer = { ...repeatLayer(), follow: line.id, count: 24, snapToCorners: false };
    const p = project([line, r]);
    const across = repeatPlacements(r, g(p), finder(p)).map((e) => acrossOfPoint(g(p), e.p));
    expect(across).toHaveLength(24);
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(0.4);
  });

  it('follows every mirrored copy of a path', () => {
    const path = { ...wavy(), mirror: 'topBottom' as const };
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, count: 5 };
    const p = project([path, r]);
    const placed = repeatPlacements(r, g(p), finder(p));
    expect(placed).toHaveLength(10);
    expect(placed.filter((e) => e.p.y < 0)).toHaveLength(5);
    // Elements keep counting across copies (for alternating colours and runes).
    expect(placed.map((e) => e.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('can face along the path or stand upright', () => {
    const path = wavy();
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, count: 9 };
    const p = project([path, r]);
    const along = repeatPlacements(r, g(p), finder(p));
    expect(along.some((e) => Math.abs(e.p.angle) > 0.2)).toBe(true);
    for (const e of repeatPlacements({ ...r, orient: 'upright' }, g(p), finder(p))) expect(e.p.angle).toBe(0);
  });

  it('grows or shrinks along the way', () => {
    const path = wavy();
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, count: 5, scaleEnd: 2 };
    const p = project([path, r]);
    const sizes = repeatPlacements(r, g(p), finder(p)).map((e) => e.h);
    expect(sizes[4] / sizes[0]).toBeCloseTo(2, 5);
    expect(sizes[2] / sizes[0]).toBeCloseTo(1.5, 5);
  });

  it('random variation is repeatable, picked by the seed, and can leave some out', () => {
    const r: RepeatLayer = { ...repeatLayer(), count: 24, snapToCorners: false, jitterSize: 0.5, jitterAngle: 40 };
    const p = project([r]);
    const a = repeatPlacements(r, g(p));
    expect(repeatPlacements(r, g(p))).toEqual(a);
    expect(new Set(a.map((e) => e.h.toFixed(3))).size).toBeGreaterThan(10);
    expect(a.some((e) => Math.abs(e.spin) > 0.2)).toBe(true);
    expect(repeatPlacements({ ...r, seed: 2 }, g(p))).not.toEqual(a);
    const sparse = repeatPlacements({ ...r, skipChance: 0.5 }, g(p));
    expect(sparse.length).toBeGreaterThan(4);
    expect(sparse.length).toBeLessThan(20);
    // Leaving some out doesn't change the others.
    for (const e of sparse) expect(e).toEqual(a.find((x) => x.index === e.index));
  });

  it('editing the followed path redraws the repeat (and only what changed)', () => {
    const path = { ...wavy(), visible: false };
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, count: 9 };
    const p = project([path, r]);
    const first = draw(p, SIZE, true);
    draw(p, SIZE, true);
    expect(renderStats.drawn).toBe(0);
    const moved = { ...p, layers: [{ ...path, y: -0.5 }, r] };
    const second = draw(moved, SIZE, true);
    expect(renderStats.drawn).toBe(1);
    expect(same(first, second)).toBe(false);
  });

  it('a copied path and the repeat following it stay together, with new ids', () => {
    const path = wavy();
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id };
    let n = 0;
    const [path2, r2] = cloneAllWithNewIds([path, r], () => `new${++n}`);
    expect(path2.id).not.toBe(path.id);
    expect((r2 as RepeatLayer).follow).toBe(path2.id);
    // Copied alone, it keeps pointing at the original.
    const [alone] = cloneAllWithNewIds([r], () => `x${++n}`);
    expect((alone as RepeatLayer).follow).toBe(path.id);
  });

  it('elements on a path can be picked on the canvas', () => {
    const path = { ...wavy(), visible: false };
    const r: RepeatLayer = { ...repeatLayer(), follow: path.id, count: 5, size: 0.5 };
    const p = project([path, r]);
    const e = repeatPlacements(r, g(p), finder(p))[2];
    expect(pickLayer(p, SIZE, e.p)?.id).toBe(r.id);
  });
});

describe('radial arrays', () => {
  const star = () => ({ ...shapeLayer(), place: 'free' as const, x: 0, y: 0, size: 0.15, shape: 'star' as const, radialCount: 8, radialRadius: 0.5 });

  it('one copy is the layer as before', () => {
    const s = shapeLayer();
    const p = project([s]);
    expect(placements(s, g(p))).toHaveLength(1);
    expect(placements({ ...s, radialCount: 1, radialRadius: 2 }, g(p))).toEqual(placements(s, g(p)));
  });

  it('puts copies evenly round the anchor, each pointing outwards', () => {
    const s = star();
    const p = project([s]);
    const R = SIZE / 2;
    const all = placements(s, g(p));
    expect(all).toHaveLength(8);
    for (const t of all) {
      expect(Math.hypot(t.x, t.y)).toBeCloseTo(0.5 * R, 6);
      // "Up" (local −y) points away from the anchor.
      const up = { x: Math.sin(t.angle), y: -Math.cos(t.angle) };
      expect((up.x * t.x + up.y * t.y) / Math.hypot(t.x, t.y)).toBeCloseTo(1, 6);
    }
    expect(all[0].x).toBeCloseTo(0, 6);
    expect(all[0].y).toBeCloseTo(-0.5 * R, 6);
  });

  it('turns with the start angle, mirrors every other copy, and multiplies with mirroring', () => {
    const s = star();
    const p = project([s]);
    const turned = placements({ ...s, radialStart: 90 }, g(p));
    expect(turned[0].x).toBeCloseTo(0.5 * (SIZE / 2), 6);
    expect(placements({ ...s, radialMirror: true }, g(p)).map((t) => t.sx)).toEqual([1, -1, 1, -1, 1, -1, 1, -1]);
    expect(placements({ ...s, place: 'band', along: 0.1, radialCount: 3, mirror: 'four' }, g(p))).toHaveLength(12);
  });

  it('draws a rosette of a drawn path on every token shape', () => {
    for (const shape of SHAPES) {
      const petal = { ...pathLayer(GEM_POINTS), size: 0.5, radialCount: 6, radialRadius: 0.7, along: 0.125 };
      const one = painted(draw(project([{ ...petal, radialCount: 1 }], { shape: shape.id })));
      const six = painted(draw(project([petal], { shape: shape.id })));
      expect(six).toBeGreaterThan(one * 3);
    }
  });
});

describe('gem cuts and settings', () => {
  const gems = (patch: Partial<RepeatLayer>): RepeatLayer => ({ ...repeatLayer(), element: 'gem', count: 6, size: 0.7, fill: '#2a5ab8', raised: false, ...patch });

  it('every cut draws its own picture, the same every time', () => {
    const pictures = GEM_CUTS.map((gemCut) => draw(project([gems({ gemCut })])));
    GEM_CUTS.forEach((gemCut, i) => {
      expect(same(pictures[i], draw(project([gems({ gemCut })])))).toBe(true);
      for (let j = 0; j < i; j++) expect(same(pictures[i], pictures[j])).toBe(false);
    });
  });

  it('table, crown, facets and sparkle change a gem', () => {
    const base = draw(project([gems({})]));
    for (const patch of [{ gemTable: 0.2 }, { gemCrown: 2 }, { gemFacets: 12 }, { gemSparkle: 1 }]) expect(same(draw(project([gems(patch)])), base)).toBe(false);
  });

  it('the facets are lit by the light', () => {
    const p = project([gems({})]);
    expect(same(draw(p), draw({ ...p, stage: { ...p.stage, light: 45 } }))).toBe(false);
  });

  it('a setting is drawn round each gem, wider than the gem, with effects of its own', () => {
    const plain = painted(draw(project([gems({})])));
    for (const setting of GEM_SETTINGS.filter((s) => s !== 'none')) expect(painted(draw(project([gems({ setting })])))).toBeGreaterThan(plain);
    const claws = draw(project([gems({ setting: 'claws4' })]));
    expect(same(draw(project([gems({ setting: 'claws6' })])), claws)).toBe(false);
    const styled = draw(project([gems({ setting: 'claws4', settingEffects: [NEW_EFFECT.bevel()] })]));
    expect(same(styled, claws)).toBe(false);
  });

  it('settings work round any element, not only gems', () => {
    const beads = { ...repeatLayer(), count: 6, size: 0.5 };
    expect(painted(draw(project([{ ...beads, setting: 'bezel' }])))).toBeGreaterThan(painted(draw(project([beads]))));
  });
});

describe('text', () => {
  it('runes: letters become runes, th and ng have their own, spaces become separators', () => {
    expect(runesOf('Thing a b')).toEqual(['th', 'i', 'ng', ' ', 'a', ' ', 'b']);
    expect(runesOf('Q?X!')).toEqual(['k', 'z']);
  });

  it('letters sit round the band at their across position, centred where asked', () => {
    const t = { ...textLayer(), text: 'ABCDE', at: 0.4, along: 0 };
    const p = project([t]);
    const { glyphs } = textGlyphs(t, g(p));
    expect(glyphs).toHaveLength(5);
    for (const gl of glyphs) expect(acrossOfPoint(g(p), gl.p)).toBeCloseTo(0.4, 2);
    // Centred on the top: the middle letter is at the top, the first to its left.
    expect(Math.abs(glyphs[2].p.x)).toBeLessThan(2);
    expect(glyphs[0].p.x).toBeLessThan(0);
    // Read the other way: right to left along the top, letters turned over.
    const back = textGlyphs({ ...t, reverse: true }, g(p)).glyphs;
    expect(back[0].p.x).toBeGreaterThan(0);
    expect(Math.abs(back[2].angle - glyphs[2].angle)).toBeCloseTo(Math.PI, 1);
  });

  it('can start at a position, and follows a path', () => {
    const path = wavy();
    const t = { ...textLayer(), text: 'RUNES', font: 'runes' as const, follow: path.id, along: 0, align: 'start' as const };
    const p = project([path, t]);
    const { glyphs } = textGlyphs(t, g(p), finder(p));
    const [track] = tracksOf(path, g(p));
    expect(glyphs).toHaveLength(5);
    expect(glyphs[0].p.x).toBeGreaterThan(track.points[0].x);
    expect(glyphs[0].p.x).toBeLessThan(glyphs[1].p.x);
  });

  it.each(['runes', 'grenze', 'atkinson'] as const)('draws with %s, and effects work on it', (font) => {
    const t = { ...textLayer(), font, fill: '#ffffff' };
    const d = draw(project([t]));
    expect(painted(d)).toBeGreaterThan(300);
    expect(same(draw(project([{ ...t, effects: [NEW_EFFECT.glow()] }])), d)).toBe(false);
    expect(same(draw(project([{ ...t, outline: '#000000' }])), d)).toBe(false);
  });

  it('can be picked on the canvas', () => {
    const t = textLayer();
    const p = project([t]);
    const { glyphs } = textGlyphs(t, g(p));
    expect(pickLayer(p, SIZE, glyphs[3].p)?.id).toBe(t.id);
  });
});

describe('contours', () => {
  it('draws its lines one inside the other, tapering', () => {
    const c = { ...contoursLayer(), count: 4, from: 0.1, spacing: 0.2, width: 0.1, taper: 0.5 };
    const lines = contourLines(c);
    expect(lines.map((l) => l.at)).toEqual([0.1, 0.30000000000000004, 0.5, 0.7000000000000001].map((v) => expect.closeTo(v, 9)));
    expect(lines[0].width).toBeCloseTo(0.1, 9);
    expect(lines[3].width).toBeCloseTo(0.05, 9);
    expect(painted(draw(project([c])))).toBeGreaterThan(painted(draw(project([{ ...c, count: 2 }]))));
  });

  it('can alternate colours and be picked', () => {
    const c = { ...contoursLayer(), altColor: '#ff0000' };
    expect(contourLines(c).map((l) => (l.paint.kind === 'solid' ? l.paint.color : ''))).toEqual(['#2a1a0a', '#ff0000', '#2a1a0a']);
    const p = project([c]);
    const geo = g(p);
    const r = SIZE / 2 - geo.outer - bandWidthPx(geo) * contourLines(c)[1].at;
    expect(pickLayer(p, SIZE, { x: 0, y: -r })?.id).toBe(c.id);
  });
});

describe('done when (renderer)', () => {
  it('the Royal inscription draws gems in claw settings along a wave and an engraved inscription, on every token shape', () => {
    const t = LAYERED_TEMPLATES.find((x) => x.id === 'royal-inscription')!;
    for (const shape of SHAPES) {
      const layers = t.make();
      const p = project(layers, { shape: shape.id });
      const gemsLayer = layers.find((l) => l.type === 'repeat') as RepeatLayer;
      const text = layers.find((l) => l.type === 'text')!;
      expect(gemsLayer.setting).toBe('claws4');
      expect(repeatPlacements(gemsLayer, g(p), finder(p)).length).toBe(24);
      expect(text.effects.length).toBeGreaterThan(0);
      expect(painted(draw(p))).toBeGreaterThan(5000);
    }
  });
});

describe('emblems on a hexagon (version 12)', () => {
  const hex = (r: RepeatLayer) => project([r], { shape: 'hexagon' });
  const outward = (e: { p: { x: number; y: number; angle: number } }) => {
    const a = Math.atan2(e.p.y, e.p.x) + Math.PI / 2 - e.p.angle;
    return Math.abs(Math.sin(a)) < 1e-6 && Math.cos(a) > 0;
  };

  it('points icons and emblems out from the centre instead of square to each side', () => {
    const r: RepeatLayer = { ...repeatLayer(), element: 'crescent', count: 12, snapToCorners: false };
    const placed = repeatPlacements(r, g(hex(r)), finder(hex(r)));
    expect(placed.every(outward)).toBe(true);
    const icons = { ...r, element: 'crown' as RepeatLayer['element'] };
    expect(repeatPlacements(icons, g(hex(icons)), finder(hex(icons))).every(outward)).toBe(true);
  });

  it('keeps plain shapes, and emblems set to "square to the edge", turned with the band', () => {
    const beads: RepeatLayer = { ...repeatLayer(), element: 'tick', count: 12, snapToCorners: false };
    expect(repeatPlacements(beads, g(hex(beads)), finder(hex(beads))).every(outward)).toBe(false);
    const edge: RepeatLayer = { ...beads, element: 'crescent', orient: 'edge' };
    expect(repeatPlacements(edge, g(hex(edge)), finder(hex(edge))).every(outward)).toBe(false);
  });

  it('faces the same way as before on a circle', () => {
    const r: RepeatLayer = { ...repeatLayer(), element: 'sun', count: 8 };
    const p = project([r]);
    const now = repeatPlacements(r, g(p), finder(p));
    const before = repeatPlacements({ ...r, orient: 'edge' }, g(p), finder(p));
    now.forEach((e, i) => expect(Math.abs(Math.sin(e.p.angle - before[i].p.angle))).toBeLessThan(0.02));
  });
});
