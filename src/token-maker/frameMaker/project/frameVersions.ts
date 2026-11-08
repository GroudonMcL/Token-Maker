// The new versions of Token Maker's frames chosen in the pre-launch frame
// review, in the owner's house style (houseStyle.ts). Each
// is listed in Token Maker as a frame of its own, in its own category
// (frameCategories.ts), with a colour picker per colour slot.

import {
  across,
  adjust,
  bandFillLayer,
  bandShading,
  base,
  bevel,
  blur,
  BRONZE_STOPS,
  contact,
  contoursLayer,
  DROP,
  fractureLayer,
  fromLayers,
  glow,
  glowCracks,
  glowLines,
  goldFx,
  goldPaint,
  growthLayer,
  inscription,
  lin,
  lineLayer,
  metalFx,
  overlay,
  panelWords,
  photo,
  recolour,
  repeatLayer,
  rims,
  ROSE_STOPS,
  shadow,
  shapeLayer,
  SILVER_STOPS,
  slot,
  STEEL_STOPS,
  textLayer,
  textureLayer,
  WARM_GOLD,
  type BandShading,
  type BuiltInFrame,
} from './houseStyle';
import { cellsLayer, chainLayer, gearsLayer, groupLayer, knotworkLayer, NEW_EFFECT } from './defaults';
import { wear } from './styles';
import { categoryOf } from './frameCategories';
import { briarRoses, pictureContact, pictureRepeat, wreathRoses } from './libraryFrames';
import type { ColourSlot } from './colourSlots';
import type { Layer, StageSettings } from './types';

/** A chosen version, as written in the review's candidate files. */
interface Version {
  id: string;
  name: string;
  description: string;
  after: string;
  colours: ColourSlot[];
  stage?: Partial<StageSettings>;
  layers: () => Layer[];
  /** Shaded with gradient bands instead of a bevel over the whole band (houseStyle.ts: bandShading). */
  shading?: BandShading;
}


const INSCRIPTION = 'FATE AND FIRE BEND TO THE WILL OF THE WISE · STARS AND STORM OBEY THE WORD OF THE WISE · ALL THINGS END · ALL THINGS BEGIN ·';
const runes = (color: string, glowColor: string, at = 0.5, size = 0.3): Layer => ({
  ...textLayer(),
  name: 'Runic inscription',
  font: 'runes',
  text: INSCRIPTION,
  size,
  spacing: 0.22,
  at,
  fill: color,
  effects: [glow({ inner: true, color: '#ffffff', opacity: 0.45, size: 0.04 }), glow({ color: glowColor, opacity: 0.85, size: 0.16 })],
});
const silver = lin(['#ffffff', '#8a90a0', '#3a3e4a']);

const WIZARD: Omit<BuiltInFrame, 'group'>[] = [
  {
    id: 'wizard-sapphire',
    name: 'Sapphire runes',
    description: 'A wizard’s sapphire band with runes glowing in its pressed-in step.',
    after: 'wizard',
    colours: [slot('band', 'Frame colour', '#5a8cff', ['Band', 'Pressed-in step']), slot('runes', 'Runes colour', '#4aa8ff', ['Runic inscription'])],
    project: fromLayers('Sapphire runes', () => [...base({ light: '#5a8cff', dark: '#0a1440', step: 0.5 }), runes('#d8f0ff', '#4aa8ff', 0.76, 0.42)]),
  },
  {
    id: 'wizard-starweave',
    name: 'Starweave',
    description: 'Night-sky marble with a faint nebula and stars, silver rims and four gold star sigils.',
    after: 'wizard',
    colours: [slot('band', 'Sky colour', '#3a4ea8', ['Band', 'Texture', 'Nebula', 'Stars']), slot('sigils', 'Sigils colour', '#f0d080', ['Star sigils'])],
    project: fromLayers(
      'Starweave',
      () => [
        ...base({ light: '#3a4ea8', dark: '#070a24', step: null, rims: false }),
        overlay('blue-onyx', 7, 'overlay', 0.55, { angle: 30 }),
        { ...textureLayer('nebula'), name: 'Nebula', color: '#7a5ae0', color2: '#2a6aff', opacity: 0.55, blend: 'screen', seed: 0x2eb },
        { ...textureLayer('sparkle'), name: 'Stars', color: '#f4f0ff', amount: 1.2, scale: 0.6, seed: 0x5a2c },
        { ...lineLayer(), name: 'Silver rim', at: 0.03, width: 0.06, paint: silver, effects: [bevel({ size: 0.6, gloss: 0.9 })] },
        { ...lineLayer(), name: 'Inner silver', at: 0.975, width: 0.05, paint: silver, effects: [bevel({ size: 0.6, gloss: 0.9 })] },
        {
          ...shapeLayer(),
          name: 'Star sigils',
          shape: 'star',
          sides: 8,
          innerRatio: 0.38,
          along: 0.125,
          across: 0.5,
          size: 0.95,
          fill: '#f0d080',
          outline: null,
          raised: false,
          faceted: true,
          facetTable: 0,
          mirror: 'four',
          effects: [...goldFx(0.4), glow({ color: '#ffd870', opacity: 0.45, size: 0.12 })],
        },
      ],
      { bloom: 0.25 },
    ),
  },
  {
    id: 'wizard-ley-lines',
    name: 'Ley lines',
    description: 'A dark band with glowing rings and two rings of glowing runes.',
    after: 'wizard',
    colours: [slot('band', 'Frame colour', '#2a2f6a', ['Band', 'Pressed-in step', 'Texture']), slot('glow', 'Glow colour', '#6a7aff', ['Glowing lines', 'Runes', 'Inner runes'])],
    project: fromLayers(
      'Ley lines',
      () => [
        ...base({ light: '#2a2f6a', dark: '#05061a', step: 0.5 }),
        overlay('black-onyx', 8, 'screen', 0.35, { angle: -40 }),
        glowLines(['#d8e4ff', '#5a4ae0'], '#6a7aff', { width: 0.05, size: 0.14, opacity: 0.9 }),
        { ...repeatLayer(), name: 'Runes', element: 'rune', mode: 'spacing', spacing: 0.5, snapToCorners: false, at: 0.26, size: 0.36, stretch: 0.7, fill: '#d8e8ff', raised: false, shaded: false, effects: [glow({ color: '#6a8aff', opacity: 0.9, size: 0.14 })] },
        { ...repeatLayer(), name: 'Inner runes', element: 'rune', mode: 'spacing', spacing: 0.5, offset: 0.5, snapToCorners: false, at: 0.74, size: 0.3, stretch: 0.7, fill: '#c8b8ff', raised: false, shaded: false, opacity: 0.85, effects: [glow({ color: '#9a6aff', opacity: 0.9, size: 0.14 })] },
      ],
      { bloom: 0.2, bleed: 0.1 },
    ),
  },
  {
    id: 'wizard-grimoire',
    name: 'Gilded grimoire',
    description: 'Rough-gold rims round a sunken lapis enamel channel with a gold runic inscription.',
    after: 'wizard',
    colours: [slot('enamel', 'Enamel colour', '#2a5ad8', ['Lapis enamel']), slot('gold', 'Gold colour', '#ccb47e', ['Outer gold', 'Inner gold', 'Runic inscription'])],
    project: fromLayers('Gilded grimoire', () => [
      { ...bandFillLayer(), name: 'Lapis enamel', paint: photo('blue-onyx', 4, { angle: 120, lighting: 0.2 }), effects: [recolour(['#050a30', '#14308a', '#2a5ad8', '#7aa0ff']), DROP] },
      { ...bandFillLayer(), name: 'Channel depth', from: 0.28, to: 0.72, blend: 'overlay', paint: { kind: 'acrossBand', stops: [{ at: 0, color: '#878787', opacity: 1 }, { at: 1, color: '#404040', opacity: 1 }] }, effects: [bevel({ direction: 'sunken', size: 0.15, gloss: 0.5, soften: 0.02 })] },
      { ...bandFillLayer(), name: 'Outer gold', from: 0, to: 0.3, paint: goldPaint(2.1), effects: [...goldFx(0.3), DROP] },
      { ...bandFillLayer(), name: 'Inner gold', from: 0.7, to: 1, paint: goldPaint(3), effects: [...goldFx(0.3), DROP] },
      { ...runes('#f6dc8a', '#ffcf5a', 0.5, 0.34), effects: [bevel({ size: 0.4, gloss: 0.7 }), glow({ color: '#ffc040', opacity: 0.35, size: 0.08 })] },
    ]),
  },
];

// Helpers the versions below share, by frame.
// engraved
const steel = (scale = 2.4) => photo('hammered-metal', scale, { lighting: 0.4 });
const sunk = bevel({ direction: 'sunken', size: 0.5, gloss: 0.5, soften: 0.01 });

// arcane
const SPELL = 'BY THE LIGHT OF THE FIRST STAR · LET WHAT IS HIDDEN BE SEEN · LET WHAT IS BOUND BE FREE · ';
const glowRunes = (fill: string, glowColor: string, at: number, size: number) => ({
  ...textLayer(),
  name: 'Glowing runes',
  font: 'runes' as const,
  text: SPELL.repeat(2),
  size,
  spacing: 0.22,
  at,
  fill,
  effects: [glow({ inner: true, color: '#ffffff', opacity: 0.5, size: 0.04 }), glow({ color: glowColor, opacity: 0.9, size: 0.16 })],
});

// infernal
const OATH = 'BURN · BREAK · BIND · NONE ESCAPE THE PIT · WHAT IS PROMISED IS OWED · ';
const fireRunes = (fill: string, glowColor: string, at: number, size: number) => ({
  ...textLayer(),
  name: 'Burning runes',
  font: 'runes' as const,
  text: OATH.repeat(3),
  size,
  spacing: 0.22,
  at,
  fill,
  effects: [glow({ inner: true, color: '#fff4c0', opacity: 0.6, size: 0.04 }), glow({ color: glowColor, opacity: 0.9, size: 0.18 })],
});
const IRON = ['#020101', '#0a0808', '#1e1a19', '#4a4240', '#a09088'];

// double
const goldLine = (name: string, at: number, width = 0.11) => ({ ...lineLayer(), name, at, width, paint: goldPaint(1.4), effects: [...goldFx(0.6, WARM_GOLD)] });

// oak
const OAK = ['#140a04', '#4a2a12', '#8a5a32', '#c89060', '#f0d0a0'];

// magma
const hotRing = (name: string, at: number, color = '#ff6a1a') => ({ ...lineLayer(), name, at, width: 0.06, paint: { kind: 'solid' as const, color: '#ffd080' }, effects: [glow({ color, opacity: 1, size: 0.24 }), blur(0.02)] });

// harlequin
// Diamonds that fit inside the piping and meet tip to tip, one at each corner.
const diamonds = (name: string, fill: string, offset: number, effects = [bevel({ size: 0.15, gloss: 0.6, highlightOpacity: 0.4 })]) => ({
  ...repeatLayer(), name, element: 'diamond' as const, mode: 'count' as const, count: 36, offset, snapToCorners: true, at: 0.5, size: 0.8, stretch: 0.88, fill, raised: false, shaded: false, effects,
});
const goldPiping = (name: string, at: number) => ({ ...lineLayer(), name, at, width: 0.09, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) });

// knotwork
const knot = (name: string, color: string, patch = {}) => ({ ...knotworkLayer(), name, width: 0.24, amplitude: 0.28, waveLength: 1.1, color, double: true, shine: false, outlineWidth: 0.025, ...patch });

// bard
const LUTE = ['#140a04', '#4a2a12', '#9a6a3a', '#d8a870', '#f8e0b8'];

// fighter
const fighterSteel = (scale = 2) => photo('hammered-metal', scale, { lighting: 0.4 });

// barbarian
const HIDE = ['#0e0602', '#3a1e0c', '#7a4a26', '#b08050', '#e0c098'];
const hide = (name = 'Hide', stops = HIDE) => ({ ...bandFillLayer(), name, paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [recolour(stops), bevel({ profile: 'rounded', size: 0.45, gloss: 0.15, highlightOpacity: 0.35, soften: 0.04 }), DROP] });

// bard
const goldLines = () => [0.08, 0.92].map((at) => ({ ...lineLayer(), name: 'Gold lines', at, width: 0.06, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) }));

// ranger
const LEATHER = ['#0a0602', '#2a1a0a', '#5a3a1a', '#8a6a40', '#c0a070'];

// rogue
const DARK_LEATHER = ['#020202', '#0e0a08', '#2a2220', '#5a4a44', '#8a7a70'];

// artificer
const brass = (scale = 2) => photo('hammered-metal', scale, { lighting: 0.4 });

// cobblestone
const cobbles = (name = 'Cobbles', patch = {}) => ({ ...bandFillLayer(), name, paint: photo('cobblestone', 1.4, { lighting: 0.7 }), effects: [bevel({ profile: 'rounded', size: 0.3, gloss: 0.15, highlightOpacity: 0.4 }), DROP], ...patch });

// ── Crafted frames ──
const laurelGold = (scale = 0.6) => photo('gold', scale, { lighting: 0.4 });
const laurelLeaves = (name: string, at: number, rotation: number, fill: string, stops: string[], o: { count?: number; offset?: number; size?: number } = {}) => ({
  ...repeatLayer(), name, element: 'leaf' as const, count: o.count ?? 24, snapToCorners: false, at, size: o.size ?? 0.9, stretch: 0.42, rotation, offset: o.offset ?? 0,
  fill, fillPaint: laurelGold(), raised: false, effects: [...metalFx(stops, 0.45, 0.8), contact(0.55)],
});
const IRON_PLATE = ['#040506', '#16191e', '#4a5058', '#8a929c', '#d0d6de'];
const ironPlate = (name: string, stops: string[], picture: 'hammered-metal' | 'metal-plate' | 'rust' = 'hammered-metal') =>
  ({ ...bandFillLayer(), name, paint: photo(picture, 1.4, { lighting: 0.3 }), effects: [recolour(stops), DROP] });
const ironRivets = (name: string, at: number, fill: string, stops: string[], count = 16, size = 0.26) =>
  ({ ...repeatLayer(), name, element: 'bead' as const, count, snapToCorners: false, at, size, fill, raised: true, effects: [...metalFx(stops, 0.6, 0.8), contact(0.7)] });
const runeStone = (name: string, picture: Parameters<typeof photo>[0], scale: number, stops?: string[]) =>
  ({ ...bandFillLayer(), name, paint: photo(picture, scale, { lighting: 0.4 }), effects: [...(stops ? [recolour(stops)] : []), DROP] });
const carvedIn = (o: { size?: number; gloss?: number } = {}) => bevel({ direction: 'sunken', size: o.size ?? 0.5, gloss: o.gloss ?? 0.2 });
const briar = (name: string, color: string, thorn: string, o: { count?: number; thickness?: number; amplitude?: number; waveLength?: number; size?: number; seed?: number } = {}) => ({
  ...growthLayer('thorns'), name, count: o.count ?? 2, thickness: o.thickness ?? 0.09, amplitude: o.amplitude ?? 0.28, waveLength: o.waveLength ?? 1.6,
  extraSize: o.size ?? 0.4, color, extraColor: thorn, seed: o.seed ?? 1,
});
const dragonScales = (name: string, color: string, o: { size?: number; gloss?: number; from?: number; to?: number } = {}) => ({
  ...textureLayer('scales'), name, from: o.from ?? 0, to: o.to ?? 1, color, amount: 1, scale: o.size ?? 1.4, strength: 1 + (o.gloss ?? 0.6) * 0.4, seed: 0xd5a1,
});
const dragonUnder = (color: string) => ({ ...bandFillLayer(), name: 'Under', paint: { kind: 'solid' as const, color }, effects: [DROP] });
const dragonEdge = (name: string, at: number) => ({ ...lineLayer(), name, at, width: 0.06, paint: { kind: 'solid' as const, color: '#d8a838' }, effects: [...metalFx(WARM_GOLD, 0.6, 0.9), contact(0.5)] });
const celestialStars = (count = 24, at = 0.5, size = 0.2) => ({ ...repeatLayer(), name: 'Stars', element: 'star' as const, count, snapToCorners: false, at, size, fill: '#f4f0ff', raised: false, shaded: false, altSizes: [1, 0.6, 0.8], effects: [glow({ color: '#c0d0ff', opacity: 0.7, size: 0.06 })] });
// Round, like a real rope: lit along the top edge and shaded underneath, from gradients rather than a bevel.
const ropeRound = () => ({ ...bandFillLayer(), name: 'Round shading', blend: 'overlay' as const, opacity: 0.8, paint: across(['#000000', '#ffffff', '#808080', '#000000']) });
const ropeStrand = (name: string, color: string, o: { from?: number; to?: number; seed?: number } = {}) => [
  { ...bandFillLayer(), name, from: o.from ?? 0, to: o.to ?? 1, paint: { kind: 'solid' as const, color }, effects: [DROP] },
  { ...textureLayer('rope'), name: name + ' twist', from: o.from ?? 0, to: o.to ?? 1, color, amount: 1, strength: 1.2, seed: o.seed ?? 0xbead },
];
const shieldPlanks = (stops?: string[]) => ({ ...bandFillLayer(), name: 'Planks', from: 0.4, to: 1, paint: photo('wood-planks', 1.6, { angle: 90, lighting: 0.3 }), effects: stops ? [recolour(stops)] : [] });
const plankJoins = () => ({ ...repeatLayer(), name: 'Plank joins', element: 'tick' as const, count: 12, snapToCorners: false, at: 0.7, size: 0.6, stretch: 0.12, fill: '#2a1a0c', raised: false, shaded: false, opacity: 0.8, blend: 'multiply' as const });
const shieldRim = (name: string, stops: string[], picture: 'hammered-metal' | 'metal-plate' = 'hammered-metal') =>
  ({ ...bandFillLayer(), name, to: 0.42, paint: photo(picture, 1, { lighting: 0.3 }), effects: [recolour(stops), DROP] });
const shieldNails = (fill: string, stops: string[], count = 12) => ({ ...repeatLayer(), name: 'Nails', element: 'bead' as const, count, snapToCorners: false, at: 0.21, size: 0.3, fill, raised: true, effects: [...metalFx(stops, 0.6, 0.8), contact(0.7)] });
// Shades the rim and the planks separately, each with its own gradient pair.
const shieldShading = () => [
  { ...bandFillLayer(), name: 'Rim shading', to: 0.42, blend: 'overlay' as const, opacity: 0.7, paint: lin(['#ffffff', '#000000']) },
  { ...bandFillLayer(), name: 'Plank shading', from: 0.42, blend: 'overlay' as const, opacity: 0.6, paint: lin(['#000000', '#ffffff']) },
  { ...lineLayer(), name: 'Crease', at: 0.42, width: 0.03, opacity: 0.6, blend: 'overlay' as const, paint: { kind: 'solid' as const, color: '#190500' } },
];

// ── Crafted borders (Frame Maker starting designs) ──
// border-filigree
/** Two gold bands either side of a channel, shaded with gradients, with filigree chased into them. */
const filigreeBands = (stops: string[], from = 0.3, to = 0.72): Layer[] => [
  { ...bandFillLayer(), name: 'Outer gold', to: from + 0.02, paint: lin(['#ffffff', '#606060']), effects: [recolour(stops), DROP] },
  { ...bandFillLayer(), name: 'Inner gold', from: to - 0.02, paint: lin(['#505050', '#f0f0f0']), effects: [recolour(stops), DROP] },
  { ...textureLayer('filigree'), name: 'Outer filigree', to: from + 0.02, color: '#8a6a30', amount: 0.8, scale: 1.5, strength: 1.2, seed: 0xf11, blend: 'multiply' },
  { ...textureLayer('filigree'), name: 'Inner filigree', from: to - 0.02, color: '#8a6a30', amount: 0.8, scale: 1.5, strength: 1.2, seed: 0xf12, blend: 'multiply' },
];
const enamelChannel = (name: string, light: string, dark: string, from = 0.3, to = 0.72): Layer => ({ ...bandFillLayer(), name, from, to, paint: lin([dark, light]), effects: [DROP] });
// border-guild
/** A metal band shaded with the twin gradients (lit band, reversed pressed-in step), cut into blocks. */
const guildBand = (stops: string[], groove: string, o: { blocks?: boolean } = {}): Layer[] => [
  { ...bandFillLayer(), name: 'Band', paint: lin(['#f8f8f8', '#404040']), effects: [recolour(stops), DROP] },
  { ...bandFillLayer(), name: 'Pressed-in step', from: 0.62, to: 1, paint: lin(['#303030', '#e8e8e8']), effects: [recolour(stops)] },
  { ...lineLayer(), name: 'Crease', at: 0.62, width: 0.04, opacity: 0.6, blend: 'multiply', paint: { kind: 'solid', color: groove } },
  ...(o.blocks === false ? [] : [{ ...repeatLayer(), name: 'Block lines', element: 'tick' as const, count: 36, snapToCorners: false, at: 0.31, size: 0.6, stretch: 0.1, rotation: 20, fill: groove, raised: false, shaded: false, opacity: 0.7, blend: 'multiply' as const }]),
  { ...lineLayer(), name: 'Outer rim (lit)', at: 0.02, width: 0.04, blend: 'overlay', paint: { kind: 'solid', color: '#ffffff' }, opacity: 0.7 },
];
const guildStuds = (fill: string, stops: string[], size = 0.95): Layer => ({ ...repeatLayer(), name: 'Studs', element: 'triangle', count: 4, at: 0.5, size, stretch: 1.1, rotation: 180, fill, raised: false, effects: [bevel({ profile: 'chisel', size: 0.4, depth: 1.4, gloss: 0.8 }), recolour(stops), contact(0.6)] });
// border-raven
const RAVEN_STAGE = { thickness: 0.18, outerSpacing: 0.01 };
/** Feathers laid along the band, two layers deep so they read as plumage rather than lines. */
const plumage = (dark: string, light: string, seed = 0xfea7): Layer[] => [
  { ...textureLayer('feathers'), name: 'Feathers', from: 0.08, to: 0.92, color: dark, amount: 1, scale: 1.3, strength: 1, seed },
  { ...textureLayer('feathers'), name: 'Top feathers', from: 0.12, to: 0.88, color: light, amount: 0.6, scale: 1.1, strength: 0.9, seed: seed + 1, effects: [contact(0.5)] },
];
/** Depth: a grained band, the plumage, then the twin gradient rings (lit band, reversed pressed-in step, crease, rims) over it all. */
const deepPlumage = (light: string, dark: string, feathers: Layer[], extra: Layer[] = []): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Band', paint: lin([light, dark]), effects: [DROP] }, overlay('black-onyx', 4, 'overlay', 0.35), ...feathers, ...extra], { step: 0.55, strength: 0.75 });
const plumeRim = (name: string, at: number, color: string, glowColor: string | null, width = 0.06): Layer => ({
  ...lineLayer(), name, at, width, paint: { kind: 'solid', color }, effects: [...metalFx(['#1e0a04', '#6a3014', color, '#f0b08a', '#fff0e0'], 0.6, 0.9), ...(glowColor ? [glow({ color: glowColor, opacity: 0.5, size: 0.08 })] : [])],
});
// border-ember
const EMBER_STAGE = { thickness: 0.18, outerSpacing: 0.09 };
const emberIron = (light = '#4a4e58', dark = '#020203'): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Black iron', paint: lin([light, dark]), effects: [DROP] }], { step: 0.6 });
const emberGrooves = (color = '#060608'): Layer => ({ ...contoursLayer(), name: 'Grooves', count: 2, from: 0.5, spacing: 0.05, width: 0.03, taper: 0, paint: { kind: 'solid', color }, opacity: 0.8 });
const lavaRing = (from: number, hot: string, deep: string, glowColor: string): Layer[] => [
  { ...bandFillLayer(), name: 'Lava', from, to: 1, paint: lin([hot, deep], 45) },
  { ...textureLayer('lava'), name: 'Molten glass', from, to: 1, color: hot, color2: deep, scale: 2.6, amount: 1.4, seed: 0x1a7a },
  { ...lineLayer(), name: 'Lava glow', at: from + (1 - from) / 2, width: (1 - from) * 0.6, paint: { kind: 'solid', color: hot }, opacity: 0.5, blend: 'screen', effects: [glow({ color: glowColor, opacity: 0.7, size: 0.12 })] },
  { ...lineLayer(), name: 'Lava rim', at: from, width: 0.04, paint: { kind: 'solid', color: '#08080a' }, effects: [contact(0.8)] },
];
// border-storm
const STORM_STAGE = { thickness: 0.2, outerSpacing: 0.03 };
const stormDistort = (amount: number, scale = 0.3, seed = 1) => ({ ...NEW_EFFECT.distort(), amount, scale, seed }) as Layer['effects'][number];
const spinBlur = (amount: number) => ({ kind: 'blur' as const, on: true, mode: 'spin' as const, amount, keepShape: false });
/** The storm, in any three colours, kept inside the band (the group is clipped to it). */
const stormRing = (cloud: string, veil: string, edge: string, wisp: string): Layer => ({
  ...groupLayer([
    { ...lineLayer(), name: 'Dark cloud', at: 0.5, width: 0.9, paint: { kind: 'solid', color: cloud }, opacity: 0.85 },
    { ...lineLayer(), name: 'Veil', at: 0.3, width: 0.1, paint: { kind: 'solid', color: veil }, waveAmplitude: 0.5, waveFit: 4, wavePhase: 0.25, opacity: 0.4 },
    { ...lineLayer(), name: 'Edge light', at: 0.18, width: 0.2, paint: { kind: 'solid', color: edge }, waveAmplitude: 0.08, waveFit: 3, blend: 'screen', opacity: 0.9 },
    { ...lineLayer(), name: 'Edge light', at: 0.82, width: 0.16, paint: { kind: 'solid', color: edge }, waveAmplitude: 0.08, waveFit: 2.5, wavePhase: 0.5, blend: 'screen', opacity: 0.7 },
    { ...lineLayer(), name: 'Veil', at: 0.4, width: 0.12, paint: { kind: 'solid', color: veil }, waveAmplitude: 0.4, waveFit: 3.4, opacity: 0.45 },
    { ...lineLayer(), name: 'Veil', at: 0.6, width: 0.1, paint: { kind: 'solid', color: veil }, waveAmplitude: 0.35, waveFit: 2.6, wavePhase: 0.5, opacity: 0.4 },
    { ...textureLayer('smoke'), name: 'Wisps', from: 0.05, to: 0.95, color: wisp, color2: null, amount: 0.7, strength: 0.7, seed: 0x5e0c, blend: 'screen' },
  ]),
  name: 'Storm',
  clip: 'band',
  effects: [stormDistort(0.12, 2.2, 7), spinBlur(0.3), blur(0.05)],
});
const lightning = (color: string, glowColor: string): Layer => ({
  ...fractureLayer(), kind: 'lightning', name: 'Lightning', from: 0.1, to: 0.9, count: 5, length: 1.4, branching: 0.6, jagged: 0.8, width: 0.025, color, seed: 0x11e7,
  effects: [glow({ color: glowColor, opacity: 0.9, size: 0.1 })],
});
// border-plates
const PLATES_STAGE = { thickness: 0.24, outerSpacing: 0.02 };
const PLATE_IRON = ['#0c0c08', '#34342a', '#66665a', '#a6a69a', '#e8e8e0'];
const plateRing = (stops: string[], picture: 'hammered-metal' | 'metal-plate' = 'hammered-metal'): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Iron ring', paint: photo(picture, 1.4, { lighting: 0.3 }), effects: [recolour(stops), DROP] }], { step: null });
/** Plates laid round the band, kept inside it; a little turn and size variety if `loose`. */
const loosePlates = (name: string, at: number, count: number, size: number, fill: string, stops: string[], o: { loose?: boolean; offset?: number; seed?: number } = {}): Layer => ({
  ...repeatLayer(), name, element: 'square', count, snapToCorners: false, at, size, stretch: 1.5, offset: o.offset ?? 0, fill, shaded: false, raised: false,
  clip: 'band', jitterSize: o.loose ? 0.15 : 0, jitterAngle: o.loose ? 8 : 0, seed: o.seed ?? 11,
  effects: [...metalFx(stops, 0.12, 0.6), contact(0.8)],
});
/** Plates that bend with the ring: one ring of metal with radial gaps cut out of it (a group that subtracts). */
const curvedPlates = (name: string, count: number, fill: string, stops: string[], o: { from?: number; to?: number; gap?: number; offset?: number } = {}): Layer => ({
  ...groupLayer([
    { ...bandFillLayer(), name: 'Plate ring', from: o.from ?? 0.1, to: o.to ?? 0.9, paint: { kind: 'solid', color: fill } },
    { ...repeatLayer(), name: 'Gaps', element: 'square', count, snapToCorners: false, at: ((o.from ?? 0.1) + (o.to ?? 0.9)) / 2, offset: o.offset ?? 0, size: ((o.to ?? 0.9) - (o.from ?? 0.1)) * 1.3, stretch: (o.gap ?? 0.06) / (((o.to ?? 0.9) - (o.from ?? 0.1)) * 1.3), fill: '#000000', raised: false, shaded: false },
  ]),
  name, combine: 'subtract', effects: [...metalFx(stops, 0.12, 0.6), contact(0.8)],
});
const plateRivets = (name: string, at: number, count: number, fill: string, stops: string[], offset = 0): Layer => ({
  ...repeatLayer(), name, element: 'bead', count, snapToCorners: false, at, offset, size: 0.09, fill, raised: true, effects: [...metalFx(stops, 0.6, 0.8), contact(0.7)],
});

// ── Layered designs (Frame Maker starting designs) ──
// layered-brass
const layeredBeads = (name: string, fill: string, effects: Layer['effects'], o: { at?: number; size?: number; count?: number; alt?: string[]; altSizes?: number[] } = {}): Layer =>
  ({ ...repeatLayer(), name, element: 'bead', count: o.count ?? 24, snapToCorners: false, at: o.at ?? 0.78, size: o.size ?? 0.27, fill, altColors: o.alt ?? [], altSizes: o.altSizes ?? [], raised: true, effects: [...effects, contact(0.6)] });
// layered-runes

// layered-jewelled
const setGems = (fill: string, alt: string[], setting: string, settingStops: string[], o: { count?: number; at?: number; size?: number; glowColor?: string } = {}): Layer => ({
  ...repeatLayer(), name: 'Gems', element: 'gem', count: o.count ?? 12, snapToCorners: false, at: o.at ?? 0.5, size: o.size ?? 0.5, fill, altColors: alt, altSizes: [1, 0.75], raised: false,
  gemFacets: 10, gemSparkle: 0.7, setting: 'claws4', settingColor: setting, settingEffects: metalFx(settingStops, 0.3, 0.9),
  effects: [contact(0.7), ...(o.glowColor ? [glow({ color: o.glowColor, opacity: 0.5, size: 0.08 })] : [])],
});
const silverVine = (color: string, leaf: string): Layer => ({ ...growthLayer('vine'), name: 'Vine', count: 1, thickness: 0.035, amplitude: 0.22, waveLength: 1.6, extra: 'leaves', extraSize: 0.3, color, extraColor: leaf, effects: metalFx(SILVER_STOPS, 0.4, 0.8) });
// layered-steel
const battleSteel = (light: string, dark: string, o: { wear?: number; tint?: string } = {}): Layer[] => [
  { ...bandFillLayer(), name: 'Steel band', paint: lin([light, dark]), effects: [DROP] },
  { ...textureLayer('hammered'), name: 'Hammered', color: light, amount: 0.6, seed: 0x2e3d },
  { ...textureLayer('wear'), name: 'Battle wear', color: o.tint ?? light, amount: o.wear ?? 1, seed: 0xf16 },
];
const steelRivets = (fill: string, stops: string[], at = 0.3, count = 16): Layer => ({ ...repeatLayer(), name: 'Rivets', element: 'bead', count, snapToCorners: false, at, size: 0.22, fill, raised: true, effects: [...metalFx(stops, 0.6, 0.8), contact(0.7)] });
// layered-night
const duskGlow = (): Layer => ({
  ...bandFillLayer(), name: 'Dusk', blend: 'overlay', opacity: 0.8,
  paint: { kind: 'ring', stops: [{ angle: 0, color: '#1a1a4a' }, { angle: 90, color: '#0b0d1e' }, { angle: 180, color: '#3a2a6a' }, { angle: 225, color: '#c06aa0' }, { angle: 270, color: '#3a2a6a' }], followLight: true },
});
const nightStars = (count = 30): Layer => ({ ...repeatLayer(), name: 'Stars', element: 'star', count, snapToCorners: false, at: 0.4, size: 0.18, fill: '#fff8f0', altSizes: [1, 0.5, 0.75, 0.4], wander: 0.5, seed: 9, raised: false, shaded: false, effects: [glow({ color: '#c0d0ff', opacity: 0.7, size: 0.06 })] });
// layered-dwarven
const dwarvenBand = (name: string, stops: string[], picture: 'hammered-metal' | 'granite' = 'hammered-metal'): Layer =>
  ({ ...bandFillLayer(), name, paint: photo(picture, 1.4, { lighting: 0.3 }), effects: [recolour(stops), DROP] });
const dwarvenPlates = (fill: string, stops: string[]): Layer => ({ ...repeatLayer(), name: 'Plates', element: 'plate', count: 8, snapToCorners: false, at: 0.5, size: 0.62, fill, raised: false, effects: [...metalFx(stops, 0.2, 0.7), contact(0.7)] });
const dwarvenRivets = (fill: string, stops: string[]): Layer[] => [0.17, 0.83].map((at) => ({ ...repeatLayer(), name: 'Rivets', element: 'bead' as const, count: 8, offset: 0.5, snapToCorners: false, at, size: 0.12, fill, raised: true, effects: [...metalFx(stops, 0.6, 0.8), contact(0.6)] }));
const dwarvenRunes = (fill: string, effects: Layer['effects'], font: 'yugurian' | 'babelstone' = 'yugurian', size = 0.3) => inscription(font, fill, { name: 'Runes', at: 0.5, size, start: 10, effects });

// dragon scales, overlapping rows
/** Overlapping rows of outlined scales, each row offset along the band and clipped to it; each row shades the one beneath. */
const overlapScales = (color: string, outline: string, offsets: number[] = [0, 0.5]): Layer => ({
  ...groupLayer(Array.from({ length: 4 }, (_v, r) => ({
    ...repeatLayer(), name: 'Scale row', element: 'drop' as const, mode: 'spacing' as const, spacing: 0.42, at: 0.2 + (r * 0.6) / 3, size: 0.6,
    rotation: 90, offset: offsets[r % offsets.length], fill: color, clip: 'band' as const, outline, outlineWidth: 0.03, raised: false, shaded: true,
    effects: [shadow({ opacity: 0.75, distance: 0.05, blur: 0.06 })],
  }))),
  name: 'Scales',
});
/** The twin gradient bands, only on the scales (clipped to the layer below). */
const scaleShading = (strength = 0.75): Layer => ({
  ...groupLayer([
    { ...bandFillLayer(), name: 'Shading', paint: lin(['#ffffff', '#000000']) },
    { ...bandFillLayer(), name: 'Pressed-in shading', from: 0.55, paint: lin(['#000000', '#ffffff']) },
    { ...lineLayer(), name: 'Crease', at: 0.55, width: 0.03, paint: { kind: 'solid', color: '#000000' }, opacity: 0.6 },
  ]),
  name: 'Scale shading', blend: 'overlay', opacity: strength, clip: 'below',
});

// ── Layered designs, round 2 ──
// layered-jewelled
/** One cut stone repeated round the band, in its own setting. */
const cutStone = (fill: string, o: { count?: number; at?: number; size?: number; offset?: number; stretch?: number; cut?: 'brilliant' | 'rose' | 'emerald'; setting?: 'claws4' | 'claws6' | 'bezel'; settingColor?: string; settingStops?: string[] } = {}): Layer => ({
  ...repeatLayer(), name: 'Gems', element: 'gem', count: o.count ?? 12, snapToCorners: false, at: o.at ?? 0.5, size: o.size ?? 0.5, offset: o.offset ?? 0, stretch: o.stretch ?? 1, fill, raised: false,
  gemCut: o.cut ?? 'brilliant', gemFacets: 10, gemSparkle: 0.8, setting: o.setting ?? 'claws4', settingColor: o.settingColor ?? '#e4e8f0', settingEffects: metalFx(o.settingStops ?? SILVER_STOPS, 0.3, 0.9), effects: [contact(0.6)],
});
// layered-eldritch
const crystalShards = (fill: string, glowColor: string, count = 12): Layer => ({ ...repeatLayer(), name: 'Crystals', element: 'shard', count, snapToCorners: false, at: 0.5, size: 0.8, fill, altSizes: [1, 0.7, 0.85], jitterAngle: 18, seed: 5, raised: false, effects: [glow({ color: glowColor, opacity: 0.7, size: 0.1 }), contact(0.6)] });
const eldritchStone = (light: string, dark: string): Layer[] => [...base({ light, dark, step: 0.62 }), overlay('black-onyx', 5, 'overlay', 0.5)];
// layered-radiant
const radiantPearls = (at = 0.78, count = 36): Layer => ({ ...repeatLayer(), name: 'Pearls', element: 'bead', count, snapToCorners: false, at, size: 0.14, fill: '#f2eee4', raised: true, effects: [bevel({ profile: 'rounded', size: 0.8, gloss: 1 }), contact(0.5)] });
const radiantGems = (fill: string, settingStops: string[], setting: string, count = 8): Layer => ({ ...repeatLayer(), name: 'Gems', element: 'gem', count, offset: 0.5, snapToCorners: false, at: 0.42, size: 0.48, fill, raised: false, gemFacets: 10, gemSparkle: 0.8, setting: 'claws4', settingColor: setting, settingEffects: metalFx(settingStops, 0.3, 0.9), effects: [contact(0.6)] });
const radiantStars = (fill: string, stops: string[], glowColor: string): Layer => ({ ...repeatLayer(), name: 'Stars', element: 'star', count: 8, snapToCorners: false, at: 0.42, size: 0.62, fill, raised: false, effects: [...metalFx(stops, 0.4, 0.9), glow({ color: glowColor, opacity: 0.6, size: 0.1 })] });
// layered-hellforged
const HELL_IRON = ['#020203', '#0c0d10', '#2a2c32', '#5a5e68', '#a0a6b0'];
const hellIron = (): Layer[] => bandShading([{ ...bandFillLayer(), name: 'Iron band', paint: photo('hammered-metal', 1.4, { lighting: 0.3 }), effects: [recolour(HELL_IRON), DROP] }], { step: 0.66 });
/** Iron spikes round the outside: reaching past the band is the point here. */
const ironSpikes = (): Layer => ({ ...repeatLayer(), name: 'Spikes', element: 'spike', count: 16, at: -0.12, size: 0.5, stretch: 0.7, fill: '#5a5e68', raised: false, snapToCorners: true, effects: [bevel({ profile: 'chisel', size: 0.3, gloss: 0.5 }), recolour(STEEL_STOPS), contact(0.6)] });
// layered-royal
const engravedIn = () => bevel({ direction: 'sunken', size: 0.5, gloss: 0.4 });
const royalLines = (color: string): Layer => ({ ...contoursLayer(), name: 'Contour lines', count: 2, from: 0.06, spacing: 0.88, width: 0.03, taper: 0, paint: { kind: 'solid', color }, effects: [engravedIn()] });
const royalGems = (fill: string, setting: string, stops: string[], count = 10): Layer => ({ ...repeatLayer(), name: 'Gems', element: 'gem', count, snapToCorners: false, at: 0.74, size: 0.4, fill, raised: false, gemFacets: 10, gemSparkle: 0.8, setting: 'claws4', settingColor: setting, settingEffects: metalFx(stops, 0.3, 0.9), effects: [contact(0.6)] });
// layered-plates
const RUNE_IRON = ['#020203', '#0c0d10', '#2a2c32', '#5a5e68', '#a0a6b0'];
const runeRing = (stops: string[] = RUNE_IRON, picture: 'hammered-metal' | 'granite' = 'hammered-metal'): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Band', paint: photo(picture, 1.4, { lighting: 0.3 }), effects: [recolour(stops), DROP] }], { step: null });
/** Eight thick plates that bend with the ring (one ring with radial gaps cut out), lit as metal. */
const runePlates = (fill: string, effects: Layer['effects'], gap = 0.14): Layer => ({
  ...groupLayer([
    { ...bandFillLayer(), name: 'Plate ring', from: 0.1, to: 0.9, paint: { kind: 'solid', color: fill } },
    { ...repeatLayer(), name: 'Gaps', element: 'square', count: 8, snapToCorners: false, at: 0.5, size: 1.04, stretch: gap / 1.04, fill: '#000000', raised: false, shaded: false },
  ]),
  name: 'Plates', combine: 'subtract', effects,
});
/** One rune word in the middle of each plate, small enough to stay off the plate's bevelled edges. */
const plateRunes = (fill: string, effects: Layer['effects'], font: 'babelstone' | 'yugurian' = 'babelstone') => panelWords(font, fill, { size: 0.34, spacing: 0.08, start: 3, effects });

// ── Layered designs, round 3 ──
// layered-moon
const MOON_STAGE = { thickness: 0.18, bloom: 0.2 };
const moonsAndStars = (fill: string, stops: string[], glowColor: string, at = 0.55): Layer[] => [
  { ...repeatLayer(), name: 'Moons', element: 'crescent', count: 8, snapToCorners: false, at, size: 0.6, fill, show: [true, false], raised: false, effects: [...metalFx(stops, 0.4, 0.9), glow({ color: glowColor, opacity: 0.5, size: 0.08 })] },
  { ...repeatLayer(), name: 'Stars', element: 'star', count: 8, snapToCorners: false, at, size: 0.44, fill, show: [false, true], raised: false, effects: [...metalFx(stops, 0.4, 0.9), glow({ color: glowColor, opacity: 0.5, size: 0.08 })] },
];
const scallopEdge = (color: string, stops: string[]): Layer => ({ ...lineLayer(), name: 'Scalloped edge', at: 0.08, width: 0.05, paint: { kind: 'solid', color }, waveAmplitude: 0.06, waveFit: 0.45, waveShape: 'scallop', effects: [...metalFx(stops, 0.5, 0.9), contact(0.5)] });
const sparkles = (seed = 0x5a2c): Layer => ({ ...textureLayer('sparkle'), name: 'Sparkles', color: '#fff6d0', seed, amount: 0.7, scale: 0.7 });
// layered-frost
const FROST_STAGE = { thickness: 0.18, bloom: 0.25 };
const snowflakes = (count = 6, size = 0.6): Layer => ({ ...repeatLayer(), name: 'Snowflakes', element: 'snowflake', count, snapToCorners: false, at: 0.5, size, fill: '#ffffff', raised: false, effects: [...metalFx(SILVER_STOPS, 0.3, 0.9), glow({ color: '#9fd8ff', opacity: 0.6, size: 0.08 })] });
const frostLayer = (): Layer => ({ ...textureLayer('frost'), name: 'Frost', color: '#e6f6ff', opacity: 0.8, seed: 0xf205, blend: 'screen' });
// layered-celtic
const CELTIC_STAGE = { thickness: 0.18 };
const celticKnot = (color: string, stops: string[], o: { at?: number; width?: number } = {}): Layer => ({ ...knotworkLayer(), name: 'Knotwork', at: o.at ?? 0.55, width: o.width ?? 0.16, amplitude: 0.22, waveLength: 0.8, color, outline: '#000000', outlineWidth: 0.03, outlineOpacity: 0.6, shine: true, effects: [recolour(stops), contact(0.6)] });
const battlementEdge = (color: string, stops: string[]): Layer => ({ ...lineLayer(), name: 'Battlements', at: 0.1, width: 0.05, paint: { kind: 'solid', color }, waveAmplitude: 0.05, waveFit: 0.3, waveShape: 'square', effects: [...metalFx(stops, 0.4, 0.8), contact(0.5)] });
// layered-royal2
const ROYAL_STAGE = { thickness: 0.18 };
const goldEdges = (color: string, stops: string[]): Layer[] => [0.06, 0.94].map((at) => ({ ...lineLayer(), name: 'Edges', at, width: 0.1, paint: { kind: 'solid' as const, color }, effects: [...metalFx(stops, 0.5, 0.9), contact(0.5)] }));
const fleursDeLis = (color: string, stops: string[]): Layer => ({ ...repeatLayer(), name: 'Fleurs-de-lis', element: 'fleur', count: 8, snapToCorners: false, at: 0.5, size: 0.66, fill: color, show: [false, true], raised: false, effects: [...goldFx(0.4, stops), contact(0.6)] });
const crownGems = (fill: string, setting: string, stops: string[]): Layer => ({ ...repeatLayer(), name: 'Gems', element: 'gem', count: 8, snapToCorners: false, at: 0.5, size: 0.46, fill, show: [true, false], raised: false, gemFacets: 10, gemSparkle: 0.8, setting: 'claws4', settingColor: setting, settingEffects: metalFx(stops, 0.3, 0.9), effects: [contact(0.6)] });
/** The crown at the top, raised a little so it covers the top gem, and kept inside the band. */
const royalCrown = (fill: string, stops: string[], detail: string): Layer => ({ ...shapeLayer(), name: 'Crown', shape: 'ornament', element: 'crown', across: 0.38, size: 0.95, stretch: 1.3, fill, outline: null, detail, effects: [...goldFx(0.4, stops), contact(0.6)] });
// layered-grim
const GRIM_STAGE = { thickness: 0.18 };
const GRIM_IRON = ['#020203', '#14141a', '#3a3834', '#6a6660', '#a8a49c'];
const BONE_STOPS = ['#2a2418', '#6a5e48', '#c8bca0', '#ece4d0', '#fffcf2'];
const grimIron = (stops = GRIM_IRON): Layer[] => bandShading([
  { ...bandFillLayer(), name: 'Iron', paint: photo('hammered-metal', 1.4, { lighting: 0.3 }), effects: [recolour(stops), DROP] },
  { ...textureLayer('chainmail'), name: 'Chainmail', color: '#8a8e96', from: 0.22, to: 0.78, seed: 1, opacity: 0.8 },
], { step: null });
const grimEmblems = (element: string, fill: string, effects: Layer['effects'], show: boolean[] = [true, false], size = 0.92): Layer => ({ ...repeatLayer(), name: element === 'skull' ? 'Skulls' : 'Emblems', element: element as never, count: 8, snapToCorners: false, at: 0.5, size, fill, show, raised: false, effects });

// ── Themed designs, round 1 ──
// themed-enamel
const ENAMEL_STAGE = { thickness: 0.18 };
/** Gold (or another metal) either side of an enamel channel, each shaded with its own gradient. */
const metalBands = (stops: string[]): Layer[] => [
  { ...bandFillLayer(), name: 'Metal', to: 0.28, paint: lin(['#ffffff', '#505050']), effects: [recolour(stops), DROP] },
  { ...bandFillLayer(), name: 'Metal', from: 0.72, paint: lin(['#404040', '#f0f0f0']), effects: [recolour(stops), DROP] },
];
const enamelBand = (light: string, dark: string, glowColor: string): Layer[] => [
  { ...bandFillLayer(), name: 'Enamel', from: 0.26, to: 0.74, paint: lin([dark, light]), effects: [glow({ inner: true, color: glowColor, opacity: 0.25, size: 0.1 })] },
  { ...lineLayer(), name: 'Enamel edge', at: 0.27, width: 0.03, paint: { kind: 'solid', color: '#000000' }, opacity: 0.4, blend: 'multiply' },
];
const beading = (fill: string, stops: string[]): Layer[] => [0.13, 0.87].map((at) => ({ ...repeatLayer(), name: 'Beading', element: 'bead' as const, mode: 'spacing' as const, spacing: 0.28, snapToCorners: false, at, size: 0.14, fill, raised: false, effects: [...metalFx(stops, 0.6, 0.9)] }));
const setStones = (fill: string, setting: string, stops: string[], cut: 'brilliant' | 'cabochon' = 'brilliant', count = 4): Layer => ({ ...repeatLayer(), name: 'Stones', element: 'gem', count, snapToCorners: false, at: 0.5, size: 0.85, fill, raised: false, gemCut: cut, gemFacets: 10, gemSparkle: 0.8, setting: 'claws4', settingColor: setting, settingEffects: metalFx(stops, 0.3, 0.9), effects: [contact(0.7)] });
// themed-iron
const IRON_RING_STAGE = { thickness: 0.2 };
const WORN_IRON = ['#020203', '#14161a', '#3e4248', '#787e88', '#c0c6ce'];
const wornIron = (stops = WORN_IRON, w = { chips: 0.3, polish: 0.5, grime: 0.45, scratches: 0.6, scale: 0.25 }): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Iron ring', paint: photo('hammered-metal', 1.4, { lighting: 0.3 }), effects: [recolour(stops), wear(w), DROP] }], { step: 0.82 });
const wornRivets = (fill: string, stops: string[], count = 12, at = 0.42, size = 0.3): Layer => ({ ...repeatLayer(), name: 'Rivets', element: 'bead', count, snapToCorners: false, at, size, fill, raised: true, effects: [...metalFx(stops, 0.6, 0.8), contact(0.8)] });
// themed-rose
const ROSE_STAGE = { thickness: 0.18 };
const woodHoop = (stops: string[], picture: 'wood-planks' | 'bark' | 'plane-bark' = 'wood-planks'): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Hoop', from: 0.15, to: 0.85, paint: photo(picture, 1.4, { angle: 90, lighting: 0.3 }), effects: [recolour(stops), DROP] }], { step: null });
const roseVine = (stem: string, leaf: string, o: { extra?: 'leaves' | 'berries' | 'thorns'; seed?: number; count?: number; size?: number } = {}): Layer => ({ ...growthLayer('vine'), name: o.extra === 'berries' ? 'Berries' : 'Vine', count: o.count ?? 2, thickness: 0.05, amplitude: 0.26, waveLength: 2, extra: o.extra ?? 'leaves', extraSize: o.size ?? 0.42, color: stem, extraColor: leaf, seed: o.seed ?? 3, effects: [bevel({ size: 0.4, gloss: 0.3 }), contact(0.6)] });
const roseBlooms = (fill: string, effects: Layer['effects'], count = 4, size = 0.95): Layer => ({ ...repeatLayer(), name: 'Roses', element: 'spiral', count, snapToCorners: false, at: 0.5, size, fill, raised: false, effects });
const HOOP_WOOD = ['#140a04', '#3a2210', '#7a5230', '#b08a60', '#e0c8a0'];
// themed-fey
const FEY_STAGE = { thickness: 0.18, bloom: 0.4 };
const feyTendrils = (color: string, glowColor: string): Layer => ({ ...growthLayer('tendrils'), name: 'Tendrils', count: 2, thickness: 0.035, color, extraColor: '#ffffff', effects: [glow({ color: glowColor, opacity: 0.35, size: 0.1 }), contact(0.5)] });
const dewdrops = (fill: string, glowColor: string, count = 14): Layer => ({ ...repeatLayer(), name: 'Dewdrops', element: 'gem', gemCut: 'cabochon', count, snapToCorners: false, at: 0.5, size: 0.24, fill, raised: false, altSizes: [1, 0.6, 0.8], wander: 0.6, seed: 5, effects: [glow({ color: glowColor, opacity: 0.7, size: 0.1 })] });
const fairyMotes = (fill: string, glowColor: string): Layer => ({ ...repeatLayer(), name: 'Motes', element: 'star', count: 40, snapToCorners: false, at: 0.5, size: 0.1, fill, shaded: false, raised: false, altSizes: [1, 0.5, 0.7], wander: 0.8, skipChance: 0.3, seed: 8, effects: [glow({ color: glowColor, opacity: 0.8, size: 0.06 })] });
// themed-gothic
const GOTHIC_STAGE = { thickness: 0.18, bloom: 0.25 };
const gothicStone = (stops = ['#020202', '#0c0a0c', '#24202a', '#4a4450', '#7a7480']): Layer[] =>
  bandShading([{ ...bandFillLayer(), name: 'Black stone', paint: photo('dark-rock', 1.4), effects: [recolour(stops), DROP] }]);
const gothicBriars = (stem: string, thorn: string, effects: Layer['effects'] = [bevel({ size: 0.5, gloss: 0.5 }), contact(0.8)]): Layer => ({ ...growthLayer('thorns'), name: 'Briars', count: 2, thickness: 0.055, amplitude: 0.28, waveLength: 1.9, extraSize: 0.26, color: stem, extraColor: thorn, effects });
/** Iron spikes round the outside: reaching past the band is the point. */
const gothicSpikes = (): Layer => ({ ...repeatLayer(), name: 'Iron spikes', element: 'spike', count: 12, at: -0.18, size: 0.55, stretch: 0.55, fill: '#5a5e68', raised: false, effects: [bevel({ profile: 'chisel', size: 0.3, gloss: 0.5 }), recolour(STEEL_STOPS), contact(0.7)] });
// themed-tidal
const TIDAL_STAGE = { thickness: 0.2 };
const seaWaves = (swell: string, foam: string): Layer[] => [
  { ...lineLayer(), name: 'Swell', at: 0.42, width: 0.3, paint: { kind: 'solid', color: swell }, waveAmplitude: 0.16, waveFit: 1.3, clip: 'band', opacity: 0.85 },
  { ...lineLayer(), name: 'Foam crests', at: 0.28, width: 0.06, paint: { kind: 'solid', color: foam }, waveAmplitude: 0.16, waveFit: 1.3, wavePhase: 0.1, clip: 'band', effects: [{ kind: 'distort', on: true, amount: 0.05, scale: 0.12, seed: 9 } as never, glow({ color: foam, opacity: 0.4, size: 0.08 })] },
];
const pearlString = (fill = '#f4f0ea'): Layer => ({ ...repeatLayer(), name: 'Pearls', element: 'bead', count: 36, snapToCorners: false, at: 0.9, size: 0.12, fill, raised: true, effects: [bevel({ profile: 'rounded', size: 0.8, gloss: 1 }), contact(0.5)] });

// ── Themed designs, round 2 ──
// themed kit
/** A photo band recoloured and shaded with the twin gradient bands. */
const photoRing = (name: string, picture: Parameters<typeof photo>[0], stops: string[] | null, o: { scale?: number; step?: number | null; angle?: number } = {}): Layer[] =>
  bandShading([{ ...bandFillLayer(), name, paint: photo(picture, o.scale ?? 1.4, { lighting: 0.3, angle: o.angle ?? 0 }), effects: [...(stops ? [recolour(stops)] : []), DROP] }], { step: o.step === undefined ? 0.6 : o.step });
/** Plates that bend with the ring: a ring with radial gaps cut out of it, with any effects. */
const bentPlates = (name: string, count: number, fill: string, effects: Layer['effects'], o: { from?: number; to?: number; gap?: number; offset?: number } = {}): Layer => {
  const from = o.from ?? 0.1, to = o.to ?? 0.9;
  return {
    ...groupLayer([
      { ...bandFillLayer(), name: 'Plate ring', from, to, paint: { kind: 'solid', color: fill } },
      { ...repeatLayer(), name: 'Gaps', element: 'square', count, snapToCorners: false, at: (from + to) / 2, offset: o.offset ?? 0, size: (to - from) * 1.3, stretch: (o.gap ?? 0.08) / ((to - from) * 1.3), fill: '#000000', raised: false, shaded: false },
    ]),
    name, combine: 'subtract', effects,
  };
};
/** A ring of shapes round the band. */
const ringOf = (name: string, element: string, count: number, fill: string, effects: Layer['effects'], o: Record<string, unknown> = {}): Layer =>
  ({ ...repeatLayer(), name, element: element as never, count, snapToCorners: false, at: 0.5, size: 0.5, fill, raised: false, effects, ...o }) as Layer;
/** Forked lightning across the band, glowing. */
const forkedLightning = (color: string, glowColor: string, seed = 0x11e7): Layer => ({
  ...fractureLayer(), kind: 'lightning', name: 'Lightning', from: 0.1, to: 0.9, count: 5, length: 1.4, branching: 0.6, jagged: 0.8, width: 0.025, color, seed, effects: [glow({ color: glowColor, opacity: 0.9, size: 0.1 })],
});
// themed-archmage
const ARCHMAGE_STAGE = { thickness: 0.2, bloom: 0.25 };
const sigilLines = (color: string, stops: string[]): Layer => ({ ...contoursLayer(), name: 'Contour lines', count: 2, from: 0.06, spacing: 0.88, width: 0.035, taper: 0, paint: { kind: 'solid', color }, effects: [...metalFx(stops, 0.5, 0.9)] });
const starSigils = (element: string, fill: string, stops: string[], glowColor: string): Layer => ringOf('Sigils', element, 4, fill, [...goldFx(0.4, stops), glow({ color: glowColor, opacity: 0.6, size: 0.12 })], { size: 0.8 });
// themed-starship
const STARSHIP_STAGE = { thickness: 0.2, bloom: 0.3 };
const hullPlates = (fill: string, stops: string[]): Layer[] => [
  { ...bandFillLayer(), name: 'Under', paint: lin(['#1a1e24', '#020304']), effects: [DROP] },
  bentPlates('Plates', 16, fill, [...metalFx(stops, 0.1, 0.7), contact(0.8)], { from: 0.06, to: 0.94, gap: 0.05 }),
];
const runningLights = (color: string, glowColor: string): Layer => glowLines(['#ffffff', color], glowColor, { count: 2, from: 0.2, spacing: 0.6, width: 0.025, size: 0.1 });
// themed-hellfire
const HELLFIRE_STAGE = { thickness: 0.2, bloom: 0.35, bleed: 0.2 };
const HELL_ROCK = ['#020101', '#140604', '#3a1a10', '#6a3a28', '#9a6a50'];
const flameRing = (fill: string, glowColor: string): Layer => ringOf('Flames', 'flame', 14, fill, [glow({ color: glowColor, opacity: 0.8, size: 0.12 })], { at: 0.55, size: 0.55, altSizes: [1, 0.7, 0.85], shaded: false } as never);
const emberSparks = (color: string): Layer => ({ ...textureLayer('sparkle'), name: 'Embers', color, amount: 0.8, scale: 0.5, seed: 0x5a3c, effects: [glow({ color, opacity: 0.6, size: 0.04 })] });
// themed-frostring
const FROSTRING_STAGE = { thickness: 0.2, bloom: 0.25 };
const iceCrystals = (color: string, stops: string[]): Layer => ({ ...cellsLayer(), name: 'Crystals', pattern: 'hex', size: 0.42, gap: 0.04, rounding: 0.05, vary: 0.25, color, opacity: 0.85, effects: [...metalFx(stops, 0.25, 0.9)] });
const ICE_STOPS = ['#04101c', '#1a4a6a', '#6aa8d0', '#c8ecff', '#ffffff'];
// themed-storm
const STORM_RING_STAGE = { thickness: 0.2, bloom: 0.35 };
const stormClouds = (color: string, color2: string, seed: number): Layer => ({ ...textureLayer('smoke'), name: 'Clouds', color, color2, amount: 1, opacity: 0.9, seed, effects: [blur(0.02)] });
// themed-necro
const NECRO_STAGE = { thickness: 0.2, bloom: 0.25 };
const NECRO_BONE = ['#2a2418', '#6a5e48', '#c8bca0', '#ece4d0', '#fffcf2'];
const bonePlates = (stops = NECRO_BONE): Layer => ({ ...cellsLayer(), name: 'Bone plates', pattern: 'brick', size: 0.6, gap: 0.05, rounding: 0.3, vary: 0.3, color: '#c8bca0', effects: [recolour(stops), bevel({ size: 0.3, gloss: 0.3 }), contact(0.6)] });
const necroChain = (color: string, stops: string[]): Layer => ({ ...chainLayer(), name: 'Chain', at: 0.5, linkLength: 0.45, linkWidth: 0.5, thickness: 0.08, color, effects: [...metalFx(stops, 0.5, 0.7), contact(0.7)] });
const deadRoots = (): Layer => ({ ...growthLayer('roots'), name: 'Roots', count: 2, thickness: 0.045, color: '#2a2016', extraColor: '#2a2016', seed: 6, clip: 'band', effects: [contact(0.7)] });
const graveMist = (color: string): Layer => ({ ...textureLayer('smoke'), name: 'Mist', color, color2: null, opacity: 0.5, blend: 'screen', seed: 0x5e15, effects: [glow({ color, opacity: 0.4, size: 0.08 })] });
const RUST_STOPS = ['#140602', '#4a1a08', '#8a3a14', '#c06a3a', '#e8a070'];
// themed-clockwork
const CLOCK_STAGE = { thickness: 0.2 };
const clockGears = (color: string, stops: string[], o: { count?: number; teeth?: number } = {}): Layer => ({ ...gearsLayer(), name: 'Gears', count: o.count ?? 8, at: 0.5, size: 1.12, teeth: o.teeth ?? 12, spokes: 4, hub: 0.3, altSize: 0.7, interlock: true, color, effects: [...metalFx(stops, 0.15, 0.8), contact(0.6)] });
const clockRivets = (fill: string, stops: string[]): Layer[] => [0.05, 0.95].map((at) => ringOf('Rivets', 'bead', 32, fill, [...metalFx(stops, 0.6, 0.8), contact(0.5)], { at, size: 0.08 } as never));
// themed-celticknot
const KNOT_STAGE = { thickness: 0.2 };
const woveKnot = (color: string, stops: string[], double = false): Layer => ({ ...knotworkLayer(), name: 'Knotwork', at: 0.5, width: 0.16, amplitude: 0.28, waveLength: 0.85, color, outline: '#000000', outlineWidth: 0.03, outlineOpacity: 0.6, shine: true, double, effects: [recolour(stops), contact(0.7)] });
const knotRims = (stops: string[]): Layer[] => [
  { ...bandFillLayer(), name: 'Rims', to: 0.12, paint: lin(['#ffffff', '#505050']), effects: [recolour(stops), DROP] },
  { ...bandFillLayer(), name: 'Rims', from: 0.88, paint: lin(['#404040', '#f0f0f0']), effects: [recolour(stops)] },
];
// themed-dragon
const DRAGON_STAGE = { thickness: 0.2 };
const scaleBand = (color: string, under: string): Layer[] => [
  { ...bandFillLayer(), name: 'Under', paint: { kind: 'solid', color: under }, effects: [DROP] },
  { ...textureLayer('scales'), name: 'Scales', from: 0.08, to: 0.92, color, amount: 1, scale: 1.4, strength: 1.2, seed: 0xd5a1 },
  { ...bandFillLayer(), name: 'Shading', paint: lin(['#ffffff', '#000000']), blend: 'overlay', opacity: 0.6 },
];
const scaleEdges = (color: string, stops: string[]): Layer[] => [0.03, 0.97].map((at) => ({ ...lineLayer(), name: 'Edges', at, width: 0.06, paint: { kind: 'solid' as const, color }, effects: [...metalFx(stops, 0.6, 0.9), contact(0.5)] }));
const dragonEye = (fill: string, glowColor: string): Layer => ringOf('Eye', 'gem', 1, fill, [glow({ color: glowColor, opacity: 0.7, size: 0.12 }), contact(0.6)], { size: 0.5, stretch: 0.6, gemCut: 'cabochon' } as never);
const hornRidge = (fill: string, stops: string[]): Layer => ringOf('Horn ridge', 'tooth', 24, fill, [...goldFx(0.3, stops)], { at: 0.12, size: 0.22, rotation: 180 } as never);
// themed-stones
const STONES_STAGE = { thickness: 0.22 };
/** The ground behind the stones: the twin gradient rings in an earthy colour. */
const groundRings = (color: string): Layer[] => base({ light: color, dark: '#020402', step: 0.55 }).map((l) => (l.name === 'Band' ? { ...l, name: 'Ground' } : l));
/** The stones, their texture and whatever grows on them as one group, with gradient rings laid over the stones only. */
const stoneGroup = (stops: string[], extra: Layer[] = []): Layer[] => [
  { ...groupLayer([...circleStones(stops), ...extra]), name: 'Stones' },
  {
    ...groupLayer([
      { ...bandFillLayer(), name: 'Shading', paint: lin(['#ffffff', '#000000']) },
      { ...bandFillLayer(), name: 'Pressed-in shading', from: 0.55, paint: lin(['#000000', '#ffffff']) },
    ]),
    name: 'Stone shading', blend: 'overlay', opacity: 0.8, clip: 'below',
  },
];
const circleStones = (stops: string[]): Layer[] => [
  bentPlates('Stones', 10, '#8a8680', [recolour(stops), contact(0.8)], { from: 0.08, to: 0.92, gap: 0.16 }),
  { ...bandFillLayer(), name: 'Stone texture', from: 0.08, to: 0.92, paint: photo('granite', 1.2), opacity: 0.6, blend: 'multiply', clip: 'below' },
];
const CIRCLE_STONE = ['#14130f', '#4a4842', '#8a8680', '#c8c4ba', '#f0ece2'];
const stoneMoss = (): Layer => ({ ...bandFillLayer(), name: 'Moss', from: 0.08, to: 0.45, paint: photo('moss', 1), opacity: 0.85, clip: 'below', effects: [{ kind: 'distort', on: true, amount: 0.3, scale: 0.4, seed: 8 } as never] });
const creeper = (leaf: string, extra: 'leaves' | 'berries' = 'leaves'): Layer => ({ ...growthLayer('vine'), name: 'Creeper', count: 1, thickness: 0.03, amplitude: 0.3, waveLength: 2.2, extra, extraSize: 0.36, color: '#2e4a1c', extraColor: leaf, seed: 9, effects: [contact(0.6)] });
// themed-nautical
const NAUTICAL_STAGE = { thickness: 0.22 };
const shipRope = (color: string, from = 0.36, to = 0.64): Layer[] => [
  { ...bandFillLayer(), name: 'Rope', from, to, paint: { kind: 'solid', color }, effects: [contact(0.6)] },
  { ...textureLayer('rope'), name: 'Rope', from, to, color, amount: 1, strength: 1.2, seed: 0xbead },
  { ...bandFillLayer(), name: 'Rope shading', from, to, blend: 'overlay', opacity: 0.8, paint: across(['#000000', '#ffffff', '#808080', '#000000']) },
];
const portholes = (stops: string[]): Layer => ringOf('Portholes', 'circle', 4, '#b5813a', [...metalFx(stops, 0.5, 0.9), contact(0.7)], { size: 0.9, outline: '#2a1a08', outlineWidth: 0.25 } as never);
const doubloons = (): Layer => ringOf('Doubloons', 'bead', 8, '#d8a838', [...goldFx(0.5, WARM_GOLD), contact(0.6)], { size: 0.32, offset: 0.5, stretch: 1 } as never);
const SHIP_WOOD = ['#140a04', '#3a2210', '#7a5230', '#b08a60', '#e0c8a0'];
// themed-autumn
const AUTUMN_STAGE = { thickness: 0.2 };
/** A thick, tumbling scatter like the original's: many leaves in many colours, sizes and angles, alternating sides. */
const autumnLeaves = (element: string, fill: string, alt: string[], effects: Layer['effects'] = [bevel({ size: 0.3, gloss: 0.3 }), contact(0.6)], count = 56): Layer =>
  ringOf('Leaves', element, count, fill, effects, { size: 0.82, stretch: 0.6, altColors: alt, altSizes: [1, 0.7, 0.85, 0.6, 0.95], jitterAngle: 120, jitterSize: 0.45, skipChance: 0.15, alternateSides: 0.14, wander: 0.15, seed: 21 } as never);
const AUTUMN_COLOURS = ['#e88a1a', '#d8b030', '#a02810', '#7a4a1a', '#e0601a', '#b8a020'];
// themed-halo
const HALO_STAGE = { thickness: 0.2, bloom: 0.35 };
const haloRays = (color: string): Layer => ringOf('Rays', 'tick', 72, color, [], { size: 0.85, stretch: 0.1, altSizes: [1, 0.55], opacity: 0.6, blend: 'overlay', shaded: false } as never);
const haloStars = (fill: string, stops: string[], glowColor: string, count = 8): Layer => ringOf('Stars', 'star', count, fill, [...metalFx(stops, 0.4, 0.9), glow({ color: glowColor, opacity: 0.7, size: 0.12 })], { size: 0.55, altSizes: [1, 0.6] } as never);
// themed-desert
const DESERT_STAGE = { thickness: 0.22 };
const SAND_STOPS = ['#2a1e0e', '#6a5434', '#c8a874', '#e8d4a8', '#fff4dc'];
const tombBlocks = (stops = SAND_STOPS): Layer[] => [
  { ...bandFillLayer(), name: 'Mortar', paint: lin(['#4a3a20', '#140e06']), effects: [DROP] },
  bentPlates('Sandstone', 10, '#c8a874', [recolour(stops), contact(0.7)], { from: 0.04, to: 0.96, gap: 0.04 }),
  { ...bandFillLayer(), name: 'Grain', paint: photo('granite', 1.4), opacity: 0.35, blend: 'multiply', clip: 'below' },
];
const lapisInlay = (): Layer[] => [0.12, 0.88].map((at) => ({ ...lineLayer(), name: 'Lapis inlay', at, width: 0.06, paint: { kind: 'solid' as const, color: '#1a3aa0' }, effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.8 })] }));
const tombGlyphs = (fill: string, effects: Layer['effects']) => panelWords('yugurian', fill, { count: 10, size: 0.36, start: 5, effects });
// themed-geode
const GEODE_STAGE = { thickness: 0.22, bloom: 0.15 };
/** A geode: rough stone crust outside, crystal lining within, each with its own shading. */
const geodeBand = (crust: string[], crystal: string, glowColor: string, inward?: string[]): Layer[] => [
  { ...bandFillLayer(), name: 'Crust', paint: photo('dark-rock', 1.2), effects: [recolour(crust), DROP] },
  { ...bandFillLayer(), name: 'Crust shading', to: 0.4, paint: lin(['#ffffff', '#000000']), blend: 'overlay', opacity: 0.6 },
  { ...bandFillLayer(), name: 'Crystal', from: 0.35, paint: lin(['#000000', crystal]), effects: [glow({ inner: true, color: glowColor, opacity: 0.4, size: 0.1 })] },
  { ...textureLayer('crystal'), name: 'Crystal', from: 0.35, color: crystal, opacity: 0.95, seed: 0xc278 },
  ...(inward ? [{ ...bandFillLayer(), name: 'Crystal', from: 0.35, paint: across(inward), blend: 'color' as const, opacity: 0.9 }, { ...bandFillLayer(), name: 'Crystal light', from: 0.35, paint: across(['#000000', '#808080', '#ffffff']), blend: 'soft-light' as const, opacity: 0.8 }] : []),
  { ...textureLayer('sparkle'), name: 'Glitter', from: 0.35, color: '#ffffff', amount: 0.7, scale: 0.4, seed: 0x5a3e },
  { ...bandFillLayer(), name: 'Rind', from: 0.3, to: 0.4, paint: { kind: 'solid', color: '#f0ece4' }, opacity: 0.6, effects: [contact(0.5)] },
];
const GEODE_CRUST = ['#0a0806', '#2a2420', '#5a5048', '#8a8078', '#b8b0a8'];

const VERSIONS: Version[] = [
  // ── stamped ──
  {
    id: 'stamped-veined',
    name: 'Veined stamp',
    description: 'Stamped in a clean two-tone light, with soft veins only on the shaded side.',
    after: 'stamped',
    colours: [slot('band', 'Frame colour', '#ff8a3a', ['Band', 'Pressed-in step', 'Veins'])],
    layers: () => [
      ...base({ light: '#ff8a3a', dark: '#3a1004', step: 0.55, rims: false }),
      { ...textureLayer('veins'), name: 'Veins', color: '#d7671f', where: 'shaded', opacity: 0.7, seed: 0x5eed },
      ...rims(),
    ],
  },
  {
    id: 'stamped-leather',
    name: 'Tooled leather',
    description: 'Dyed leather with a tooled groove and stitching round the inside.',
    after: 'stamped',
    colours: [slot('leather', 'Leather colour', '#a0461c', ['Leather']), slot('stitch', 'Stitching colour', '#f0dcb0', ['Stitching'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Leather', paint: photo('leather', 1.6, { lighting: 0.7 }), effects: [recolour(['#120402', '#4a1a06', '#a0461c', '#d07a40']), bevel({ size: 0.35, gloss: 0.1, highlightOpacity: 0.25, soften: 0.03 }), DROP] },
      { ...lineLayer(), name: 'Tooled groove', at: 0.42, width: 0.05, paint: lin(['#000000', '#000000']), opacity: 0.6, blend: 'multiply', effects: [bevel({ direction: 'sunken', size: 0.6, gloss: 0.2 })] },
      { ...lineLayer(), name: 'Stitching', at: 0.75, width: 0.035, dash: 'dashed', paint: { kind: 'solid', color: '#f0dcb0' }, effects: [contact(0.6)] },
      ...rims(),
    ],
  },
  {
    id: 'stamped-enamel',
    name: 'Brass & enamel',
    description: 'A rounded brass rim with beads outside and a glossy enamel step inside.',
    after: 'stamped',
    colours: [slot('enamel', 'Enamel colour', '#e0601c', ['Enamel']), slot('metal', 'Metal colour', '#ccb47e', ['Brass rim', 'Brass beads'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Enamel', from: 0.45, to: 1, paint: lin(['#ffa060', '#e0601c', '#4a1404']), effects: [bevel({ direction: 'sunken', size: 0.2, gloss: 0.9, highlightOpacity: 0.6, soften: 0.02 }), DROP] },
      { ...bandFillLayer(), name: 'Brass rim', from: 0, to: 0.5, paint: goldPaint(2.1), effects: [...goldFx(0.35), DROP] },
      { ...repeatLayer(), name: 'Brass beads', element: 'bead', mode: 'spacing', spacing: 0.45, snapToCorners: false, at: 0.25, size: 0.26, fill: '#ccb47e', raised: true, effects: [recolour(['#3a2c12', '#8a7444', '#ccb47e', '#f0e4bc', '#fffcf2']), contact(0.5)] },
    ],
  },
  {
    id: 'stamped-ember',
    name: 'Ember stamp',
    description: 'A stamped band whose seam glows like metal fresh from the forge.',
    after: 'stamped',
    stage: { bloom: 0.2 },
    colours: [slot('band', 'Frame colour', '#ff6c08', ['Band', 'Pressed-in step', 'Glowing seam'])],
    layers: () => [
      ...base({ light: '#ffb060', dark: '#2a0a02', step: 0.55, stepLight: '#ff6c08', stepDark: '#3a0e02' }),
      overlay('lava-flow', 6, 'overlay', 0.5, { angle: 20 }),
      { ...lineLayer(), name: 'Glowing seam', at: 0.55, width: 0.03, paint: { kind: 'solid', color: '#ffd080' }, effects: [glow({ color: '#ff6c08', opacity: 0.9, size: 0.16 })] },
    ],
  },
  // ── gilded ──
  {
    id: 'gilded-filigree',
    shading: {},
    name: 'Filigree',
    description: 'Gold chased with scrolling filigree between bright lit rims.',
    after: 'gilded',
    colours: [slot('gold', 'Gold colour', '#c8952e', ['Gold', 'Filigree'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Gold', paint: goldPaint(2.4), effects: [...goldFx(0.3, WARM_GOLD), DROP] },
      { ...textureLayer('filigree'), name: 'Filigree', color: '#5a4416', from: 0.12, to: 0.88, opacity: 0.8, blend: 'multiply', seed: 0xf111 },
      { ...lineLayer(), name: 'Outer bead line', at: 0.08, width: 0.05, paint: lin(['#fffcf2', '#8a7444']), effects: [bevel({ size: 0.6, gloss: 0.8 })] },
      { ...lineLayer(), name: 'Inner bead line', at: 0.92, width: 0.05, paint: lin(['#fffcf2', '#8a7444']), effects: [bevel({ size: 0.6, gloss: 0.8 })] },
    ],
  },
  {
    id: 'gilded-lacquer',
    name: 'Gold on lacquer',
    description: 'Glossy black lacquer with fine gold lines and a dusting of gold leaf.',
    after: 'gilded',
    colours: [slot('lacquer', 'Lacquer colour', '#1a1a20', ['Band']), slot('gold', 'Gold colour', '#e0c070', ['Gold lines', 'Gold leaf'])],
    layers: () => [
      ...base({ light: '#4a4a58', dark: '#050508', step: null, rims: false }),
      { ...textureLayer('sparkle'), name: 'Gold leaf', color: '#e0c070', amount: 1.1, scale: 0.6, seed: 0x901d },
      { ...lineLayer(), name: 'Gold lines', at: 0.14, width: 0.08, paint: lin(['#fff0c0', '#e0c070', '#6a5020']), effects: [bevel({ size: 0.6, gloss: 0.9 }), contact(0.4)] },
      { ...lineLayer(), name: 'Gold lines', at: 0.86, width: 0.08, paint: lin(['#fff0c0', '#e0c070', '#6a5020']), effects: [bevel({ size: 0.6, gloss: 0.9 }), contact(0.4)] },
      ...rims(),
    ],
  },
  // ── engraved ──
  {
    id: 'engraved-scrollwork',
    name: 'Scrollwork steel',
    description: 'Bright steel with engraved scrolls between two polished rims.',
    after: 'engraved',
    colours: [slot('metal', 'Metal colour', '#7a828c', ['Steel', 'Scrolls', 'Outer rim', 'Inner rim'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Steel', paint: steel(), effects: [...metalFx(STEEL_STOPS, 0.3, 0.8), DROP] },
      { ...textureLayer('filigree'), name: 'Scrolls', color: '#20262c', from: 0.15, to: 0.85, opacity: 0.85, blend: 'multiply', seed: 0xf111, effects: [sunk] },
      { ...lineLayer(), name: 'Outer rim', at: 0.06, width: 0.08, paint: lin(['#ffffff', '#7a828c', '#20262c']), effects: [bevel({ size: 0.6, gloss: 0.9 })] },
      { ...lineLayer(), name: 'Inner rim', at: 0.94, width: 0.08, paint: lin(['#ffffff', '#7a828c', '#20262c']), effects: [bevel({ size: 0.6, gloss: 0.9 })] },
    ],
  },
  {
    id: 'engraved-inlay',
    shading: {},
    name: 'Silver inlay',
    description: 'Blackened gunmetal with an inscription in Sith AF inlaid in bright silver.',
    after: 'engraved',
    colours: [slot('metal', 'Metal colour', '#3a4048', ['Gunmetal']), slot('inlay', 'Inlay colour', '#e4e8f0', ['Inlaid inscription', 'Inlay lines'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Gunmetal', paint: steel(2), effects: [...metalFx(['#050608', '#181c22', '#3a4048', '#7a828c', '#c8ced6'], 0.3, 0.7), DROP] },
      { ...lineLayer(), name: 'Inlay lines', at: 0.2, width: 0.035, paint: { kind: 'solid', color: '#e4e8f0' }, effects: [bevel({ size: 0.6, gloss: 0.9 })] },
      { ...lineLayer(), name: 'Inlay lines', at: 0.8, width: 0.035, paint: { kind: 'solid', color: '#e4e8f0' }, effects: [bevel({ size: 0.6, gloss: 0.9 })] },
      inscription('sith', '#e4e8f0', { name: 'Inlaid inscription', size: 0.42, spacing: 0.12, effects: [bevel({ size: 0.5, gloss: 0.9 }), contact(0.4)] }),
      ...rims(),
    ],
  },
  {
    id: 'engraved-damascus',
    name: 'Damascus',
    description: 'Folded steel with flowing light and dark grain and a polished bevel.',
    after: 'engraved',
    colours: [slot('metal', 'Metal colour', '#7a828c', ['Damascus'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Damascus', paint: photo('tiger-rock', 1.4, { angle: 90, lighting: 0.3 }), effects: [adjust({ contrast: 0.8 }), recolour(STEEL_STOPS), bevel({ profile: 'rounded', size: 0.35, gloss: 0.8, highlightOpacity: 0.7, soften: 0.02 }), DROP] },
      ...rims(),
    ],
  },
  {
    id: 'engraved-knotwork',
    shading: {},
    name: 'Etched knotwork',
    description: 'Steel etched with an interlaced knot band in a darker colour.',
    after: 'engraved',
    colours: [slot('metal', 'Metal colour', '#7a828c', ['Steel']), slot('etch', 'Etching colour', '#1a2a3a', ['Etched knot'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Steel', paint: steel(), effects: [...metalFx(STEEL_STOPS, 0.3, 0.8), DROP] },
      { ...knotworkLayer(), name: 'Etched knot', width: 0.22, amplitude: 0.26, waveLength: 1.1, color: '#1a2a3a', outline: '#c8ced6', outlineWidth: 0.02, outlineOpacity: 0.8, shine: false, double: true, opacity: 0.85, effects: [sunk] },
      ...rims(),
    ],
  },
  {
    id: 'engraved-bronze',
    shading: {},
    name: 'Engraved bronze',
    description: 'Warm bronze with a deep-cut Yugurian inscription and a pressed-in step.',
    after: 'engraved',
    colours: [slot('metal', 'Metal colour', '#a87a3a', ['Bronze', 'Pressed-in bronze'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Bronze', paint: steel(2), effects: [...metalFx(BRONZE_STOPS, 0.3, 0.7), DROP] },
      { ...bandFillLayer(), name: 'Pressed-in bronze', from: 0.68, to: 1, paint: lin(['#1e1206', '#e0c08a']), opacity: 0.5, blend: 'soft-light' },
      inscription('yugurian', '#2a1a08', { name: 'Engraving', at: 0.36, size: 0.44, spacing: 0.1, start: 3, effects: [sunk] }),
      { ...lineLayer(), name: 'Crease', at: 0.68, width: 0.03, opacity: 0.55, blend: 'overlay', paint: { kind: 'solid', color: '#190500' } },
      ...rims(),
    ],
  },
  // ── arcane ──
  {
    id: 'arcane-sigil',
    name: 'Sigil band',
    description: 'A deep teal-blue band with runes glowing in its pressed-in step and a glowing seam.',
    after: 'arcane',
    stage: { bloom: 0.2 },
    colours: [slot('band', 'Frame colour', '#2a6a9a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#6fc3ff', ['Glowing runes', 'Glowing seam'])],
    layers: () => [
      ...base({ light: '#2a6a9a', dark: '#04101c', step: 0.5 }),
      { ...lineLayer(), name: 'Glowing seam', at: 0.5, width: 0.025, paint: { kind: 'solid', color: '#d8f4ff' }, effects: [glow({ color: '#6fc3ff', opacity: 0.9, size: 0.12 })] },
      glowRunes('#e0f6ff', '#6fc3ff', 0.75, 0.4),
    ],
  },
  {
    id: 'arcane-crystal',
    shading: {},
    name: 'Arcane crystal',
    description: 'Cracked crystal lit from within, with soft glowing rings.',
    after: 'arcane',
    stage: { bloom: 0.3, bleed: 0.3 },
    colours: [slot('glow', 'Glow colour', '#4a8aff', ['Crystal', 'Tint', 'Glowing cracks', 'Glowing lines'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Crystal', paint: photo('ice', 9, { angle: -70 }), effects: [bevel({ profile: 'chisel', size: 0.45, depth: 1.8, gloss: 0.1, highlightOpacity: 0.4 }), DROP] },
      { ...bandFillLayer(), name: 'Tint', blend: 'overlay', paint: { kind: 'linear', angle: 45, followLight: false, stops: [{ at: 0, color: '#b0c8ff', opacity: 1 }, { at: 1, color: '#2a3ab5', opacity: 1 }] } },
      { ...glowCracks('#dbe0ff', '#4a8aff', '#4a8aff'), opacity: 0.45 },
      glowLines(['#e0e8ff', '#2a4ab5'], '#4a8aff', { width: 0.06 }),
    ],
  },
  {
    id: 'arcane-spellbook',
    name: 'Spellbook',
    description: 'Dark leather between gold rims, with glowing runes tooled into it.',
    after: 'arcane',
    stage: { bloom: 0.15 },
    colours: [slot('leather', 'Leather colour', '#2a3a5a', ['Leather']), slot('gold', 'Gold colour', '#ccb47e', ['Outer gold', 'Inner gold']), slot('glow', 'Glow colour', '#6fc3ff', ['Glowing runes'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Leather', paint: photo('leather', 1.6, { lighting: 0.6 }), effects: [recolour(['#04060c', '#141c2e', '#2a3a5a', '#5a6a8a']), DROP] },
      { ...bandFillLayer(), name: 'Outer gold', to: 0.2, paint: goldPaint(2), effects: goldFx(0.4) },
      { ...bandFillLayer(), name: 'Inner gold', from: 0.8, paint: goldPaint(2), effects: goldFx(0.4) },
      { ...glowRunes('#e0f6ff', '#6fc3ff', 0.5, 0.36), effects: [bevel({ direction: 'sunken', size: 0.4, gloss: 0.3 }), glow({ color: '#6fc3ff', opacity: 0.8, size: 0.12 })] },
    ],
  },
  {
    id: 'arcane-circuitry',
    name: 'Arcane circuitry',
    description: 'Glowing traces running round a dark band and ending in bright nodes.',
    after: 'arcane',
    stage: { bloom: 0.3 },
    colours: [slot('band', 'Frame colour', '#16222a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#5affd0', ['Circuitry', 'Nodes'])],
    layers: () => [
      ...base({ light: '#2a3a48', dark: '#04080a', step: 0.55 }),
      overlay('black-onyx', 8, 'screen', 0.3),
      { ...textureLayer('circuit'), name: 'Circuitry', color: '#5affd0', seed: 0xc1c, effects: [glow({ color: '#5affd0', opacity: 0.7, size: 0.08 }), blur(0.01)] },
      { ...repeatLayer(), name: 'Nodes', element: 'bead', count: 8, at: 0.55, size: 0.22, fill: '#c8fff0', raised: false, shaded: false, effects: [glow({ color: '#5affd0', opacity: 0.9, size: 0.14 })] },
    ],
  },
  // ── infernal ──
  {
    id: 'infernal-hellfire',
    name: 'Hellfire runes',
    description: 'A charcoal-to-crimson band with runes burning in its pressed-in step.',
    after: 'infernal',
    stage: { bloom: 0.25 },
    colours: [slot('band', 'Frame colour', '#8a1a10', ['Band', 'Pressed-in step']), slot('fire', 'Fire colour', '#ff6a1a', ['Burning runes', 'Ember seam'])],
    layers: () => [
      ...base({ light: '#8a1a10', dark: '#0a0202', step: 0.5 }),
      { ...lineLayer(), name: 'Ember seam', at: 0.5, width: 0.025, paint: { kind: 'solid', color: '#ffd080' }, effects: [glow({ color: '#ff6a1a', opacity: 0.9, size: 0.12 })] },
      fireRunes('#ffe8a0', '#ff6a1a', 0.75, 0.4),
    ],
  },
  {
    id: 'infernal-brimstone',
    name: 'Brimstone',
    description: 'Dark volcanic rock split by glowing lava cracks.',
    after: 'infernal',
    stage: { bloom: 0.3, bleed: 0.2 },
    colours: [slot('fire', 'Fire colour', '#ff4a10', ['Glowing cracks', 'Second cracks', 'Glowing lines'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Rock', paint: photo('dark-rock', 3, { lighting: 0.4 }), effects: [adjust({ brightness: -0.35, contrast: 0.3 }), bevel({ profile: 'chisel', size: 0.35, gloss: 0.15, highlightOpacity: 0.25 }), DROP] },
      glowCracks('#1a0804', '#ef1d06', '#ff8a2a'),
      { ...glowCracks('#1a0804', '#ff6a06', '#ffd04a', 1, 0.7), name: 'Second cracks' },
      { ...lineLayer(), name: 'Glowing lines', at: 0.03, width: 0.03, paint: { kind: 'solid', color: '#ffb060' }, effects: [glow({ color: '#ff4a10', opacity: 0.8, size: 0.14 })] },
      { ...lineLayer(), name: 'Glowing lines', at: 0.97, width: 0.03, paint: { kind: 'solid', color: '#ffb060' }, effects: [glow({ color: '#ff4a10', opacity: 0.8, size: 0.14 })] },
    ],
  },
  {
    id: 'infernal-iron',
    name: 'Infernal iron',
    description: 'Blackened, scarred iron with spikes along the outside and a red-hot seam.',
    after: 'infernal',
    stage: { bloom: 0.2 },
    colours: [slot('metal', 'Metal colour', '#3a3230', ['Iron', 'Spikes']), slot('fire', 'Fire colour', '#ff3a10', ['Hot seam'])],
    layers: () => [
      { ...repeatLayer(), name: 'Spikes', element: 'spike', count: 16, at: -0.2, size: 0.95, stretch: 0.45, fill: '#5a5250', raised: false, effects: [...metalFx(IRON, 0.5, 0.6)] },
      { ...bandFillLayer(), name: 'Iron', paint: photo('hammered-metal', 1.6, { lighting: 0.5 }), effects: [wear({ chips: 0.04, polish: 0.4, grime: 0.4, scale: 0.12, scratches: 0.3 }), ...metalFx(IRON, 0.25, 0.5), DROP] },
      { ...lineLayer(), name: 'Hot seam', at: 0.6, width: 0.04, paint: { kind: 'solid', color: '#ffb060' }, effects: [glow({ color: '#ff3a10', opacity: 0.95, size: 0.16 })] },
    ],
  },
  {
    id: 'infernal-blood-pact',
    shading: {},
    name: 'Blood pact',
    description: 'Glossy blood-red enamel between black iron rims, with glowing sigils at the quarters.',
    after: 'infernal',
    stage: { bloom: 0.2 },
    colours: [slot('enamel', 'Enamel colour', '#a01020', ['Enamel']), slot('metal', 'Metal colour', '#3a3230', ['Outer iron', 'Inner iron']), slot('fire', 'Sigil colour', '#ff6a1a', ['Sigils'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Enamel', paint: { kind: 'linear', angle: 45, followLight: false, stops: [{ at: 0, color: '#ff4050', opacity: 1 }, { at: 0.5, color: '#a01020', opacity: 1 }, { at: 1, color: '#200204', opacity: 1 }] }, effects: [bevel({ direction: 'sunken', size: 0.15, gloss: 0.9, highlightOpacity: 0.6, soften: 0.02 }), DROP] },
      { ...bandFillLayer(), name: 'Outer iron', to: 0.22, paint: photo('hammered-metal', 1.6, { lighting: 0.5 }), effects: metalFx(IRON, 0.45, 0.6) },
      { ...bandFillLayer(), name: 'Inner iron', from: 0.78, paint: photo('hammered-metal', 1.6, { lighting: 0.5 }), effects: metalFx(IRON, 0.45, 0.6) },
      { ...shapeLayer(), name: 'Sigils', shape: 'star', sides: 5, innerRatio: 0.38, along: 0.125, across: 0.5, size: 0.75, fill: '#ffd080', outline: null, raised: false, mirror: 'four', effects: [glow({ color: '#ff6a1a', opacity: 0.9, size: 0.16 }), contact(0.5)] },
    ],
  },
  // ── double ──
  {
    id: 'double-gold-enamel',
    name: 'Gold lines on enamel',
    description: 'A glossy coloured band crossed by two gold lines, with gold diamonds at the quarters.',
    after: 'double',
    colours: [slot('band', 'Frame colour', '#1e4a8a', ['Band']), slot('gold', 'Gold colour', '#c8952e', ['Outer line', 'Inner line', 'Diamonds'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Band', paint: lin(['#4a7ad0', '#1e4a8a', '#04102a']), effects: [bevel({ direction: 'sunken', size: 0.12, gloss: 0.9, highlightOpacity: 0.5, soften: 0.02 }), DROP] },
      goldLine('Outer line', 0.12),
      goldLine('Inner line', 0.88),
      { ...shapeLayer(), name: 'Diamonds', shape: 'polygon', sides: 4, along: 0.125, across: 0.5, size: 0.55, stretch: 0.7, fill: '#c8952e', outline: null, raised: false, faceted: true, facetTable: 0.3, mirror: 'four', effects: [recolour(WARM_GOLD), contact(0.5)] },
    ],
  },
  {
    id: 'double-twin-rings',
    name: 'Twin rings',
    description: 'Two separate rounded rings with a gap between them, each in its own colour.',
    after: 'double',
    colours: [slot('outer', 'Outer colour', '#e0a040', ['Outer ring']), slot('inner', 'Inner colour', '#c03a2a', ['Inner ring'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Outer ring', to: 0.44, paint: lin(['#ffd080', '#e0a040', '#3a2004']), effects: [bevel({ size: 0.5, gloss: 0.4, highlightOpacity: 0.5 }), DROP] },
      { ...bandFillLayer(), name: 'Inner ring', from: 0.56, paint: lin(['#ff7a6a', '#c03a2a', '#2a0604']), effects: [bevel({ size: 0.5, gloss: 0.4, highlightOpacity: 0.5 }), DROP] },
    ],
  },
  {
    id: 'double-studded',
    name: 'Studded double',
    description: 'Two polished silver lines with a row of silver studs between them.',
    after: 'double',
    colours: [slot('band', 'Frame colour', '#2a2e38', ['Band']), slot('metal', 'Metal colour', '#a8aeb8', ['Outer line', 'Inner line', 'Studs'])],
    layers: () => [
      ...base({ light: '#4a5060', dark: '#08090c', step: null, rims: false }),
      { ...lineLayer(), name: 'Outer line', at: 0.14, width: 0.08, paint: photo('hammered-metal', 1.4), effects: metalFx(SILVER_STOPS, 0.6, 0.9) },
      { ...lineLayer(), name: 'Inner line', at: 0.86, width: 0.08, paint: photo('hammered-metal', 1.4), effects: metalFx(SILVER_STOPS, 0.6, 0.9) },
      { ...repeatLayer(), name: 'Studs', element: 'bead', mode: 'spacing', spacing: 0.6, snapToCorners: false, at: 0.5, size: 0.3, fill: '#a8aeb8', raised: true, effects: [recolour(SILVER_STOPS), contact(0.6)] },
      ...rims(),
    ],
  },
  {
    id: 'double-fine-lines',
    name: 'Fine lines',
    description: 'A clean two-tone band with two crisp bright lines pressed into it.',
    after: 'double',
    colours: [slot('band', 'Frame colour', '#c9b27a', ['Band', 'Pressed-in step'])],
    layers: () => [
      ...base({ light: '#e8d8a8', dark: '#3a2c14', step: 0.55 }),
      { ...lineLayer(), name: 'Bright line', at: 0.22, width: 0.035, paint: { kind: 'solid', color: '#fff8e8' }, opacity: 0.7, blend: 'overlay', effects: [bevel({ direction: 'sunken', size: 0.6, gloss: 0.4 })] },
      { ...lineLayer(), name: 'Bright line', at: 0.8, width: 0.035, paint: { kind: 'solid', color: '#fff8e8' }, opacity: 0.7, blend: 'overlay', effects: [bevel({ direction: 'sunken', size: 0.6, gloss: 0.4 })] },
    ],
  },
  {
    id: 'double-cord',
    name: 'Cord between gold',
    description: 'A twisted silk cord between two gold lines.',
    after: 'double',
    colours: [slot('cord', 'Cord colour', '#8a1a2a', ['Cord', 'Twist']), slot('gold', 'Gold colour', '#c8952e', ['Outer line', 'Inner line'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Cord', from: 0.18, to: 0.82, paint: lin(['#d04a5a', '#8a1a2a', '#2a0408']), effects: [bevel({ size: 0.9, depth: 1.4, gloss: 0.5 }), DROP] },
      { ...textureLayer('rope'), name: 'Twist', from: 0.18, to: 0.82, color: '#c03a4a', amount: 1, strength: 1.2, seed: 0xbead },
      goldLine('Outer line', 0.1, 0.18),
      goldLine('Inner line', 0.9, 0.18),
    ],
  },
  // ── polished ──
  {
    id: 'polished-titanium',
    name: 'Anodised titanium',
    description: 'Brushed titanium with an anodised sheen shifting round the band.',
    after: 'minimal',
    stage: { bloom: 0.1 },
    colours: [slot('metal', 'Sheen colour', '#5a6aff', ['Titanium', 'Sheen'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Titanium', paint: photo('hammered-metal', 3, { lighting: 0.4 }), effects: [...metalFx(STEEL_STOPS, 0.35, 0.8), DROP] },
      { ...textureLayer('brushed'), name: 'Brushing', color: '#c8ced6', opacity: 0.5, seed: 0xb705 },
      { ...bandFillLayer(), name: 'Sheen', blend: 'color', opacity: 0.7, paint: { kind: 'ring', followLight: false, stops: [{ angle: 0, color: '#3a8aff' }, { angle: 120, color: '#5a6aff' }, { angle: 240, color: '#a04aff' }, { angle: 330, color: '#3a8aff' }] } },
      ...rims(),
    ],
  },
  {
    id: 'polished-pearl',
    name: 'Pearl',
    description: 'Soft glossy pearl with a faint rainbow shimmer.',
    after: 'minimal',
    colours: [slot('band', 'Pearl colour', '#ece6de', ['Band', 'Pressed-in step'])],
    layers: () => [
      ...base({ light: '#ffffff', dark: '#a8a098', step: 0.55, rims: false }),
      { ...bandFillLayer(), name: 'Shimmer', blend: 'soft-light', opacity: 0.6, paint: lin(['#ffc8e8', '#c8f0ff', '#e8ffd0', '#ffe8c0'], 30) },
      { ...lineLayer(), name: 'Gloss', at: 0.25, width: 0.05, paint: { kind: 'solid', color: '#ffffff' }, opacity: 0.6, blend: 'screen', effects: [glow({ color: '#ffffff', opacity: 0.5, size: 0.08 })] },
      ...rims(),
    ],
  },
  {
    id: 'polished-obsidian',
    shading: {},
    name: 'Obsidian',
    description: 'Black volcanic glass polished to a sharp highlight, with a coloured glint.',
    after: 'minimal',
    colours: [slot('band', 'Glint colour', '#4a3a6a', ['Band', 'Glint'])],
    layers: () => [
      ...base({ light: '#4a3a6a', dark: '#020204', step: null, rims: false }),
      { ...bandFillLayer(), name: 'Glass', paint: photo('black-onyx', 6), opacity: 0.6, blend: 'overlay' },
      { ...bandFillLayer(), name: 'Glint', paint: lin(['#ffffff', '#4a3a6a', '#000000'], 45, true), opacity: 0.35, blend: 'screen', effects: [bevel({ profile: 'rounded', size: 0.5, gloss: 1, highlightOpacity: 0.9 })] },
      ...rims(),
    ],
  },
  // ── oak ──
  {
    id: 'oak-varnished',
    shading: {},
    name: 'Varnished oak',
    description: 'Real oak grain under a glossy varnish, with a pressed-in step.',
    after: 'oak',
    colours: [slot('wood', 'Wood colour', '#8a5a32', ['Oak', 'Pressed-in oak'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Oak', paint: photo('wood-planks', 1.4, { angle: 90, lighting: 0.4 }), effects: [recolour(OAK), bevel({ size: 0.35, gloss: 0.7, highlightOpacity: 0.6, soften: 0.02 }), DROP] },
      { ...bandFillLayer(), name: 'Pressed-in oak', from: 0.55, to: 1, paint: lin(['#140a04', '#c89060']), opacity: 0.45, blend: 'soft-light' },
      { ...lineLayer(), name: 'Crease', at: 0.55, width: 0.03, opacity: 0.55, blend: 'overlay', paint: { kind: 'solid', color: '#190500' } },
      ...rims(),
    ],
  },
  {
    id: 'oak-brass-bound',
    name: 'Brass-bound oak',
    description: 'Oak bound by two brass bands and studded with brass nails, like an old sea chest.',
    after: 'oak',
    colours: [slot('wood', 'Wood colour', '#8a5a32', ['Oak']), slot('metal', 'Metal colour', '#a87a3a', ['Outer brass', 'Inner brass', 'Nails'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Oak', paint: photo('medieval-wood', 1.6, { angle: 90, lighting: 0.5 }), effects: [recolour(OAK), DROP] },
      { ...bandFillLayer(), name: 'Outer brass', to: 0.2, paint: photo('hammered-metal', 1.4), effects: metalFx(BRONZE_STOPS, 0.5, 0.8) },
      { ...bandFillLayer(), name: 'Inner brass', from: 0.8, paint: photo('hammered-metal', 1.4), effects: metalFx(BRONZE_STOPS, 0.5, 0.8) },
      { ...repeatLayer(), name: 'Nails', element: 'bead', count: 12, at: 0.5, size: 0.24, fill: '#a87a3a', raised: true, effects: [recolour(BRONZE_STOPS), contact(0.6)] },
    ],
  },
  {
    id: 'oak-rune-carved',
    shading: {},
    name: 'Rune-carved oak',
    description: 'Dark oak with a BabelStone runic inscription carved deep into it.',
    after: 'oak',
    colours: [slot('wood', 'Wood colour', '#6a4024', ['Oak'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Oak', paint: photo('medieval-wood', 1.6, { angle: 90, lighting: 0.5 }), effects: [recolour(['#0a0402', '#2a160a', '#6a4024', '#a87850', '#e0c098']), bevel({ size: 0.3, gloss: 0.3 }), DROP] },
      inscription('babelstone', '#1a0c04', { name: 'Carved runes', size: 0.46, spacing: 0.18, effects: [bevel({ direction: 'sunken', size: 0.6, gloss: 0.2, highlightOpacity: 0.5 })] }),
      ...rims(),
    ],
  },
  {
    id: 'oak-living-bark',
    shading: {},
    name: 'Living bark',
    description: 'Rough tree bark with patches of moss growing over it.',
    after: 'oak',
    colours: [slot('bark', 'Bark colour', '#56473c', ['Bark']), slot('moss', 'Moss colour', '#6a8a2a', ['Moss'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Bark', paint: photo('plane-bark', 2, { angle: 90, lighting: 0.6 }), effects: [bevel({ profile: 'rounded', size: 0.45, gloss: 0.1, highlightOpacity: 0.4 }), DROP] },
      { ...textureLayer('lichen'), name: 'Moss', color: '#6a8a2a', amount: 1.3, opacity: 0.9, seed: 0x11c4 },
    ],
  },
  // ── magma ──
  {
    id: 'magma-crust',
    name: 'Cooling crust',
    description: 'Dark plates of cooled rock on bright molten lava glowing through every gap.',
    after: 'magma',
    stage: { bloom: 0.3, bleed: 0.2 },
    colours: [slot('fire', 'Lava colour', '#ff6a1a', ['Molten lava']), slot('rock', 'Crust colour', '#2a1e1c', ['Crust'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Molten lava', paint: lin(['#ffe080', '#ff6a1a', '#a01a02']), effects: [glow({ color: '#ff6a1a', opacity: 0.6, size: 0.14 }), DROP] },
      { ...cellsLayer(), name: 'Crust', pattern: 'voronoi', size: 0.55, gap: 0.06, jitter: 0.9, rounding: 0.35, vary: 0.3, color: '#2a1e1c', effects: [bevel({ profile: 'rounded', size: 0.25, gloss: 0.2, surface: 'cracked', surfaceDepth: 0.5, highlightOpacity: 0.3 })] },
    ],
  },
  {
    id: 'magma-obsidian-fire',
    name: 'Obsidian & fire',
    description: 'Black volcanic glass with fire glowing along both edges.',
    after: 'magma',
    stage: { bloom: 0.3 },
    colours: [slot('glass', 'Glass colour', '#1a1416', ['Band']), slot('fire', 'Fire colour', '#ff6a1a', ['Outer fire', 'Inner fire'])],
    layers: () => [
      ...base({ light: '#4a3a3e', dark: '#020102', step: null, rims: false }),
      overlay('black-onyx', 6, 'overlay', 0.7),
      hotRing('Outer fire', 0.05),
      hotRing('Inner fire', 0.95),
    ],
  },
  {
    id: 'magma-embers',
    shading: {},
    name: 'Ember streaks',
    description: 'Streaks of embers round the band, with sparks drifting off them.',
    after: 'magma',
    stage: { bloom: 0.25 },
    colours: [slot('fire', 'Ember colour', '#ff6a1a', ['Embers', 'Sparks'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Embers', paint: photo('molten-rock', 2, { angle: 90 }), effects: [adjust({ contrast: 0.3 }), bevel({ size: 0.3, gloss: 0.3, highlightOpacity: 0.3 }), DROP] },
      { ...textureLayer('sparkle'), name: 'Sparks', color: '#ffc060', amount: 0.5, scale: 0.5, seed: 0x5a2d, effects: [glow({ color: '#ff6a1a', opacity: 0.7, size: 0.06 })] },
    ],
  },
  {
    id: 'magma-script',
    name: 'Volcanic script',
    description: 'Dark basalt with a Sith AF inscription glowing like magma between two hot seams.',
    after: 'magma',
    stage: { bloom: 0.25 },
    colours: [slot('rock', 'Rock colour', '#211c17', ['Basalt']), slot('fire', 'Fire colour', '#ff5a10', ['Glowing script', 'Outer seam', 'Inner seam'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Basalt', paint: photo('dark-rock', 2.4, { lighting: 0.5 }), effects: [adjust({ brightness: -0.2 }), bevel({ profile: 'chisel', size: 0.3, gloss: 0.2, highlightOpacity: 0.3 }), DROP] },
      inscription('sith', '#ffe0a0', { name: 'Glowing script', size: 0.44, start: 2, effects: [glow({ inner: true, color: '#fff4c0', opacity: 0.6, size: 0.04 }), glow({ color: '#ff5a10', opacity: 0.9, size: 0.18 })] }),
      hotRing('Outer seam', 0.08, '#ff5a10'),
      hotRing('Inner seam', 0.92, '#ff5a10'),
    ],
  },
  // ── harlequin ──
  {
    id: 'harlequin-jester',
    name: 'Jester’s diamonds',
    description: 'Glossy diamonds in two colours with gold piping along both edges.',
    after: 'harlequin',
    colours: [slot('first', 'First colour', '#8c2f4a', ['Band', 'Dark diamonds']), slot('second', 'Second colour', '#e8c050', ['Light diamonds']), slot('trim', 'Trim colour', '#c8952e', ['Outer piping', 'Inner piping'])],
    layers: () => [
      ...base({ light: '#d04a6a', dark: '#3a0a18', step: null, rims: false }),
      diamonds('Light diamonds', '#e8c050', 0.5),
      goldPiping('Outer piping', 0.04),
      goldPiping('Inner piping', 0.96),
    ],
  },
  {
    id: 'harlequin-velvet',
    shading: {},
    name: 'Velvet harlequin',
    description: 'Patterned velvet with a satin sheen and gold cord edges.',
    after: 'harlequin',
    colours: [slot('velvet', 'Velvet colour', '#930320', ['Velvet']), slot('trim', 'Trim colour', '#c8952e', ['Outer piping', 'Inner piping'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Velvet', paint: photo('jacquard', 1.2, { lighting: 0.6 }), effects: [bevel({ size: 0.5, gloss: 0.2, highlightOpacity: 0.35 }), DROP] },
      { ...diamonds('Sheen', '#ffffff', 0.5, []), opacity: 0.12, blend: 'screen' },
      goldPiping('Outer piping', 0.04),
      goldPiping('Inner piping', 0.96),
    ],
  },
  {
    id: 'harlequin-checker',
    name: 'Checkered enamel',
    description: 'A two-colour chequerboard in glossy enamel between rims.',
    after: 'harlequin',
    colours: [slot('first', 'First colour', '#1a1a1a', ['Band']), slot('second', 'Second colour', '#f0ece4', ['Squares'])],
    layers: () => [
      ...base({ light: '#4a4a4a', dark: '#050505', step: null, rims: false }),
      { ...repeatLayer(), name: 'Squares', element: 'square', mode: 'count', count: 24, snapToCorners: true, at: 0.25, size: 0.56, stretch: 1.3, fill: '#f0ece4', raised: false, shaded: false, clip: 'band', effects: [bevel({ size: 0.1, gloss: 0.8, highlightOpacity: 0.4 })] },
      { ...repeatLayer(), name: 'Squares', element: 'square', mode: 'count', count: 24, snapToCorners: true, offset: 0.5, at: 0.75, size: 0.56, stretch: 1.3, fill: '#f0ece4', raised: false, shaded: false, clip: 'band', effects: [bevel({ size: 0.1, gloss: 0.8, highlightOpacity: 0.4 })] },
      ...rims(),
    ],
  },
  {
    id: 'harlequin-stained-glass',
    name: 'Stained glass',
    description: 'Pieces of coloured glass in dark leading, glowing softly.',
    after: 'harlequin',
    stage: { bloom: 0.2 },
    colours: [slot('glass', 'Glass colour', '#3a6ad0', ['Glass']), slot('lead', 'Leading colour', '#1a1a1e', ['Leading'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Leading', paint: lin(['#4a4a50', '#1a1a1e', '#050505']), effects: [DROP] },
      { ...cellsLayer(), name: 'Glass', pattern: 'voronoi', size: 0.55, gap: 0.07, jitter: 0.9, rounding: 0.1, vary: 0.9, color: '#3a6ad0', effects: [bevel({ size: 0.15, gloss: 0.9, highlightOpacity: 0.5 }), glow({ inner: true, color: '#ffffff', opacity: 0.25, size: 0.1 })] },
    ],
  },
  {
    id: 'harlequin-carnival',
    name: 'Carnival',
    description: 'Bright harlequin diamonds with little gold bells at the points.',
    after: 'harlequin',
    colours: [slot('first', 'First colour', '#2a6ad0', ['Band']), slot('second', 'Second colour', '#e03a3a', ['Light diamonds']), slot('bells', 'Bell colour', '#c8952e', ['Bells'])],
    layers: () => [
      ...base({ light: '#5a9aff', dark: '#0a1a50', step: null, rims: false }),
      diamonds('Light diamonds', '#e03a3a', 0.5),
      { ...repeatLayer(), name: 'Bells', element: 'bead', mode: 'spacing', spacing: 1.2, snapToCorners: false, at: 0.5, size: 0.28, fill: '#c8952e', raised: true, effects: [recolour(WARM_GOLD), contact(0.6)] },
      ...rims(),
    ],
  },
  // ── knotwork ──
  {
    id: 'knotwork-celtic-gold',
    shading: {},
    name: 'Celtic gold',
    description: 'Gold knotwork woven over and under on green enamel, between gold rims.',
    after: 'knotwork',
    colours: [slot('enamel', 'Enamel colour', '#1e5a34', ['Enamel']), slot('gold', 'Gold colour', '#c8952e', ['Gold knot', 'Outer rim', 'Inner rim'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Enamel', paint: lin(['#3a8a5a', '#1e5a34', '#04140a']), effects: [bevel({ direction: 'sunken', size: 0.1, gloss: 0.9, highlightOpacity: 0.4 }), DROP] },
      { ...knot('Gold knot', '#c8952e'), effects: [...goldFx(0.4, WARM_GOLD)] },
      { ...lineLayer(), name: 'Outer rim', at: 0.03, width: 0.06, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) },
      { ...lineLayer(), name: 'Inner rim', at: 0.97, width: 0.06, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) },
    ],
  },
  {
    id: 'knotwork-silver',
    name: 'Silver on black',
    description: 'Bright silver knotwork on glossy black.',
    after: 'knotwork',
    colours: [slot('band', 'Band colour', '#1a1a20', ['Band']), slot('metal', 'Metal colour', '#a8aeb8', ['Silver knot'])],
    layers: () => [
      ...base({ light: '#4a4a58', dark: '#050508', step: null, rims: false }),
      { ...knot('Silver knot', '#c8ccd4'), effects: metalFx(SILVER_STOPS, 0.4, 0.9) },
      ...rims(),
    ],
  },
  {
    id: 'knotwork-carved-stone',
    shading: {},
    name: 'Carved stone knot',
    description: 'Knotwork carved into weathered stone, with BabelStone runes along the inner edge.',
    after: 'knotwork',
    colours: [slot('stone', 'Stone colour', '#908372', ['Stone'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Stone', paint: photo('coral-stone', 1.6, { lighting: 0.6 }), effects: [bevel({ profile: 'chisel', size: 0.2, gloss: 0.1, highlightOpacity: 0.4 }), DROP] },
      { ...knot('Carved knot', '#5a5044', { at: 0.42, width: 0.2, amplitude: 0.22, outline: null }), opacity: 0.8, blend: 'multiply', effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.1, highlightOpacity: 0.5 })] },
      inscription('babelstone', '#3a3228', { name: 'Carved runes', at: 0.86, size: 0.2, spacing: 0.2, effects: [bevel({ direction: 'sunken', size: 0.6, gloss: 0.1 })] }),
    ],
  },
  {
    id: 'knotwork-leather',
    name: 'Braided leather',
    description: 'Tan leather strips braided over dark leather, with stitched edges.',
    after: 'knotwork',
    colours: [slot('leather', 'Leather colour', '#3a1e0e', ['Leather']), slot('braid', 'Braid colour', '#b07040', ['Braid', 'Stitching'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Leather', paint: photo('leather', 1.6, { lighting: 0.6 }), effects: [recolour(['#0a0402', '#1e0e06', '#3a1e0e', '#6a3e22']), DROP] },
      { ...knot('Braid', '#b07040'), effects: [bevel({ size: 0.5, gloss: 0.3, highlightOpacity: 0.5 }), contact(0.5)] },
      { ...lineLayer(), name: 'Stitching', at: 0.07, width: 0.03, dash: 'dashed', paint: { kind: 'solid', color: '#b07040' } },
      { ...lineLayer(), name: 'Stitching', at: 0.93, width: 0.03, dash: 'dashed', paint: { kind: 'solid', color: '#b07040' } },
    ],
  },
  {
    id: 'knotwork-fey',
    name: 'Fey knot',
    description: 'A glowing knot of light woven through a dark band.',
    after: 'knotwork',
    stage: { bloom: 0.3 },
    colours: [slot('band', 'Band colour', '#141a2a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#6affd8', ['Glowing knot'])],
    layers: () => [
      ...base({ light: '#2a3448', dark: '#020306', step: 0.55 }),
      { ...knot('Glowing knot', '#d8fff4', { outline: null, width: 0.16 }), effects: [glow({ color: '#6affd8', opacity: 0.9, size: 0.16 })] },
    ],
  },
  // ── starfield ──
  {
    id: 'starfield-deep-space',
    name: 'Deep space',
    description: 'A violet nebula drifting through stars, between thin silver rims.',
    after: 'starfield',
    stage: { bloom: 0.2 },
    colours: [slot('sky', 'Sky colour', '#2a1a5a', ['Band']), slot('nebula', 'Nebula colour', '#d04ab0', ['Nebula'])],
    layers: () => [
      ...base({ light: '#3a2a7a', dark: '#04020e', step: null, rims: false }),
      { ...textureLayer('nebula'), name: 'Nebula', color: '#d04ab0', color2: '#3a6aff', opacity: 0.8, blend: 'screen', seed: 0x2ec },
      { ...textureLayer('sparkle'), name: 'Stars', color: '#ffffff', amount: 1.4, scale: 0.5, seed: 0x5a2e },
      { ...lineLayer(), name: 'Silver rim', at: 0.025, width: 0.05, paint: silver, effects: [bevel({ size: 0.6, gloss: 0.9 })] },
      { ...lineLayer(), name: 'Silver rim', at: 0.975, width: 0.05, paint: silver, effects: [bevel({ size: 0.6, gloss: 0.9 })] },
    ],
  },
  {
    id: 'starfield-star-chart',
    name: 'Star chart',
    description: 'A navigator\'s star chart with gold rings and an Outer Rim AF inscription.',
    after: 'starfield',
    colours: [slot('sky', 'Chart colour', '#0e1a40', ['Band', 'Stars']), slot('ink', 'Ink colour', '#e8c878', ['Chart rings', 'Chart script', 'Compass points'])],
    layers: () => [
      ...base({ light: '#2a3a7a', dark: '#02040e', step: null, rims: false }),
      { ...textureLayer('sparkle'), name: 'Stars', color: '#c8d8ff', amount: 0.8, scale: 0.4, seed: 0x5a2f },
      { ...lineLayer(), name: 'Chart rings', at: 0.12, width: 0.025, paint: { kind: 'solid', color: '#e8c878' } },
      { ...lineLayer(), name: 'Chart rings', at: 0.88, width: 0.025, paint: { kind: 'solid', color: '#e8c878' } },
      inscription('outerRim', '#e8c878', { name: 'Chart script', size: 0.38, start: 1 }),
      { ...shapeLayer(), name: 'Compass points', shape: 'star', sides: 4, innerRatio: 0.3, along: 0, across: 0.5, size: 0.85, fill: '#e8c878', outline: null, raised: false, mirror: 'four', effects: [glow({ color: '#ffe0a0', opacity: 0.5, size: 0.1 })] },
    ],
  },
  {
    id: 'starfield-galaxy',
    name: 'Galaxy swirl',
    description: 'Stars and gas whirling round the band like a spiral galaxy.',
    after: 'starfield',
    stage: { bloom: 0.3 },
    colours: [slot('sky', 'Sky colour', '#140a30', ['Band']), slot('core', 'Glow colour', '#8a6aff', ['Swirl'])],
    layers: () => [
      ...base({ light: '#2a1a5a', dark: '#020108', step: null, rims: false }),
      { ...textureLayer('nebula'), name: 'Swirl', color: '#8a6aff', color2: '#ff6ac8', opacity: 0.9, blend: 'screen', seed: 0x2ed, effects: [{ kind: 'blur', on: true, mode: 'spin', amount: 0.6, keepShape: true }] },
      { ...textureLayer('sparkle'), name: 'Stars', color: '#ffffff', amount: 1.2, scale: 0.45, seed: 0x5a30 },
    ],
  },
  {
    id: 'starfield-moons',
    name: 'Moon phases',
    description: 'Silver moons waxing and waning round a starry midnight band.',
    after: 'starfield',
    colours: [slot('sky', 'Sky colour', '#141c3a', ['Band', 'Stars']), slot('moon', 'Moon colour', '#e4e8f0', ['Moons'])],
    layers: () => [
      ...base({ light: '#2a3a6a', dark: '#02040a', step: null }),
      { ...textureLayer('sparkle'), name: 'Stars', color: '#e8ecff', amount: 0.8, scale: 0.45, seed: 0x5a31 },
      { ...repeatLayer(), name: 'Moons', element: 'circle', count: 8, at: 0.5, size: 0.7, fill: '#e4e8f0', raised: false, effects: [bevel({ size: 0.6, gloss: 0.6 }), glow({ color: '#c8d8ff', opacity: 0.5, size: 0.1 })] },
      { ...repeatLayer(), name: 'Moon shadows', element: 'circle', count: 8, at: 0.44, size: 0.62, fill: '#0a0e1e', raised: false, shaded: false, opacity: 0.9, offset: 0.06 },
    ],
  },
  {
    id: 'starfield-aurora',
    name: 'Aurora',
    description: 'Ribbons of green and violet aurora over a starry night.',
    after: 'starfield',
    stage: { bloom: 0.3 },
    colours: [slot('first', 'First light', '#40ffa0', ['Aurora']), slot('second', 'Second light', '#a060ff', ['Aurora glow'])],
    layers: () => [
      ...base({ light: '#1a2a4a', dark: '#020408', step: null, rims: false }),
      { ...textureLayer('sparkle'), name: 'Stars', color: '#ffffff', amount: 0.9, scale: 0.4, seed: 0x5a32 },
      { ...bandFillLayer(), name: 'Aurora', from: 0.15, to: 0.6, paint: lin(['#40ffa0', '#40ffa0', '#20a0ff'], 0), opacity: 0.6, blend: 'screen', clip: 'band', effects: [blur(0.06)] },
      { ...bandFillLayer(), name: 'Aurora glow', from: 0.4, to: 0.85, paint: lin(['#a060ff', '#ff60c0'], 0), opacity: 0.5, blend: 'screen', clip: 'band', effects: [blur(0.06)] },
      overlay('blue-onyx', 8, 'soft-light', 0.3),
    ],
  },
  // ── bard ──
  {
    id: 'bard-lute',
    shading: {},
    name: 'Lute',
    description: 'Polished lute wood with strings running round it and gold notes along them.',
    after: 'bard',
    colours: [slot('wood', 'Wood colour', '#9a6a3a', ['Wood']), slot('notes', 'Note colour', '#c8952e', ['Notes'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Wood', paint: photo('wood-planks', 1.4, { angle: 90, lighting: 0.4 }), effects: [recolour(LUTE), bevel({ size: 0.35, gloss: 0.7, highlightOpacity: 0.6 }), DROP] },
      ...[0.3, 0.43, 0.57, 0.7].map((at) => ({ ...lineLayer(), name: 'Strings', at, width: 0.015, paint: { kind: 'solid' as const, color: '#f4f0e8' }, effects: [contact(0.5)] })),
      { ...repeatLayer(), name: 'Notes', element: 'bardNote', count: 8, at: 0.5, size: 1.05, fill: '#c8952e', raised: true, effects: [recolour(WARM_GOLD), bevel({ size: 0.5, gloss: 0.8 }), contact(0.6)] },
    ],
  },
  {
    id: 'bard-velvet',
    name: 'Velvet & gold',
    description: 'Plum velvet between gold rims, with glowing gold notes.',
    after: 'bard',
    stage: { bloom: 0.15 },
    colours: [slot('velvet', 'Velvet colour', '#5a1a5a', ['Velvet']), slot('gold', 'Gold colour', '#c8952e', ['Outer gold', 'Inner gold', 'Notes'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Velvet', paint: photo('jacquard', 1.2, { lighting: 0.6 }), effects: [recolour(['#1a061a', '#4a1a4a', '#8a3a8a', '#d08ad0']), bevel({ size: 0.5, gloss: 0.2, highlightOpacity: 0.35 }), DROP] },
      { ...bandFillLayer(), name: 'Outer gold', to: 0.14, paint: goldPaint(1.4), effects: goldFx(0.5, WARM_GOLD) },
      { ...bandFillLayer(), name: 'Inner gold', from: 0.86, paint: goldPaint(1.4), effects: goldFx(0.5, WARM_GOLD) },
      { ...repeatLayer(), name: 'Notes', element: 'note', count: 10, at: 0.5, size: 0.85, fill: '#f0d080', raised: false, shaded: false, effects: [glow({ color: '#ffc040', opacity: 0.7, size: 0.1 })] },
    ],
  },
  {
    id: 'bard-starlit',
    name: 'Starlit song',
    description: 'Notes glowing like stars on a deep violet night, with a Yugurian lyric.',
    after: 'bard',
    stage: { bloom: 0.3 },
    colours: [slot('band', 'Frame colour', '#2a1048', ['Band', 'Sparkle']), slot('glow', 'Glow colour', '#d08aff', ['Notes', 'Lyric'])],
    layers: () => [
      ...base({ light: '#4a2a7a', dark: '#06020e', step: null, rims: false }),
      { ...textureLayer('sparkle'), name: 'Sparkle', color: '#f0e0ff', amount: 0.9, scale: 0.45, seed: 0x5a33 },
      { ...repeatLayer(), name: 'Notes', element: 'bardNote', count: 8, at: 0.4, size: 0.55, fill: '#f8e8ff', raised: false, shaded: false, effects: [glow({ color: '#d08aff', opacity: 0.9, size: 0.14 })] },
      inscription('yugurian', '#f0d8ff', { name: 'Lyric', at: 0.86, size: 0.2, start: 6, effects: [glow({ color: '#d08aff', opacity: 0.7, size: 0.08 })] }),
      ...rims(),
    ],
  },
  {
    id: 'bard-lyre',
    name: 'Golden lyre',
    description: 'Purple enamel with gold music notes at the quarters and fine gold lines.',
    after: 'bard',
    colours: [slot('enamel', 'Enamel colour', '#6a2a8a', ['Enamel']), slot('gold', 'Gold colour', '#c8952e', ['Lyres', 'Gold lines'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Enamel', paint: lin(['#a05ad0', '#6a2a8a', '#1a0626']), effects: [bevel({ direction: 'sunken', size: 0.12, gloss: 0.9, highlightOpacity: 0.5 }), DROP] },
      { ...lineLayer(), name: 'Gold lines', at: 0.08, width: 0.06, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) },
      { ...lineLayer(), name: 'Gold lines', at: 0.92, width: 0.06, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) },
      { ...repeatLayer(), name: 'Lyres', element: 'note', count: 4, at: 0.5, size: 0.95, fill: '#c8952e', raised: true, effects: [recolour(WARM_GOLD), bevel({ size: 0.4, gloss: 0.8 }), contact(0.6)] },
    ],
  },
  // ── cleric ──
  {
    id: 'cleric-holy-light',
    name: 'Holy light',
    description: 'A white-gold band glowing with radiant light, with a BabelStone prayer in gold.',
    after: 'cleric',
    stage: { bloom: 0.35, bleed: 0.2 },
    colours: [slot('band', 'Frame colour', '#fff0c0', ['Band', 'Pressed-in step']), slot('glow', 'Light colour', '#ffd870', ['Radiance', 'Prayer'])],
    layers: () => [
      ...base({ light: '#ffffff', dark: '#c8a050', step: 0.55 }),
      { ...lineLayer(), name: 'Radiance', at: 0.55, width: 0.04, paint: { kind: 'solid', color: '#ffffff' }, effects: [glow({ color: '#ffd870', opacity: 0.9, size: 0.2 })] },
      inscription('babelstone', '#a07010', { name: 'Prayer', at: 0.28, size: 0.32, effects: [glow({ color: '#ffd870', opacity: 0.5, size: 0.06 })] }),
    ],
  },
  {
    id: 'cleric-silver',
    shading: {},
    name: 'Silver & sapphire',
    description: 'Polished silver with silver crosses at the quarters between cut sapphires.',
    after: 'cleric',
    colours: [slot('metal', 'Metal colour', '#a8aeb8', ['Silver', 'Symbols']), slot('gems', 'Gem colour', '#2a5ad0', ['Sapphires'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Silver', paint: photo('hammered-metal', 2.4), effects: [...metalFx(SILVER_STOPS, 0.35, 0.9), DROP] },
      { ...repeatLayer(), name: 'Symbols', element: 'cross', count: 4, at: 0.5, size: 1, fill: '#c8ccd4', raised: true, effects: [recolour(SILVER_STOPS), bevel({ size: 0.4, gloss: 0.9 }), contact(0.6)] },
      { ...repeatLayer(), name: 'Sapphires', element: 'gem', count: 8, offset: 0.5, at: 0.5, size: 0.5, fill: '#2a5ad0', raised: false, gemSparkle: 0.7, effects: [contact(0.5)] },
    ],
  },
  {
    id: 'cleric-temple',
    name: 'Temple marble',
    description: 'White marble with gold inlaid lines and golden suns at the quarters.',
    after: 'cleric',
    colours: [slot('stone', 'Marble colour', '#ece6dc', ['Band', 'Texture']), slot('gold', 'Gold colour', '#c8952e', ['Gold lines', 'Suns'])],
    layers: () => [
      ...base({ light: '#ffffff', dark: '#8a8278', step: null, rims: false }),
      overlay('marble', 1.4, 'multiply', 0.6, { lighting: 0.3 }),
      { ...lineLayer(), name: 'Gold lines', at: 0.14, width: 0.05, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) },
      { ...lineLayer(), name: 'Gold lines', at: 0.86, width: 0.05, paint: goldPaint(1.4), effects: goldFx(0.6, WARM_GOLD) },
      { ...repeatLayer(), name: 'Suns', element: 'sun', count: 4, at: 0.5, size: 1.4, fill: '#c8952e', raised: true, effects: [recolour(WARM_GOLD), bevel({ size: 0.4, gloss: 0.8 }), contact(0.5)] },
      ...rims(),
    ],
  },
  {
    id: 'cleric-dawn',
    name: 'Dawn',
    description: 'A dawn gradient of rose and gold with a soft glowing seam.',
    after: 'cleric',
    stage: { bloom: 0.2 },
    colours: [slot('band', 'Frame colour', '#ffb070', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#fff0c0', ['Dawn seam'])],
    layers: () => [
      ...base({ light: '#fff0b0', dark: '#a03a5a', step: 0.55, stepLight: '#ffd080', stepDark: '#6a1a3a' }),
      { ...lineLayer(), name: 'Dawn seam', at: 0.55, width: 0.03, paint: { kind: 'solid', color: '#fff0c0' }, effects: [glow({ color: '#ffd080', opacity: 0.8, size: 0.14 })] },
    ],
  },
  // ── druid ──
  {
    id: 'druid-stone-circle',
    shading: {},
    name: 'Glowing stone circle',
    description: 'Mossy standing stone with green BabelStone runes glowing in it.',
    after: 'druid',
    stage: { bloom: 0.25 },
    colours: [slot('stone', 'Stone colour', '#6c6b57', ['Stone']), slot('glow', 'Glow colour', '#8aff6a', ['Glowing runes'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Stone', paint: photo('mossy-rock', 1.6, { lighting: 0.6 }), effects: [bevel({ profile: 'chisel', size: 0.25, gloss: 0.15, highlightOpacity: 0.4 }), DROP] },
      inscription('babelstone', '#e0ffd0', { name: 'Glowing runes', size: 0.4, start: 5, effects: [glow({ inner: true, color: '#ffffff', opacity: 0.4, size: 0.04 }), glow({ color: '#8aff6a', opacity: 0.9, size: 0.14 })] }),
    ],
  },
  // ── fighter ──
  {
    id: 'fighter-battle-steel',
    shading: {},
    name: 'Battle steel',
    description: 'Bright steel with battle scratches and a ring of domed rivets.',
    after: 'fighter',
    colours: [slot('metal', 'Metal colour', '#7a828c', ['Steel', 'Rivets'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Steel', paint: fighterSteel(), effects: [wear({ chips: 0.02, polish: 0.6, grime: 0.2, scale: 0.1, scratches: 0.6 }), ...metalFx(STEEL_STOPS, 0.3, 0.8), DROP] },
      { ...repeatLayer(), name: 'Rivets', element: 'bead', count: 16, at: 0.5, size: 0.26, fill: '#a8b0ba', raised: true, effects: [recolour(STEEL_STOPS), contact(0.7)] },
      ...rims(),
    ],
  },
  {
    id: 'fighter-shield-wall',
    name: 'Shield wall',
    description: 'A row of painted shields rimmed in steel.',
    after: 'fighter',
    colours: [slot('paint', 'Shield colour', '#8a1a1a', ['Shields']), slot('metal', 'Metal colour', '#7a828c', ['Outer steel', 'Inner steel'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Under', paint: { kind: 'solid', color: '#1a1a1a' }, effects: [DROP] },
      { ...cellsLayer(), name: 'Shields', pattern: 'grid', from: 0.15, to: 0.85, size: 0.75, gap: 0.06, rounding: 0.4, vary: 0.35, color: '#8a1a1a', effects: [bevel({ profile: 'rounded', size: 0.3, gloss: 0.5, highlightOpacity: 0.5 })] },
      { ...bandFillLayer(), name: 'Outer steel', to: 0.16, paint: fighterSteel(1.4), effects: metalFx(STEEL_STOPS, 0.5, 0.8) },
      { ...bandFillLayer(), name: 'Inner steel', from: 0.84, paint: fighterSteel(1.4), effects: metalFx(STEEL_STOPS, 0.5, 0.8) },
    ],
  },
  {
    id: 'fighter-chainmail',
    name: 'Chainmail',
    description: 'Interlinked steel rings between leather edges.',
    after: 'fighter',
    colours: [slot('metal', 'Metal colour', '#a8aeb8', ['Mail']), slot('leather', 'Leather colour', '#5a3418', ['Outer leather', 'Inner leather'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Under', paint: { kind: 'solid', color: '#3a3e46' }, effects: [DROP] },
      { ...textureLayer('chainmail'), name: 'Mail', color: '#a8aeb8', from: 0.12, to: 0.88, seed: 1, effects: [bevel({ size: 0.2, gloss: 0.8 })] },
      { ...bandFillLayer(), name: 'Outer leather', to: 0.14, paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [recolour(['#0a0402', '#2a1408', '#5a3418', '#8a6040']), bevel({ size: 0.5, gloss: 0.2 })] },
      { ...bandFillLayer(), name: 'Inner leather', from: 0.86, paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [recolour(['#0a0402', '#2a1408', '#5a3418', '#8a6040']), bevel({ size: 0.5, gloss: 0.2 })] },
    ],
  },
  {
    id: 'fighter-champion',
    shading: {},
    name: 'Champion',
    description: 'Red enamel between gold rims, studded with gold rivets.',
    after: 'fighter',
    colours: [slot('enamel', 'Enamel colour', '#a01a1a', ['Enamel']), slot('gold', 'Gold colour', '#c8952e', ['Outer gold', 'Inner gold', 'Rivets'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Enamel', paint: lin(['#e04a4a', '#a01a1a', '#2a0404']), effects: [bevel({ direction: 'sunken', size: 0.12, gloss: 0.9, highlightOpacity: 0.5 }), DROP] },
      { ...bandFillLayer(), name: 'Outer gold', to: 0.18, paint: goldPaint(1.4), effects: goldFx(0.5, WARM_GOLD) },
      { ...bandFillLayer(), name: 'Inner gold', from: 0.82, paint: goldPaint(1.4), effects: goldFx(0.5, WARM_GOLD) },
      { ...repeatLayer(), name: 'Rivets', element: 'bead', count: 12, at: 0.5, size: 0.24, fill: '#c8952e', raised: true, effects: [recolour(WARM_GOLD), contact(0.6)] },
    ],
  },
  // ── monk ──
  {
    id: 'monk-saffron',
    shading: {},
    name: 'Saffron robe',
    description: 'Folded saffron cloth with a knotted cord round its middle.',
    after: 'monk',
    colours: [slot('cloth', 'Cloth colour', '#e07a1a', ['Cloth']), slot('cord', 'Cord colour', '#8a2a1a', ['Cord', 'Twist'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Cloth', paint: photo('hessian', 0.8, { lighting: 0.6 }), effects: [recolour(['#2a0a02', '#8a3a06', '#e07a1a', '#ffc070']), bevel({ size: 0.6, gloss: 0.15, highlightOpacity: 0.35 }), DROP] },
      { ...bandFillLayer(), name: 'Cord', from: 0.36, to: 0.64, paint: lin(['#e06a5a', '#a03a2a', '#3a0804']), effects: [bevel({ size: 0.9, gloss: 0.4 }), contact(0.5)] },
      { ...textureLayer('rope'), name: 'Twist', from: 0.36, to: 0.64, color: '#c05a4a', seed: 0xbeae },
    ],
  },
  {
    id: 'monk-jade',
    name: 'Jade & gold',
    description: 'Polished jade between gold rims, with a Yugurian sutra in gold.',
    after: 'monk',
    colours: [slot('jade', 'Jade colour', '#3a9a6a', ['Jade']), slot('gold', 'Gold colour', '#c8952e', ['Outer gold', 'Inner gold', 'Sutra'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Jade', paint: photo('blue-onyx', 4, { angle: 60 }), effects: [recolour(['#021a0e', '#0e4a2a', '#3a9a6a', '#8ae0b0']), bevel({ size: 0.4, gloss: 0.95, highlightOpacity: 0.6 }), DROP] },
      { ...bandFillLayer(), name: 'Outer gold', to: 0.14, paint: goldPaint(1.4), effects: goldFx(0.5, WARM_GOLD) },
      { ...bandFillLayer(), name: 'Inner gold', from: 0.86, paint: goldPaint(1.4), effects: goldFx(0.5, WARM_GOLD) },
      inscription('yugurian', '#e8c060', { name: 'Sutra', size: 0.34, start: 7, effects: [bevel({ size: 0.4, gloss: 0.8 })] }),
    ],
  },
  {
    id: 'monk-ink',
    name: 'Ink circle',
    description: 'A single bold brushstroke of black ink on pale rice paper.',
    after: 'monk',
    colours: [slot('paper', 'Paper colour', '#f0e8d8', ['Band']), slot('ink', 'Ink colour', '#141414', ['Ink'])],
    layers: () => [
      ...base({ light: '#fffaf0', dark: '#b8ae98', step: null, rims: false }),
      { ...lineLayer(), name: 'Ink', at: 0.5, width: 0.55, paint: { kind: 'solid', color: '#141414' }, opacity: 0.92, effects: [{ kind: 'distort', on: true, amount: 0.12, scale: 0.25, seed: 4 }, blur(0.01)] },
      ...rims(),
    ],
  },
  // ── cobblestone ──
  {
    id: 'cobblestone-mossy',
    name: 'Mossy cobbles',
    description: 'Rounded cobblestones with moss and lichen creeping between them.',
    after: 'cobblestone',
    shading: {},
    colours: [slot('stone', 'Stone colour', '#928b80', ['Cobbles']), slot('moss', 'Moss colour', '#7a9a2a', ['Moss'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Cobbles', paint: photo('cobblestone', 1.4, { lighting: 0.7 }), effects: [bevel({ profile: 'rounded', size: 0.3, gloss: 0.15, highlightOpacity: 0.4 }), DROP] },
      { ...textureLayer('lichen'), name: 'Moss', color: '#7a9a2a', amount: 1, opacity: 0.85, seed: 0x11c5 },
      ...rims(),
    ],
  },
  // ── barbarian ──
  {
    id: 'barbarian-fur',
    shading: {},
    name: 'Fur trim',
    description: 'A thick ruff of fur over a leather band, with soft uneven edges like a real pelt.',
    after: 'barbarian',
    colours: [slot('fur', 'Fur colour', '#6a4a30', ['Fur']), slot('hide', 'Leather colour', '#4a2a14', ['Hide'])],
    layers: () => [
      hide('Hide', ['#0a0402', '#24120a', '#4a2a14', '#7a5030', '#a88060']),
      { ...textureLayer('feathers'), name: 'Fur', color: '#b08a60', from: 0.05, to: 0.75, scale: 0.6, amount: 1.4, seed: 0xfea9, effects: [{ kind: 'distort', on: true, amount: 0.05, scale: 0.15, seed: 5 }, blur(0.006), contact(0.5)] },
    ],
  },
  {
    id: 'barbarian-bone',
    name: 'Gnarled bone',
    description: 'Knotted, twisting bone grown into a ring, pale and weathered.',
    after: 'barbarian',
    colours: [slot('bone', 'Bone colour', '#d8c8a8', ['Bone', 'Roots'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Bone', from: 0.25, to: 0.75, paint: photo('coral-stone', 2, { lighting: 0.4 }), effects: [recolour(['#2a2014', '#7a6a50', '#d8c8a8', '#f8f0e0']), bevel({ profile: 'rounded', size: 0.9, depth: 1.3, gloss: 0.3 }), DROP] },
      { ...growthLayer('vine'), name: 'Roots', count: 2, thickness: 0.13, amplitude: 0.18, waveLength: 1.2, gnarl: 0.7, branching: 0, extra: 'none', color: '#c8b898', extraColor: '#a89878', effects: [bevel({ size: 0.6, gloss: 0.3 }), contact(0.6)] },
    ],
  },
  {
    id: 'barbarian-club',
    shading: {},
    name: 'War club',
    description: 'A ring of rough, gnarled wood like a war club, studded with iron nails.',
    after: 'barbarian',
    colours: [slot('wood', 'Wood colour', '#56473c', ['Club wood']), slot('studs', 'Stud colour', '#5a5a60', ['Studs'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Club wood', paint: photo('plane-bark', 1.6, { angle: 90, lighting: 0.6 }), effects: [adjust({ contrast: 0.2 }), bevel({ profile: 'rounded', size: 0.6, depth: 1.3, gloss: 0.2, highlightOpacity: 0.45, soften: 0.04 }), { kind: 'distort', on: true, amount: 0.04, scale: 0.3, seed: 2 }, DROP] },
      { ...repeatLayer(), name: 'Studs', element: 'bead', count: 12, at: 0.5, size: 0.28, fill: '#5a5a60', raised: true, effects: [recolour(['#050506', '#1e1e22', '#5a5a60', '#a8a8b0']), contact(0.6)] },
    ],
  },
  // ── bard ──
  {
    id: 'bard-chorus',
    shading: {},
    name: 'Outer Rim chorus',
    description: 'Deep teal enamel with lyrics in Outer Rim AF glowing between gold lines.',
    after: 'bard',
    stage: { bloom: 0.2 },
    colours: [slot('enamel', 'Enamel colour', '#0e5a6a', ['Enamel']), slot('glow', 'Lyric colour', '#8affe8', ['Lyrics']), slot('gold', 'Gold colour', '#c8952e', ['Gold lines'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Enamel', paint: lin(['#2a9aaa', '#0e5a6a', '#021a20']), effects: [bevel({ direction: 'sunken', size: 0.12, gloss: 0.9, highlightOpacity: 0.5 }), DROP] },
      ...goldLines(),
      inscription('outerRim', '#e0fff8', { name: 'Lyrics', size: 0.4, start: 2, effects: [glow({ color: '#8affe8', opacity: 0.85, size: 0.12 })] }),
    ],
  },
  {
    id: 'bard-aria',
    name: 'Crimson aria',
    description: 'Crimson velvet with an aria in Sith AF in gold, framed by gold lines.',
    after: 'bard',
    colours: [slot('velvet', 'Velvet colour', '#8a1022', ['Velvet']), slot('gold', 'Gold colour', '#c8952e', ['Aria', 'Gold lines'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Velvet', paint: photo('jacquard', 1.2, { lighting: 0.6 }), effects: [bevel({ size: 0.5, gloss: 0.2, highlightOpacity: 0.35 }), DROP] },
      ...goldLines(),
      inscription('sith', '#f0d080', { name: 'Aria', size: 0.38, start: 3, effects: [bevel({ size: 0.4, gloss: 0.8 }), contact(0.4)] }),
    ],
  },
  {
    id: 'bard-moon-verse',
    name: 'Moonlit verse',
    description: 'Silver notes and a Yugurian verse on midnight blue with a shimmer of stars.',
    after: 'bard',
    stage: { bloom: 0.2 },
    colours: [slot('band', 'Frame colour', '#141c3a', ['Band', 'Stars']), slot('silver', 'Silver colour', '#e4e8f0', ['Notes', 'Verse'])],
    layers: () => [
      ...base({ light: '#2a3a6a', dark: '#02040a', step: 0.6 }),
      { ...textureLayer('sparkle'), name: 'Stars', color: '#e8ecff', amount: 0.6, scale: 0.4, seed: 0x5a35 },
      { ...repeatLayer(), name: 'Notes', element: 'bardNote', count: 8, at: 0.3, size: 0.48, fill: '#e4e8f0', raised: false, shaded: false, effects: [glow({ color: '#c8d8ff', opacity: 0.7, size: 0.1 })] },
      inscription('yugurian', '#e4e8f0', { name: 'Verse', at: 0.8, size: 0.26, start: 8, effects: [glow({ color: '#c8d8ff', opacity: 0.6, size: 0.08 })] }),
    ],
  },
  // ── druid ──
  {
    id: 'druid-bramble',
    name: 'Bramble & berries',
    description: 'Thorny bramble stems winding round each other, heavy with dark berries.',
    after: 'druid',
    colours: [slot('stem', 'Stem colour', '#4a3a22', ['Brambles']), slot('berries', 'Berry colour', '#3a1050', ['Berries'])],
    layers: () => [
      { ...growthLayer('vine'), name: 'Brambles', count: 2, thickness: 0.07, amplitude: 0.2, waveLength: 1.6, extra: 'thorns', extraSize: 0.18, color: '#4a3a22', extraColor: '#2a1e10', effects: [bevel({ size: 0.5, gloss: 0.3 }), DROP] },
      { ...growthLayer('vine'), name: 'Leaves', count: 1, thickness: 0.04, amplitude: 0.2, waveLength: 2.1, extra: 'leaves', extraSize: 0.35, color: '#3a5a22', extraColor: '#4a7a2a', seed: 4, effects: [bevel({ size: 0.5, gloss: 0.3 }), contact(0.5)] },
      { ...growthLayer('vine'), name: 'Berries', count: 1, thickness: 0.03, amplitude: 0.18, waveLength: 1.8, extra: 'berries', extraSize: 0.32, color: '#4a3a22', extraColor: '#3a1050', seed: 9, effects: [bevel({ size: 0.6, gloss: 0.8 }), contact(0.5)] },
    ],
  },
  {
    id: 'druid-meadow',
    shading: {},
    name: 'Wildflower meadow',
    description: 'A strip of meadow grass dotted with small white and yellow flowers.',
    after: 'druid',
    colours: [slot('grass', 'Grass colour', '#4a7a2a', ['Meadow']), slot('flowers', 'Flower colour', '#f4f0e0', ['Flowers'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Meadow', paint: photo('moss', 0.9, { lighting: 0.5 }), effects: [bevel({ profile: 'rounded', size: 0.5, gloss: 0.1, highlightOpacity: 0.3 }), DROP] },
      { ...repeatLayer(), name: 'Flowers', element: 'circle', count: 40, at: 0.5, size: 0.16, fill: '#f4f0e0', raised: true, wander: 0.8, effects: [contact(0.4)] },
      { ...repeatLayer(), name: 'Flower hearts', element: 'circle', count: 40, at: 0.5, size: 0.06, fill: '#f0c020', raised: false, wander: 0.8, shaded: false },
      { ...shapeLayer(), name: 'Big flowers', shape: 'flower', sides: 6, innerRatio: 0.5, along: 0.125, across: 0.5, size: 0.42, fill: '#f8d040', outline: null, raised: false, mirror: 'four', effects: [bevel({ size: 0.4, gloss: 0.4 }), contact(0.5)] },
    ],
  },
  // ── cobblestone ──
  {
    id: 'cobblestone-forest-path',
    name: 'Forest path',
    description: 'Cobbles half covered in fallen autumn leaves and soft earth.',
    after: 'cobblestone',
    shading: {},
    colours: [slot('stone', 'Stone colour', '#928b80', ['Cobbles']), slot('leaves', 'Leaf colour', '#a0602a', ['Leaves'])],
    layers: () => [
      cobbles(),
      { ...bandFillLayer(), name: 'Leaves', paint: photo('forest-floor', 1.2), opacity: 0.9, effects: [{ kind: 'distort', on: true, amount: 0.15, scale: 0.35, seed: 11 }, contact(0.5)], clip: 'band', from: 0, to: 0.6 },
      ...rims(),
    ],
  },
  {
    id: 'cobblestone-lichen-granite',
    name: 'Lichen granite',
    description: 'Speckled granite patched with orange and yellow lichen.',
    after: 'cobblestone',
    shading: {},
    colours: [slot('stone', 'Stone colour', '#6a6a6c', ['Granite']), slot('lichen', 'Lichen colour', '#d8a020', ['Lichen'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Granite', paint: photo('lichen-rock', 1.4, { lighting: 0.6 }), effects: [bevel({ profile: 'chisel', size: 0.25, gloss: 0.2, highlightOpacity: 0.4 }), DROP] },
      { ...textureLayer('lichen'), name: 'Lichen', color: '#d8a020', amount: 0.55, opacity: 0.6, seed: 0x11c8 },
      ...rims(),
    ],
  },
  // ── paladin ──
  {
    id: 'paladin-oathbound',
    shading: {},
    name: 'Oathbound silver',
    description: 'White silver with a gold oath in BabelStone runes and gold crosses at the quarters.',
    after: 'paladin',
    colours: [slot('metal', 'Metal colour', '#c8ccd4', ['Silver']), slot('gold', 'Gold colour', '#c8952e', ['Oath', 'Crosses'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Silver', paint: photo('hammered-metal', 2.4), effects: [...metalFx(SILVER_STOPS, 0.35, 0.95), DROP] },
      inscription('babelstone', '#c8952e', { name: 'Oath', size: 0.32, start: 2, effects: [recolour(WARM_GOLD), bevel({ size: 0.4, gloss: 0.8 })] }),
      { ...repeatLayer(), name: 'Crosses', element: 'cross', count: 4, at: 0.5, size: 0.72, fill: '#c8952e', raised: true, effects: [recolour(WARM_GOLD), bevel({ size: 0.5, gloss: 0.8 }), contact(0.6)] },
    ],
  },
  {
    id: 'paladin-tabard',
    shading: {},
    name: 'Tabard',
    description: 'A blue cloth tabard band trimmed with gold braid.',
    after: 'paladin',
    colours: [slot('cloth', 'Cloth colour', '#1e3a8a', ['Cloth']), slot('gold', 'Gold colour', '#c8952e', ['Outer braid', 'Inner braid'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Cloth', paint: photo('hessian', 0.7, { lighting: 0.6 }), effects: [recolour(['#02061a', '#0e1e4a', '#1e3a8a', '#5a7ad0']), bevel({ size: 0.5, gloss: 0.15, highlightOpacity: 0.3 }), DROP] },
      ...[0.08, 0.92].map((at, i) => ({ ...lineLayer(), name: i ? 'Inner braid' : 'Outer braid', at, width: 0.12, paint: goldPaint(1.2), dash: 'solid' as const, effects: goldFx(0.7, WARM_GOLD) })),
    ],
  },
  {
    id: 'paladin-radiant',
    name: 'Radiant shield',
    description: 'Bright steel with a glowing golden seam, like a blessed shield rim.',
    after: 'paladin',
    stage: { bloom: 0.3 },
    colours: [slot('metal', 'Metal colour', '#a8b0bc', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#ffd870', ['Holy seam'])],
    layers: () => [
      ...base({ light: '#f4f8ff', dark: '#3a4250', step: 0.55 }),
      { ...lineLayer(), name: 'Holy seam', at: 0.55, width: 0.035, paint: { kind: 'solid', color: '#fff4d0' }, effects: [glow({ color: '#ffd870', opacity: 0.9, size: 0.18 })] },
    ],
  },
  {
    id: 'paladin-dawnsteel',
    name: 'Dawnsteel',
    description: 'Steel in the warm light of dawn, with a Sith AF vow etched in pale gold.',
    after: 'paladin',
    colours: [slot('band', 'Frame colour', '#e0b890', ['Band', 'Pressed-in step']), slot('etch', 'Etching colour', '#fff0c0', ['Vow'])],
    layers: () => [
      ...base({ light: '#fff0d8', dark: '#5a4a5a', step: 0.6 }),
      inscription('sith', '#fff0c0', { name: 'Vow', at: 0.28, size: 0.3, start: 6, effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.4 })] }),
    ],
  },
  // ── ranger ──
  {
    id: 'ranger-fletching',
    shading: {},
    name: 'Arrow fletching',
    description: 'Grey-green feathers along a leather quiver strap.',
    after: 'ranger',
    colours: [slot('feathers', 'Feather colour', '#6a7a5a', ['Feathers']), slot('leather', 'Leather colour', '#5a3a1a', ['Strap'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Strap', paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [recolour(LEATHER), bevel({ size: 0.4, gloss: 0.2 }), DROP] },
      { ...textureLayer('feathers'), name: 'Feathers', color: '#6a7a5a', from: 0.12, to: 0.88, seed: 0xfeaa, effects: [contact(0.5)] },
    ],
  },
  {
    id: 'ranger-cloak',
    shading: {},
    name: 'Woodland cloak',
    description: 'Green woollen cloak cloth with an oak-leaf clasp and stitched edges.',
    after: 'ranger',
    colours: [slot('cloth', 'Cloth colour', '#3a5a2a', ['Cloak']), slot('clasp', 'Clasp colour', '#a87a3a', ['Clasp'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Cloak', paint: photo('hessian', 0.7, { lighting: 0.6 }), effects: [recolour(['#040a02', '#16260e', '#3a5a2a', '#7a9a5a']), bevel({ size: 0.5, gloss: 0.1 }), DROP] },
      ...[0.08, 0.92].map((at) => ({ ...lineLayer(), name: 'Stitching', at, width: 0.03, dash: 'dashed' as const, paint: { kind: 'solid' as const, color: '#c8b888' } })),
      { ...repeatLayer(), name: 'Clasp', element: 'leaf', count: 1, at: 0.5, size: 0.8, fill: '#a87a3a', raised: true, effects: [recolour(['#1e1206', '#5a3a18', '#a87a3a', '#e0c08a', '#fff0d0']), bevel({ size: 0.4, gloss: 0.8 }), contact(0.6)] },
    ],
  },
  {
    id: 'ranger-bowstave',
    shading: {},
    name: 'Yew bowstave',
    description: 'Honey-coloured yew bound with green cord, like a longbow\'s grip.',
    after: 'ranger',
    colours: [slot('wood', 'Wood colour', '#c08850', ['Yew']), slot('cord', 'Cord colour', '#3a6a3a', ['Bindings'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Yew', paint: photo('wood-planks', 1.4, { angle: 90, lighting: 0.4 }), effects: [recolour(['#2a1406', '#7a4a1e', '#c08850', '#f0c890', '#fff0d8']), bevel({ profile: 'rounded', size: 0.6, depth: 1.3, gloss: 0.7 }), DROP] },
      { ...repeatLayer(), name: 'Bindings', element: 'square', count: 8, at: 0.5, size: 0.95, stretch: 0.35, fill: '#3a6a3a', raised: true, effects: [bevel({ size: 0.5, gloss: 0.3, surface: 'grain', surfaceDepth: 0.5 }), contact(0.5)] },
    ],
  },
  {
    id: 'ranger-trail',
    shading: {},
    name: 'Trail markings',
    description: 'Weathered bark with Yugurian trail markings carved into it.',
    after: 'ranger',
    colours: [slot('bark', 'Bark colour', '#5f5640', ['Bark']), slot('carving', 'Carving colour', '#d8c8a0', ['Markings'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Bark', paint: photo('bark', 1.6, { angle: 90, lighting: 0.6 }), effects: [bevel({ profile: 'rounded', size: 0.5, gloss: 0.15 }), DROP] },
      inscription('yugurian', '#d8c8a0', { name: 'Markings', size: 0.4, start: 1, effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.2 })] }),
    ],
  },
  {
    id: 'ranger-pine',
    name: 'Pine wreath',
    description: 'Pine boughs and small cones wound into a ring.',
    after: 'ranger',
    colours: [slot('pine', 'Pine colour', '#2a4a2a', ['Boughs']), slot('cones', 'Cone colour', '#6a4424', ['Cones'])],
    layers: () => [
      { ...growthLayer('vine'), name: 'Boughs', count: 3, thickness: 0.06, amplitude: 0.14, waveLength: 1.4, extra: 'thorns', extraSpacing: 0.14, extraSize: 0.2, color: '#3a2a1a', extraColor: '#2a4a2a', effects: [bevel({ size: 0.4, gloss: 0.3 }), DROP] },
      { ...repeatLayer(), name: 'Cones', element: 'bead', count: 8, at: 0.5, size: 0.34, stretch: 0.7, fill: '#6a4424', raised: true, effects: [bevel({ size: 0.6, gloss: 0.3, surface: 'scales', surfaceDepth: 0.8 }), contact(0.6)] },
    ],
  },
  // ── rogue ──
  {
    id: 'rogue-shadow-leather',
    shading: {},
    name: 'Shadow leather',
    description: 'Supple black leather with neat grey stitching.',
    after: 'rogue',
    colours: [slot('leather', 'Leather colour', '#2a2220', ['Leather']), slot('stitch', 'Stitch colour', '#8a8a8a', ['Stitching'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Leather', paint: photo('leather', 1.4, { lighting: 0.7 }), effects: [recolour(DARK_LEATHER), bevel({ profile: 'rounded', size: 0.45, gloss: 0.5, highlightOpacity: 0.4 }), DROP] },
      ...[0.12, 0.88].map((at) => ({ ...lineLayer(), name: 'Stitching', at, width: 0.03, dash: 'dashed' as const, paint: { kind: 'solid' as const, color: '#8a8a8a' } })),
    ],
  },
  {
    id: 'rogue-daggers',
    shading: {},
    name: 'Dagger belt',
    description: 'A dark leather belt with four steel bolts slotted along it.',
    after: 'rogue',
    colours: [slot('leather', 'Leather colour', '#3a2a20', ['Belt']), slot('metal', 'Blade colour', '#a8b0ba', ['Daggers'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Belt', paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [recolour(['#050302', '#1a120c', '#3a2a20', '#6a5444', '#9a8474']), bevel({ size: 0.4, gloss: 0.3 }), DROP] },
      { ...repeatLayer(), name: 'Daggers', element: 'arrow', count: 4, at: 0.5, size: 1.1, rotation: 90, fill: '#a8b0ba', raised: true, effects: [recolour(STEEL_STOPS), bevel({ size: 0.4, gloss: 0.9 }), contact(0.6)] },
    ],
  },
  {
    id: 'rogue-cant',
    name: 'Thieves’ cant',
    description: 'Charcoal band with secret marks in Outer Rim AF.',
    after: 'rogue',
    colours: [slot('band', 'Frame colour', '#2a2a30', ['Band', 'Pressed-in step']), slot('marks', 'Mark colour', '#b8b8c0', ['Cant'])],
    layers: () => [
      ...base({ light: '#5a5a66', dark: '#050506', step: 0.6 }),
      inscription('outerRim', '#b8b8c0', { name: 'Cant', at: 0.3, size: 0.34, start: 7, effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.3 })] }),
    ],
  },
  {
    id: 'rogue-poison',
    shading: {},
    name: 'Poisoner',
    description: 'Black leather with a glowing seam of green poison.',
    after: 'rogue',
    stage: { bloom: 0.25 },
    colours: [slot('leather', 'Leather colour', '#1e1e20', ['Leather']), slot('poison', 'Poison colour', '#6aff4a', ['Poison seam'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Leather', paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [recolour(DARK_LEATHER), bevel({ size: 0.4, gloss: 0.4 }), DROP] },
      { ...lineLayer(), name: 'Poison seam', at: 0.5, width: 0.04, paint: { kind: 'solid', color: '#d0ffb0' }, effects: [glow({ color: '#6aff4a', opacity: 0.9, size: 0.16 })] },
    ],
  },
  {
    id: 'rogue-smoke',
    shading: {},
    name: 'Smoke & steel',
    description: 'Dark gunmetal veiled in drifting smoke.',
    after: 'rogue',
    colours: [slot('metal', 'Metal colour', '#2a2e36', ['Gunmetal']), slot('smoke', 'Smoke colour', '#8a8a96', ['Smoke'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Gunmetal', paint: photo('hammered-metal', 2), effects: [...metalFx(['#020203', '#0e1014', '#2a2e36', '#6a707a', '#b8c0c8'], 0.3, 0.8), DROP] },
      { ...textureLayer('smoke'), name: 'Smoke', color: '#8a8a96', color2: '#0e1014', opacity: 0.7, seed: 0x5e0d },
      ...rims(),
    ],
  },
  // ── sorcerer ──
  {
    id: 'sorcerer-wild-magic',
    name: 'Wild magic',
    description: 'A swirl of shifting colours with sparks of raw magic.',
    after: 'sorcerer',
    stage: { bloom: 0.3 },
    colours: [slot('first', 'First colour', '#ff3a6a', ['Swirl']), slot('second', 'Second colour', '#3a8aff', ['Swirl glow'])],
    layers: () => [
      ...base({ light: '#4a2a6a', dark: '#06020e', step: null }),
      { ...textureLayer('nebula'), name: 'Swirl', color: '#ff3a6a', color2: '#3a8aff', opacity: 0.9, blend: 'screen', seed: 0x2ee },
      { ...textureLayer('sparkle'), name: 'Swirl glow', color: '#ffffff', amount: 1, scale: 0.5, seed: 0x5a36, effects: [glow({ color: '#c08aff', opacity: 0.7, size: 0.06 })] },
    ],
  },
  {
    id: 'sorcerer-bloodline',
    name: 'Draconic bloodline',
    description: 'Dark red with a glowing ember seam and a Sith AF inscription.',
    after: 'sorcerer',
    stage: { bloom: 0.25 },
    colours: [slot('band', 'Frame colour', '#7a1a14', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#ff8a3a', ['Glowing lines', 'Draconic'])],
    layers: () => [
      ...base({ light: '#b8322a', dark: '#120202', step: 0.55 }),
      glowLines(['#ffd090', '#ff6a2a'], '#ff6a1a', { count: 2, from: 0.05, spacing: 0.9, width: 0.035, size: 0.12 }),
      inscription('sith', '#ffd0a0', { name: 'Draconic', at: 0.3, size: 0.32, start: 2, effects: [glow({ color: '#ff8a3a', opacity: 0.8, size: 0.1 })] }),
    ],
  },
  {
    id: 'sorcerer-storm',
    name: 'Storm sorcery',
    description: 'Storm-blue band crackling between two glowing rings.',
    after: 'sorcerer',
    stage: { bloom: 0.35 },
    colours: [slot('band', 'Frame colour', '#1a2a4a', ['Band']), slot('glow', 'Lightning colour', '#8ad0ff', ['Glowing lines', 'Lightning'])],
    layers: () => [
      ...base({ light: '#3a4a7a', dark: '#02040a', step: null }),
      overlay('black-onyx', 6, 'screen', 0.35),
      glowLines(['#e8f8ff', '#8ad0ff'], '#4aa0ff', { count: 2, from: 0.07, spacing: 0.86, width: 0.03, size: 0.14 }),
      { ...textureLayer('smoke'), name: 'Lightning', color: '#e8f8ff', color2: '#1a2a4a', opacity: 0.6, blend: 'screen', seed: 0x5e0e },
    ],
  },
  {
    id: 'sorcerer-crystal',
    name: 'Crystal heart',
    description: 'Faceted ruby crystal with four cut gems glowing from within.',
    after: 'sorcerer',
    stage: { bloom: 0.25 },
    colours: [slot('crystal', 'Crystal colour', '#c02a4a', ['Crystal', 'Gems'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Crystal', paint: lin(['#ff6a8a', '#c02a4a', '#2a0410']), effects: [DROP] },
      { ...textureLayer('crystal'), name: 'Facets', color: '#c02a4a', opacity: 0.8, seed: 0xc276 },
      { ...repeatLayer(), name: 'Gems', element: 'gem', count: 4, at: 0.5, size: 0.75, fill: '#c02a4a', raised: false, gemSparkle: 0.8, effects: [glow({ color: '#ff4a6a', opacity: 0.6, size: 0.12 }), contact(0.5)] },
    ],
  },
  // ── warlock ──
  {
    id: 'warlock-pact',
    name: 'Pact runes',
    description: 'Deep violet with a pact glowing in Sith AF in the pressed-in step.',
    after: 'warlock',
    stage: { bloom: 0.25 },
    colours: [slot('band', 'Frame colour', '#5b2d7a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#c06aff', ['Pact'])],
    layers: () => [
      ...base({ light: '#8a4ab0', dark: '#0e0214', step: 0.5 }),
      inscription('sith', '#f0d8ff', { name: 'Pact', at: 0.75, size: 0.4, start: 7, effects: [glow({ color: '#c06aff', opacity: 0.9, size: 0.14 })] }),
    ],
  },
  {
    id: 'warlock-tendrils',
    name: 'Eldritch tendrils',
    description: 'Curling purple tendrils writhing through a black band.',
    after: 'warlock',
    stage: { bloom: 0.25 },
    colours: [slot('band', 'Frame colour', '#120818', ['Band']), slot('tendrils', 'Tendril colour', '#8a3ab0', ['Tendrils'])],
    layers: () => [
      ...base({ light: '#2a1a3a', dark: '#020104', step: null }),
      { ...growthLayer('tendrils'), name: 'Tendrils', count: 3, thickness: 0.05, amplitude: 0.22, color: '#8a3ab0', extraColor: '#c06aff', effects: [glow({ color: '#a04aff', opacity: 0.7, size: 0.1 }), bevel({ size: 0.5, gloss: 0.5 })] },
    ],
  },
  {
    id: 'warlock-eyes',
    shading: {},
    name: 'Watching eyes',
    description: 'Eyes of every size half open in a dark violet hide.',
    after: 'warlock',
    colours: [slot('hide', 'Hide colour', '#3a1a2a', ['Hide']), slot('eyes', 'Eye colour', '#c8a020', ['Eyes'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Hide', paint: photo('leather', 1.4, { lighting: 0.6 }), effects: [{ kind: 'recolour', on: true, amount: 1, stops: [{ at: 0, color: '#05020a', opacity: 1 }, { at: 0.5, color: '#3a1a2a', opacity: 1 }, { at: 1, color: '#8a5a7a', opacity: 1 }] }, bevel({ size: 0.4, gloss: 0.3 }), DROP] },
      { ...textureLayer('eyes'), name: 'Eyes', color: '#c8a020', seed: 0xe7e6 },
    ],
  },
  {
    id: 'warlock-void',
    name: 'Void cracks',
    description: 'Black obsidian split by cracks glowing violet.',
    after: 'warlock',
    stage: { bloom: 0.3, bleed: 0.2 },
    colours: [slot('glow', 'Glow colour', '#a04aff', ['Glowing cracks', 'Second cracks'])],
    layers: () => [
      ...base({ light: '#3a3040', dark: '#020103', step: null }),
      overlay('black-onyx', 6, 'overlay', 0.7),
      glowCracks('#100418', '#a04aff', '#c08aff'),
      { ...glowCracks('#100418', '#6a2aff', '#a08aff', 3, 0.7), name: 'Second cracks' },
    ],
  },
  {
    id: 'warlock-sigils',
    name: 'Hex sigils',
    description: 'Dark violet with glowing sigils at the quarters and drifting smoke.',
    after: 'warlock',
    stage: { bloom: 0.25 },
    colours: [slot('band', 'Frame colour', '#2a1038', ['Band', 'Smoke']), slot('glow', 'Sigil colour', '#d08aff', ['Sigils'])],
    layers: () => [
      ...base({ light: '#4a2a6a', dark: '#06020a', step: null }),
      { ...textureLayer('smoke'), name: 'Smoke', color: '#8a6aaa', color2: '#06020a', opacity: 0.6, seed: 0x5e0f },
      { ...repeatLayer(), name: 'Sigils', element: 'star', count: 4, at: 0.5, size: 1.1, fill: '#f0d8ff', raised: false, shaded: false, effects: [glow({ color: '#d08aff', opacity: 0.9, size: 0.14 }), contact(0.4)] },
    ],
  },
  // ── artificer ──
  {
    id: 'artificer-pipes',
    name: 'Copper pipework',
    description: 'Copper pipes joined by brass collars round the band.',
    after: 'artificer',
    colours: [slot('pipes', 'Pipe colour', '#c06a3a', ['Pipes']), slot('collars', 'Collar colour', '#b5813a', ['Collars'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Back plate', paint: { kind: 'solid', color: '#1e1a16' }, effects: [DROP] },
      ...[0.3, 0.7].map((at) => ({ ...lineLayer(), name: 'Pipes', at, width: 0.3, paint: { kind: 'solid' as const, color: '#c06a3a' }, effects: [bevel({ profile: 'rounded', size: 0.9, depth: 1.4, gloss: 0.9 }), contact(0.5)] })),
      { ...repeatLayer(), name: 'Collars', element: 'square', count: 8, at: 0.5, size: 0.9, stretch: 0.25, fill: '#b5813a', raised: true, effects: [recolour(BRONZE_STOPS), bevel({ size: 0.4, gloss: 0.8 }), contact(0.6)] },
    ],
  },
  {
    id: 'artificer-workshop',
    name: 'Workshop iron',
    description: 'Riveted iron plates with brass bolts.',
    after: 'artificer',
    colours: [slot('metal', 'Iron colour', '#5a5e66', ['Plates']), slot('bolts', 'Bolt colour', '#b5813a', ['Bolts'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Plates', paint: brass(1.6), effects: [...metalFx(['#050608', '#1a1e24', '#5a5e66', '#9aa0aa', '#d8dce4'], 0.2, 0.6), DROP] },
      { ...repeatLayer(), name: 'Plate joins', element: 'tick', count: 10, at: 0.5, size: 1.1, stretch: 0.1, fill: '#0a0a0c', raised: false, shaded: false, opacity: 0.7 },
      { ...repeatLayer(), name: 'Bolts', element: 'bead', count: 20, at: 0.2, size: 0.18, fill: '#b5813a', raised: true, effects: [recolour(BRONZE_STOPS), contact(0.6)] },
      { ...repeatLayer(), name: 'Bolts', element: 'bead', count: 20, at: 0.8, size: 0.18, fill: '#b5813a', raised: true, effects: [recolour(BRONZE_STOPS), contact(0.6)] },
      ...rims(),
    ],
  },
  // ── gilded-laurel ──
  {
    id: 'gilded-laurel-enamel',
    name: 'Laurel on enamel',
    description: 'Gold laurel leaves laid on a deep green enamel band with a pressed-in step, like a victor’s medal.',
    after: 'gilded-laurel',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    colours: [slot('band', 'Enamel colour', '#1e5a3a', ['Band', 'Pressed-in step']), slot('gold', 'Leaf colour', '#d8a838', ['Outer leaves', 'Inner leaves'])],
    layers: () => [
      ...base({ light: '#2e8a58', dark: '#04180c', step: 0.55 }),
      laurelLeaves('Outer leaves', 0.3, -68, '#d8a838', WARM_GOLD),
      laurelLeaves('Inner leaves', 0.72, 68, '#d8a838', WARM_GOLD, { offset: 0.5 }),
    ],
  },
  {
    id: 'gilded-laurel-wreath',
    name: 'Victor’s wreath',
    description: 'A real wreath: gilded laurel twigs growing round each other.',
    after: 'gilded-laurel',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    colours: [slot('gold', 'Leaf colour', '#d8a838', ['Wreath', 'Second wreath'])],
    layers: () => [
      { ...growthLayer('vine'), name: 'Wreath', count: 2, thickness: 0.05, amplitude: 0.16, waveLength: 1.3, extra: 'leaves', extraSpacing: 0.1, extraSize: 0.55, color: '#a8782a', extraColor: '#d8a838', effects: [...goldFx(0.35, WARM_GOLD), DROP] },
      { ...growthLayer('vine'), name: 'Second wreath', count: 1, thickness: 0.035, amplitude: 0.22, waveLength: 1.9, extra: 'leaves', extraSpacing: 0.13, extraSize: 0.45, color: '#a8782a', extraColor: '#e8c060', seed: 5, effects: [...goldFx(0.35, WARM_GOLD), contact(0.5)] },
    ],
  },
  {
    id: 'gilded-laurel-jewelled',
    name: 'Jewelled wreath',
    description: 'The gilded wreath with six sharply cut sapphires held in gold claws round it.',
    after: 'gilded-laurel',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    colours: [slot('gold', 'Leaf colour', '#d8a838', ['Wreath', 'Second wreath', 'Gems']), slot('gems', 'Gem colour', '#1f4fd0', ['Gems'])],
    layers: () => [
      { ...growthLayer('vine'), name: 'Wreath', count: 2, thickness: 0.05, amplitude: 0.16, waveLength: 1.3, extra: 'leaves', extraSpacing: 0.1, extraSize: 0.55, color: '#a8782a', extraColor: '#d8a838', effects: [...goldFx(0.35, WARM_GOLD), DROP] },
      { ...growthLayer('vine'), name: 'Second wreath', count: 1, thickness: 0.035, amplitude: 0.22, waveLength: 1.9, extra: 'leaves', extraSpacing: 0.13, extraSize: 0.45, color: '#a8782a', extraColor: '#e8c060', seed: 5, effects: [...goldFx(0.35, WARM_GOLD), contact(0.5)] },
      { ...repeatLayer(), name: 'Gems', element: 'gem', count: 6, at: 0.5, size: 0.85, fill: '#1f4fd0', raised: false, gemCut: 'brilliant', gemFacets: 10, gemTable: 0.46, gemCrown: 1, gemSparkle: 0.8, setting: 'claws6', settingColor: '#d8a838', settingEffects: [...goldFx(0.3, WARM_GOLD)], effects: [contact(0.7)] },
    ],
  },
  {
    id: 'gilded-laurel-silver-olive',
    name: 'Silver olive',
    description: 'Slim silver olive leaves on a cool slate band, shaded with the twin gradients rather than a bevel.',
    after: 'gilded-laurel',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    colours: [slot('band', 'Band colour', '#3a4652', ['Band', 'Pressed-in step']), slot('leaves', 'Leaf colour', '#c8ccd4', ['Outer leaves', 'Inner leaves'])],
    layers: () => [
      ...base({ light: '#62707e', dark: '#0a0e12', step: 0.55 }),
      { ...laurelLeaves('Outer leaves', 0.3, -72, '#c8ccd4', SILVER_STOPS, { count: 30, size: 0.8 }), stretch: 0.32 },
      { ...laurelLeaves('Inner leaves', 0.72, 72, '#c8ccd4', SILVER_STOPS, { count: 30, size: 0.8, offset: 0.5 }), stretch: 0.32 },
    ],
  },
  {
    id: 'gilded-laurel-oath',
    name: 'Laurel oath',
    description: 'A single row of laurel round the outside and a Yugurian oath engraved in the pressed-in step.',
    after: 'gilded-laurel',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    colours: [slot('band', 'Band colour', '#7a1a1e', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#d8a838', ['Laurel', 'Oath'])],
    layers: () => [
      ...base({ light: '#b03038', dark: '#1a0204', step: 0.55 }),
      laurelLeaves('Laurel', 0.28, -70, '#d8a838', WARM_GOLD, { count: 28, size: 0.75 }),
      inscription('yugurian', '#f4d27a', { name: 'Oath', at: 0.78, size: 0.3, start: 4, effects: [...goldFx(0.4, WARM_GOLD), contact(0.5)] }),
    ],
  },
  // ── iron-rivets ──
  {
    id: 'iron-rivets-blackened',
    name: 'Blackened iron',
    description: 'Dark hammered iron shaded with the twin gradient bands, with a ring of bright steel rivets.',
    after: 'iron-rivets',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    colours: [slot('iron', 'Iron colour', '#4a5058', ['Iron plate']), slot('rivets', 'Rivet colour', '#a8b0ba', ['Rivets'])],
    layers: () => bandShading([ironPlate('Iron plate', IRON_PLATE), ironRivets('Rivets', 0.3, '#a8b0ba', STEEL_STOPS)]),
  },
  {
    id: 'iron-rivets-rusted',
    name: 'Rusted plate',
    description: 'Iron gone orange with rust at the edges, held together with dark rivets.',
    after: 'iron-rivets',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    colours: [slot('rust', 'Rust colour', '#9a4a1e', ['Rust']), slot('rivets', 'Rivet colour', '#5a5e66', ['Rivets'])],
    layers: () => bandShading([
      ironPlate('Iron plate', IRON_PLATE),
      { ...bandFillLayer(), name: 'Rust', paint: photo('rust', 1.2), opacity: 0.9, blend: 'color', clip: 'band' },
      { ...bandFillLayer(), name: 'Rust', paint: photo('rust', 1.2), opacity: 0.35, blend: 'multiply', clip: 'band' },
      ironRivets('Rivets', 0.3, '#5a5e66', IRON_PLATE),
    ]),
  },
  {
    id: 'iron-rivets-dwarven',
    name: 'Dwarven strapwork',
    description: 'Heavy iron plates with joins between them, two rows of rivets and a thin brass trim line.',
    after: 'iron-rivets',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    colours: [slot('iron', 'Iron colour', '#4a5058', ['Iron plate']), slot('brass', 'Brass colour', '#b5813a', ['Brass trim', 'Rivets'])],
    layers: () => bandShading([
      ironPlate('Iron plate', IRON_PLATE, 'metal-plate'),
      { ...repeatLayer(), name: 'Plate joins', element: 'tick', count: 8, at: 0.5, size: 1.1, stretch: 0.08, fill: '#050608', raised: false, shaded: false, opacity: 0.75 },
      { ...lineLayer(), name: 'Brass trim', at: 0.5, width: 0.05, paint: { kind: 'solid', color: '#b5813a' }, effects: [...metalFx(BRONZE_STOPS, 0.6, 0.8), contact(0.5)] },
      ironRivets('Rivets', 0.22, '#b5813a', BRONZE_STOPS, 24, 0.16),
      ironRivets('Rivets', 0.78, '#b5813a', BRONZE_STOPS, 24, 0.16),
    ]),
  },
  {
    id: 'iron-rivets-forge-script',
    name: 'Forge script',
    description: 'Black iron with a Sith AF inscription glowing forge-orange between two rows of rivets.',
    after: 'iron-rivets',
    stage: { thickness: 0.2, outerSpacing: 0.02, bloom: 0.2 },
    colours: [slot('iron', 'Iron colour', '#3a3e46', ['Iron plate']), slot('glow', 'Glow colour', '#ff7a2a', ['Forge script'])],
    layers: () => bandShading([
      ironPlate('Iron plate', ['#020203', '#0e1014', '#3a3e46', '#6a707a', '#a8b0b8']),
      ironRivets('Rivets', 0.14, '#8a929c', STEEL_STOPS, 24, 0.14),
      ironRivets('Rivets', 0.86, '#8a929c', STEEL_STOPS, 24, 0.14),
      inscription('sith', '#ffd0a0', { name: 'Forge script', at: 0.5, size: 0.36, start: 6, effects: [glow({ color: '#ff7a2a', opacity: 0.9, size: 0.12 })] }),
    ], { step: null }),
  },
  {
    id: 'iron-rivets-gunmetal',
    name: 'Gunmetal bolts',
    description: 'Smooth blue-grey gunmetal with hex bolts and a fine brushed finish.',
    after: 'iron-rivets',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    colours: [slot('metal', 'Metal colour', '#3a4450', ['Gunmetal', 'Brushing']), slot('bolts', 'Bolt colour', '#c8ced6', ['Bolts'])],
    layers: () => bandShading([
      { ...bandFillLayer(), name: 'Gunmetal', paint: { kind: 'linear', angle: 45, followLight: false, stops: [{ at: 0, color: '#6a7686', opacity: 1 }, { at: 1, color: '#0c1016', opacity: 1 }] }, effects: [DROP] },
      { ...textureLayer('brushed'), name: 'Brushing', color: '#ffffff', opacity: 0.25, seed: 0xb707 },
      { ...repeatLayer(), name: 'Bolts', element: 'bead', count: 12, at: 0.3, size: 0.3, fill: '#c8ced6', raised: true, effects: [...metalFx(STEEL_STOPS, 0.5, 0.9), contact(0.7)] },
    ]),
  },
  // ── runestone ──
  {
    id: 'runestone-mossy',
    name: 'Mossy runestone',
    description: 'Old weathered stone with moss creeping over the outer edge and runes carved but long gone dark.',
    after: 'runestone',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    colours: [slot('stone', 'Stone colour', '#7a786e', ['Stone']), slot('moss', 'Moss colour', '#5a7a2a', ['Moss'])],
    layers: () => bandShading([
      runeStone('Stone', 'mossy-rock', 1.4),
      { ...bandFillLayer(), name: 'Moss', from: 0, to: 0.45, paint: photo('moss', 1), opacity: 0.85, clip: 'band', effects: [{ kind: 'distort', on: true, amount: 0.3, scale: 0.4, seed: 8 }, contact(0.4)] },
      inscription('babelstone', '#3a382e', { name: 'Runes', at: 0.75, size: 0.32, start: 3, effects: [carvedIn({ size: 0.6 })] }),
    ]),
  },
  {
    id: 'runestone-ember',
    name: 'Ember runes',
    description: 'Dark volcanic rock split by glowing cracks, with Yugurian runes burning orange.',
    after: 'runestone',
    stage: { thickness: 0.2, outerSpacing: 0.02, bloom: 0.3 },
    colours: [slot('stone', 'Stone colour', '#3a3430', ['Stone']), slot('glow', 'Glow colour', '#ff7a2a', ['Glowing cracks', 'Runes'])],
    layers: () => bandShading([
      runeStone('Stone', 'dark-rock', 1.4),
      glowCracks('#1a0a04', '#ff7a2a', '#ffb05a', 7, 0.7),
      inscription('yugurian', '#ffe0b0', { name: 'Runes', at: 0.3, size: 0.38, start: 1, effects: [carvedIn(), glow({ color: '#ff7a2a', opacity: 0.9, size: 0.12 })] }),
    ]),
  },
  {
    id: 'runestone-frost',
    name: 'Frost runes',
    description: 'Blue-grey stone furred with frost, with BabelStone runes glowing icy cyan.',
    after: 'runestone',
    stage: { thickness: 0.2, outerSpacing: 0.02, bloom: 0.25 },
    colours: [slot('stone', 'Stone colour', '#6a7a88', ['Stone']), slot('glow', 'Rune colour', '#8af0ff', ['Runes'])],
    layers: () => bandShading([
      runeStone('Stone', 'granite', 1.4, ['#06080c', '#2a3440', '#6a7a88', '#b8c8d6', '#f0f8ff']),
      { ...textureLayer('frost'), name: 'Frost', color: '#e8f8ff', opacity: 0.7, seed: 0xf205 },
      inscription('babelstone', '#e8fcff', { name: 'Runes', at: 0.3, size: 0.4, start: 5, effects: [carvedIn(), glow({ color: '#8af0ff', opacity: 0.85, size: 0.12 })] }),
    ]),
  },
  {
    id: 'runestone-gilded-slate',
    name: 'Gilded slate',
    description: 'Smooth dark slate with runes carved in and filled with gold leaf, and a gold rune at each quarter.',
    after: 'runestone',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    colours: [slot('stone', 'Slate colour', '#2e3238', ['Stone']), slot('gold', 'Gold colour', '#d8a838', ['Runes', 'Rune stones'])],
    layers: () => bandShading([
      runeStone('Stone', 'black-onyx', 3, ['#020304', '#121418', '#2e3238', '#5a606a', '#8a909a']),
      inscription('babelstone', '#f4d27a', { name: 'Runes', at: 0.76, size: 0.28, start: 2, effects: [...goldFx(0.3, WARM_GOLD)] }),
      { ...repeatLayer(), name: 'Rune stones', element: 'rune', count: 4, at: 0.2, size: 0.38, fill: '#d8a838', raised: false, effects: [...goldFx(0.4, WARM_GOLD), contact(0.5)] },
    ]),
  },
  // ── thorns ──
  {
    id: 'thorns-rose-briar',
    name: 'Rose briar',
    description: 'Dark thorny stems wound round each other with deep red roses blooming at intervals.',
    after: 'thorns',
    stage: { thickness: 0.16, outerSpacing: 0.06 },
    colours: [slot('stem', 'Stem colour', '#3a2a1a', ['Briar', 'Second briar']), slot('roses', 'Rose colour', '#a01828', ['Roses'])],
    layers: () => [
      { ...briar('Briar', '#3a2a1a', '#1a120a'), effects: [bevel({ size: 0.5, gloss: 0.3 }), DROP] },
      { ...briar('Second briar', '#4a3420', '#1e140a', { count: 1, thickness: 0.06, waveLength: 2.2, seed: 7 }), effects: [bevel({ size: 0.5, gloss: 0.3 }), contact(0.6)] },
      { ...growthLayer('vine'), name: 'Leaves', count: 1, thickness: 0.025, amplitude: 0.2, waveLength: 1.9, extra: 'leaves', extraSize: 0.3, color: '#2a3a1a', extraColor: '#2e5a22', seed: 3, effects: [bevel({ size: 0.4, gloss: 0.3 }), contact(0.5)] },
      // Frame review (owner's pick): shaded rose pictures in the spirals' red, with depth.
      briarRoses(),
    ],
  },
  {
    id: 'thorns-bark-bramble',
    name: 'Bramble on bark',
    description: 'A narrow ring of bark, shaded with gradient bands, with a thorny bramble climbing over it.',
    after: 'thorns',
    stage: { thickness: 0.16, outerSpacing: 0.04 },
    colours: [slot('bark', 'Bark colour', '#5f5040', ['Bark']), slot('stem', 'Bramble colour', '#4a3020', ['Bramble'])],
    layers: () => [
      ...bandShading([{ ...bandFillLayer(), name: 'Bark', from: 0.2, to: 0.8, paint: photo('bark', 1.4, { angle: 90, lighting: 0.4 }), effects: [recolour(['#0a0604', '#2a1e14', '#5f5040', '#8a7a64', '#b8a888']), DROP] }], { step: null }),
      { ...briar('Bramble', '#4a3020', '#24160a', { count: 2, thickness: 0.07, amplitude: 0.32, size: 0.35 }), effects: [bevel({ size: 0.5, gloss: 0.35 }), contact(0.7)] },
    ],
  },
  {
    id: 'thorns-silverwork',
    name: 'Silverwork thorns',
    description: 'A jeweller’s crown of thorns in polished silver, set with small amethysts.',
    after: 'thorns',
    stage: { thickness: 0.16, outerSpacing: 0.06 },
    colours: [slot('metal', 'Metal colour', '#c8ccd4', ['Briar', 'Second briar']), slot('gems', 'Gem colour', '#8a3ac0', ['Gems'])],
    layers: () => [
      { ...briar('Briar', '#c8ccd4', '#e8ecf0', { thickness: 0.07 }), effects: [...metalFx(SILVER_STOPS, 0.5, 0.9), DROP] },
      { ...briar('Second briar', '#a8aeb8', '#d8dce4', { count: 1, thickness: 0.05, waveLength: 2.2, seed: 7 }), effects: [...metalFx(SILVER_STOPS, 0.5, 0.9), contact(0.6)] },
      { ...repeatLayer(), name: 'Gems', element: 'gem', count: 6, at: 0.5, size: 0.36, fill: '#8a3ac0', raised: false, gemSparkle: 0.7, effects: [contact(0.6)] },
    ],
  },
  // ── dragon-scales ──
  {
    id: 'dragon-scales-red',
    name: 'Red dragon',
    description: 'Crimson scales, glossy and shaded with the twin gradient bands, between thin gold edges.',
    after: 'dragon-scales',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('scales', 'Scale colour', '#b8322a', ['Scales']), slot('gold', 'Edge colour', '#d8a838', ['Outer edge', 'Inner edge'])],
    layers: () => [...bandShading([dragonUnder('#200404'), dragonScales('Scales', '#e04a3a', { from: 0.06, to: 0.94 })]), dragonEdge('Outer edge', 0.03), dragonEdge('Inner edge', 0.97)],
  },
  {
    id: 'dragon-scales-black',
    name: 'Black dragon',
    description: 'Glossy black scales with a violet sheen, like oil on obsidian.',
    after: 'dragon-scales',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('scales', 'Scale colour', '#1a1620', ['Scales']), slot('sheen', 'Sheen colour', '#8a4ad0', ['Sheen'])],
    layers: () => bandShading([
      dragonUnder('#020104'),
      dragonScales('Scales', '#1a1620', { gloss: 0.9 }),
      { ...bandFillLayer(), name: 'Sheen', paint: lin(['#8a4ad0', '#000000', '#2a8ad0'], 30), opacity: 0.55, blend: 'screen' },
    ]),
  },
  {
    id: 'dragon-scales-wyrm-script',
    name: 'Wyrm script',
    description: 'Green scales on the outside and a gold band in the pressed-in step with draconic words in Sith AF.',
    after: 'dragon-scales',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('scales', 'Scale colour', '#3a7a2a', ['Scales']), slot('band', 'Band colour', '#3a1a08', ['Script band']), slot('gold', 'Script colour', '#d8a838', ['Draconic'])],
    layers: () => [
      ...bandShading([dragonUnder('#081404'), dragonScales('Scales', '#3a7a2a', { to: 0.58 })], { step: null }),
      { ...bandFillLayer(), name: 'Script band', from: 0.58, to: 1, paint: lin(['#6a3a14', '#140602'], 225) },
      { ...lineLayer(), name: 'Crease', at: 0.58, width: 0.03, opacity: 0.55, blend: 'overlay', paint: { kind: 'solid', color: '#190500' } },
      inscription('sith', '#f4d27a', { name: 'Draconic', at: 0.79, size: 0.3, start: 8, effects: [...goldFx(0.4, WARM_GOLD)] }),
    ],
  },
  // ── celestial ──
  {
    id: 'celestial-sun-moon',
    name: 'Sun & moon',
    description: 'Day fading into night round the band: gold sun at the top, silver moon at the bottom, stars between.',
    after: 'celestial',
    stage: { thickness: 0.16, outerSpacing: 0.03, bloom: 0.2 },
    colours: [slot('day', 'Day colour', '#e8a040', ['Band']), slot('night', 'Night colour', '#141a4a', ['Night'])],
    layers: () => [
      ...base({ light: '#f4c060', dark: '#a85020', step: null }),
      { ...bandFillLayer(), name: 'Night', paint: { kind: 'linear', angle: 90, followLight: false, stops: [{ at: 0.3, color: '#141a4a', opacity: 0 }, { at: 0.7, color: '#141a4a', opacity: 1 }] } },
      { ...celestialStars(16, 0.5, 0.18), offset: 0.5 },
      { ...repeatLayer(), name: 'Sun', element: 'sun', count: 1, snapToCorners: false, at: 0.5, size: 1.15, fill: '#f4d27a', raised: false, effects: [...goldFx(0.4, WARM_GOLD), glow({ color: '#ffd080', opacity: 0.6, size: 0.1 })] },
      { ...repeatLayer(), name: 'Moon', element: 'crescent', count: 1, snapToCorners: false, offset: 0.5, at: 0.5, size: 1, fill: '#d8dce4', raised: false, effects: [...metalFx(SILVER_STOPS, 0.4, 0.9), glow({ color: '#c0d0ff', opacity: 0.5, size: 0.08 })] },
    ],
  },
  {
    id: 'celestial-astrolabe',
    name: 'Astrolabe',
    description: 'A brass astrolabe ring with fine degree marks and star names in Outer Rim AF.',
    after: 'celestial',
    stage: { thickness: 0.16, outerSpacing: 0.03 },
    colours: [slot('brass', 'Brass colour', '#b5813a', ['Band', 'Pressed-in step']), slot('marks', 'Mark colour', '#2a1a08', ['Degrees', 'Star names'])],
    layers: () => [
      ...base({ light: '#e0b060', dark: '#3a2208', step: 0.62 }),
      { ...repeatLayer(), name: 'Degrees', element: 'tick', count: 72, at: 0.8, size: 0.3, stretch: 0.2, fill: '#2a1a08', raised: false, shaded: false, accentEvery: 6, accentScale: 1.7 },
      inscription('outerRim', '#2a1a08', { name: 'Star names', at: 0.3, size: 0.34, start: 5, effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.4 })] }),
    ],
  },
  // ── rope ──
  {
    id: 'rope-sailors',
    name: 'Sailor’s rope',
    description: 'Tarred rope coiled over a navy band, with a brass ring lashed on at each quarter.',
    after: 'rope',
    stage: { thickness: 0.14, outerSpacing: 0.03 },
    colours: [slot('band', 'Band colour', '#1a2a4a', ['Band']), slot('rope', 'Rope colour', '#c8a870', ['Rope', 'Rope twist']), slot('brass', 'Ring colour', '#b5813a', ['Rings'])],
    layers: () => [
      ...bandShading([{ ...bandFillLayer(), name: 'Band', paint: { kind: 'linear', angle: 45, followLight: false, stops: [{ at: 0, color: '#2a4a7a', opacity: 1 }, { at: 1, color: '#040a18', opacity: 1 }] }, effects: [DROP] }], { step: null }),
      ...ropeStrand('Rope', '#c8a870', { from: 0.25, to: 0.75 }),
      { ...ropeRound(), from: 0.25, to: 0.75 },
      { ...repeatLayer(), name: 'Rings', element: 'circle', count: 4, at: 0.5, size: 0.8, fill: '#b5813a', outline: null, raised: true, effects: [...metalFx(BRONZE_STOPS, 0.5, 0.9), contact(0.7)] },
    ],
  },
  {
    id: 'rope-braided-leather',
    name: 'Braided leather',
    description: 'A tight plait of dark leather cord with a soft sheen, bound with a copper wire every so often.',
    after: 'rope',
    stage: { thickness: 0.14, outerSpacing: 0.03 },
    colours: [slot('leather', 'Leather colour', '#5a3420', ['Cord', 'Cord twist']), slot('wire', 'Binding colour', '#c06a3a', ['Bindings'])],
    layers: () => [
      ...ropeStrand('Cord', '#5a3420', { seed: 0xbeef }),
      { ...bandFillLayer(), name: 'Leather', paint: photo('leather', 0.8), opacity: 0.45, blend: 'overlay' },
      ropeRound(),
      { ...repeatLayer(), name: 'Bindings', element: 'square', count: 8, at: 0.5, size: 1, stretch: 0.22, fill: '#c06a3a', raised: true, effects: [...metalFx(['#1e0a04', '#6a3014', '#c06a3a', '#f0b08a', '#fff0e0'], 0.6, 0.9), contact(0.6)] },
    ],
  },
  // ── shield-rim ──
  {
    id: 'shield-rim-viking',
    name: 'Viking shield',
    description: 'Planks painted deep red, an iron rim and iron nails, shaded with gradients instead of a bevel.',
    after: 'shield-rim',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('paint', 'Paint colour', '#a01a1a', ['Paint']), slot('rim', 'Rim colour', '#6a7078', ['Steel rim'])],
    layers: () => [
      { ...shieldPlanks(['#1a0202', '#5a0a0a', '#a01a1a', '#d05a4a', '#f0b0a0']), name: 'Paint' },
      plankJoins(),
      shieldRim('Steel rim', ['#06080a', '#22262c', '#6a7078', '#a8b0b8', '#e0e6ec']),
      shieldNails('#6a7078', STEEL_STOPS),
      ...shieldShading(),
    ],
  },
  {
    id: 'shield-rim-hoplite',
    name: 'Bronze hoplite',
    description: 'A wide polished bronze rim with a Yugurian battle cry engraved round it, over dark oak.',
    after: 'shield-rim',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('bronze', 'Bronze colour', '#a87a3a', ['Bronze rim']), slot('wood', 'Wood colour', '#4a2a14', ['Planks'])],
    layers: () => [
      shieldPlanks(['#0a0402', '#2a160a', '#4a2a14', '#7a5030', '#a8805a']),
      plankJoins(),
      { ...shieldRim('Bronze rim', BRONZE_STOPS), to: 0.5 },
      inscription('yugurian', '#3a2208', { name: 'Battle cry', at: 0.25, size: 0.32, start: 9, effects: [bevel({ direction: 'sunken', size: 0.5, gloss: 0.4 })] }),
      { ...shieldShading()[0], to: 0.5 }, { ...shieldShading()[1], from: 0.5 }, { ...shieldShading()[2], at: 0.5 },
    ],
  },
  {
    id: 'shield-rim-heraldry',
    name: 'Knight’s heraldry',
    description: 'Blue enamel field with a gold rim, gold nails and a fleur-de-lys at each quarter.',
    after: 'shield-rim',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('field', 'Field colour', '#1a3a8a', ['Field']), slot('gold', 'Gold colour', '#d8a838', ['Gold rim', 'Nails', 'Fleurs'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Field', from: 0.4, to: 1, paint: lin(['#2a5ab0', '#081a48']) },
      { ...repeatLayer(), name: 'Fleurs', element: 'fleur', count: 4, at: 0.71, size: 0.62, fill: '#d8a838', raised: false, effects: [...goldFx(0.4, WARM_GOLD)] },
      { ...shieldRim('Gold rim', WARM_GOLD), paint: photo('gold', 1, { lighting: 0.3 }) },
      shieldNails('#d8a838', WARM_GOLD),
      ...shieldShading(),
    ],
  },
  {
    id: 'shield-rim-battle-worn',
    name: 'Battle-worn',
    description: 'A scarred shield: chipped steel rim, splintered planks, one nail missing.',
    after: 'shield-rim',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('rim', 'Rim colour', '#6a7078', ['Steel rim'])],
    layers: () => [
      shieldPlanks(['#0a0602', '#2e1e10', '#5a4028', '#8a7050', '#b8a080']),
      plankJoins(),
      { ...shieldRim('Steel rim', ['#06080a', '#22262c', '#6a7078', '#a8b0b8', '#e0e6ec']), effects: [recolour(['#06080a', '#22262c', '#6a7078', '#a8b0b8', '#e0e6ec']), wear({ chips: 0.12, polish: 0.2, grime: 0.6, scale: 0.12, scratches: 0.5 }), DROP] },
      { ...shieldNails('#8a8478', STEEL_STOPS), missing: 0.1 },
      ...shieldShading(),
    ],
  },
  {
    id: 'shield-rim-leather-bound',
    name: 'Leather-bound',
    description: 'Oak planks with a stitched leather edge instead of metal, and brass studs.',
    after: 'shield-rim',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('leather', 'Leather colour', '#5a3420', ['Leather edge']), slot('brass', 'Stud colour', '#b5813a', ['Nails'])],
    layers: () => [
      shieldPlanks(),
      plankJoins(),
      { ...bandFillLayer(), name: 'Leather edge', to: 0.42, paint: photo('leather', 1.2, { lighting: 0.3 }), effects: [recolour(['#0a0402', '#2a160a', '#5a3420', '#8a6040', '#b89070']), DROP] },
      { ...lineLayer(), name: 'Stitching', at: 0.36, width: 0.03, dash: 'dashed', paint: { kind: 'solid', color: '#d8c8a0' } },
      { ...lineLayer(), name: 'Stitching', at: 0.06, width: 0.03, dash: 'dashed', paint: { kind: 'solid', color: '#d8c8a0' } },
      shieldNails('#b5813a', BRONZE_STOPS),
      ...shieldShading(),
    ],
  },
  // ── border-filigree ──
  {
    id: 'gilded-filigree-sapphire',
    name: 'Sapphire filigree',
    description: 'Deep blue enamel glittering faintly, between warm gold filigree bands.',
    after: 'filigree-border',
    colours: [slot('enamel', 'Enamel colour', '#1a3aa0', ['Enamel']), slot('gold', 'Gold colour', '#c8952e', ['Outer gold', 'Inner gold', 'Outer filigree', 'Inner filigree'])],
    stage: { thickness: 0.25, outerSpacing: 0.01 },
    layers: () => [
      enamelChannel('Enamel', '#3a6ae0', '#060e30'),
      { ...textureLayer('sparkle'), name: 'Glitter', from: 0.3, to: 0.72, color: '#e8f0ff', amount: 0.6, scale: 0.5, seed: 0x5a38 },
      ...filigreeBands(WARM_GOLD),
    ],
  },
  {
    id: 'gilded-filigree-emerald-script',
    name: 'Emerald script',
    description: 'Emerald enamel with a raised gold Yugurian inscription running through it, between filigree bands.',
    after: 'filigree-border',
    colours: [slot('enamel', 'Enamel colour', '#1a7a4a', ['Enamel']), slot('gold', 'Gold colour', '#c8952e', ['Outer gold', 'Inner gold', 'Outer filigree', 'Inner filigree', 'Inscription'])],
    stage: { thickness: 0.25, outerSpacing: 0.01 },
    layers: () => [
      enamelChannel('Enamel', '#2aa868', '#041a0c'),
      ...filigreeBands(WARM_GOLD),
      inscription('yugurian', '#f4d27a', { name: 'Inscription', at: 0.51, size: 0.3, start: 3, effects: [...goldFx(0.4, WARM_GOLD)] }),
    ],
  },
  // ── border-guild ──
  {
    id: 'guild-gold-shaded',
    name: 'Gold guild ring',
    description: 'The gold guild ring shaded with the twin gradients instead of a bevel, its four arrow studs kept inside the band.',
    after: 'guild-gold',
    stage: { thickness: 0.15, outerSpacing: 0.02 },
    colours: [slot('metal', 'Metal colour', '#c8952e', ['Band', 'Pressed-in step', 'Studs'])],
    layers: () => [...guildBand(WARM_GOLD, '#4a2c08'), guildStuds('#c8952e', WARM_GOLD)],
  },
  {
    id: 'guild-silver-sapphire',
    name: 'Silver & sapphire',
    description: 'A silver guild ring with a cut sapphire set at each quarter instead of the arrow studs.',
    after: 'guild-gold',
    stage: { thickness: 0.15, outerSpacing: 0.02 },
    colours: [slot('metal', 'Metal colour', '#b8bcc4', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#1f4fd0', ['Gems'])],
    layers: () => [
      ...guildBand(SILVER_STOPS, '#2a2e36'),
      { ...repeatLayer(), name: 'Gems', element: 'gem', count: 4, at: 0.5, size: 0.8, fill: '#1f4fd0', raised: false, gemFacets: 10, gemSparkle: 0.8, setting: 'claws4', settingColor: '#d8dce4', settingEffects: [...metalFx(SILVER_STOPS, 0.3, 0.9)], effects: [contact(0.7)] },
    ],
  },
  {
    id: 'guild-bronze-enamel',
    name: 'Bronze & enamel',
    description: 'A bronze guild ring with a blue enamel step on the inside and bronze studs.',
    after: 'guild-gold',
    stage: { thickness: 0.15, outerSpacing: 0.02 },
    colours: [slot('metal', 'Metal colour', '#a87a3a', ['Band', 'Studs']), slot('enamel', 'Enamel colour', '#1a4a8a', ['Pressed-in step'])],
    layers: () => {
      const ls = guildBand(BRONZE_STOPS, '#2a1606');
      ls[1] = { ...bandFillLayer(), name: 'Pressed-in step', from: 0.62, to: 1, paint: lin(['#0a1a38', '#3a7ac8']) };
      return [...ls, guildStuds('#a87a3a', BRONZE_STOPS)];
    },
  },
  // ── border-raven ──
  {
    id: 'raven-plume-sheen',
    name: 'Raven sheen',
    description: 'Fuller black plumage with the blue-violet sheen of a raven’s wing, between bright copper rims.',
    after: 'raven-plume',
    stage: { ...RAVEN_STAGE, bloom: 0.15 },
    colours: [slot('feathers', 'Feather colour', '#2a2e38', ['Feathers', 'Top feathers']), slot('rims', 'Rim colour', '#c8602a', ['Outer copper', 'Inner copper'])],
    layers: () => [
      ...deepPlumage('#2a2c38', '#020204', plumage('#2a2e38', '#5a6070'), [{ ...bandFillLayer(), name: 'Sheen', from: 0.08, to: 0.92, paint: lin(['#3a2a8a', '#000000', '#1a6a8a'], 30), opacity: 0.5, blend: 'screen' }]),
      plumeRim('Outer copper', 0.03, '#c8602a', '#ff6a2a'),
      plumeRim('Inner copper', 0.97, '#c8602a', '#ff6a2a'),
    ],
  },
  {
    id: 'raven-plume-bone',
    name: 'Plume & bone',
    description: 'Black feathers threaded with small carved bone beads, like a shaman’s talisman.',
    after: 'raven-plume',
    stage: RAVEN_STAGE,
    colours: [slot('feathers', 'Feather colour', '#2a2e38', ['Feathers', 'Top feathers']), slot('beads', 'Bead colour', '#e8dcc0', ['Bone beads'])],
    layers: () => [
      ...deepPlumage('#2a2c38', '#020204', plumage('#2a2e38', '#5a6070')),
      { ...repeatLayer(), name: 'Bone beads', element: 'bead', count: 12, at: 0.5, size: 0.34, stretch: 0.8, fill: '#e8dcc0', raised: true, effects: [contact(0.6)] },
      plumeRim('Outer rim', 0.03, '#8a6a40', null, 0.04),
      plumeRim('Inner rim', 0.97, '#8a6a40', null, 0.04),
    ],
  },
  {
    id: 'raven-plume-owl',
    name: 'Owl plume',
    description: 'Soft brown and cream barred owl feathers between bronze rims.',
    after: 'raven-plume',
    stage: RAVEN_STAGE,
    colours: [slot('feathers', 'Feather colour', '#8a6a44', ['Feathers', 'Top feathers']), slot('rims', 'Rim colour', '#a87a3a', ['Outer bronze', 'Inner bronze'])],
    layers: () => [
      ...deepPlumage('#6a4c30', '#140a04', plumage('#8a6a44', '#e8dcc0', 0xfeb1)),
      { ...lineLayer(), name: 'Outer bronze', at: 0.03, width: 0.06, paint: { kind: 'solid', color: '#a87a3a' }, effects: metalFx(BRONZE_STOPS, 0.6, 0.9) },
      { ...lineLayer(), name: 'Inner bronze', at: 0.97, width: 0.06, paint: { kind: 'solid', color: '#a87a3a' }, effects: metalFx(BRONZE_STOPS, 0.6, 0.9) },
    ],
  },
  // ── border-ember ──
  {
    id: 'emberforged-molten',
    name: 'Molten ring',
    description: 'Black iron shaded with gradients instead of a bevel, two grooves, and a wider ring of glowing lava inside.',
    after: 'emberforged',
    stage: { ...EMBER_STAGE, bloom: 0.25 },
    colours: [slot('iron', 'Iron colour', '#4a4e58', ['Black iron']), slot('lava', 'Lava colour', '#ff4a2a', ['Lava', 'Molten glass', 'Lava glow'])],
    layers: () => [...emberIron(), emberGrooves(), ...lavaRing(0.66, '#ff4a2a', '#5a0606', '#ff3a1a')],
  },
  {
    id: 'emberforged-forge-runes',
    name: 'Forge runes',
    description: 'Sith AF runes glowing hot on the iron, over a lava ring and glowing cracks.',
    after: 'emberforged',
    stage: { ...EMBER_STAGE, bloom: 0.3 },
    colours: [slot('iron', 'Iron colour', '#4a4e58', ['Black iron']), slot('glow', 'Glow colour', '#ff7a2a', ['Runes', 'Glowing cracks', 'Lava', 'Molten glass', 'Lava glow'])],
    layers: () => [
      ...emberIron(),
      glowCracks('#1a0a04', '#ff7a2a', '#ffb05a', 9, 0.5),
      inscription('sith', '#ffe0b0', { name: 'Runes', at: 0.3, size: 0.36, start: 5, effects: [glow({ color: '#ff7a2a', opacity: 0.9, size: 0.12 })] }),
      ...lavaRing(0.7, '#ff6a2a', '#5a0a04', '#ff5a1a'),
    ],
  },
  {
    id: 'emberforged-frostfire',
    name: 'Frostfire',
    description: 'The cold twin: frosted iron round a ring of glowing blue ice.',
    after: 'emberforged',
    stage: { ...EMBER_STAGE, bloom: 0.25 },
    colours: [slot('iron', 'Iron colour', '#5a6270', ['Black iron', 'Frost']), slot('glow', 'Glow colour', '#4ac8ff', ['Lava', 'Molten glass', 'Lava glow'])],
    layers: () => [
      ...emberIron('#5a6270', '#04060a'),
      { ...textureLayer('frost'), name: 'Frost', to: 0.6, color: '#e0f0ff', amount: 0.9, scale: 1.3, strength: 0.7, seed: 0xf206, blend: 'screen' },
      emberGrooves(),
      ...lavaRing(0.66, '#8ae8ff', '#06204a', '#4ac8ff'),
    ],
  },
  // ── border-storm ──
  {
    id: 'storm-wisps-arcane',
    name: 'Arcane storm',
    description: 'A violet storm with magenta light at its edges and pale lightning.',
    after: 'storm-wisps',
    stage: { ...STORM_STAGE, bloom: 0.3 },
    colours: [slot('cloud', 'Cloud colour', '#1a0e24', ['Storm']), slot('light', 'Lightning colour', '#f0c8ff', ['Lightning'])],
    layers: () => [stormRing('#1a0e24', '#8a70a0', '#b04ad0', '#e0c0f0'), lightning('#fff0ff', '#d070ff')],
  },
  {
    id: 'storm-wisps-sea-squall',
    name: 'Sea squall',
    description: 'Teal sea-spray and white mist whirling round, like a squall over dark water.',
    after: 'storm-wisps',
    stage: { ...STORM_STAGE, bloom: 0.15 },
    colours: [slot('sea', 'Sea colour', '#0a2a30', ['Storm'])],
    layers: () => [stormRing('#0a2a30', '#a8c8c8', '#3ac8b0', '#e8fafa')],
  },
  // ── border-plates ──
  {
    id: 'riveted-plates-ordered',
    name: 'Ordered plates',
    description: 'Even iron plates neatly riveted round a shaded iron ring, all inside the band.',
    after: 'riveted-plates',
    stage: PLATES_STAGE,
    colours: [slot('iron', 'Iron colour', '#66665a', ['Iron ring', 'Outer plates', 'Inner plates', 'Rivets'])],
    layers: () => [
      ...plateRing(PLATE_IRON),
      loosePlates('Outer plates', 0.27, 14, 0.42, '#a4a49e', PLATE_IRON),
      loosePlates('Inner plates', 0.73, 14, 0.42, '#9c9c96', PLATE_IRON, { offset: 0.5 }),
      plateRivets('Rivets', 0.27, 28, '#c8c8c0', PLATE_IRON, 0.25),
      plateRivets('Rivets', 0.73, 28, '#c8c8c0', PLATE_IRON, 0.75),
    ],
  },
  {
    id: 'riveted-plates-ordered-curved',
    name: 'Curved ordered plates',
    description: 'Two rows of iron plates that bend with the ring, a rivet at the centre of each.',
    after: 'riveted-plates',
    stage: PLATES_STAGE,
    colours: [slot('iron', 'Iron colour', '#66665a', ['Iron ring', 'Outer plates', 'Inner plates', 'Rivets'])],
    layers: () => [
      ...plateRing(PLATE_IRON),
      curvedPlates('Outer plates', 14, '#a4a49e', PLATE_IRON, { from: 0.06, to: 0.48 }),
      curvedPlates('Inner plates', 14, '#9c9c96', PLATE_IRON, { from: 0.52, to: 0.94, offset: 0.5 }),
      plateRivets('Rivets', 0.27, 14, '#c8c8c0', PLATE_IRON, 0.5),
      plateRivets('Rivets', 0.73, 14, '#c8c8c0', PLATE_IRON, 0),
    ],
  },  {
    id: 'riveted-plates-forge-seams-curved',
    name: 'Curved forge seams',
    description: 'Blackened steel plates that bend with the ring, with red-hot seams running straight across the band.',
    after: 'riveted-plates',
    stage: { ...PLATES_STAGE, bloom: 0.2 },
    colours: [slot('steel', 'Steel colour', '#3a3e46', ['Plates']), slot('glow', 'Glow colour', '#ff5a1a', ['Seam glow'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Under', paint: lin(['#1a0604', '#040101']), effects: [DROP] },
      { ...lineLayer(), name: 'Seam glow', at: 0.5, width: 0.9, paint: { kind: 'solid', color: '#ff5a1a' }, opacity: 0.6, effects: [glow({ color: '#ff3a0a', opacity: 0.6, size: 0.1 })] },
      curvedPlates('Plates', 12, '#3a3e46', ['#020203', '#0e1014', '#3a3e46', '#7a808a', '#c0c8d0'], { from: 0.06, to: 0.94, gap: 0.08 }),
      plateRivets('Rivets', 0.5, 12, '#8a929c', STEEL_STOPS, 0.5),
    ],
  },
  // ── layered-brass ──
  {
    id: 'brass-beads-polished',
    name: 'Polished brass',
    description: 'Warm brass in the twin gradient bands, with a ring of polished brass beads in the pressed-in step.',
    after: 'brass-beads',
    colours: [slot('brass', 'Brass colour', '#c8952e', ['Band', 'Pressed-in step', 'Beads'])],
    layers: () => [...base({ light: '#f0c060', dark: '#4a2a06', step: 0.58 }), layeredBeads('Beads', '#d8a838', metalFx(WARM_GOLD, 0.6, 0.9))],
  },
  {
    id: 'brass-beads-jet',
    name: 'Brass & jet',
    description: 'A black enamel step set with glossy jet beads, framed by brass.',
    after: 'brass-beads',
    colours: [slot('brass', 'Brass colour', '#c8952e', ['Band']), slot('enamel', 'Enamel colour', '#14141a', ['Pressed-in step', 'Jet beads'])],
    layers: () => [...base({ light: '#f0c060', dark: '#4a2a06', step: 0.55, stepLight: '#3a3a44', stepDark: '#020204' }), layeredBeads('Jet beads', '#14141a', [bevel({ profile: 'rounded', size: 0.8, gloss: 1, highlightOpacity: 0.8 })])],
  },
  // ── layered-runes ──
  {
    id: 'glowing-runes-runic',
    name: 'Runic glow',
    description: 'Dark slate in the twin gradient bands, BabelStone runes and a soft glowing line in the pressed-in step.',
    after: 'glowing-runes',
    stage: { bloom: 0.25 },
    colours: [slot('stone', 'Stone colour', '#2a2c36', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#6fc3ff', ['Runes', 'Glowing lines'])],
    layers: () => [
      ...base({ light: '#4a4e5c', dark: '#06070a', step: 0.62 }),
      overlay('black-onyx', 5, 'overlay', 0.4),
      inscription('babelstone', '#d0f0ff', { name: 'Runes', at: 0.32, size: 0.4, start: 0, effects: [glow({ color: '#6fc3ff', opacity: 0.9, size: 0.12 })] }),
      glowLines(['#e8f8ff', '#8ad0ff'], '#4aa0ff', { count: 1, from: 0.8, width: 0.035, size: 0.12 }),
    ],
  },
  {
    id: 'glowing-runes-emerald',
    name: 'Emerald runes',
    description: 'Deep green stone with Yugurian runes glowing emerald.',
    after: 'glowing-runes',
    stage: { bloom: 0.25 },
    colours: [slot('stone', 'Stone colour', '#1a3a2a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#4aff9a', ['Runes', 'Glowing lines'])],
    layers: () => [
      ...base({ light: '#2e5a44', dark: '#020a06', step: 0.62 }),
      inscription('yugurian', '#d0ffe0', { name: 'Runes', at: 0.32, size: 0.4, start: 2, effects: [glow({ color: '#4aff9a', opacity: 0.85, size: 0.12 })] }),
      glowLines(['#e8fff0', '#8affb0'], '#2aff7a', { count: 1, from: 0.8, width: 0.035, size: 0.12 }),
    ],
  },
  {
    id: 'glowing-runes-fire',
    name: 'Fire runes',
    description: 'Black basalt with Sith AF runes burning orange-red.',
    after: 'glowing-runes',
    stage: { bloom: 0.3 },
    colours: [slot('stone', 'Stone colour', '#2a2220', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#ff6a2a', ['Runes', 'Glowing lines'])],
    layers: () => [
      ...base({ light: '#4a3a34', dark: '#060302', step: 0.62 }),
      overlay('dark-rock', 2, 'overlay', 0.5),
      inscription('sith', '#ffe0b0', { name: 'Runes', at: 0.32, size: 0.38, start: 6, effects: [glow({ color: '#ff6a2a', opacity: 0.9, size: 0.12 })] }),
      glowLines(['#ffe0b0', '#ff8a3a'], '#ff4a1a', { count: 1, from: 0.8, width: 0.035, size: 0.12 }),
    ],
  },
  {
    id: 'glowing-runes-twin-circle',
    name: 'Twin circle',
    description: 'Two rings of runes, BabelStone outside and Outer Rim AF inside, either side of a glowing line.',
    after: 'glowing-runes',
    stage: { bloom: 0.25 },
    colours: [slot('stone', 'Stone colour', '#2a2c40', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#b08aff', ['Outer runes', 'Inner runes', 'Glowing lines'])],
    layers: () => [
      ...base({ light: '#4a4c6a', dark: '#06060e', step: 0.5 }),
      inscription('babelstone', '#f0e0ff', { name: 'Outer runes', at: 0.26, size: 0.3, start: 4, effects: [glow({ color: '#b08aff', opacity: 0.85, size: 0.1 })] }),
      glowLines(['#f8f0ff', '#c8a8ff'], '#9a6aff', { count: 1, from: 0.48, width: 0.03, size: 0.1 }),
      inscription('outerRim', '#f0e0ff', { name: 'Inner runes', at: 0.74, size: 0.28, start: 8, effects: [glow({ color: '#b08aff', opacity: 0.85, size: 0.1 })] }),
    ],
  },
  // ── layered-jewelled ──
  {
    id: 'jewelled-silver',
    name: 'Silver & jewels',
    description: 'Silver in the twin gradient bands with a silver vine and rubies and sapphires in claw settings.',
    after: 'jewelled',
    colours: [slot('metal', 'Metal colour', '#a8aeb8', ['Band', 'Pressed-in step', 'Vine']), slot('gems', 'Gem colour', '#c0182a', ['Gems'])],
    layers: () => [...base({ light: '#e8ecf0', dark: '#2a2e36', step: 0.6 }), silverVine('#c8ccd4', '#e8ecf0'), setGems('#c0182a', ['#1f4fd0'], '#d8dce4', SILVER_STOPS)],
  },
  // ── layered-steel ──
  {
    id: 'battle-steel-notched',
    name: 'Notched blade',
    description: 'Steel cut with sword notches along the outer edge, as if it took a hundred blows.',
    after: 'battle-steel',
    colours: [slot('steel', 'Steel colour', '#8a8f99', ['Steel band', 'Hammered', 'Battle wear'])],
    layers: () => [
      ...bandShading(battleSteel('#b8bec8', '#2a2e36', { wear: 1.4 }), { step: 0.62 }),
      { ...repeatLayer(), name: 'Notches', element: 'gash', count: 10, snapToCorners: false, at: 0.22, size: 0.4, fill: '#14161a', raised: false, shaded: false, jitterAngle: 25, jitterSize: 0.3, seed: 4, opacity: 0.85 },
    ],
  },
  {
    id: 'battle-steel-bloodied',
    name: 'Bloodied steel',
    description: 'Dark steel spattered with blood: red in its scratches and dents, and glossy drops across the band.',
    after: 'battle-steel',
    colours: [slot('steel', 'Steel colour', '#6a707a', ['Steel band', 'Hammered']), slot('stain', 'Stain colour', '#8a1010', ['Battle wear'])],
    layers: () => [
      ...bandShading(battleSteel('#8a909a', '#14161a', { tint: '#8a1010', wear: 1.3 }), { step: 0.62 }),
      { ...textureLayer('scatter'), name: 'Blood spatter', color: '#7a0a0a', color2: '#b01a14', amount: 2.4, scale: 0.7, strength: 1.4, seed: 0xb100d, clip: 'band', effects: [{ kind: 'distort', on: true, amount: 0.35, scale: 0.15, seed: 4 } as never] },
      { ...repeatLayer(), name: 'Blood spatter', element: 'drop', count: 28, snapToCorners: false, at: 0.45, size: 0.34, fill: '#9a0c0c', altSizes: [1, 0.5, 0.7, 0.35], wander: 0.7, jitterAngle: 180, jitterSize: 0.4, skipChance: 0.1, seed: 21, raised: false, shaded: false, clip: 'band', effects: [bevel({ profile: 'rounded', size: 0.6, gloss: 0.9, highlightOpacity: 0.6 })] },
      steelRivets('#a8b0ba', STEEL_STOPS),
    ],
  },
  // ── layered-night ──
  {
    id: 'night-sky-dusk',
    name: 'Dusk to midnight',
    description: 'Twin gradient bands in deep blue, with a dusk glow round one side, a nebula haze, stars and a glowing line.',
    after: 'night-sky',
    stage: { bloom: 0.25 },
    colours: [slot('sky', 'Sky colour', '#1a1a4a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#cfc4ff', ['Glowing lines'])],
    layers: () => [
      ...base({ light: '#2a2a6a', dark: '#04040e', step: 0.66 }),
      duskGlow(),
      { ...textureLayer('nebula'), name: 'Haze', color: '#6a4ad0', color2: '#2a6ad0', opacity: 0.35, blend: 'screen', seed: 0x2f1 },
      nightStars(),
      glowLines(['#f0ecff', '#cfc4ff'], '#8a7aff', { count: 1, from: 0.76, width: 0.03, size: 0.1 }),
    ],
  },
  {
    id: 'night-sky-constellations',
    name: 'Constellations',
    description: 'Bright stars of every size in a dark band, as clear as a winter night, with silver rims.',
    after: 'night-sky',
    stage: { bloom: 0.2 },
    colours: [slot('sky', 'Sky colour', '#0e1430', ['Band', 'Pressed-in step'])],
    layers: () => [...base({ light: '#1e2a5a', dark: '#02030a', step: null }), { ...textureLayer('sparkle'), name: 'Starlight', color: '#ffffff', amount: 1, scale: 0.5, seed: 0x5a39 }, nightStars(40)],
  },
  {
    id: 'night-sky-aurora',
    name: 'Aurora',
    description: 'Green, teal and violet northern lights rippling through a night-blue band, darker at its edges, over a pressed-in step with a glowing seam.',
    after: 'night-sky',
    stage: { bloom: 0.3 },
    colours: [slot('sky', 'Sky colour', '#0a1a2a', ['Band', 'Pressed-in step']), slot('aurora', 'Aurora colour', '#3aff9a', ['Aurora'])],
    layers: () => [
      ...base({ light: '#1a3050', dark: '#02060a', step: 0.66 }),
      { ...textureLayer('nebula'), name: 'Aurora', to: 0.66, color: '#3aff9a', color2: '#2ac8ff', opacity: 0.8, blend: 'screen', seed: 0x2f2, effects: [blur(0.02)] },
      { ...textureLayer('nebula'), name: 'Aurora', from: 0.1, to: 0.6, color: '#c06aff', color2: '#3aff9a', opacity: 0.35, blend: 'screen', seed: 0x2f3 },
      nightStars(20),
      { ...bandFillLayer(), name: 'Depth', paint: { kind: 'acrossBand', stops: [{ at: 0, color: '#000000', opacity: 0.6 }, { at: 0.35, color: '#000000', opacity: 0 }, { at: 0.62, color: '#000000', opacity: 0.5 }, { at: 0.7, color: '#000000', opacity: 0 }, { at: 1, color: '#000000', opacity: 0.6 }] } },
      glowLines(['#e8fff4', '#8affc8'], '#3aff9a', { count: 1, from: 0.66, width: 0.025, size: 0.1 }),
    ],
  },
  // ── layered-dwarven ──
  {
    id: 'dwarven-bronze-forged',
    name: 'Forged bronze',
    description: 'Hammered bronze in the twin gradient bands, faceted bronze plates, Yugurian runes engraved between them, and rivets.',
    after: 'dwarven-bronze',
    colours: [slot('bronze', 'Bronze colour', '#a87a3a', ['Bronze band', 'Plates', 'Rivets'])],
    layers: () => [...bandShading([dwarvenBand('Bronze band', BRONZE_STOPS)]), dwarvenRunes('#3a2208', [bevel({ direction: 'sunken', size: 0.5, gloss: 0.4 })]), dwarvenPlates('#a87a3a', BRONZE_STOPS), ...dwarvenRivets('#d8a858', BRONZE_STOPS)],
  },
  {
    id: 'dwarven-bronze-steel-gold',
    name: 'Steel & gold',
    description: 'Dwarven steel with big gold Yugurian runes between gold plates, and gold rivets.',
    after: 'dwarven-bronze',
    colours: [slot('steel', 'Steel colour', '#5a606a', ['Bronze band']), slot('gold', 'Gold colour', '#d8a838', ['Plates', 'Rivets', 'Runes'])],
    layers: () => [
      ...bandShading([dwarvenBand('Bronze band', ['#040506', '#16191e', '#5a606a', '#9aa0aa', '#d8dce4'])]),
      panelWords('yugurian', '#f4d27a', { size: 0.5, effects: goldFx(0.4, WARM_GOLD) }),
      dwarvenPlates('#d8a838', WARM_GOLD),
      ...dwarvenRivets('#d8a838', WARM_GOLD),
    ],
  },
  {
    id: 'dwarven-bronze-runic',
    name: 'Runic bronze',
    description: 'Forged bronze without the plates: big Yugurian runes engraved across the whole band, between two rows of rivets.',
    after: 'dwarven-bronze',
    colours: [slot('bronze', 'Bronze colour', '#a87a3a', ['Bronze band', 'Rivets'])],
    layers: () => [...bandShading([dwarvenBand('Bronze band', BRONZE_STOPS)]), dwarvenRunes('#3a2208', [bevel({ direction: 'sunken', size: 0.5, gloss: 0.4 })], 'yugurian', 0.62), ...dwarvenRivets('#d8a858', BRONZE_STOPS)],
  },
  {
    id: 'dragon-scales-serpent',
    name: 'Serpent coil',
    description: 'Overlapping green scales running round the band like a coiled serpent, each row shading the next, with gradient bands over the scales only.',
    after: 'dragon-scales',
    stage: { thickness: 0.18, outerSpacing: 0.02 },
    colours: [slot('scales', 'Scale colour', '#3a8a2a', ['Scales'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Under', paint: { kind: 'solid', color: '#061004' }, effects: [DROP] },
      overlapScales('#3a8a2a', '#123a0c', [0, 0.33, 0.67, 0]),
      scaleShading(),
    ],
  },
  // ── layered-jewelled ──
  {
    id: 'jewelled-pave',
    name: 'Pavé band',
    description: 'Platinum paved with three staggered rows of tiny diamonds, like a pavé wedding band.',
    after: 'jewelled',
    stage: { thickness: 0.2 },
    colours: [slot('metal', 'Metal colour', '#c8ccd4', ['Band', 'Pressed-in step']), slot('gems', 'Stone colour', '#f4f8ff', ['Gems'])],
    layers: () => [
      ...base({ light: '#f0f2f6', dark: '#3a3e46', step: null }),
      ...[0.25, 0.5, 0.75].map((at, r) => cutStone('#f4f8ff', { count: 56, at, size: 0.24, offset: r % 2 ? 0.5 : 0, setting: 'bezel' })),
    ],
  },
  {
    id: 'jewelled-art-deco',
    name: 'Art deco',
    description: 'Step-cut emeralds between pairs of baguette diamonds, set in platinum with black onyx enamel.',
    after: 'jewelled',
    stage: { thickness: 0.2 },
    colours: [slot('enamel', 'Enamel colour', '#14141a', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#0f9a5a', ['Emeralds'])],
    layers: () => [
      ...base({ light: '#3a3a44', dark: '#020204', step: null }),
      { ...lineLayer(), name: 'Platinum edges', at: 0.06, width: 0.1, paint: { kind: 'solid', color: '#d8dce4' }, effects: metalFx(SILVER_STOPS, 0.4, 0.9) },
      { ...lineLayer(), name: 'Platinum edges', at: 0.94, width: 0.1, paint: { kind: 'solid', color: '#d8dce4' }, effects: metalFx(SILVER_STOPS, 0.4, 0.9) },
      { ...cutStone('#f4f8ff', { count: 24, at: 0.5, size: 0.44, stretch: 0.35, cut: 'emerald', setting: 'bezel' }), name: 'Baguettes' },
      { ...cutStone('#0f9a5a', { count: 8, at: 0.5, size: 0.62, stretch: 0.8, cut: 'emerald', setting: 'claws4' }), name: 'Emeralds' },
    ],
  },
  {
    id: 'jewelled-garnets',
    name: 'Victorian garnets',
    description: 'Dense clusters of rose-cut garnets on yellow gold, like a Victorian garnet brooch.',
    after: 'jewelled',
    stage: { thickness: 0.2 },
    colours: [slot('metal', 'Metal colour', '#c8952e', ['Band', 'Pressed-in step']), slot('gems', 'Garnet colour', '#8a0a1a', ['Garnets'])],
    layers: () => [
      ...base({ light: '#f4d27a', dark: '#3a2006', step: null }),
      ...[0.28, 0.5, 0.72].map((at, r) => ({ ...cutStone('#8a0a1a', { count: 40, at, size: r === 1 ? 0.4 : 0.3, offset: r % 2 ? 0.5 : 0, cut: 'rose', setting: 'bezel', settingColor: '#d8a838', settingStops: WARM_GOLD }), name: 'Garnets' })),
    ],
  },
  {
    id: 'jewelled-eternity',
    name: 'Eternity band',
    description: 'An unbroken row of large brilliant-cut diamonds in white-gold claws, all the way round.',
    after: 'jewelled',
    stage: { thickness: 0.2, bloom: 0.1 },
    colours: [slot('metal', 'Metal colour', '#d8dce4', ['Band', 'Pressed-in step']), slot('gems', 'Stone colour', '#f4f8ff', ['Gems'])],
    layers: () => [...base({ light: '#f0f2f6', dark: '#3a3e46', step: null }), cutStone('#f4f8ff', { count: 30, at: 0.5, size: 0.82, setting: 'claws4' })],
  },
  // ── layered-eldritch ──
  {
    id: 'eldritch-crystal-geode',
    name: 'Amethyst geode',
    description: 'A band split open like a geode: dark rock outside, glittering amethyst crystal inside.',
    after: 'eldritch-crystal',
    stage: { bloom: 0.2 },
    colours: [slot('stone', 'Rock colour', '#4a4038', ['Band']), slot('crystal', 'Crystal colour', '#9a4ad0', ['Geode', 'Crystals'])],
    layers: () => [
      ...eldritchStone('#5a5048', '#0a0806'),
      { ...textureLayer('crystal'), name: 'Geode', from: 0.35, to: 1, color: '#9a4ad0', opacity: 0.95, seed: 0xc277 },
      { ...textureLayer('sparkle'), name: 'Glitter', from: 0.35, to: 1, color: '#ffffff', amount: 0.6, scale: 0.4, seed: 0x5a3a },
      crystalShards('#d8a8ff', '#b06aff', 10),
    ],
  },
  // ── layered-radiant ──
  {
    id: 'radiant-gold-holy',
    name: 'Holy gold',
    description: 'Warm gold in the twin gradient bands, with glowing gold stars between sapphires, and a string of pearls in the step.',
    after: 'radiant-gold',
    stage: { thickness: 0.18, bloom: 0.2 },
    colours: [slot('gold', 'Gold colour', '#c8952e', ['Band', 'Pressed-in step', 'Stars']), slot('gems', 'Gem colour', '#2a5ab8', ['Gems'])],
    layers: () => [...base({ light: '#f4d27a', dark: '#3a2006', step: 0.66 }), radiantStars('#f4d27a', WARM_GOLD, '#ffe8a0'), radiantGems('#2a5ab8', WARM_GOLD, '#d8a838'), radiantPearls()],
  },
  {
    id: 'radiant-gold-rose',
    name: 'Rose gold & pearls',
    description: 'Soft rose gold with pink sapphires and pearls.',
    after: 'radiant-gold',
    stage: { thickness: 0.18 },
    colours: [slot('gold', 'Metal colour', '#d8907a', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#e0608a', ['Gems'])],
    layers: () => [...base({ light: '#f6d0c0', dark: '#3a1a14', step: 0.66 }), radiantGems('#e0608a', ROSE_STOPS, '#e8b0a0'), radiantPearls()],
  },
  {
    id: 'radiant-gold-prayer',
    name: 'Divine script',
    description: 'Gold with a glowing Yugurian prayer round it and white-gold stars at the quarters.',
    after: 'radiant-gold',
    stage: { thickness: 0.18, bloom: 0.25 },
    colours: [slot('gold', 'Gold colour', '#c8952e', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#fff0c0', ['Prayer', 'Stars'])],
    layers: () => [
      ...base({ light: '#f4d27a', dark: '#3a2006', step: 0.66 }),
      inscription('yugurian', '#fffbe8', { name: 'Prayer', at: 0.34, size: 0.36, start: 11, effects: [glow({ color: '#ffe8a0', opacity: 0.9, size: 0.1 })] }),
      { ...radiantStars('#f0f2f6', SILVER_STOPS, '#fff0c0'), count: 4, at: 0.83, size: 0.4 },
    ],
  },
  // ── layered-hellforged ──
  {
    id: 'hellforged-iron-shaded',
    name: 'Hellforged',
    description: 'Blackened iron in the twin gradient bands, split by blurred glowing cracks, with iron spikes round the edge.',
    after: 'hellforged-iron',
    stage: { bloom: 0.3, bleed: 0.2 },
    colours: [slot('iron', 'Iron colour', '#2a2c32', ['Iron band', 'Spikes']), slot('glow', 'Fire colour', '#ff5a1a', ['Glowing cracks'])],
    layers: () => [ironSpikes(), ...hellIron(), glowCracks('#1a0602', '#ff5a1a', '#ffb05a', 13, 0.9)],
  },
  // ── layered-royal ──
  {
    id: 'royal-inscription-gold',
    name: 'Royal gold',
    description: 'Gold in the twin gradient bands, an Outer Rim AF inscription engraved round the top, fine contour lines and rubies in claws.',
    after: 'royal-inscription',
    stage: { thickness: 0.18 },
    colours: [slot('gold', 'Gold colour', '#c8952e', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#b0182a', ['Gems'])],
    layers: () => [...base({ light: '#f4d27a', dark: '#3a2006', step: 0.55 }), royalLines('#5a3a10'), inscription('outerRim', '#5a3a10', { name: 'Inscription', at: 0.28, size: 0.32, start: 13, effects: [engravedIn()] }), royalGems('#b0182a', '#d8a838', WARM_GOLD)],
  },
  {
    id: 'royal-inscription-crimson',
    name: 'Crimson & gold',
    description: 'Crimson enamel with a raised gold inscription and gold edges.',
    after: 'royal-inscription',
    stage: { thickness: 0.18 },
    colours: [slot('enamel', 'Enamel colour', '#8a1020', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#c8952e', ['Inscription', 'Gold edges'])],
    layers: () => [
      ...base({ light: '#c02a3a', dark: '#1a0206', step: null }),
      ...[0.04, 0.96].map((at) => ({ ...royalLines('#d8a838'), name: 'Gold edges', count: 1, from: at, width: 0.07, effects: goldFx(0.4, WARM_GOLD) })),
      inscription('outerRim', '#f4d27a', { name: 'Inscription', at: 0.5, size: 0.4, start: 14, effects: goldFx(0.4, WARM_GOLD) }),
    ],
  },
  {
    id: 'royal-inscription-silver',
    name: 'Silver & sapphire',
    description: 'Silver with an engraved Yugurian inscription and sapphires in silver claws.',
    after: 'royal-inscription',
    stage: { thickness: 0.18 },
    colours: [slot('metal', 'Metal colour', '#a8aeb8', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#1f4fd0', ['Gems'])],
    layers: () => [...base({ light: '#e8ecf0', dark: '#2a2e36', step: 0.55 }), royalLines('#3a3e46'), inscription('yugurian', '#3a3e46', { name: 'Inscription', at: 0.28, size: 0.32, start: 15, effects: [engravedIn()] }), royalGems('#1f4fd0', '#d8dce4', SILVER_STOPS)],
  },
  {
    id: 'royal-inscription-velvet',
    name: 'Royal velvet',
    description: 'Purple velvet with a gold inscription embroidered round it, between gold piping.',
    after: 'royal-inscription',
    stage: { thickness: 0.18 },
    colours: [slot('velvet', 'Velvet colour', '#4a1a6a', ['Velvet']), slot('gold', 'Gold colour', '#c8952e', ['Inscription', 'Gold piping'])],
    layers: () => [
      ...base({ light: '#6a2a8a', dark: '#0e0214', step: null }).map((l) => (l.name === 'Band' ? { ...l, name: 'Velvet' } : l)),
      { ...bandFillLayer(), name: 'Velvet', paint: photo('jacquard', 1.2), opacity: 0.5, blend: 'overlay', effects: [recolour(['#0e0214', '#2a0a3a', '#4a1a6a', '#8a5aaa', '#c8a0e0'])] },
      ...[0.06, 0.94].map((at) => ({ ...royalLines('#d8a838'), name: 'Gold piping', count: 1, from: at, width: 0.06, effects: goldFx(0.5, WARM_GOLD) })),
      inscription('outerRim', '#f4d27a', { name: 'Inscription', at: 0.5, size: 0.38, start: 16, effects: goldFx(0.3, WARM_GOLD) }),
    ],
  },
  // ── layered-plates ──
  {
    id: 'rune-plates-runelit',
    name: 'Runelit plates',
    description: 'Iron plates with the runes glowing blue from inside, and blue light showing in the gaps.',
    after: 'rune-plates',
    stage: { thickness: 0.2, bloom: 0.3 },
    colours: [slot('iron', 'Plate colour', '#5a5e68', ['Plates']), slot('glow', 'Glow colour', '#4ac8ff', ['Runes', 'Gap glow'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Gap glow', paint: lin(['#0a2a4a', '#020a14']), effects: [DROP, glow({ color: '#4ac8ff', opacity: 0.5, size: 0.1, inner: true })] },
      runePlates('#5a5e68', [...metalFx(RUNE_IRON, 0.15, 0.6), contact(0.8)]),
      plateRunes('#d0f4ff', [glow({ color: '#4ac8ff', opacity: 0.9, size: 0.12 })]),
    ],
  },
  {
    id: 'rune-plates-silver-gold',
    name: 'Silver & gold runes',
    description: 'Silver plates with gold Yugurian runes inlaid in them.',
    after: 'rune-plates',
    stage: { thickness: 0.2 },
    colours: [slot('metal', 'Plate colour', '#a8aeb8', ['Plates']), slot('gold', 'Rune colour', '#d8a838', ['Runes'])],
    layers: () => [...runeRing(), runePlates('#a8aeb8', [...metalFx(SILVER_STOPS, 0.15, 0.8), contact(0.8)]), plateRunes('#f4d27a', goldFx(0.3, WARM_GOLD), 'yugurian')],
  },
  // ── layered-moon ──
  {
    id: 'moon-stars-midnight',
    name: 'Midnight moons',
    description: 'Midnight blue in the twin gradient bands, gold moons and stars in turn, sparkles and a silver scalloped edge.',
    after: 'moon-stars',
    stage: MOON_STAGE,
    colours: [slot('sky', 'Sky colour', '#1f2a5a', ['Band', 'Pressed-in step']), slot('gold', 'Moon colour', '#f4d27a', ['Moons', 'Stars'])],
    layers: () => [...base({ light: '#34449a', dark: '#04060e', step: 0.72 }), sparkles(), scallopEdge('#d8dce4', SILVER_STOPS), ...moonsAndStars('#f4d27a', WARM_GOLD, '#fff2b0')],
  },
  {
    id: 'moon-stars-phases',
    name: 'Moon phases',
    description: 'The moon waxing and waning round the band in silver, from crescent to full and back.',
    after: 'moon-stars',
    stage: MOON_STAGE,
    colours: [slot('sky', 'Sky colour', '#141a3a', ['Band', 'Pressed-in step']), slot('moons', 'Moon colour', '#e4e8f0', ['Moons'])],
    layers: () => [
      ...base({ light: '#2a3470', dark: '#02030a', step: null }),
      sparkles(0x5a2d),
      { ...repeatLayer(), name: 'Moons', element: 'crescent', count: 8, snapToCorners: false, at: 0.5, size: 0.62, fill: '#e4e8f0', show: [true, true, true, false, true, true, true, false], raised: false, effects: [...metalFx(SILVER_STOPS, 0.4, 0.9), glow({ color: '#c0d0ff', opacity: 0.5, size: 0.08 })] },
      { ...repeatLayer(), name: 'Moons', element: 'bead', count: 2, offset: 0.75, snapToCorners: false, at: 0.5, size: 0.58, fill: '#e4e8f0', raised: false, effects: [...metalFx(SILVER_STOPS, 0.5, 0.9), glow({ color: '#c0d0ff', opacity: 0.6, size: 0.1 })] },
    ],
  },
  // ── layered-frost ──
  {
    id: 'frostbound-steel',
    name: 'Frost steel',
    description: 'Icy blue steel in the twin gradient bands, furred with frost, with a glowing zigzag and silver snowflakes.',
    after: 'frostbound',
    stage: FROST_STAGE,
    colours: [slot('ice', 'Ice colour', '#6f93b8', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#9fd8ff', ['Zigzag'])],
    layers: () => [
      ...base({ light: '#a8c8e8', dark: '#0a1a2a', step: 0.62 }),
      frostLayer(),
      { ...lineLayer(), name: 'Zigzag', at: 0.5, width: 0.03, paint: { kind: 'solid', color: '#eaf8ff' }, waveAmplitude: 0.3, waveFit: 0.5, waveShape: 'zigzag', effects: [glow({ color: '#9fd8ff', opacity: 0.8, size: 0.1 })] },
      snowflakes(),
    ],
  },
  {
    id: 'frostbound-glacier',
    name: 'Glacier',
    description: 'Clear glacier ice split by cracks that glow cold blue from within.',
    after: 'frostbound',
    stage: FROST_STAGE,
    colours: [slot('ice', 'Ice colour', '#8ab8d8', ['Ice']), slot('glow', 'Glow colour', '#4ac8ff', ['Glowing cracks'])],
    layers: () => [
      ...bandShading([{ ...bandFillLayer(), name: 'Ice', paint: photo('ice', 1.4), effects: [recolour(['#04101c', '#1a4a6a', '#6aa8d0', '#c8ecff', '#ffffff']), DROP] }]),
      glowCracks('#0a2030', '#4ac8ff', '#c0f0ff', 21, 0.8),
    ],
  },
  {
    id: 'frostbound-snowfall',
    name: 'Snowfall',
    description: 'Deep winter blue with a flurry of snowflakes of every size.',
    after: 'frostbound',
    stage: FROST_STAGE,
    colours: [slot('sky', 'Sky colour', '#1a3a6a', ['Band', 'Pressed-in step'])],
    layers: () => [
      ...base({ light: '#2a5a9a', dark: '#040c1a', step: null }),
      { ...textureLayer('sparkle'), name: 'Snow', color: '#ffffff', amount: 1, scale: 0.4, seed: 0x5a3b },
      { ...snowflakes(14, 0.5), altSizes: [1, 0.55, 0.75], wander: 0.6, jitterAngle: 30, seed: 6 },
    ],
  },
  // ── layered-celtic ──
  {
    id: 'celtic-emerald-gold',
    name: 'Emerald & gold',
    description: 'Deep green in the twin gradient bands with a woven gold knot and a gold battlement edge.',
    after: 'celtic',
    stage: CELTIC_STAGE,
    colours: [slot('band', 'Band colour', '#2f6a3c', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#d8a838', ['Knotwork', 'Battlements'])],
    layers: () => [...base({ light: '#3e8a4e', dark: '#041408', step: 0.3 }), battlementEdge('#d8a838', WARM_GOLD), celticKnot('#d8a838', WARM_GOLD)],
  },
  {
    id: 'celtic-carved-stone',
    name: 'Carved stone',
    description: 'A grey granite ring with a bronze knot set into it, like an old Celtic cross.',
    after: 'celtic',
    stage: CELTIC_STAGE,
    colours: [slot('stone', 'Stone colour', '#8a8680', ['Granite']), slot('bronze', 'Knot colour', '#a87a3a', ['Knotwork'])],
    layers: () => [
      ...bandShading([{ ...bandFillLayer(), name: 'Granite', paint: photo('granite', 1.4), effects: [DROP] }]),
      celticKnot('#a87a3a', BRONZE_STOPS, { at: 0.5 }),
    ],
  },
  // ── layered-royal2 ──
  {
    id: 'royal-crimson',
    name: 'Crimson royal',
    description: 'Crimson in the twin gradient bands between polished gold edges, with gold fleurs-de-lis, sapphires in claws and a crown inside the band at the top.',
    after: 'royal',
    stage: ROYAL_STAGE,
    colours: [slot('band', 'Band colour', '#8a1a2a', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#d8a838', ['Edges', 'Fleurs-de-lis', 'Crown']), slot('gems', 'Gem colour', '#2a5ad8', ['Gems'])],
    layers: () => [...base({ light: '#c02a3a', dark: '#1a0206', step: null }), ...goldEdges('#d8a838', WARM_GOLD), fleursDeLis('#e2b85a', WARM_GOLD), crownGems('#2a5ad8', '#d8a838', WARM_GOLD), royalCrown('#e2b85a', WARM_GOLD, '#a01a2a')],
  },
  {
    id: 'royal-blue',
    name: 'Royal blue',
    description: 'Royal blue and gold, with rubies between the fleurs-de-lis.',
    after: 'royal',
    stage: ROYAL_STAGE,
    colours: [slot('band', 'Band colour', '#1a3a8a', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#d8a838', ['Edges', 'Fleurs-de-lis', 'Crown']), slot('gems', 'Gem colour', '#c0182a', ['Gems'])],
    layers: () => [...base({ light: '#2a5ac0', dark: '#030a24', step: null }), ...goldEdges('#d8a838', WARM_GOLD), fleursDeLis('#e2b85a', WARM_GOLD), crownGems('#c0182a', '#d8a838', WARM_GOLD), royalCrown('#e2b85a', WARM_GOLD, '#1a3a8a')],
  },
  {
    id: 'royal-purple-silver',
    name: 'Purple & silver',
    description: 'Imperial purple with silver edges, silver fleurs and amethysts.',
    after: 'royal',
    stage: ROYAL_STAGE,
    colours: [slot('band', 'Band colour', '#4a1a6a', ['Band', 'Pressed-in step']), slot('silver', 'Silver colour', '#d8dce4', ['Edges', 'Fleurs-de-lis', 'Crown']), slot('gems', 'Gem colour', '#9a4ad0', ['Gems'])],
    layers: () => [...base({ light: '#6a2a9a', dark: '#0e0218', step: null }), ...goldEdges('#d8dce4', SILVER_STOPS), fleursDeLis('#e4e8f0', SILVER_STOPS), crownGems('#9a4ad0', '#d8dce4', SILVER_STOPS), royalCrown('#e4e8f0', SILVER_STOPS, '#4a1a6a')],
  },
  {
    id: 'royal-ermine',
    name: 'Ermine',
    description: 'White ermine flecked with black tails between gold edges, like a royal mantle, with a gold crown.',
    after: 'royal',
    stage: ROYAL_STAGE,
    colours: [slot('gold', 'Gold colour', '#d8a838', ['Edges', 'Crown'])],
    layers: () => [
      ...base({ light: '#ffffff', dark: '#b8b4ac', step: null }),
      { ...textureLayer('feathers'), name: 'Fur', color: '#d8d4cc', amount: 0.6, scale: 0.6, strength: 0.6, seed: 0xfe11 },
      { ...repeatLayer(), name: 'Ermine tails', element: 'drop', count: 18, snapToCorners: false, at: 0.5, size: 0.24, stretch: 0.55, rotation: 180, fill: '#141414', altSizes: [1, 0.8], alternateSides: 0.18, raised: false, shaded: false },
      ...goldEdges('#d8a838', WARM_GOLD),
      royalCrown('#e2b85a', WARM_GOLD, '#a01a2a'),
    ],
  },
  // ── layered-grim ──
  {
    id: 'grim-iron-bone-ring',
    name: 'Bone ring',
    description: 'Black iron with a ring of skulls, yellowed like old ivory.',
    after: 'grim-iron',
    stage: GRIM_STAGE,
    colours: [slot('iron', 'Iron colour', '#2a2824', ['Iron', 'Chainmail']), slot('bone', 'Bone colour', '#e8dcc0', ['Skulls', 'Emblems'])],
    layers: () => [
      ...grimIron(['#020202', '#0c0c0c', '#2a2824', '#4a4844', '#7a7670']),
      grimEmblems('skull', '#e8dcc0', [recolour(BONE_STOPS), bevel({ size: 0.4, gloss: 0.4 }), contact(0.7)]),
      grimEmblems('skull', '#e8dcc0', [recolour(BONE_STOPS), contact(0.6)], [false, true], 0.8),
    ],
  },
  {
    id: 'grim-iron-crowned-skulls',
    name: 'Crowned skulls',
    description: 'Black iron with gold skulls, for a lich or a pirate king.',
    after: 'grim-iron',
    stage: GRIM_STAGE,
    colours: [slot('iron', 'Iron colour', '#2a2824', ['Iron', 'Chainmail']), slot('gold', 'Gold colour', '#d8a838', ['Emblems'])],
    layers: () => [...grimIron(['#020202', '#0c0c0c', '#2a2824', '#4a4844', '#7a7670']), grimEmblems('skull', '#d8a838', [...goldFx(0.4, WARM_GOLD), contact(0.7)], [true], 0.9)],
  },
  // ── themed-enamel ──
  {
    id: 'enamel-gold-sapphire',
    name: 'Sapphire enamel',
    description: 'Warm gold shaded with gradients, a glossy blue enamel channel, gold beading and four sapphires in claws.',
    after: 'enamel-gold',
    stage: ENAMEL_STAGE,
    colours: [slot('gold', 'Metal colour', '#c8952e', ['Metal', 'Beading']), slot('enamel', 'Enamel colour', '#1d3f8f', ['Enamel']), slot('gems', 'Stone colour', '#2a5ad0', ['Stones'])],
    layers: () => [...metalBands(WARM_GOLD), ...enamelBand('#3a6ad0', '#081a48', '#7aa8ff'), ...beading('#e8c060', WARM_GOLD), setStones('#2a5ad0', '#d8a838', WARM_GOLD)],
  },
  {
    id: 'enamel-gold-cloisonne',
    name: 'Ruby cloisonné',
    description: 'Red enamel divided by fine gold wires into cells, with cabochon rubies.',
    after: 'enamel-gold',
    stage: ENAMEL_STAGE,
    colours: [slot('gold', 'Metal colour', '#c8952e', ['Metal', 'Wires']), slot('enamel', 'Enamel colour', '#a01828', ['Enamel']), slot('gems', 'Stone colour', '#c0102a', ['Stones'])],
    layers: () => [
      ...metalBands(WARM_GOLD),
      ...enamelBand('#d83040', '#3a0408', '#ff7a8a'),
      { ...repeatLayer(), name: 'Wires', element: 'tick', count: 32, snapToCorners: false, at: 0.5, size: 0.5, stretch: 0.08, fill: '#e8c060', raised: false, effects: metalFx(WARM_GOLD, 0.6, 0.9) },
      setStones('#c0102a', '#d8a838', WARM_GOLD, 'cabochon', 8),
    ],
  },
  {
    id: 'enamel-gold-silver-green',
    name: 'Silver & green enamel',
    description: 'Silver with an emerald-green enamel channel and emeralds in silver claws.',
    after: 'enamel-gold',
    stage: ENAMEL_STAGE,
    colours: [slot('metal', 'Metal colour', '#a8aeb8', ['Metal', 'Beading']), slot('enamel', 'Enamel colour', '#0f6a4a', ['Enamel']), slot('gems', 'Stone colour', '#0f9a5a', ['Stones'])],
    layers: () => [...metalBands(SILVER_STOPS), ...enamelBand('#2aa878', '#02200e', '#7affc0'), ...beading('#e4e8f0', SILVER_STOPS), setStones('#0f9a5a', '#d8dce4', SILVER_STOPS)],
  },
  // ── themed-iron ──
  {
    id: 'worn-iron-battered',
    name: 'Battered iron',
    description: 'Chipped, scratched blackened iron shaded with gradients and a pressed-in inner rim, with heavy steel rivets.',
    after: 'worn-iron',
    stage: IRON_RING_STAGE,
    colours: [slot('iron', 'Iron colour', '#3e4248', ['Iron ring', 'Rivets'])],
    layers: () => [...wornIron(), wornRivets('#a8b0ba', STEEL_STOPS)],
  },
  {
    id: 'worn-iron-smouldering',
    name: 'Smouldering iron',
    description: 'Worn iron with embers still glowing in its cracks.',
    after: 'worn-iron',
    stage: { ...IRON_RING_STAGE, bloom: 0.25 },
    colours: [slot('iron', 'Iron colour', '#3e4248', ['Iron ring', 'Rivets']), slot('glow', 'Ember colour', '#ff6a1a', ['Glowing cracks'])],
    layers: () => [...wornIron(), glowCracks('#1a0602', '#ff6a1a', '#ffb05a', 23, 0.7), wornRivets('#8a929c', STEEL_STOPS)],
  },
  {
    id: 'worn-iron-rusted',
    name: 'Rust-eaten iron',
    description: 'Iron gone orange with rust, the rivets nearly rusted away.',
    after: 'worn-iron',
    stage: IRON_RING_STAGE,
    colours: [slot('iron', 'Iron colour', '#5a4a3a', ['Iron ring']), slot('rust', 'Rust colour', '#9a4a1e', ['Rust'])],
    layers: () => [
      ...wornIron(['#060402', '#2a1a0e', '#5a4a3a', '#8a7a6a', '#c0b0a0']),
      { ...bandFillLayer(), name: 'Rust', paint: photo('rust', 1.2), opacity: 0.75, blend: 'color', clip: 'band' },
      { ...bandFillLayer(), name: 'Rust', paint: photo('rust', 1.2), opacity: 0.4, blend: 'multiply', clip: 'band' },
      wornRivets('#8a4a24', ['#140602', '#4a1a08', '#9a4a1e', '#d0884a', '#f0c090']),
    ],
  },
  // ── themed-rose ──
  {
    id: 'rose-wreath-red',
    name: 'Red rose wreath',
    description: 'A wooden hoop shaded with gradients, a leafy vine, red berries, four red roses and four rosebuds.',
    after: 'rose-wreath',
    stage: ROSE_STAGE,
    colours: [slot('leaves', 'Leaf colour', '#4a8a2a', ['Vine']), slot('roses', 'Rose colour', '#b01828', ['Roses', 'Buds', 'Berries'])],
    // Frame review (owner's pick): real rose pictures instead of the drawn spirals.
    layers: () => [...woodHoop(HOOP_WOOD), roseVine('#3a5220', '#4a8a2a'), roseVine('#3a5220', '#c8283a', { extra: 'berries', count: 1, seed: 7, size: 0.28 }), ...wreathRoses()],
  },
  {
    id: 'rose-wreath-briar',
    name: 'Briar rose',
    description: 'A thorny briar wound round dark bark, with dark red roses blooming along it.',
    after: 'rose-wreath',
    stage: ROSE_STAGE,
    colours: [slot('stem', 'Stem colour', '#3a2a1a', ['Vine']), slot('roses', 'Rose colour', '#8a0a1a', ['Roses'])],
    layers: () => [...woodHoop(['#060402', '#1a120a', '#3a2a1a', '#6a5440', '#9a8470'], 'bark'), roseVine('#3a2a1a', '#1a1008', { extra: 'thorns', size: 0.35 }), roseVine('#2a3a1a', '#3a6a2a', { seed: 9, count: 1, size: 0.34 }), roseBlooms('#8a0a1a', [bevel({ size: 0.4, gloss: 0.6 }), contact(0.7)], 6, 0.85)],
  },
  {
    id: 'rose-wreath-golden',
    name: 'Golden roses',
    description: 'A jeweller’s wreath: a gilded vine and leaves with four red roses.',
    after: 'rose-wreath',
    stage: ROSE_STAGE,
    colours: [slot('gold', 'Gold colour', '#c8952e', ['Vine']), slot('roses', 'Rose colour', '#b01828', ['Roses'])],
    // Frame review (owner's pick): the Red rose wreath's roses, in their own colours.
    layers: () => [
      { ...growthLayer('vine'), name: 'Vine', count: 2, thickness: 0.05, amplitude: 0.26, waveLength: 2, extra: 'leaves', extraSize: 0.45, color: '#a8782a', extraColor: '#d8a838', seed: 3, effects: [...goldFx(0.35, WARM_GOLD), DROP] },
      pictureRepeat('Roses', 'deco-rose-bloom', { count: 4, at: 0.5, size: 1.35, effects: [pictureContact(0.75)] }),
    ],
  },
  // ── themed-fey ──
  {
    id: 'fey-glade-twilight',
    name: 'Fey twilight',
    description: 'Teal-to-violet twilight in the twin gradient bands, silver-green tendrils, glowing dewdrops and fairy motes.',
    after: 'fey-glade',
    stage: FEY_STAGE,
    colours: [slot('band', 'Band colour', '#1e3a3a', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#7affc8', ['Dewdrops', 'Motes', 'Tendrils'])],
    layers: () => [...base({ light: '#2a5a5a', dark: '#0e0a24', step: 0.6 }), { ...textureLayer('nebula'), name: 'Mist', color: '#3a8a6a', color2: '#5a3aa0', opacity: 0.4, blend: 'screen', seed: 0x2f4 }, feyTendrils('#9ad0b0', '#7affc8'), dewdrops('#7affd8', '#8affe0'), fairyMotes('#ffffe0', '#e0ffb0')],
  },
  {
    id: 'fey-glade-moonlit',
    name: 'Moonlit glade',
    description: 'Midnight blue and silver: pale tendrils, moonlit dewdrops and cool motes.',
    after: 'fey-glade',
    stage: FEY_STAGE,
    colours: [slot('band', 'Band colour', '#141e40', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#b0d0ff', ['Dewdrops', 'Motes', 'Tendrils'])],
    layers: () => [...base({ light: '#2a3a6a', dark: '#02040e', step: 0.6 }), feyTendrils('#c8d8f0', '#b0d0ff'), dewdrops('#d8e8ff', '#b0d0ff'), fairyMotes('#ffffff', '#c0d8ff')],
  },
  {
    id: 'fey-glade-fireflies',
    name: 'Firefly glade',
    description: 'Deep forest green with warm golden fireflies glowing all round it.',
    after: 'fey-glade',
    stage: { ...FEY_STAGE, bloom: 0.5 },
    colours: [slot('band', 'Band colour', '#14301a', ['Band', 'Pressed-in step']), slot('glow', 'Firefly colour', '#ffd060', ['Fireflies', 'Tendrils'])],
    layers: () => [
      ...base({ light: '#2a5030', dark: '#020a04', step: 0.6 }),
      feyTendrils('#4a7a3a', '#3aff6a'),
      { ...dewdrops('#fff0a0', '#ffc040', 24), name: 'Fireflies', gemCut: 'cabochon', size: 0.16 },
    ],
  },
  // ── themed-gothic ──
  {
    id: 'gothic-thorns-shaded',
    name: 'Gothic thorns',
    description: 'Black stone in the twin gradient bands, bleeding red cracks that glow, thorny briars and iron spikes round the edge.',
    after: 'gothic-thorns',
    stage: GOTHIC_STAGE,
    colours: [slot('stone', 'Stone colour', '#24202a', ['Black stone']), slot('glow', 'Glow colour', '#ff1a2a', ['Glowing cracks'])],
    layers: () => [gothicSpikes(), ...gothicStone(), glowCracks('#200206', '#ff1a2a', '#ff7080', 25, 0.8), gothicBriars('#1a1012', '#2a1418')],
  },
  {
    id: 'gothic-thorns-blood-roses',
    name: 'Blood roses',
    description: 'Black briars over dark stone, blooming with six red roses.',
    after: 'gothic-thorns',
    stage: GOTHIC_STAGE,
    colours: [slot('stone', 'Stone colour', '#24202a', ['Black stone']), slot('roses', 'Rose colour', '#b01828', ['Roses'])],
    // Frame review (owner's pick): the Red rose wreath's roses, in their own colours.
    layers: () => [...gothicStone(), gothicBriars('#1a1012', '#2a1418'), pictureRepeat('Roses', 'deco-rose-bloom', { count: 6, at: 0.5, size: 1.3, jitterAngle: 25, seed: 11, effects: [pictureContact(0.75)] })],
  },
  {
    id: 'gothic-thorns-bone',
    name: 'Bone thorns',
    description: 'Pale bone-white thorns wound over black stone, with a sickly green glow from the cracks.',
    after: 'gothic-thorns',
    stage: GOTHIC_STAGE,
    colours: [slot('bone', 'Thorn colour', '#e8dcc0', ['Briars']), slot('glow', 'Glow colour', '#6aff4a', ['Glowing cracks'])],
    layers: () => [...gothicStone(), glowCracks('#041a02', '#6aff4a', '#c0ffb0', 29, 0.7), gothicBriars('#e8dcc0', '#fffcf0', [recolour(['#2a2418', '#6a5e48', '#c8bca0', '#ece4d0', '#fffcf2']), bevel({ size: 0.5, gloss: 0.4 }), contact(0.8)])],
  },
  // ── themed-tidal ──
  {
    id: 'tidal-ring-lagoon',
    name: 'Lagoon',
    description: 'Clear turquoise lagoon water over sand, with gentle foam and pearls.',
    after: 'tidal-ring',
    stage: TIDAL_STAGE,
    colours: [slot('sea', 'Sea colour', '#1ab0b8', ['Band', 'Pressed-in step', 'Swell'])],
    layers: () => [...base({ light: '#5ae0e0', dark: '#0a5a6a', step: 0.8 }), ...seaWaves('#8af0f0', '#ffffff'), pearlString('#fff8f0')],
  },
  // ── themed-archmage ──
  {
    id: 'archmage-midnight', name: 'Midnight sigils',
    description: 'Midnight blue in the twin gradient bands, gold contour lines, glowing Outer Rim AF words between gold star sigils at the quarters.',
    after: 'archmage',
    stage: ARCHMAGE_STAGE,
    colours: [slot('band', 'Band colour', '#1a2460', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#d8a838', ['Contour lines', 'Sigils']), slot('glow', 'Glow colour', '#a8d8ff', ['Inscription'])],
    layers: () => [...base({ light: '#2a3a90', dark: '#04061a', step: null }), sigilLines('#d8a838', WARM_GOLD), panelWords('outerRim', '#e0f0ff', { size: 0.38, start: 2, effects: [glow({ color: '#6ab0ff', opacity: 0.9, size: 0.1 })] }), starSigils('star', '#f4d27a', WARM_GOLD, '#ffe8a0')],
  },
  {
    id: 'archmage-panels', name: 'Sigil panels',
    description: 'Midnight blue with a glowing word in each of eight panels between gold sigils.',
    after: 'archmage',
    stage: ARCHMAGE_STAGE,
    colours: [slot('band', 'Band colour', '#1a2460', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#d8a838', ['Contour lines', 'Sigils']), slot('glow', 'Glow colour', '#a8d8ff', ['Runes'])],
    layers: () => [...base({ light: '#2a3a90', dark: '#04061a', step: null }), sigilLines('#d8a838', WARM_GOLD), panelWords('yugurian', '#e0f0ff', { size: 0.4, offset: 0, effects: [glow({ color: '#6ab0ff', opacity: 0.9, size: 0.1 })] }), { ...starSigils('star', '#f4d27a', WARM_GOLD, '#ffe8a0'), count: 8, size: 0.5 } as Layer],
  },
  {
    id: 'archmage-blood', name: 'Blood sigils',
    description: 'Black and crimson with rose-gold lines, red-glowing Sith AF runes and star sigils.',
    after: 'archmage',
    stage: ARCHMAGE_STAGE,
    colours: [slot('band', 'Band colour', '#3a0a14', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#ff3a4a', ['Inscription'])],
    layers: () => [...base({ light: '#6a1a2a', dark: '#0a0204', step: null }), sigilLines('#d8907a', ROSE_STOPS), panelWords('sith', '#ffd0d0', { size: 0.36, start: 6, effects: [glow({ color: '#ff3a4a', opacity: 0.9, size: 0.1 })] }), starSigils('star', '#d8907a', ROSE_STOPS, '#ff6a7a')],
  },
  // ── themed-starship ──
  {
    id: 'starship-gunmetal', name: 'Gunmetal hull',
    description: 'Curved gunmetal hull plates with cyan running lights along both edges and small lit ports.',
    after: 'starship',
    stage: STARSHIP_STAGE,
    colours: [slot('metal', 'Hull colour', '#4a5260', ['Plates']), slot('glow', 'Light colour', '#4ae0ff', ['Glowing lines', 'Ports'])],
    layers: () => [...hullPlates('#4a5260', ['#040506', '#1a1e24', '#4a5260', '#8a929e', '#d0d6de']), runningLights('#8af0ff', '#2ad0ff'), ringOf('Ports', 'square', 16, '#c8f8ff', [glow({ color: '#4ae0ff', opacity: 0.8, size: 0.06 })], { size: 0.1, offset: 0.5, shaded: false } as never)],
  },
  {
    id: 'starship-living', name: 'Living hull',
    description: 'An alien ship grown, not built: violet cells glowing green where they join.',
    after: 'starship',
    stage: STARSHIP_STAGE,
    colours: [slot('hull', 'Hull colour', '#4a2a6a', ['Cells']), slot('glow', 'Glow colour', '#6aff8a', ['Glow'])],
    layers: () => [
      ...base({ light: '#2a3a2a', dark: '#020402', step: null }),
      { ...bandFillLayer(), name: 'Glow', from: 0.1, to: 0.9, paint: { kind: 'solid', color: '#6aff8a' }, opacity: 0.5, effects: [glow({ color: '#4aff6a', opacity: 0.6, size: 0.1 })] },
      { ...cellsLayer(), name: 'Cells', pattern: 'voronoi', size: 0.55, gap: 0.06, rounding: 0.6, vary: 0.3, color: '#4a2a6a', effects: [...metalFx(['#0a0214', '#2a1440', '#4a2a6a', '#8a5aaa', '#c8a0e0'], 0.4, 0.6), contact(0.6)] },
    ],
  },
  {
    id: 'starship-white', name: 'White armour',
    description: 'Clean white armour plating with blue running lights.',
    after: 'starship',
    stage: STARSHIP_STAGE,
    colours: [slot('metal', 'Plate colour', '#e8ecf0', ['Plates']), slot('glow', 'Light colour', '#4a8aff', ['Glowing lines'])],
    layers: () => [...hullPlates('#e8ecf0', ['#4a4e56', '#9aa0aa', '#d8dce4', '#f4f6f8', '#ffffff']), runningLights('#a0c8ff', '#4a8aff')],
  },
  // ── themed-hellfire ──
  {
    id: 'hellfire-ring-shaded', name: 'Hellfire',
    description: 'Molten rock shaded with gradients, split by blurred burning cracks, with flames licking along it and embers.',
    after: 'hellfire-ring',
    stage: HELLFIRE_STAGE,
    colours: [slot('rock', 'Rock colour', '#3a1a10', ['Rock']), slot('fire', 'Fire colour', '#ff6a1a', ['Glowing cracks', 'Flames'])],
    layers: () => [...photoRing('Rock', 'dark-rock', HELL_ROCK), glowCracks('#1a0602', '#ff6a1a', '#ffc070', 31, 0.9), flameRing('#ffd070', '#ff5a1a'), emberSparks('#ffb050')],
  },
  {
    id: 'hellfire-ring-blue', name: 'Blue hellfire',
    description: 'The same fire burning blue and white, hotter and stranger.',
    after: 'hellfire-ring',
    stage: HELLFIRE_STAGE,
    colours: [slot('rock', 'Rock colour', '#1a1a2a', ['Rock']), slot('fire', 'Fire colour', '#4a8aff', ['Glowing cracks', 'Flames'])],
    layers: () => [...photoRing('Rock', 'dark-rock', ['#010102', '#04060e', '#1a1a2a', '#3a3a5a', '#6a6a8a']), glowCracks('#020618', '#4a8aff', '#c0e0ff', 33, 0.9), flameRing('#d0e8ff', '#4a8aff'), emberSparks('#a0c8ff')],
  },
  {
    id: 'hellfire-ring-lava', name: 'Lava flow',
    description: 'A ring of flowing lava, crusted dark at the edges and bright in the middle.',
    after: 'hellfire-ring',
    stage: HELLFIRE_STAGE,
    colours: [slot('lava', 'Lava colour', '#ff4a1a', ['Lava'])],
    layers: () => [...photoRing('Lava', 'lava-flow', null, { step: null }), { ...textureLayer('lava'), name: 'Lava', from: 0.3, to: 0.7, color: '#ff6a2a', color2: '#5a0a04', opacity: 0.7, blend: 'screen', seed: 0x1a7c }],
  },
  // ── themed-frostring ──
  {
    id: 'frost-ring-glacier', name: 'Glacier crystal',
    description: 'Hexagonal ice crystals over glacier blue, shaded with gradients, with a cold glowing seam.',
    after: 'frost-ring',
    stage: FROSTRING_STAGE,
    colours: [slot('ice', 'Ice colour', '#6aa8d0', ['Band', 'Pressed-in step', 'Crystals'])],
    layers: () => [...base({ light: '#8ac8f0', dark: '#06182a', step: 0.74 }), iceCrystals('#a8d8f8', ICE_STOPS), glowLines(['#f0fcff', '#a8ecff'], '#4ac8ff', { count: 1, from: 0.74, width: 0.025, size: 0.1 })],
  },
  {
    id: 'frost-ring-silver', name: 'Frozen silver',
    description: 'Frosted silver with silver snowflakes and a pale blue glow.',
    after: 'frost-ring',
    stage: FROSTRING_STAGE,
    colours: [slot('metal', 'Metal colour', '#c8ccd4', ['Band', 'Pressed-in step', 'Snowflakes'])],
    layers: () => [...base({ light: '#e8ecf0', dark: '#3a4048', step: 0.7 }), { ...textureLayer('frost'), name: 'Frost', color: '#ffffff', opacity: 0.7, seed: 0xf208, blend: 'screen' }, ringOf('Snowflakes', 'snowflake', 8, '#ffffff', [...metalFx(SILVER_STOPS, 0.3, 0.9), glow({ color: '#bfe8ff', opacity: 0.5, size: 0.08 })], { size: 0.6, at: 0.36 } as never)],
  },
  // ── themed-storm ──
  {
    id: 'storm-ring-thunderhead', name: 'Thunderhead',
    description: 'Swirling grey storm cloud in the twin gradient bands, crackling with forked lightning.',
    after: 'storm-ring',
    stage: STORM_RING_STAGE,
    colours: [slot('cloud', 'Cloud colour', '#3a4450', ['Band', 'Pressed-in step', 'Clouds']), slot('light', 'Lightning colour', '#bfe4ff', ['Lightning'])],
    layers: () => [...base({ light: '#5a6470', dark: '#06080a', step: null }), stormClouds('#9aa4b0', '#1a2028', 0x5e11), forkedLightning('#f0f8ff', '#6ab0ff')],
  },
  {
    id: 'storm-ring-arcane', name: 'Arcane tempest',
    description: 'A violet storm with pink lightning.',
    after: 'storm-ring',
    stage: STORM_RING_STAGE,
    colours: [slot('cloud', 'Cloud colour', '#3a2450', ['Band', 'Pressed-in step', 'Clouds']), slot('light', 'Lightning colour', '#ffc8ff', ['Lightning'])],
    layers: () => [...base({ light: '#5a3a7a', dark: '#0a0412', step: null }), stormClouds('#b08ad0', '#1a0a28', 0x5e12), forkedLightning('#fff0ff', '#e070ff', 0x11e8)],
  },
  {
    id: 'storm-ring-blood', name: 'Blood storm',
    description: 'Red-black clouds lit by orange lightning.',
    after: 'storm-ring',
    stage: STORM_RING_STAGE,
    colours: [slot('cloud', 'Cloud colour', '#3a1010', ['Band', 'Pressed-in step', 'Clouds']), slot('light', 'Lightning colour', '#ffc080', ['Lightning'])],
    layers: () => [...base({ light: '#6a2020', dark: '#0a0202', step: null }), stormClouds('#c06050', '#1a0404', 0x5e13), forkedLightning('#fff0d0', '#ff7a2a', 0x11e9)],
  },
  // ── themed-necro ──
  {
    id: 'necropolis-bone', name: 'Bone & chain',
    description: 'Yellowed bone plates on a dark band, bound with a rusted chain and dead roots, under a sickly green mist.',
    after: 'necropolis',
    stage: NECRO_STAGE,
    colours: [slot('bone', 'Bone colour', '#c8bca0', ['Bone plates']), slot('glow', 'Mist colour', '#8aff6a', ['Mist'])],
    layers: () => [...base({ light: '#2a2a20', dark: '#040402', step: null }), bonePlates(), deadRoots(), necroChain('#8a3a14', RUST_STOPS), graveMist('#8aff6a')],
  },
  // ── themed-clockwork ──
  {
    id: 'clockwork-brass', name: 'Brass clockwork',
    description: 'Dark plate shaded with gradients, meshing polished brass gears and rows of rivets.',
    after: 'clockwork',
    stage: CLOCK_STAGE,
    colours: [slot('plate', 'Plate colour', '#2a2014', ['Band']), slot('brass', 'Brass colour', '#c8952e', ['Gears', 'Rivets'])],
    layers: () => [...base({ light: '#4a3a24', dark: '#0a0602', step: null }), clockGears('#c8952e', WARM_GOLD), ...clockRivets('#c8952e', WARM_GOLD)],
  },
  {
    id: 'clockwork-watchwork', name: 'Silver watchwork',
    description: 'The inside of a silver pocket watch: fine silver gears, each with a ruby jewel bearing at its centre.',
    after: 'clockwork',
    stage: CLOCK_STAGE,
    colours: [slot('metal', 'Metal colour', '#c8ccd4', ['Band', 'Gears']), slot('gems', 'Jewel colour', '#c0203a', ['Jewels'])],
    layers: () => [...photoRing('Band', 'hammered-metal', SILVER_STOPS, { step: null }), clockGears('#d8dce4', SILVER_STOPS, { count: 14, teeth: 16 }), ringOf('Jewels', 'gem', 14, '#c0203a', [contact(0.5)], { size: 0.2, altSizes: [1, 0.7] } as never)],
  },
  {
    id: 'clockwork-steampunk', name: 'Steampunk',
    description: 'Brown leather strapped round brass gears and a steel chain.',
    after: 'clockwork',
    stage: CLOCK_STAGE,
    colours: [slot('leather', 'Leather colour', '#5a3420', ['Band']), slot('brass', 'Brass colour', '#b5813a', ['Gears'])],
    layers: () => [
      ...photoRing('Band', 'leather', ['#0a0402', '#2a160a', '#5a3420', '#8a6040', '#b89070'], { step: null }),
      clockGears('#b5813a', BRONZE_STOPS, { count: 6 }),
      { ...chainLayer(), name: 'Chain', at: 0.85, linkLength: 0.3, linkWidth: 0.4, thickness: 0.05, color: '#a8b0ba', effects: [...metalFx(STEEL_STOPS, 0.5, 0.8), contact(0.6)] },
    ],
  },
  // ── themed-celticknot ──
  {
    id: 'celtic-knot-silver', name: 'Silver on green',
    description: 'Silver knotwork woven over and under on green enamel, between silver rims shaded with gradients.',
    after: 'celtic-knot',
    stage: KNOT_STAGE,
    colours: [slot('enamel', 'Enamel colour', '#1f6a3c', ['Band']), slot('silver', 'Silver colour', '#d8dce4', ['Knotwork', 'Rims'])],
    layers: () => [...base({ light: '#2e8a50', dark: '#031408', step: null }), ...knotRims(SILVER_STOPS), woveKnot('#d8dce4', SILVER_STOPS)],
  },
  {
    id: 'celtic-knot-gold', name: 'Gold on red',
    description: 'A double gold knot on deep red enamel between gold rims.',
    after: 'celtic-knot',
    stage: KNOT_STAGE,
    colours: [slot('enamel', 'Enamel colour', '#8a1a24', ['Band']), slot('gold', 'Gold colour', '#d8a838', ['Knotwork', 'Rims'])],
    layers: () => [...base({ light: '#c02a3a', dark: '#1a0206', step: null }), ...knotRims(WARM_GOLD), woveKnot('#d8a838', WARM_GOLD, true)],
  },
  {
    id: 'celtic-knot-bronze', name: 'Bronze on blue',
    description: 'Bronze knotwork on midnight-blue enamel.',
    after: 'celtic-knot',
    stage: KNOT_STAGE,
    colours: [slot('enamel', 'Enamel colour', '#1a2a5a', ['Band']), slot('bronze', 'Bronze colour', '#a87a3a', ['Knotwork', 'Rims'])],
    layers: () => [...base({ light: '#2a4a8a', dark: '#02061a', step: null }), ...knotRims(BRONZE_STOPS), woveKnot('#a87a3a', BRONZE_STOPS)],
  },
  // ── themed-dragon ──
  {
    id: 'dragon-scale-crimson', name: 'Crimson dragon',
    description: 'Crimson scales shaded with a gradient, gold edges, a row of gold horn tips and a glowing amber dragon’s eye at the top.',
    after: 'dragon-scale',
    stage: { ...DRAGON_STAGE, bloom: 0.2 },
    colours: [slot('scales', 'Scale colour', '#d03a2a', ['Scales']), slot('gold', 'Gold colour', '#d8a838', ['Edges', 'Horn ridge'])],
    layers: () => [...scaleBand('#d03a2a', '#200404'), hornRidge('#f4d27a', WARM_GOLD), ...scaleEdges('#d8a838', WARM_GOLD), dragonEye('#ffa020', '#ffc040')],
  },
  {
    id: 'dragon-scale-emerald', name: 'Emerald dragon',
    description: 'Green scales with bronze edges and a glowing yellow eye.',
    after: 'dragon-scale',
    stage: { ...DRAGON_STAGE, bloom: 0.2 },
    colours: [slot('scales', 'Scale colour', '#3a9a3a', ['Scales'])],
    layers: () => [...scaleBand('#3a9a3a', '#041004'), ...scaleEdges('#a87a3a', ['#1e1206', '#5a3a18', '#a87a3a', '#e0c08a', '#fff0d0']), dragonEye('#e0ff40', '#c0ff40')],
  },
  {
    id: 'dragon-scale-shadow', name: 'Shadow dragon',
    description: 'Black scales with a violet sheen and a glowing violet eye.',
    after: 'dragon-scale',
    stage: { ...DRAGON_STAGE, bloom: 0.25 },
    colours: [slot('scales', 'Scale colour', '#2a2034', ['Scales']), slot('glow', 'Eye colour', '#b06aff', ['Eye'])],
    layers: () => [...scaleBand('#2a2034', '#020104'), { ...bandFillLayer(), name: 'Sheen', paint: lin(['#8a4ad0', '#000000', '#2a8ad0'], 30), opacity: 0.45, blend: 'screen' }, dragonEye('#c890ff', '#9a5aff')],
  },
  // ── themed-stones ──
  {
    id: 'druid-circle-stones', name: 'Standing stones',
    description: 'Ten grey stones that follow the ring, with gradient rings for depth over them and the ground behind, moss on their tops and a creeper threading between them.',
    after: 'druid-circle',
    stage: STONES_STAGE,
    colours: [slot('stone', 'Stone colour', '#8a8680', ['Stones']), slot('moss', 'Leaf colour', '#5a8a32', ['Creeper'])],
    layers: () => [...groundRings('#3a4a2a'), ...stoneGroup(CIRCLE_STONE, [stoneMoss()]), creeper('#5a8a32')],
  },
  {
    id: 'druid-circle-runes', name: 'Rune stones',
    description: 'The stones carved with a rune each, glowing faint green.',
    after: 'druid-circle',
    stage: { ...STONES_STAGE, bloom: 0.25 },
    colours: [slot('stone', 'Stone colour', '#8a8680', ['Stones']), slot('glow', 'Rune colour', '#6aff8a', ['Runes'])],
    layers: () => [...groundRings('#2a3a24'), ...stoneGroup(CIRCLE_STONE), panelWords('babelstone', '#d0ffd8', { count: 10, size: 0.34, effects: [glow({ color: '#4aff6a', opacity: 0.85, size: 0.1 })] })],
  },
  // ── themed-nautical ──
  {
    id: 'nautical-timber', name: 'Ship’s timber',
    description: 'Weathered timber shaded with gradients, a twisted rope round the middle, brass portholes and gold doubloons.',
    after: 'nautical',
    stage: NAUTICAL_STAGE,
    colours: [slot('wood', 'Wood colour', '#7a5230', ['Timber']), slot('rope', 'Rope colour', '#c8a870', ['Rope'])],
    layers: () => [...photoRing('Timber', 'wood-planks', SHIP_WOOD, { angle: 90, step: null }), ...shipRope('#c8a870'), portholes(BRONZE_STOPS), doubloons()],
  },
  {
    id: 'nautical-driftwood', name: 'Driftwood & shells',
    description: 'Sun-bleached driftwood bound with rope, with shells tucked into it.',
    after: 'nautical',
    stage: NAUTICAL_STAGE,
    colours: [slot('wood', 'Wood colour', '#b8a890', ['Timber']), slot('shells', 'Shell colour', '#f8e8e0', ['Shells'])],
    layers: () => [...photoRing('Timber', 'plane-bark', ['#2a2620', '#6a6050', '#b8a890', '#e0d8c8', '#fffcf4'], { angle: 90, step: null }), ...shipRope('#c8a870', 0.6, 0.8), ringOf('Shells', 'shell', 8, '#f8e8e0', [contact(0.6)], { size: 0.5, at: 0.3 } as never)],
  },
  {
    id: 'nautical-pirate', name: 'Pirate’s hoard',
    description: 'Black tarred timber, a rope, gold doubloons and a skull at the top.',
    after: 'nautical',
    stage: NAUTICAL_STAGE,
    colours: [slot('wood', 'Wood colour', '#2a2018', ['Timber'])],
    layers: () => [...photoRing('Timber', 'wood-planks', ['#020101', '#0e0a06', '#2a2018', '#5a4a3a', '#8a7a6a'], { angle: 90, step: null }), ...shipRope('#a88a5a'), doubloons(), ringOf('Skull', 'skull', 1, '#f0e8d8', [contact(0.7)], { size: 0.85 } as never)],
  },
  // ── themed-autumn ──
  {
    id: 'autumn-leaves-birch', name: 'Birch & autumn',
    description: 'A birch-bark hoop shaded with gradients, with red, orange and gold leaves tumbling round it.',
    after: 'autumn-leaves',
    stage: AUTUMN_STAGE,
    colours: [slot('bark', 'Bark colour', '#d8d4c8', ['Bark']), slot('leaves', 'Leaf colour', '#c0501a', ['Leaves'])],
    layers: () => [...photoRing('Bark', 'plane-bark', ['#2a2a26', '#8a8a82', '#d8d4c8', '#f0ece4', '#ffffff'], { angle: 90 }), autumnLeaves('leaf', '#c83a14', AUTUMN_COLOURS)],
  },
  {
    id: 'autumn-leaves-gilded', name: 'Gilded leaves',
    description: 'Leaves of beaten gold scattered round a dark hoop.',
    after: 'autumn-leaves',
    stage: AUTUMN_STAGE,
    colours: [slot('gold', 'Gold colour', '#d8a838', ['Leaves'])],
    layers: () => [...photoRing('Bark', 'wood-planks', ['#0a0602', '#1e140a', '#3a2814', '#5a4428', '#806040'], { angle: 90 }), autumnLeaves('leaf', '#d8a838', ['#f0c860', '#b07820', '#e8b0a0', '#c89040'], [...goldFx(0.35, WARM_GOLD), contact(0.6)])],
  },
  // ── themed-halo ──
  {
    id: 'celestial-halo-white-gold', name: 'White-gold halo',
    description: 'White gold in the twin gradient bands, a radiant sunburst of rays, glowing stars and a soft heavenly bloom.',
    after: 'celestial-halo',
    stage: HALO_STAGE,
    colours: [slot('metal', 'Metal colour', '#e8e4d8', ['Band', 'Pressed-in step', 'Stars']), slot('glow', 'Glow colour', '#fff4c0', ['Glowing lines'])],
    layers: () => [...base({ light: '#ffffff', dark: '#8a8678', step: 0.7 }), haloRays('#ffffff'), haloStars('#fffbe8', ['#4a4638', '#a8a490', '#e8e4d8', '#fffcf0', '#ffffff'], '#fff4c0'), glowLines(['#ffffff', '#fff4c0'], '#ffe890', { count: 1, from: 0.7, width: 0.025, size: 0.12 })],
  },
  {
    id: 'celestial-halo-golden', name: 'Golden halo',
    description: 'Warm gold with a sunburst and golden stars.',
    after: 'celestial-halo',
    stage: HALO_STAGE,
    colours: [slot('gold', 'Gold colour', '#d8a838', ['Band', 'Pressed-in step', 'Stars'])],
    layers: () => [...base({ light: '#f4d27a', dark: '#4a2a06', step: 0.7 }), haloRays('#fff0b0'), haloStars('#f4d27a', WARM_GOLD, '#ffe8a0')],
  },
  // ── themed-desert ──
  {
    id: 'desert-tomb-sandstone', name: 'Sandstone tomb',
    description: 'Sandstone blocks that follow the ring, a glyph carved in each, lapis inlay lines and gold scarabs over every other joint.',
    after: 'desert-tomb',
    stage: DESERT_STAGE,
    colours: [slot('stone', 'Stone colour', '#c8a874', ['Sandstone']), slot('lapis', 'Inlay colour', '#1a3aa0', ['Lapis inlay'])],
    layers: () => [...tombBlocks(), ...lapisInlay(), tombGlyphs('#5a4020', [bevel({ direction: 'sunken', size: 0.6, gloss: 0.3 })]), ringOf('Scarabs', 'gem', 5, '#d8a838', [...goldFx(0.4, WARM_GOLD), contact(0.6)], { size: 0.5, gemCut: 'cabochon', offset: 0 } as never)],
  },
  {
    id: 'desert-tomb-lapis', name: 'Lapis & gold',
    description: 'Deep lapis blue with gold glyphs and gold bands, like a pharaoh’s collar.',
    after: 'desert-tomb',
    stage: DESERT_STAGE,
    colours: [slot('lapis', 'Stone colour', '#1a3aa0', ['Lapis']), slot('gold', 'Gold colour', '#d8a838', ['Gold bands', 'Runes'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Lapis', paint: lin(['#3a6ad0', '#061440']), effects: [DROP] },
      { ...bandFillLayer(), name: 'Lapis', paint: photo('blue-onyx', 3), opacity: 0.5, blend: 'overlay' },
      ...[0.08, 0.92].map((at) => ({ ...lineLayer(), name: 'Gold bands', at, width: 0.12, paint: { kind: 'solid' as const, color: '#d8a838' }, effects: [...metalFx(WARM_GOLD, 0.5, 0.9), contact(0.5)] })),
      tombGlyphs('#f4d27a', goldFx(0.3, WARM_GOLD)),
    ],
  },
  // ── themed-geode ──
  {
    id: 'amethyst-geode-amethyst', name: 'Amethyst geode',
    description: 'Grey stone crust outside, a white rind, then glittering crystal going from deep purple to pale lilac towards the centre.',
    after: 'amethyst-geode',
    stage: GEODE_STAGE,
    colours: [slot('crust', 'Crust colour', '#5a5048', ['Crust']), slot('crystal', 'Crystal colour', '#9a4ad0', ['Crystal'])],
    layers: () => geodeBand(GEODE_CRUST, '#9a4ad0', '#c08aff', ['#2a0a5a', '#6a2aa0', '#b07ae0', '#f0e0ff']),
  },
  {
    id: 'amethyst-geode-agate', name: 'Banded agate',
    description: 'A slice of agate: bands of colour going from deep blue outside to white at the centre, polished smooth.',
    after: 'amethyst-geode',
    stage: GEODE_STAGE,
    colours: [slot('agate', 'Agate colour', '#3a6aa0', ['Agate', 'Bands'])],
    layers: () => [
      { ...bandFillLayer(), name: 'Agate', paint: across(['#0e2440', '#2a5a90', '#6a9ac8', '#c8dcf0', '#ffffff']), effects: [DROP] },
      { ...contoursLayer(), name: 'Bands', count: 7, from: 0.06, spacing: 0.14, width: 0.04, taper: 0.3, paint: { kind: 'solid', color: '#f0f4f8' }, altColor: '#1a3a60', opacity: 0.55, effects: [{ kind: 'distort', on: true, amount: 0.04, scale: 0.4, seed: 3 } as never] },
      { ...bandFillLayer(), name: 'Polish', paint: lin(['#ffffff', '#000000']), blend: 'overlay', opacity: 0.5 },
    ],
  },
  // ── next ──
];

/** Every version, each filed under its own category (frameCategories.ts). */
export const FRAME_VERSIONS: BuiltInFrame[] = [
  ...WIZARD,
  ...VERSIONS.map(({ layers, stage, shading, ...v }) => ({ ...v, project: fromLayers(v.name, shading ? () => bandShading(layers(), shading) : layers, stage) })),
].map((v) => ({ ...v, group: categoryOf(v.id) }));
