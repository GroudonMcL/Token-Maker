import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { lineLayer, bandFillLayer, createProject, EFFECT_NAMES, NEW_EFFECT, GEM_POINTS, TEXTURES, textureFromPreset, textureLayer, groupLayer, NEW_LAYER, pathLayer, projectFromFrame, repeatLayer, shapeLayer } from './defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { parseProject, serializeProject } from './migrate';
import { EFFECT_KINDS, SCHEMA_VERSION, type Effect, type FrameProject, type Layer } from './types';

const roundTrip = (p: FrameProject) => {
  const r = parseProject(serializeProject(p));
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('project files', () => {
  it('a saved and reopened project is the same project', () => {
    for (const make of [() => createProject(LAYERED_TEMPLATES[0].make()), () => projectFromFrame('warlock'), () => createProject(Object.values(NEW_LAYER).map((m) => m()))]) {
      const p = make();
      const r = roundTrip(p);
      expect(r.project).toEqual(p);
      expect(r.warnings).toEqual([]);
    }
  });

  it('every Token Maker frame survives a round trip', () => {
    for (const f of FRAME_PRESETS) expect(roundTrip(projectFromFrame(f.id)).project.layers[0]).toMatchObject({ type: 'legacyFrame', presetId: f.id, style: f.style });
  });

  it('carries a format name and version', () => {
    const json = JSON.parse(serializeProject(createProject()));
    expect(json.format).toBe('frame-studio-project');
    expect(json.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('refuses files that are not projects, with a reason', () => {
    for (const bad of ['not json', '{}', '[]', JSON.stringify({ format: 'frame-studio-project' })]) {
      const r = parseProject(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    }
  });

  it('refuses a project from a newer version instead of guessing', () => {
    const r = parseProject({ ...createProject(), schemaVersion: SCHEMA_VERSION + 1 });
    expect(r.ok).toBe(false);
  });

  it('keeps a layer kind it does not know, unchanged, and writes it back', () => {
    const p = { ...createProject(), layers: [{ id: 'x1', name: 'Future', type: 'sparkleField', visible: true, locked: false, opacity: 1, blend: 'source-over', density: 7, nested: { a: [1, 2] } }] };
    const r = parseProject(JSON.stringify(p));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.layers[0]).toMatchObject({ type: 'unsupported', originalType: 'sparkleField', data: { density: 7, nested: { a: [1, 2] } } });
    expect(r.warnings.join(' ')).toMatch(/Future/);
    expect(JSON.parse(serializeProject(r.project)).layers[0]).toEqual(p.layers[0]);
  });

  it('bad values fall back to defaults; numbers are kept in range', () => {
    const r = parseProject({
      format: 'frame-studio-project',
      schemaVersion: 1,
      stage: { shape: 'blob', thickness: 99 },
      layers: [{ type: 'repeat', count: -4, fill: 'red', size: 'big', element: 'dragon' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.stage.shape).toBe('circle');
    expect(r.project.stage.thickness).toBe(0.6);
    const l = r.project.layers[0];
    if (l.type !== 'repeat') throw new Error('expected a repeat');
    expect(l.count).toBe(1);
    expect(l.fill).toBe('#e0c070');
    expect(l.element).toBe('bead');
    expect(l.id).toBeTruthy();
  });

  it('gives clashing layer ids fresh ones', () => {
    const a = NEW_LAYER.line();
    const r = parseProject({ ...createProject(), layers: [a, { ...a }] });
    if (!r.ok) throw new Error();
    expect(new Set(r.project.layers.map((l) => l.id)).size).toBe(2);
  });

  it('version 2: shapes, paths, groups and the new options survive a round trip', () => {
    const p = createProject([
      { ...shapeLayer(), shape: 'star', sides: 7, mirror: 'four', place: 'free', x: 0.1, y: -0.2, clip: 'band' },
      { ...pathLayer(GEM_POINTS.map((q, i) => (i === 2 ? { ...q, handle: { x: 0.2, y: -0.1 } } : q))), closed: false },
      groupLayer([{ ...repeatLayer(), altColors: ['#123456'], altSizes: [1, 0.5], skipAroundAccent: 1, accentEvery: 9, alternateSides: 0.2 }, groupLayer([])]),
      { ...NEW_LAYER.line(), waveAmplitude: 0.2, waves: 9, wavePhase: 0.25, clip: 'below' } as ReturnType<typeof NEW_LAYER.line>,
    ]);
    p.stage.light = 45;
    const r = roundTrip(p);
    expect(r.project).toEqual(p);
    expect(r.warnings).toEqual([]);
  });

  it('migrates a version-1 file: light from the top left, nothing clipped, no waves or patterns', () => {
    const v1 = {
      format: 'frame-studio-project',
      schemaVersion: 1,
      name: 'Old',
      stage: { shape: 'square', thickness: 0.2, outerSpacing: 0.1, showArt: false, backingColor: '#000000' },
      layers: [
        { id: 'a', name: 'L', type: 'line', visible: true, locked: false, opacity: 1, blend: 'source-over', at: 0.3, width: 0.1, paint: { kind: 'solid', color: '#ffffff' }, dash: 'solid', glow: null },
        { id: 'b', name: 'R', type: 'repeat', visible: true, locked: false, opacity: 1, blend: 'source-over', element: 'bead', count: 5 },
      ],
    };
    const r = parseProject(JSON.stringify(v1));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.project.stage.light).toBe(225);
    expect(r.project.layers[0]).toMatchObject({ clip: 'none', waveAmplitude: 0, at: 0.3 });
    expect(r.project.layers[1]).toMatchObject({ clip: 'none', altColors: [], altSizes: [], skipAroundAccent: 0, alternateSides: 0, count: 5 });
  });

  it('keeps unknown layers inside groups, and writes them back unchanged', () => {
    const future = { id: 'f1', name: 'Future', type: 'sparkleField', visible: true, locked: false, opacity: 1, blend: 'source-over', density: 3 };
    const p = { ...createProject(), layers: [{ ...groupLayer([]), children: [future] }] };
    const r = parseProject(JSON.stringify(p));
    if (!r.ok) throw new Error(r.error);
    const g = r.project.layers[0];
    expect(g.type === 'group' && g.children[0]).toMatchObject({ type: 'unsupported', originalType: 'sparkleField' });
    expect(JSON.parse(serializeProject(r.project)).layers[0].children[0]).toEqual(future);
  });

  it('ids must be unique across groups too; bad shape and path values fall back', () => {
    const a = NEW_LAYER.line();
    const r = parseProject({
      ...createProject(),
      layers: [a, { ...groupLayer([{ ...a }]) }, { type: 'shape', shape: 'splodge', sides: 99, mirror: 'sideways', place: 'nowhere' }, { type: 'path', points: [{ x: 'a', y: 2, handle: 7 }, 'junk'] }],
    });
    if (!r.ok) throw new Error(r.error);
    const g = r.project.layers[1];
    expect(g.type === 'group' && g.children[0].id).not.toBe(a.id);
    expect(r.project.layers[2]).toMatchObject({ type: 'shape', shape: 'polygon', sides: 24, mirror: 'none', place: 'band' });
    expect(r.project.layers[3]).toMatchObject({ type: 'path', points: [{ x: 0, y: 2, handle: null }] });
  });

  it('a light outside 0–359° is turned back into range', () => {
    const r = parseProject({ ...createProject(), stage: { ...createProject().stage, light: -90 } });
    expect(r.ok && r.project.stage.light).toBe(270);
  });

  it('version 3: texture layers and the ring paint survive a round trip', () => {
    const p = createProject([
      { ...bandFillLayer(), paint: { kind: 'ring', stops: [{ angle: 0, color: '#ff0000' }, { angle: 120, color: '#00ff00' }, { angle: 240, color: '#0000ff' }], followLight: false } },
      ...TEXTURES.map(textureFromPreset),
      { ...textureLayer('scatter'), from: 0.2, to: 0.8, amount: 2, scale: 0.5, strength: 1.5, where: 'lit', seed: 42, color2: null },
    ]);
    const r = roundTrip(p);
    expect(r.project).toEqual(p);
    expect(r.warnings).toEqual([]);
    expect(JSON.parse(serializeProject(p)).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('a version-2 file opens as version 3 unchanged', () => {
    const p = createProject([bandFillLayer()]);
    const v2 = { ...JSON.parse(serializeProject(p)), schemaVersion: 2 };
    const r = parseProject(JSON.stringify(v2));
    if (!r.ok) throw new Error(r.error);
    expect(r.project).toEqual(p);
  });

  it('a version-3 file opens as version 4 with the new settings switched off, in groups too', () => {
    const v3 = {
      format: 'frame-studio-project',
      schemaVersion: 3,
      name: 'Old',
      stage: {},
      layers: [
        { id: 'a', type: 'bandFill', paint: { kind: 'lit', color: '#123456', light: 0.5, dark: 0.5, pressed: true } },
        {
          id: 'g',
          type: 'group',
          children: [
            { id: 'b', type: 'line', paint: { kind: 'linear', angle: 10, stops: [{ at: 0, color: '#ffffff' }, { at: 1, color: '#000000' }] } },
            { id: 'c', type: 'repeat', element: 'bead' },
          ],
        },
      ],
    };
    const r = parseProject(JSON.stringify(v3));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    const [band, group] = r.project.layers;
    expect(band.type === 'bandFill' && band.paint).toEqual({ kind: 'lit', color: '#123456', light: 0.5, dark: 0.5, pressed: true, highlight: null });
    if (group.type !== 'group') throw new Error('not a group');
    const [line, rep] = group.children;
    expect(line.type === 'line' && line.paint).toEqual({ kind: 'linear', angle: 10, followLight: false, stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }] });
    expect(rep).toMatchObject({ shaded: true, show: [] });
  });

  it('a version-3 layer of an unknown kind is kept exactly, paint and all', () => {
    const future = { id: 'f', name: 'Future', type: 'glimmer', visible: true, locked: false, opacity: 1, blend: 'source-over', clip: 'none', paint: { kind: 'lit', color: '#123456' } };
    const r = parseProject(JSON.stringify({ format: 'frame-studio-project', schemaVersion: 3, name: 'Old', stage: {}, layers: [future] }));
    if (!r.ok) throw new Error(r.error);
    expect(JSON.parse(serializeProject(r.project)).layers[0]).toEqual(future);
  });

  it('version 4: new settings survive a round trip, and bad ones fall back', () => {
    const p = createProject([
      { ...bandFillLayer(), paint: { kind: 'lit', color: '#123456', light: 0.5, dark: 0.5, pressed: false, highlight: '#fafafa' } },
      { ...repeatLayer(), shaded: false, show: [true, false, false] },
    ]);
    expect(roundTrip(p).project).toEqual(p);
    const raw = JSON.parse(serializeProject(p));
    raw.layers[0].paint.highlight = 'shiny';
    Object.assign(raw.layers[1], { shaded: 'no', show: [false, false] });
    const r = parseProject(raw);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers[0]).toMatchObject({ paint: { highlight: null } });
    expect(r.project.layers[1]).toMatchObject({ shaded: true, show: [] });
  });

  it('bad texture and ring values fall back; numbers are kept in range', () => {
    const p = JSON.parse(serializeProject(createProject([bandFillLayer(), textureLayer('wood')])));
    p.layers[0].paint = { kind: 'ring', stops: [{ angle: 400, color: '#ABCDEF' }, { angle: -90, color: 'nope' }] };
    Object.assign(p.layers[1], { kind: 'plasma', amount: 99, scale: -1, strength: 'lots', where: 'somewhere', color: 'red', color2: 5, seed: -3 });
    const r = parseProject(p);
    if (!r.ok) throw new Error(r.error);
    const [band, tex] = r.project.layers;
    expect(band.type === 'bandFill' && band.paint).toEqual({ kind: 'ring', stops: [{ angle: 40, color: '#abcdef' }, { angle: 270, color: '#ffffff' }], followLight: true });
    expect(tex).toMatchObject({ type: 'texture', kind: 'marble', amount: 4, scale: 0.1, strength: 1, where: 'shaded', color: textureLayer('marble').color, color2: null, seed: 0 });
  });

  it('a ring paint with fewer than two colours falls back to the default paint', () => {
    const p = JSON.parse(serializeProject(createProject([bandFillLayer()])));
    p.layers[0].paint = { kind: 'ring', stops: [{ angle: 10, color: '#ffffff' }] };
    const r = parseProject(p);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers[0].type === 'bandFill' && r.project.layers[0].paint.kind).toBe('lit');
  });

  it('a version-4 file opens as the current version with no effects and smooth shapes, in groups too', () => {
    const v4 = {
      format: 'frame-studio-project',
      schemaVersion: 4,
      name: 'Old',
      stage: {},
      layers: [
        { id: 'a', type: 'bandFill' },
        { id: 'g', type: 'group', children: [{ id: 's', type: 'shape' }, { id: 'p', type: 'path', points: [] }] },
      ],
    };
    const r = parseProject(JSON.stringify(v4));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project.schemaVersion).toBe(SCHEMA_VERSION);
    const [band, group] = r.project.layers;
    expect(band.effects).toEqual([]);
    if (group.type !== 'group') throw new Error('not a group');
    expect(group.effects).toEqual([]);
    for (const l of group.children) expect(l).toMatchObject({ effects: [], faceted: false, facetTable: 0.5, facetDepth: 1 });
  });

  it('version 5: every effect, facets and the new blend modes survive a round trip', () => {
    const p = createProject([
      { ...bandFillLayer(), blend: 'color-dodge', effects: EFFECT_KINDS.map((k) => NEW_EFFECT[k]()) },
      { ...shapeLayer(), faceted: true, facetTable: 0, facetDepth: 2, blend: 'destination-out' },
      { ...groupLayer([repeatLayer()]), effects: [{ ...NEW_EFFECT.glow(), on: false }] },
    ]);
    expect(roundTrip(p).project).toEqual(p);
    expect(Object.keys(EFFECT_NAMES).sort()).toEqual([...EFFECT_KINDS].sort());
  });

  it('bad effect values fall back or are kept in range; an unknown effect is left out with a warning', () => {
    const raw = JSON.parse(serializeProject(createProject([bandFillLayer()])));
    raw.layers[0].effects = [
      { kind: 'bevel', size: 99, depth: -1, profile: 'wobbly', surface: 'lumpy', highlight: 'bright', on: 'yes' },
      { kind: 'sparkle', amount: 3 },
      { kind: 'adjust', hue: 999 },
      'nonsense',
    ];
    const r = parseProject(raw);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers[0].effects).toHaveLength(2);
    expect(r.project.layers[0].effects[0]).toMatchObject({ kind: 'bevel', size: 2, depth: 0, profile: 'rounded', surface: 'smooth', highlight: '#ffffff', on: true });
    expect(r.project.layers[0].effects[1]).toMatchObject({ kind: 'adjust', hue: 180 });
    expect(r.warnings).toHaveLength(2);
  });

  it('an unknown layer keeps its effects exactly as they came', () => {
    const future = { id: 'f', name: 'Future', type: 'glimmer', visible: true, locked: false, opacity: 1, blend: 'source-over', clip: 'none', effects: [{ kind: 'sparkle' }] };
    const r = parseProject(JSON.stringify({ format: 'frame-studio-project', schemaVersion: 5, name: 'New', stage: {}, layers: [future] }));
    if (!r.ok) throw new Error(r.error);
    expect(JSON.parse(serializeProject(r.project)).layers[0]).toEqual(future);
  });

  it('a version-5 file opens with repeats on the band, the Phase 6 gem, no setting and no radial arrays, in groups too', () => {
    const v5 = {
      format: 'frame-studio-project',
      schemaVersion: 5,
      name: 'Old',
      stage: {},
      layers: [{ id: 'g', type: 'group', effects: [], children: [{ id: 'r', type: 'repeat', element: 'gem', effects: [] }, { id: 's', type: 'shape', effects: [] }] }],
    };
    const r = parseProject(JSON.stringify(v5));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    const [group] = r.project.layers;
    if (group.type !== 'group') throw new Error('not a group');
    expect(group.children[0]).toMatchObject({ follow: null, orient: 'along', scaleEnd: 1, jitterSize: 0, skipChance: 0, gemCut: 'brilliant', gemTable: 0.52, gemCrown: 0.9, gemFacets: 8, setting: 'none', settingEffects: [] });
    expect(group.children[1]).toMatchObject({ radialCount: 1 });
  });

  it('version 6: following, variation, gems, settings, radial arrays, text and contours survive a round trip', () => {
    const path = { ...pathLayer(GEM_POINTS), radialCount: 5, radialRadius: 1.2, radialStart: 30, radialMirror: true };
    const p = createProject([
      path,
      { ...repeatLayer(), element: 'gem', follow: path.id, orient: 'upright', scaleEnd: 1.5, jitterSize: 0.2, jitterAngle: 15, skipChance: 0.1, gemCut: 'emerald', gemTable: 0.4, gemCrown: 1.4, gemFacets: 6, gemSparkle: 0.5, setting: 'claws6', settingColor: '#aabbcc', settingEffects: [NEW_EFFECT.bevel()] },
      { ...NEW_LAYER.text(), text: 'Ever onward', font: 'runes', reverse: true, align: 'start', follow: path.id, outline: '#000000' } as Layer,
      { ...NEW_LAYER.contours(), count: 5, taper: -0.3, altColor: '#ff0000', dash: 'dotted' } as Layer,
    ]);
    expect(roundTrip(p).project).toEqual(p);
  });

  it('bad version-6 values fall back or are clamped', () => {
    const r = parseProject(JSON.stringify({ ...createProject(), layers: [{ type: 'repeat', gemCut: 'pear', setting: 'prongs', gemFacets: 99, follow: 7 }, { type: 'text', font: 'comic', text: 5, size: -1 }] }));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers[0]).toMatchObject({ gemCut: 'brilliant', setting: 'none', gemFacets: 16, follow: null });
    expect(r.project.layers[1]).toMatchObject({ font: 'grenze', size: 0.05 });
  });

  it('a version-6 file opens with lines not fitted to the band and wear without scratches', () => {
    const v6 = {
      format: 'frame-studio-project',
      schemaVersion: 6,
      name: 'Old',
      stage: {},
      layers: [{ id: 'l', type: 'line', waveAmplitude: 0.2, effects: [{ kind: 'wear', chips: 0.2 }] }],
    };
    const r = parseProject(JSON.stringify(v6));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    expect(r.project.layers[0]).toMatchObject({ waveFit: 0, effects: [{ kind: 'wear', scratches: 0, chips: 0.2 }] });
  });

  it('version 7: every generator, distortion, scratches and fitted waves survive a round trip', () => {
    const p = createProject([
      { ...NEW_LAYER.line(), waveAmplitude: 0.2, waveFit: 1.5 } as Layer,
      ...(['growth', 'fracture', 'cells', 'knotwork', 'gears', 'chain'] as const).map((t) => NEW_LAYER[t]()),
      { ...bandFillLayer(), effects: [NEW_EFFECT.distort(), { ...NEW_EFFECT.wear(), scratches: 0.5 } as Effect] },
      { ...repeatLayer(), element: 'gash' },
    ]);
    expect(roundTrip(p).project).toEqual(p);
  });

  it('a version-7 file opens with no masks, no shared height, groups drawn as before and plain paths', () => {
    const v7 = { format: 'frame-studio-project', schemaVersion: 7, name: 'Old', stage: {}, layers: [{ id: 'g', type: 'group', children: [{ id: 'p', type: 'path', points: [{ x: 0, y: 0, handle: { x: 1, y: 0 } }] }] }] };
    const r = parseProject(JSON.stringify(v7));
    if (!r.ok) throw new Error(r.error);
    expect(r.warnings).toEqual([]);
    const [group] = r.project.layers;
    expect(group).toMatchObject({ mask: null, heightMode: 'none', combine: 'normal' });
    if (group.type !== 'group') throw new Error('not a group');
    expect(group.children[0]).toMatchObject({ mask: null, heightMode: 'none', stroke: 0, taperStart: 0, taperEnd: 0 });
    expect(group.children[0].type === 'path' && group.children[0].points[0].handleIn).toBeUndefined();
  });

  it('version 8: masks, shared height, combining, strokes, separate handles, sides and grow survive a round trip', () => {
    const shape = shapeLayer();
    const p = createProject([
      shape,
      { ...bandFillLayer(), mask: { source: shape.id, mode: 'luminance', invert: true }, heightMode: 'carve', heightDepth: 2, heightSize: 0.3, effects: [NEW_EFFECT.extrude(), NEW_EFFECT.offset()] },
      { ...groupLayer([lineLayer()]), combine: 'subtract' },
      { ...pathLayer([{ x: 0, y: 0, handle: { x: 1, y: 0 }, handleIn: { x: -0.2, y: 0.5 } }, { x: 1, y: 1, handle: null }]), stroke: 0.4, taperStart: 0.3, taperEnd: 1 },
    ]);
    expect(roundTrip(p).project).toEqual(p);
  });

  it('a version-8 file opens with the lighting rig off', () => {
    const r = parseProject(JSON.stringify({ format: 'frame-studio-project', schemaVersion: 8, name: 'Old', stage: { light: 100 }, layers: [] }));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.stage).toMatchObject({ light: 100, lights: [], ambientStrength: 0, bloom: 0, bleed: 0 });
  });
});
