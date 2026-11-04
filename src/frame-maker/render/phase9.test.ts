// @vitest-environment node
// Phase 9 renderer checks: masks from any layer, the shared height map
// (raised and carved layers lighting as one surface), extruded sides, grow
// and shrink, combining a group's shapes, tapered strokes, separate path
// handles, turning a group round the token, and the height and normal views.
import { createCanvas } from '@napi-rs/canvas';
import { registerShippedFonts } from '../../../scripts/frame-maker/nodeFonts';
import { SHAPES } from '../engine/legacy/catalog';
import { bandFillLayer, createProject, groupLayer, lineLayer, NEW_EFFECT, pathLayer, repeatLayer, shapeLayer, textLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import type { Effect, FrameProject, GroupLayer, Layer, PathPoint } from '../project/types';
import { bandGeometry } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { movePathPart, toggleSeparate, turnLayer } from './hitTest';
import { clearLayerCache } from './layerCache';
import { shapeAsPath } from './placed';
import { renderProject, type RenderOptions } from './renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();

const SIZE = 200;
const project = (layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject => {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.3, ...stage };
  return p;
};
function draw(p: FrameProject, opts: RenderOptions = {}, size = SIZE): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, p, size, { cache: false, ...opts });
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
/** Total coverage: the sum of every pixel's alpha (0–1). */
const cover = (d: Uint8ClampedArray) => d.reduce((n, v, i) => (i % 4 === 3 ? n + v / 255 : n), 0);
const painted = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);
const alphaAt = (d: Uint8ClampedArray, x: number, y: number) => d[(Math.round(y) * SIZE + Math.round(x)) * 4 + 3];
const grey = (effects: Effect[] = []) => ({ ...bandFillLayer(), paint: { kind: 'solid' as const, color: '#808080' }, effects });
/** A shape at the top of the band, placed freely so it is easy to find. */
const blob = (patch: Partial<Layer> = {}) => ({ ...shapeLayer(), shape: 'circle' as const, place: 'free' as const, x: 0, y: -0.8, size: 0.25, outline: null, raised: false, shaded: false, fill: '#ffffff', ...patch }) as Layer;

beforeEach(() => clearLayerCache());

describe('masks', () => {
  it('a layer shows only through another layer’s shape, even a hidden one', () => {
    const shape = blob({ visible: false });
    const band = { ...grey(), mask: { source: shape.id, mode: 'alpha' as const, invert: false } };
    const d = draw(project([shape, band]));
    // Inside the hidden circle the band shows; elsewhere on the band it doesn't.
    expect(alphaAt(d, SIZE / 2, SIZE / 2 - 0.8 * (SIZE / 2))).toBeGreaterThan(200);
    expect(alphaAt(d, SIZE / 2, SIZE / 2 + 0.8 * (SIZE / 2))).toBe(0);
    // Inverted: the other way round.
    const inv = draw(project([shape, { ...band, mask: { ...band.mask, invert: true } }]));
    expect(alphaAt(inv, SIZE / 2, SIZE / 2 - 0.8 * (SIZE / 2))).toBe(0);
    expect(alphaAt(inv, SIZE / 2, SIZE / 2 + 0.8 * (SIZE / 2))).toBeGreaterThan(200);
  });

  it('a luminance mask lets light parts show and dark parts hide', () => {
    const dark = blob({ visible: false, fill: '#000000' });
    const light = { ...dark, id: 'light', fill: '#ffffff' } as Layer;
    const band = (source: string) => ({ ...grey(), mask: { source, mode: 'luminance' as const, invert: false } });
    expect(painted(draw(project([dark, band(dark.id)])))).toBe(0);
    expect(painted(draw(project([light, band('light')])))).toBeGreaterThan(100);
  });

  it('a mask that points at nothing (or at itself) leaves the layer as it is', () => {
    const plain = draw(project([grey()]));
    expect(same(draw(project([{ ...grey(), mask: { source: 'gone', mode: 'alpha', invert: false } }])), plain)).toBe(true);
  });
});

describe('the shared height map', () => {
  const plateGroup = (carve: Partial<Layer>, effects: Effect[] = [NEW_EFFECT.bevel()]): GroupLayer => ({
    ...groupLayer([{ ...grey(), name: 'Plate' }, { ...lineLayer(), at: 0.5, width: 0.2, paint: { kind: 'solid', color: '#808080' }, ...carve } as Layer]),
    effects,
  });

  it('a carved layer cuts into its group’s bevel: lit on its far edge, shaded on its near one, where the plain plate is flat', () => {
    const flat = draw(project([plateGroup({})]));
    const carved = draw(project([plateGroup({ heightMode: 'carve', heightDepth: 1.5, heightSize: 0.08 })]));
    expect(same(carved, flat)).toBe(false);
    // A raised line instead lights the other way.
    const raised = draw(project([plateGroup({ heightMode: 'raise', heightDepth: 1.5, heightSize: 0.08 })]));
    expect(same(raised, carved)).toBe(false);
  });

  it('an invisible (0 % opacity) carved layer only shapes the surface: the picture keeps the plate’s outline', () => {
    const carved = draw(project([plateGroup({ heightMode: 'carve', opacity: 0 })]));
    expect(painted(carved)).toBe(painted(draw(project([plateGroup({})]))));
  });

  it('without a bevel on the group, heights change nothing', () => {
    expect(same(draw(project([plateGroup({ heightMode: 'carve' }, [])])), draw(project([plateGroup({}, [])])))).toBe(true);
  });

  it('the height and normal views show the bevel’s maps instead of lighting it', () => {
    const p = project([plateGroup({ heightMode: 'carve', heightDepth: 1.5 })]);
    const picture = draw(p);
    const height = draw(p, { view: 'height' });
    const normals = draw(p, { view: 'normals' });
    expect(same(height, picture)).toBe(false);
    expect(same(normals, height)).toBe(false);
    // A height map is grey.
    for (let i = 0; i < height.length; i += 4 * 97) if (height[i + 3] === 255) expect(height[i]).toBe(height[i + 1]);
  });

  it('the Rune-carved plates template lights runes cut through raised plates, on every shape', () => {
    const t = LAYERED_TEMPLATES.find((x) => x.id === 'rune-plates')!;
    const layers = t.make();
    const group = layers.find((l) => l.type === 'group') as GroupLayer;
    expect(group.children.some((l) => l.heightMode === 'carve')).toBe(true);
    for (const shape of SHAPES) {
      const p = project(t.make(), { shape: shape.id });
      const withRunes = draw(p);
      const g = p.layers.find((l) => l.type === 'group') as GroupLayer;
      const noRunes = draw({ ...p, layers: p.layers.map((l) => (l === g ? { ...g, children: g.children.filter((c) => c.type !== 'text') } : l)) });
      expect(same(withRunes, noRunes)).toBe(false);
    }
  });
});

describe('sides, grow and shrink', () => {
  it('extruded sides spread the shape away from the light', () => {
    const plain = painted(draw(project([blob()])));
    const sided = draw(project([blob({ effects: [{ ...NEW_EFFECT.extrude(), depth: 0.2 } as Effect] })]));
    expect(painted(sided)).toBeGreaterThan(plain);
    // Away from the light (top left): further down and right than up and left.
    const cx = SIZE / 2;
    const cy = SIZE / 2 - 0.8 * (SIZE / 2);
    const r = 0.125 * (SIZE / 2);
    expect(alphaAt(sided, cx + r * 0.9, cy + r * 0.9)).toBeGreaterThan(alphaAt(sided, cx - r * 0.9, cy - r * 0.9));
  });

  it('grow makes the shape bigger, shrink smaller', () => {
    const plain = painted(draw(project([blob()])));
    const grow = painted(draw(project([blob({ effects: [{ ...NEW_EFFECT.offset(), amount: 0.08 } as Effect] })])));
    const shrink = painted(draw(project([blob({ effects: [{ ...NEW_EFFECT.offset(), amount: -0.08 } as Effect] })])));
    expect(grow).toBeGreaterThan(plain * 1.1);
    expect(shrink).toBeLessThan(plain * 0.9);
  });
});

describe('combining a group’s shapes', () => {
  const two = (combine: GroupLayer['combine']) => ({ ...groupLayer([blob({ x: -0.06 }), blob({ x: 0.06, fill: '#ff0000' })]), combine });

  it('union, subtract, intersect and exclude give the expected areas', () => {
    const a = cover(draw(project([blob({ x: -0.06 })])));
    const union = cover(draw(project([two('union')])));
    const sub = cover(draw(project([two('subtract')])));
    const inter = cover(draw(project([two('intersect')])));
    const ex = cover(draw(project([two('exclude')])));
    expect(union).toBeGreaterThan(a);
    expect(sub).toBeLessThan(a);
    expect(inter).toBeLessThan(a);
    expect(Math.abs(sub + inter - a)).toBeLessThan(a * 0.08);
    expect(Math.abs(ex - (union - inter))).toBeLessThan(a * 0.08);
    expect(same(draw(project([two('normal')])), draw(project([two('union')])))).toBe(true);
  });

  it('a bevel on a combined group follows the combined shape', () => {
    const g = { ...two('subtract'), effects: [NEW_EFFECT.bevel()] };
    expect(painted(draw(project([g])))).toBe(painted(draw(project([two('subtract')]))));
  });
});

describe('paths: strokes and handles', () => {
  const line: PathPoint[] = [
    { x: -2, y: 0, handle: null },
    { x: 2, y: 0, handle: null },
  ];

  it('a path can be drawn as a filled stroke, tapering at its ends', () => {
    const p = { ...pathLayer(line), closed: false, fill: '#ffffff', outline: null, raised: false, shaded: false, place: 'free' as const, x: 0, y: -0.8, size: 0.2 };
    expect(painted(draw(project([p])))).toBe(0);
    const stroke = painted(draw(project([{ ...p, stroke: 0.5 }])));
    expect(stroke).toBeGreaterThan(200);
    expect(painted(draw(project([{ ...p, stroke: 0.5, taperStart: 1, taperEnd: 1 }])))).toBeLessThan(stroke * 0.85);
  });

  it('separate handles let a point’s arriving curve differ from its leaving one', () => {
    const pts: PathPoint[] = [
      { x: -1, y: 0, handle: null },
      { x: 0, y: -1, handle: { x: 0.5, y: 0 } },
      { x: 1, y: 0, handle: null },
    ];
    const layer = { ...pathLayer(pts), closed: false, fill: null, outline: '#ffffff', place: 'free' as const, x: 0, y: 0, size: 0.5 };
    const p = project([layer]);
    const g = bandGeometry(p.stage, SIZE);
    const sep = toggleSeparate(pts, 1);
    expect(sep[1].handleIn).toEqual({ x: -0.5, y: 0 });
    // Joined, dragging the arriving handle moves both; separate, only it.
    const joined = movePathPart({ ...layer, points: pts }, g, { point: 1, part: 'in' }, { x: -40, y: 10 })!;
    expect(joined[1].handleIn).toBeUndefined();
    const apart = movePathPart({ ...layer, points: sep }, g, { point: 1, part: 'in' }, { x: -40, y: 10 })!;
    expect(apart[1].handle).toEqual({ x: 0.5, y: 0 });
    expect(apart[1].handleIn).not.toEqual({ x: -0.5, y: 0 });
    expect(same(draw(project([{ ...layer, points: apart }])), draw(project([{ ...layer, points: sep }])))).toBe(false);
    // Joined again: the arriving handle mirrors the leaving one.
    expect(toggleSeparate(apart, 1)[1].handleIn).toBeUndefined();
  });

  it('a shape turned into a path draws the same outline', () => {
    const s = { ...shapeLayer(), shape: 'polygon' as const, sides: 6, raised: false, shaded: false, outline: null };
    const { shape: _s, sides: _d, innerRatio: _i, corner: _c, ...rest } = s;
    const path = { ...rest, type: 'path' as const, points: shapeAsPath(s), closed: true, stroke: 0, taperStart: 0, taperEnd: 0 };
    const a = draw(project([s]));
    const b = draw(project([path]));
    expect(Math.abs(painted(a) - painted(b))).toBeLessThan(painted(a) * 0.02);
  });
});

describe('turning a group round the token', () => {
  it('band positions slide round, free shapes move round the centre', () => {
    expect(turnLayer({ ...shapeLayer(), along: 0.1 }, 90, 1)).toEqual({ along: 0.35 });
    const free = turnLayer({ ...shapeLayer(), place: 'free', x: 0, y: -0.5, rotation: 0 }, 90, 1)!;
    expect(free).toMatchObject({ x: 0.5, y: 0, rotation: 90 });
    expect(turnLayer({ ...repeatLayer(), offset: 0 }, 30, 12)).toEqual({ offset: 0 });
    expect(turnLayer({ ...repeatLayer(), offset: 0 }, 15, 12)).toEqual({ offset: 0.5 });
    expect(turnLayer({ ...textLayer(), along: 0 }, 180, 1)).toEqual({ along: 0.5 });
    expect(turnLayer(bandFillLayer(), 45, 1)).toBeNull();
  });
});
