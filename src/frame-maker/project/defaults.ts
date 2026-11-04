// Starting values for projects and layers. Every layer type has predictable
// defaults, so a new layer always looks sensible straight away.

import { FRAME_PRESETS, framePresetById } from '../engine/legacy/catalog';
import { frameAccent } from '../engine/legacy/frames';
import { pictureById, type PictureId } from './pictures';
import { bevel, glow, material, shadow, styleEffects } from './styles';

export { EFFECT_NAMES, NEW_EFFECT } from './effectDefaults';
import {
  PROJECT_FORMAT,
  SCHEMA_VERSION,
  DEFAULT_LIGHT,
  type BandFillLayer,
  type ContoursLayer,
  type ExtraLight,
  type CellsLayer,
  type ChainLayer,
  type FractureLayer,
  type GearsLayer,
  type GrowthKind,
  type GrowthLayer,
  type KnotworkLayer,
  type TextLayer,
  type Effect,
  type EditableLayerType,
  type FrameProject,
  type GroupLayer,
  type LegacyFrameLayer,
  type Layer,
  type LineLayer,
  type PathLayer,
  type PathPoint,
  type Placement,
  type PlacedStyle,
  type RepeatLayer,
  type ShapeLayer,
  type StageSettings,
  type TextureKind,
  type TextureLayer,
} from './types';

/** The lighting rig switched off (version 9). */
export const NO_RIG = { lights: [] as ExtraLight[], ambient: '#203050', ambientStrength: 0, bloom: 0, bleed: 0 };

/** A new extra light: a cool rim light from opposite the main light. */
export const newLight = (main: number): ExtraLight => ({ angle: (main + 180) % 360, color: '#9fd0ff', strength: 0.8, height: 20 });

export const DEFAULT_STAGE: StageSettings = {
  shape: 'circle',
  // token-maker's default frame on a Medium token.
  thickness: 0.14,
  outerSpacing: 0.1,
  showArt: true,
  backingColor: '#1d1f27',
  light: DEFAULT_LIGHT,
  ...NO_RIG,
};

let counter = 0;
/** A new layer id, unique within this browser session and across saved files. */
export function newId(): string {
  counter = (counter + 1) % 0x10000;
  return `L${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 0x10000).toString(36)}`;
}

const base = (name: string) => ({ id: newId(), name, visible: true, locked: false, opacity: 1, blend: 'source-over' as const, clip: 'none' as const, effects: [] as Effect[], ...LAYER_PHASE9 });

/** What every layer gets from version 8 on, all off: no mask, not part of a shared height map. */
export const LAYER_PHASE9 = { mask: null, heightMode: 'none' as const, heightDepth: 1, heightSize: 0.15 };

export function legacyFrameLayer(presetId: string): LegacyFrameLayer {
  const preset = framePresetById(presetId) ?? FRAME_PRESETS[0];
  return { ...base(preset.name), type: 'legacyFrame', presetId: preset.id, style: preset.style, color: preset.color, accent: null };
}

export function bandFillLayer(): BandFillLayer {
  return { ...base('Band fill'), type: 'bandFill', from: 0, to: 1, paint: { kind: 'lit', color: '#c9a24a', light: 0.85, dark: 0.8, pressed: false, highlight: null } };
}

export function lineLayer(): LineLayer {
  return { ...base('Line'), type: 'line', at: 0.5, width: 0.06, paint: { kind: 'solid', color: '#2a1a0a' }, dash: 'solid', glow: null, waveAmplitude: 0, waves: 12, wavePhase: 0, waveFit: 0, waveShape: 'sine', raised: false };
}

export function repeatLayer(): RepeatLayer {
  return {
    ...base('Repeated shapes'),
    type: 'repeat',
    element: 'bead',
    mode: 'count',
    count: 12,
    spacing: 1,
    snapToCorners: true,
    at: 0.5,
    size: 0.3,
    stretch: 1,
    rotation: 0,
    offset: 0,
    fill: '#e0c070',
    outline: null,
    outlineWidth: 0.08,
    raised: true,
    glow: null,
    accentEvery: 0,
    accentScale: 1.6,
    accentColor: null,
    seed: 1,
    altColors: [],
    altSizes: [],
    skipAroundAccent: 0,
    alternateSides: 0,
    shaded: true,
    show: [],
    ...REPEAT_PHASE7,
    ...REPEAT_V10,
  };
}

/** What a repeat gets from version 10 on, all off: one colour, any count, no wandering, no paint. */
export const REPEAT_V10 = { detail: null, multipleOf: 1, wander: 0, fillPaint: null, paintEach: false } satisfies Partial<RepeatLayer>;

/** What a repeat gets from version 6 on, all off: on the band, no variation, Phase 6's brilliant cut, no setting. */
export const REPEAT_PHASE7 = {
  follow: null,
  orient: 'along',
  scaleEnd: 1,
  jitterSize: 0,
  jitterAngle: 0,
  skipChance: 0,
  gemCut: 'brilliant',
  gemTable: 0.52,
  gemCrown: 0.9,
  gemFacets: 8,
  gemSparkle: 0,
  setting: 'none',
  settingColor: '#d4a838',
  settingEffects: [] as Effect[],
} satisfies Partial<RepeatLayer>;

/** A radial array that is off (one copy). */
export const NO_RADIAL = { radialCount: 1, radialRadius: 0.6, radialStart: 0, radialMirror: false } satisfies Partial<Placement>;

/** A texture over the whole band, as Token Maker draws it. */
export function textureLayer(kind: TextureKind = 'marble'): TextureLayer {
  const preset = TEXTURES.find((t) => t.layer.kind === kind)?.layer ?? {};
  return { ...base('Texture'), type: 'texture', kind, from: 0, to: 1, color: '#c9a24a', color2: null, amount: 1, scale: 1, strength: 1, where: 'everywhere', seed: 1, ...preset };
}

export interface TexturePreset {
  id: string;
  name: string;
  description: string;
  /** The texture's settings (a new layer gets the rest from textureLayer). */
  layer: Partial<TextureLayer> & { kind: TextureKind };
  /** A band colour that suits it, used under it in the library and when it is added with a band. */
  band: string;
}

/**
 * The texture library (Add layer → Texture…). The first preset of each kind
 * is that kind's default. Seeds and colours are Token Maker's where a frame
 * uses the texture, so they look as they do there (variations go up to 99999).
 */
export const TEXTURES: TexturePreset[] = [
  { id: 'marble', name: 'Marble', description: 'Soft marbling and flecks on the shaded side, like Stamped and Gilded.', layer: { kind: 'marble', name: 'Marble', color: '#b98a3c', where: 'shaded', seed: 0x5eed }, band: '#b98a3c' },
  { id: 'dark-marble', name: 'Heavy marble', description: 'Marbling all the way round, like Warlock and Arcane.', layer: { kind: 'marble', name: 'Heavy marble', color: '#5a4a6a', amount: 1.4, strength: 1.4, where: 'everywhere', seed: 0xe7e }, band: '#4a3a5a' },
  { id: 'hammered', name: 'Hammered metal', description: 'Dents with a bright fleck on their lit side, like Fighter.', layer: { kind: 'hammered', name: 'Hammered metal', color: '#8a8f99', amount: 0.6, seed: 0x2e3d }, band: '#8a8f99' },
  { id: 'hide', name: 'Hide', description: 'Fine pitting, like Barbarian and Rogue leather.', layer: { kind: 'hammered', name: 'Hide', color: '#6e4a2c', amount: 1.5, scale: 0.45, strength: 0.8, seed: 0x5717 }, band: '#6e4a2c' },
  { id: 'wear', name: 'Battle wear', description: 'Dents and bright scratches, like Fighter and Barbarian.', layer: { kind: 'wear', name: 'Battle wear', color: '#8a8f99', seed: 0xf16 }, band: '#8a8f99' },
  { id: 'wood', name: 'Wood grain', description: 'Wavy grain and knots, like Oak and Druid.', layer: { kind: 'wood', name: 'Wood grain', color: '#7a5230', seed: 0x0a4 }, band: '#7a5230' },
  { id: 'stone', name: 'Stone blocks', description: 'Blocks of varied tone with mortar and pitting, like Cobblestone.', layer: { kind: 'stone', name: 'Stone blocks', color: '#7d7a72', seed: 0x570e }, band: '#7d7a72' },
  { id: 'stars', name: 'Starfield', description: 'Haze and scattered stars, like Starfield.', layer: { kind: 'scatter', name: 'Stars', color: '#ffffff', color2: '#6a5acd', seed: 0x57a2 }, band: '#1a1c3a' },
  { id: 'rope', name: 'Rope', description: 'Twisted strands, like Monk’s cord.', layer: { kind: 'rope', name: 'Rope', color: '#a07a48', seed: 0xbead }, band: '#a07a48' },
  { id: 'scales', name: 'Dragon scales', description: 'Overlapping scales in staggered rows, like Sorcerer.', layer: { kind: 'scales', name: 'Scales', color: '#3f8a5a' }, band: '#3f8a5a' },
  { id: 'cracks', name: 'Magma cracks', description: 'Glowing wandering cracks, like Magma.', layer: { kind: 'cracks', name: 'Magma cracks', color: '#ff5a1a', seed: 0x1a7a }, band: '#2a1e1c' },
  { id: 'veins', name: 'Veined marble', description: 'Stamped’s veins, flecks and marbling, kept to the shaded side.', layer: { kind: 'veins', name: 'Veined marble', color: '#d7671f', where: 'shaded', seed: 0x5eed }, band: '#b5561a' },
  { id: 'brushed', name: 'Brushed metal', description: 'Fine streaks running round the band, like brushed steel.', layer: { kind: 'brushed', name: 'Brushed metal', color: '#9aa0aa', seed: 0xb705 }, band: '#9aa0aa' },
  { id: 'woven', name: 'Basket weave', description: 'Strands woven over and under, like wicker or cloth.', layer: { kind: 'woven', name: 'Basket weave', color: '#c49a5a', seed: 1 }, band: '#7a5a30' },
  { id: 'chainmail', name: 'Chainmail', description: 'Rows of interlinked steel rings.', layer: { kind: 'chainmail', name: 'Chainmail', color: '#a8aeb8', seed: 1 }, band: '#2e3138' },
  { id: 'rust', name: 'Rust', description: 'Patches of rust with pits and specks, on old iron.', layer: { kind: 'rust', name: 'Rust', color: '#8a3b12', seed: 0x2057 }, band: '#5e5a56' },
  { id: 'frost', name: 'Frost', description: 'A cold haze and ice crystals growing in from both edges.', layer: { kind: 'frost', name: 'Frost', color: '#e6f6ff', seed: 0xf205 }, band: '#5a7a9a' },
  { id: 'bark', name: 'Bark', description: 'Deep rough fissures, like an old tree.', layer: { kind: 'bark', name: 'Bark', color: '#6a4a2c', seed: 0xba2c }, band: '#6a4a2c' },
  { id: 'sparkle', name: 'Sparkles', description: 'Twinkling four-pointed sparkles and glints.', layer: { kind: 'sparkle', name: 'Sparkles', color: '#fff6d0', seed: 0x5a2c }, band: '#2a2450' },
  { id: 'gold-sparkle', name: 'Gold dust', description: 'Sparkles on gold, for a fey or royal shimmer.', layer: { kind: 'sparkle', name: 'Gold dust', color: '#fffbe6', amount: 1.6, scale: 0.7, seed: 0x901d }, band: '#c9a24a' },
  { id: 'crackle', name: 'Crackle glaze', description: 'A web of fine cracks, like old porcelain or dried mud.', layer: { kind: 'crackle', name: 'Crackle glaze', color: '#d8cfb8', seed: 0xc4ac }, band: '#d8cfb8' },
  { id: 'knurl', name: 'Knurled grip', description: 'Crossing diagonal grooves, like the grip of a tool.', layer: { kind: 'knurl', name: 'Knurled grip', color: '#8a8f99', seed: 1 }, band: '#8a8f99' },
  // Version 11: natural…
  { id: 'crystal', name: 'Crystal facets', description: 'Flat crystal faces, each tilted its own way and lit by the light, with bright edges.', layer: { kind: 'crystal', name: 'Crystal facets', color: '#8a6ad8', seed: 0xc275 }, band: '#3a2a6a' },
  { id: 'ice-crystal', name: 'Ice crystal', description: 'Pale blue crystal faces, like a ring cut from ice.', layer: { kind: 'crystal', name: 'Ice crystal', color: '#a8d8f0', scale: 0.7, seed: 0x1ce }, band: '#4a7a9a' },
  { id: 'lava', name: 'Molten lava', description: 'Glowing rivers between crusted plates of cooling rock.', layer: { kind: 'lava', name: 'Molten lava', color: '#ff5a1a', color2: '#1a0806', seed: 0x1a7a }, band: '#2a0e08' },
  { id: 'smoke', name: 'Smoke and wisps', description: 'Thin wisps curling along the band over a soft haze.', layer: { kind: 'smoke', name: 'Smoke and wisps', color: '#bfe4ff', color2: '#1a3a5a', seed: 0x5e0c }, band: '#0e1620' },
  { id: 'feathers', name: 'Feathers', description: 'Plumes lying across the band, overlapping like a raven’s wing.', layer: { kind: 'feathers', name: 'Feathers', color: '#6a6e78', seed: 0xfea7 }, band: '#121318' },
  { id: 'filigree', name: 'Filigree scrolls', description: 'Scrolling tendrils that curl into spirals, chased into metal.', layer: { kind: 'filigree', name: 'Filigree scrolls', color: '#c9a24a', seed: 0xf111 }, band: '#c9a24a' },
  { id: 'mottled', name: 'Mottled patina', description: 'Blotches of a second colour with flecks, like old gilding or enamel.', layer: { kind: 'mottled', name: 'Mottled patina', color: '#d9a640', color2: '#fff0b0', seed: 0x307 }, band: '#8a2a14' },
  { id: 'lichen', name: 'Lichen', description: 'Round colonies with crinkled rims, as on old stone.', layer: { kind: 'lichen', name: 'Lichen', color: '#b8b84a', seed: 0x11c4 }, band: '#6a6a66' },
  { id: 'caustics', name: 'Water caustics', description: 'A shimmering net of light, as through rippling water.', layer: { kind: 'caustics', name: 'Water caustics', color: '#d8fbff', seed: 0xca05 }, band: '#1a6a8a' },
  // …and strange.
  { id: 'nebula', name: 'Nebula', description: 'Clouds of two colours in deep space, with stars.', layer: { kind: 'nebula', name: 'Nebula', color: '#d04ab0', color2: '#3a6aff', seed: 0x2eb }, band: '#0a0a1e' },
  { id: 'circuit', name: 'Arcane circuitry', description: 'Glowing traces in lanes along the band, ending in nodes.', layer: { kind: 'circuit', name: 'Arcane circuitry', color: '#5affd0', seed: 0xc1c }, band: '#16222a' },
  { id: 'bubbles', name: 'Bubbles', description: 'Round cells of every size crowded together: foam, spawn, something alive.', layer: { kind: 'bubbles', name: 'Bubbles', color: '#8adf6a', seed: 0xb0b }, band: '#1e3a1a' },
  { id: 'eyes', name: 'Watching eyes', description: 'Eyes of every size, some half shut, watching from the band.', layer: { kind: 'eyes', name: 'Watching eyes', color: '#c8a020', seed: 0xe7e5 }, band: '#3a1a2a' },
];

/** A band fill of a photo texture (version 6), bent round the band and lit like the rest. */
export function photoBand(picture: PictureId): BandFillLayer {
  // Photos whose grain runs up and down are turned to run along the band.
  const angle = picture === 'bark' || picture === 'medieval-wood' ? 90 : 0;
  return { ...bandFillLayer(), name: pictureById(picture)?.name ?? 'Photo texture', paint: { kind: 'picture', picture, scale: 3, angle, bend: true, tint: null, lighting: 0.5 } };
}

/** A texture layer from the library. */
export function textureFromPreset(preset: TexturePreset): TextureLayer {
  return { ...textureLayer(preset.layer.kind), ...preset.layer };
}

/** The band a library texture sits on in its picture, and under it when it is added with a band. */
export function textureBand(preset: TexturePreset): BandFillLayer {
  return { ...bandFillLayer(), name: `${preset.name} band`, paint: { kind: 'lit', color: preset.band, light: 0.75, dark: 0.8, pressed: false, highlight: null } };
}

/** A new shape or path sits at the top of the band, upright, one band width tall. */
export const DEFAULT_PLACEMENT: Placement = { place: 'band', along: 0, across: 0.5, x: 0, y: -0.8, size: 0.8, stretch: 1, rotation: 0, mirror: 'none', ...NO_RADIAL };
const DEFAULT_STYLE: PlacedStyle = { fill: '#5fa8d3', shaded: true, outline: '#1a1008', outlineWidth: 0.06, raised: true, glow: null, faceted: false, facetTable: 0.5, facetDepth: 1, fillPaint: null, paintEach: false };

export function shapeLayer(): ShapeLayer {
  return { ...base('Shape'), type: 'shape', ...DEFAULT_PLACEMENT, ...DEFAULT_STYLE, shape: 'polygon', sides: 6, innerRatio: 0.45, corner: 0, element: 'heart', detail: null, seed: 1 };
}

/** A new path has no points: it is drawn by clicking on the canvas. */
export function pathLayer(points: PathPoint[] = []): PathLayer {
  return { ...base('Path'), type: 'path', ...DEFAULT_PLACEMENT, ...DEFAULT_STYLE, size: 1, points, closed: points.length > 2, stroke: 0, taperStart: 0, taperEnd: 0 };
}

/** An inscription round the top of the band. */
export function textLayer(): TextLayer {
  return {
    ...base('Text'),
    type: 'text',
    text: 'FORTUNE FAVOURS THE BOLD',
    font: 'grenze',
    size: 0.42,
    spacing: 0.08,
    at: 0.5,
    along: 0,
    align: 'centre',
    reverse: false,
    fit: true,
    follow: null,
    fill: '#2a1a0a',
    outline: null,
    outlineWidth: 0.06,
  };
}

/** Three lines round the band, thinner towards the inside. */
export function contoursLayer(): ContoursLayer {
  return { ...base('Contours'), type: 'contours', count: 3, from: 0.12, spacing: 0.12, width: 0.05, taper: 0.4, paint: { kind: 'solid', color: '#2a1a0a' }, altColor: null, dash: 'solid' };
}

/** Organic growth: a ready-made start for each kind (the Kind menu applies these). */
export const GROWTH_PRESETS: Record<GrowthKind, Partial<GrowthLayer>> = {
  vine: { kind: 'vine', count: 1, waveLength: 1.8, amplitude: 0.22, gnarl: 0.1, thickness: 0.08, taper: 0.7, branching: 0.35, branchLength: 0.45, branchAngle: 50, curl: 220, depth: 1, extra: 'leaves', extraSpacing: 0.9, extraSize: 0.6, color: '#3e5a22', extraColor: '#6aa83a' },
  roots: { kind: 'roots', count: 1, waveLength: 0, amplitude: 0, gnarl: 0.6, thickness: 0.11, taper: 0.9, branching: 0.6, branchLength: 0.7, branchAngle: 65, curl: 40, depth: 3, extra: 'none', extraSpacing: 0.6, extraSize: 0.3, color: '#4a3220', extraColor: '#6a4a2c' },
  thorns: { kind: 'thorns', count: 1, waveLength: 2.4, amplitude: 0.12, gnarl: 0.2, thickness: 0.07, taper: 0.8, branching: 0, branchLength: 0.4, branchAngle: 45, curl: 0, depth: 1, extra: 'thorns', extraSpacing: 0.35, extraSize: 0.28, color: '#3a2a1a', extraColor: '#3a2a1a' },
  tendrils: { kind: 'tendrils', count: 2, waveLength: 3, amplitude: 0.25, gnarl: 0.15, thickness: 0.05, taper: 0.9, branching: 0.5, branchLength: 0.7, branchAngle: 40, curl: 420, depth: 1, extra: 'none', extraSpacing: 0.6, extraSize: 0.3, color: '#4a1a66', extraColor: '#7a3aa8' },
  antlers: { kind: 'antlers', count: 6, waveLength: 0, amplitude: 0, gnarl: 0.25, thickness: 0.14, taper: 0.85, branching: 0.6, branchLength: 0.9, branchAngle: 38, curl: 60, depth: 2, extra: 'none', extraSpacing: 0.6, extraSize: 0.3, color: '#d8c8a8', extraColor: '#b8a888' },
};

export function growthLayer(kind: GrowthKind = 'vine'): GrowthLayer {
  return {
    ...base('Growth'),
    type: 'growth',
    follow: null,
    at: 0.5,
    seed: 1,
    ...(GROWTH_PRESETS.vine as Omit<GrowthLayer, keyof ReturnType<typeof base> | 'type' | 'follow' | 'at' | 'seed'>),
    ...GROWTH_PRESETS[kind],
    kind,
  };
}

export function fractureLayer(): FractureLayer {
  return { ...base('Cracks'), type: 'fracture', kind: 'cracks', from: 0, to: 1, count: 6, length: 1.6, branching: 0.5, jagged: 0.5, width: 0.05, color: '#1a1208', seed: 1 };
}

export function cellsLayer(): CellsLayer {
  return { ...base('Plates'), type: 'cells', pattern: 'voronoi', from: 0, to: 1, size: 0.5, gap: 0.04, jitter: 0.8, rounding: 0.2, missing: 0, vary: 0.3, color: '#8a8478', seed: 1 };
}

export function knotworkLayer(): KnotworkLayer {
  return { ...base('Knotwork'), type: 'knotwork', follow: null, at: 0.5, waveLength: 0.9, amplitude: 0.25, width: 0.17, color: '#d4ac52', outline: '#000000', outlineWidth: 0.035, outlineOpacity: 0.6, shine: true, double: false, flip: false };
}

export function gearsLayer(): GearsLayer {
  return { ...base('Gears'), type: 'gears', follow: null, at: 0.5, count: 6, snapToCorners: true, size: 0.8, teeth: 10, toothDepth: 0.22, toothShape: 'square', spokes: 4, hub: 0.3, domed: false, altSize: 1, interlock: false, rotation: 0, offset: 0, color: '#b8862e', shaded: true };
}

export function chainLayer(): ChainLayer {
  return { ...base('Chain'), type: 'chain', follow: null, at: 0.5, linkLength: 0.5, linkWidth: 0.6, thickness: 0.08, color: '#9aa0aa', shaded: true };
}

export function groupLayer(children: Layer[] = []): GroupLayer {
  return { ...base('Group'), type: 'group', children, collapsed: false, combine: 'normal' };
}

/** A cut gem, pointing outwards: a ready-made path. */
export const GEM_POINTS: PathPoint[] = [
  { x: -0.5, y: -0.8, handle: null },
  { x: 0.5, y: -0.8, handle: null },
  { x: 0.9, y: -0.3, handle: null },
  { x: 0, y: 1, handle: null },
  { x: -0.9, y: -0.3, handle: null },
];

export const NEW_LAYER: Record<EditableLayerType, () => Layer> = {
  legacyFrame: () => legacyFrameLayer('stamped'),
  bandFill: bandFillLayer,
  line: lineLayer,
  repeat: repeatLayer,
  texture: () => textureLayer(),
  shape: shapeLayer,
  path: () => pathLayer(),
  text: textLayer,
  contours: contoursLayer,
  growth: () => growthLayer(),
  fracture: fractureLayer,
  cells: cellsLayer,
  knotwork: knotworkLayer,
  gears: gearsLayer,
  chain: chainLayer,
  group: () => groupLayer(),
};

/** What each layer type is called in the interface. */
export const LAYER_TYPE_NAMES: Record<Layer['type'], string> = {
  legacyFrame: 'Token Maker frame',
  bandFill: 'Band fill',
  line: 'Line',
  repeat: 'Repeated shapes',
  texture: 'Texture',
  shape: 'Shape',
  path: 'Path',
  text: 'Text',
  contours: 'Contours',
  growth: 'Growth',
  fracture: 'Cracks and lightning',
  cells: 'Plates and cells',
  knotwork: 'Knotwork',
  gears: 'Gears',
  chain: 'Chain',
  group: 'Group',
  unsupported: 'Unsupported layer',
};

export function createProject(layers: Layer[] = [], name = 'Untitled frame'): FrameProject {
  return { format: PROJECT_FORMAT, schemaVersion: SCHEMA_VERSION, name, stage: { ...DEFAULT_STAGE }, layers };
}

/** A project holding one token-maker frame, as a starting point. */
export function projectFromFrame(presetId: string): FrameProject {
  const layer = legacyFrameLayer(presetId);
  return createProject([layer], layer.name);
}

/** The default highlights colour of a frame, if it has own-coloured details. */
export const defaultAccent = (layer: LegacyFrameLayer) => frameAccent(layer.style);

export interface LayeredTemplate {
  id: string;
  name: string;
  description: string;
  make: () => Layer[];
}

/**
 * Designs built only from editable layers. They show what the layer types
 * can do; they are new designs, not conversions of token-maker frames.
 */
export const LAYERED_TEMPLATES: LayeredTemplate[] = [
  {
    id: 'glowing-runes',
    name: 'Glowing runes',
    description: 'A dark stone band with a glowing line and runes all the way round.',
    make: () => [
      { ...bandFillLayer(), name: 'Dark stone', paint: { kind: 'lit', color: '#2a2c36', light: 0.45, dark: 0.7, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Glow line', at: 0.7, width: 0.035, paint: { kind: 'solid', color: '#a8e4ff' }, glow: '#6fc3ff' },
      {
        ...repeatLayer(),
        name: 'Runes',
        element: 'rune',
        mode: 'spacing',
        spacing: 0.55,
        snapToCorners: false,
        at: 0.36,
        size: 0.34,
        stretch: 0.7,
        fill: '#a8e4ff',
        raised: false,
        glow: '#6fc3ff',
      },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#6a6f7c' } },
    ],
  },
  {
    id: 'battle-steel',
    name: 'Battle-worn steel',
    description: 'Hammered steel with dents and scratches, a pressed-in step and a ring of rivets.',
    make: () => [
      { ...bandFillLayer(), name: 'Steel band', paint: { kind: 'lit', color: '#8a8f99', light: 0.75, dark: 0.8, pressed: false, highlight: null } },
      { ...bandFillLayer(), name: 'Pressed-in step', from: 0.65, to: 1, paint: { kind: 'lit', color: '#8a8f99', light: 0.75, dark: 0.8, pressed: true, highlight: null } },
      { ...textureLayer('hammered'), name: 'Hammered', color: '#8a8f99', amount: 0.6, seed: 0x2e3d },
      { ...textureLayer('wear'), name: 'Battle wear', color: '#8a8f99' },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#e8ecf0' } },
      { ...lineLayer(), name: 'Inner rim', at: 0.99, width: 0.03, paint: { kind: 'solid', color: '#14161a' } },
      { ...repeatLayer(), name: 'Rivets', at: 0.33, size: 0.3, fill: '#9aa0aa' },
    ],
  },
  {
    id: 'night-sky',
    name: 'Night sky',
    description: 'Colours round the ring from dusk to midnight, with stars, haze and a glowing line.',
    make: () => [
      {
        ...bandFillLayer(),
        name: 'Sky',
        paint: {
          kind: 'ring',
          stops: [
            { angle: 0, color: '#1a1a4a' },
            { angle: 90, color: '#0b0d1e' },
            { angle: 180, color: '#3a2a6a' },
            { angle: 225, color: '#6a4a9a' },
            { angle: 270, color: '#3a2a6a' },
          ],
          followLight: true,
        },
      },
      { ...textureLayer('scatter'), name: 'Stars', color: '#ffffff', color2: '#6a5acd', amount: 1.3 },
      { ...lineLayer(), name: 'Glow line', at: 0.75, width: 0.03, paint: { kind: 'solid', color: '#cfc4ff' }, glow: '#8a7aff' },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#b8b0e0' } },
    ],
  },
  // Phase 6: designs made with effects (DESIGN.md §6.4).
  {
    id: 'hellforged-iron',
    name: 'Hellforged iron',
    description: 'Blackened, chipped iron split by burning cracks, with iron spikes round the edge.',
    make: () => [
      { ...repeatLayer(), name: 'Spikes', element: 'spike', count: 16, at: -0.12, size: 0.5, stretch: 0.7, fill: '#7a7a7a', raised: false, snapToCorners: true, effects: [bevel({ profile: 'chisel', size: 0.3, gloss: 0.3 }), material('iron'), shadow({ distance: 0.04, blur: 0.05 })] },
      { ...bandFillLayer(), name: 'Iron band', paint: { kind: 'solid', color: '#7a7a7a' }, effects: styleEffects('blackened-iron') },
      { ...textureLayer('cracks'), name: 'Burning cracks', color: '#ff6a1a', amount: 0.6, clip: 'band', seed: 0x4e11, effects: [glow({ inner: true, color: '#ffe08a', opacity: 0.6, size: 0.03 }), glow({ color: '#ff3a0a', opacity: 0.8, size: 0.12 })] },
      { ...lineLayer(), name: 'Inner rim', at: 0.96, width: 0.07, paint: { kind: 'solid', color: '#7a7a7a' }, effects: [bevel({ size: 0.5, gloss: 0.4 }), material('iron')] },
    ],
  },
  // Phase 7: ornaments anywhere.
  // Phase 9: a shared height map.
  // Phase 8: made only from generators and styles.
  // More to build with (from the Phase 6–7 branch, version 10): new ornaments, textures and wave shapes.
];
