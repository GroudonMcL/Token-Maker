// @vitest-environment node
// Phase 4: Token Maker frames converted into editable layers. Each conversion
// is drawn beside the original (a legacy layer, itself pixel for pixel
// token-maker's drawFrame) and the difference measured: the mean difference
// per channel (0–255) and the share of pixels that differ visibly (by more
// than 24/255 in some channel). The limits are per frame, a little above what
// each conversion measures, so any change that moves a conversion away from
// its original fails here. Polished and Paladin (the "done when" frames) are
// checked on every shape at three sizes and two thicknesses; the others on
// every shape at one size, and thick on a circle.
import { createCanvas } from '@napi-rs/canvas';
import { FRAME_PRESETS, SHAPES, type ShapeId } from '../engine/legacy/catalog';
import { frameAccent } from '../engine/legacy/frames';
import { setCanvasFactory, type Ctx } from '../render/canvas';
import { compareFrames } from '../render/compare';
import { renderProject } from '../render/renderProject';
import { canConvert, CONVERTIBLE_STYLES, convertFrame, convertLegacyLayer, convertPreset } from './convert';
import { createProject, groupLayer, legacyFrameLayer, repeatLayer } from './defaults';
import { parseProject, serializeProject } from './migrate';
import { flatten } from './tree';
import type { FrameProject, GroupLayer, Layer, RepeatLayer } from './types';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

/** The agreed limits: worst mean difference (0–255) and worst share of visibly different pixels (%). */
const LIMITS: Record<string, { mean: number; over: number }> = {
  minimal: { mean: 0.15, over: 0.01 }, // Polished: the same picture to within rounding
  paladin: { mean: 2.5, over: 5 },
  gilded: { mean: 0.5, over: 0.2 },
  engraved: { mean: 1.4, over: 1.6 },
  arcane: { mean: 2.6, over: 0.8 },
  infernal: { mean: 2.6, over: 0.8 },
  wizard: { mean: 2.4, over: 0.9 },
  double: { mean: 1.6, over: 4 },
  oak: { mean: 0.35, over: 0.05 },
  cobblestone: { mean: 0.3, over: 0.05 },
  magma: { mean: 0.5, over: 0.25 },
  harlequin: { mean: 0.75, over: 1 },
  starfield: { mean: 0.25, over: 0.05 },
  fighter: { mean: 0.25, over: 0.1 },
  monk: { mean: 1.1, over: 0.8 },
  rogue: { mean: 1.4, over: 1.5 },
  sorcerer: { mean: 0.3, over: 0.05 },
  // Phase 8, with generators:
  druid: { mean: 1.2, over: 1.5 },
  knotwork: { mean: 3.4, over: 5.5 },
  barbarian: { mean: 1.6, over: 3.2 },
  artificer: { mean: 1.5, over: 2.2 },
  // Version 10, with the ornaments and textures made for them:
  stamped: { mean: 0.2, over: 0.05 }, // the same picture to within rounding
  ranger: { mean: 2.8, over: 8 },
  bard: { mean: 0.6, over: 0.35 },
  warlock: { mean: 2.2, over: 3 },
};

const converted = FRAME_PRESETS.filter((p) => canConvert(p.style));

function pixels(p: FrameProject, size: number): Uint8ClampedArray {
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, p, size, { cache: false });
  return c.getContext('2d').getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}

function measure(original: Layer[], layers: Layer[], stage: Partial<FrameProject['stage']>, size: number) {
  const [a, b] = [original, layers].map((l) => {
    const p = createProject(l);
    p.stage = { ...p.stage, showArt: false, ...stage };
    return pixels(p, size);
  });
  return compareFrames(a, b);
}

function expectWithin(presetId: string, shape: ShapeId, size: number, thickness: number) {
  const d = measure([legacyFrameLayer(presetId)], convertPreset(presetId)!, { shape, thickness }, size);
  const limit = LIMITS[presetId];
  expect(d.mean, `mean difference on ${shape}, ${size} px, thickness ${thickness}`).toBeLessThanOrEqual(limit.mean);
  expect(d.over * 100, `visibly different pixels on ${shape}, ${size} px, thickness ${thickness}`).toBeLessThanOrEqual(limit.over);
}

describe('converted frames look like the originals', () => {
  it('every converted frame has an agreed limit, and nothing else is converted', () => {
    expect(converted.map((p) => p.id).sort()).toEqual(Object.keys(LIMITS).sort());
  });

  describe.each(['minimal', 'paladin'])('%s, on every shape, size and thickness', (id) => {
    it.each(SHAPES.flatMap((s) => [96, 200, 320].flatMap((size) => [0.14, 0.25].map((t) => [s.id, size, t] as const))))('%s at %i px, thickness %f', (shape, size, t) =>
      expectWithin(id, shape, size, t),
    );
  });

  it.each(converted.filter((p) => p.id !== 'minimal' && p.id !== 'paladin').map((p) => p.id))('%s, on every shape', (id) => {
    for (const s of SHAPES) expectWithin(id, s.id, 200, 0.14);
    expectWithin(id, 'circle', 200, 0.25);
  });

  it('a frame in its own colour and highlights colour converts as closely', () => {
    const layer = { ...legacyFrameLayer('paladin'), color: '#a0522d', accent: '#33cc88' };
    const d = measure([layer], convertLegacyLayer(layer)!.children, { shape: 'rounded' }, 200);
    expect(d.mean).toBeLessThanOrEqual(LIMITS.paladin.mean);
    expect(d.over * 100).toBeLessThanOrEqual(LIMITS.paladin.over);
    const polished = { ...legacyFrameLayer('minimal'), color: '#3a7bd5' };
    expect(measure([polished], convertLegacyLayer(polished)!.children, { shape: 'hexagon' }, 200).mean).toBeLessThanOrEqual(LIMITS.minimal.mean);
  });
});

describe('the converted layers', () => {
  it.each(converted.map((p) => p.id))('%s: open from a file as they are, without warnings', (id) => {
    const p = createProject(convertPreset(id)!);
    const r = parseProject(serializeProject(p));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project).toEqual(p);
  });

  it('get fresh, unique ids every time', () => {
    const a = flatten(convertPreset('paladin')!).map((l) => l.id);
    const b = flatten(convertPreset('paladin')!).map((l) => l.id);
    expect(new Set([...a, ...b]).size).toBe(a.length + b.length);
  });

  it('are the build Token Maker frames share: band, step, crease and rims, then ornaments on top', () => {
    const names = convertPreset('paladin')!.map((l) => l.name);
    expect(names).toEqual(['Band', 'Pressed-in step', 'Groove', 'Crease', 'Outer rim (lit)', 'Inner rim (shadow)', 'Gold crosses', 'Blue gems']);
    expect(convertPreset('minimal')!.map((l) => l.name)).toEqual(['Band', 'Pressed-in step', 'Crease', 'Outer rim (lit)', 'Inner rim (shadow)']);
  });

  it('take the frame’s colour and highlights colour', () => {
    const layers = convertFrame('holy', { color: '#123456', accent: '#ff0000' })!;
    const band = layers[0];
    expect(band.type === 'bandFill' && band.paint.kind === 'lit' && band.paint.color).toBe('#123456');
    expect(layers.find((l) => l.name === 'Gold crosses')).toMatchObject({ fill: '#ff0000' });
    expect(convertFrame('holy', { color: '#123456', accent: null })!.find((l) => l.name === 'Gold crosses')).toMatchObject({ fill: frameAccent('holy') });
  });

  it('follow the light, as the original can’t', () => {
    for (const id of ['minimal', 'paladin']) {
      const at = (light: number, layers: Layer[]) => {
        const p = createProject(layers);
        p.stage = { ...p.stage, showArt: false, light };
        return pixels(p, 160);
      };
      const layers = convertPreset(id)!;
      expect(compareFrames(at(225, layers), at(45, layers)).mean).toBeGreaterThan(5);
      const legacy = [legacyFrameLayer(id)];
      expect(compareFrames(at(225, legacy), at(45, legacy)).mean).toBe(0);
    }
  });

  it('a converted layer becomes a group in its place, keeping its name, visibility, opacity, blend and clip', () => {
    const layer = { ...legacyFrameLayer('paladin'), name: 'My frame', visible: false, opacity: 0.5, blend: 'multiply' as const, clip: 'band' as const };
    const group = convertLegacyLayer(layer)!;
    expect(group).toMatchObject({ type: 'group', name: 'My frame', visible: false, opacity: 0.5, blend: 'multiply', clip: 'band', collapsed: false });
    expect(group.id).not.toBe(layer.id);
    expect(group.children.length).toBe(8);
  });

  it('every Token Maker frame converts; "No frame" has nothing to convert', () => {
    expect(canConvert('none')).toBe(false);
    expect(convertFrame('none', { color: '#888888', accent: null })).toBeNull();
    expect(convertLegacyLayer(legacyFrameLayer('none'))).toBeNull();
    expect(CONVERTIBLE_STYLES.length).toBe(25);
    expect(FRAME_PRESETS.filter((p) => p.style !== 'none').every((p) => canConvert(p.style))).toBe(true);
  });
});

describe('version 11 files', () => {
  it('keep their emblems square to the band, so they draw as they did', () => {
    // A version 11 icon ornament (taken out since): the file still names it.
    const icon: RepeatLayer = { ...repeatLayer(), element: 'icon-rose' as RepeatLayer['element'] };
    const bead: RepeatLayer = { ...repeatLayer(), element: 'bead' };
    const old = { ...createProject([icon, { ...groupLayer([icon]) }, bead] as never), schemaVersion: 11 };
    const r = parseProject(JSON.parse(JSON.stringify(old)));
    if (!r.ok) throw new Error(r.error);
    const [a, grp, b] = r.project.layers as [RepeatLayer, GroupLayer, RepeatLayer];
    expect(a.orient).toBe('edge');
    expect((grp.children[0] as RepeatLayer).orient).toBe('edge');
    expect(b.orient).toBe('along');
  });
});
