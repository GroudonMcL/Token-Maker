// Themed borders (the "Themed borders" section of New): a varied set of
// designs in the styles people buy and make for tabletop tokens (metal and
// enamel rings, floral and fey wreaths, gothic frames, elemental rings,
// clockwork, Celtic knotwork, scales, nautical rope…), each built only from
// ordinary editable layers, generators and styles, so every part of them can
// be changed. They use what Phases 6–10 added: effects and styles,
// ornaments along paths, gem cuts and settings, text, generators, shared
// height and the lighting rig.

import {
  bandFillLayer,
  cellsLayer,
  chainLayer,
  contoursLayer,
  createProject,
  fractureLayer,
  gearsLayer,
  growthLayer,
  knotworkLayer,
  lineLayer,
  NEW_EFFECT,
  repeatLayer,
  shapeLayer,
  textLayer,
  textureLayer,
  type LayeredTemplate,
} from './defaults';
import { adjust, bevel, glow, material, shadow, styleEffects, wear } from './styles';
import type { Effect, FrameProject, Paint, StageSettings } from './types';

const solid = (color: string): Paint => ({ kind: 'solid', color });
const grey = solid('#909090');
const distort = (amount: number, scale = 0.3, seed = 1): Effect => ({ ...NEW_EFFECT.distort(), amount, scale, seed }) as Effect;
const soft = (opacity = 0.6) => shadow({ distance: 0.04, blur: 0.05, opacity });

/** A themed template: its layers, and (for a few) a lighting rig of their own. */
export interface ThemedTemplate extends LayeredTemplate {
  /** Stage settings it looks best with (its lighting rig); the rest are the editor's. */
  stage?: Partial<StageSettings>;
}

export const THEMED_TEMPLATES: ThemedTemplate[] = [
  {
    id: 'fey-glade',
    name: 'Fey glade',
    description: 'Curling silver-green tendrils, glowing dewdrop gems riding a wave and soft fairy light.',
    stage: { bloom: 0.45, bleed: 0.3 },
    make: () => {
      const wave = { ...lineLayer(), name: 'Dewdrop path', visible: false, at: 0.5, waveAmplitude: 0.22, waveFit: 1.6 };
      return [
        { ...bandFillLayer(), name: 'Twilight band', paint: { kind: 'ring', stops: [{ angle: 0, color: '#1e3a3a' }, { angle: 120, color: '#2a2450' }, { angle: 240, color: '#183a2a' }], followLight: false }, effects: [bevel({ size: 0.2, gloss: 0.4, highlightOpacity: 0.4 })] },
        { ...textureLayer('scatter'), name: 'Fairy dust', color: '#e8fff0', color2: '#3a8a6a', amount: 1.4, clip: 'band' },
        { ...growthLayer('tendrils'), name: 'Tendrils', color: '#9ad0b0', extraColor: '#ffffff', thickness: 0.035, effects: [bevel({ size: 0.6, gloss: 0.6 }), glow({ color: '#7affc8', opacity: 0.35, size: 0.12 })] },
        wave,
        { ...repeatLayer(), name: 'Dewdrops', element: 'gem', gemCut: 'cabochon', follow: wave.id, mode: 'spacing', spacing: 0.8, size: 0.24, fill: '#7affd8', raised: false, jitterSize: 0.4, effects: [glow({ color: '#8affe0', opacity: 0.7, size: 0.2 })] },
        { ...repeatLayer(), name: 'Motes', element: 'star', mode: 'spacing', spacing: 0.35, snapToCorners: false, at: 0.5, size: 0.09, fill: '#ffffe0', shaded: false, raised: false, jitterSize: 0.8, jitterAngle: 40, skipChance: 0.5, alternateSides: 0.35, effects: [glow({ color: '#fff8a0', opacity: 0.9, size: 0.12 })] },
      ];
    },
  },
  {
    id: 'gothic-thorns',
    name: 'Gothic thorns',
    description: 'Black cracked stone bound in thorny briars, iron spikes and a blood-red inner glow.',
    make: () => [
      { ...repeatLayer(), name: 'Iron spikes', element: 'spike', count: 12, at: -0.22, size: 0.62, stretch: 0.55, fill: '#7a7a7a', raised: false, effects: [bevel({ profile: 'chisel', size: 0.3, gloss: 0.4 }), material('iron'), soft(0.7)] },
      { ...bandFillLayer(), name: 'Black stone', paint: grey, effects: [...styleEffects('carved-stone'), adjust({ brightness: -0.45, saturation: -0.6 })] },
      { ...fractureLayer(), name: 'Bleeding cracks', count: 10, width: 0.04, color: '#d01020', clip: 'band', effects: [glow({ color: '#ff1a2a', opacity: 0.75, size: 0.1 })] },
      { ...growthLayer('thorns'), name: 'Briars', count: 2, thickness: 0.055, amplitude: 0.28, waveLength: 1.9, extraSize: 0.24, color: '#1a1012', extraColor: '#2a1418', effects: [bevel({ size: 0.5, gloss: 0.5 }), soft(0.8)] },
      { ...lineLayer(), name: 'Blood glow', at: 0.985, width: 0.03, paint: solid('#ff3040'), effects: [glow({ color: '#ff0a1a', opacity: 0.6, size: 0.18 })] },
    ],
  },
  {
    id: 'tidal-ring',
    name: 'Tidal ring',
    description: 'Rolling sea-glass waves with foam crests, bubbles and a pearl-studded rim.',
    make: () => [
      { ...bandFillLayer(), name: 'Deep water', paint: { kind: 'acrossBand', stops: [{ at: 0, color: '#0a4a6a', opacity: 1 }, { at: 1, color: '#062a42', opacity: 1 }] }, effects: [bevel({ size: 0.35, gloss: 0.9, highlightOpacity: 0.45 })] },
      { ...lineLayer(), name: 'Swell', at: 0.42, width: 0.28, paint: solid('#1f8ab0'), waveAmplitude: 0.16, waveFit: 1.3, clip: 'band', effects: [distort(0.03, 0.25, 4), bevel({ size: 0.4, gloss: 0.9 })] },
      { ...lineLayer(), name: 'Foam crests', at: 0.3, width: 0.06, paint: solid('#e8fbff'), waveAmplitude: 0.16, waveFit: 1.3, wavePhase: 0.1, clip: 'band', effects: [distort(0.05, 0.12, 9), glow({ color: '#bff6ff', opacity: 0.4, size: 0.08 })] },
      { ...repeatLayer(), name: 'Bubbles', element: 'circle', mode: 'spacing', spacing: 0.3, snapToCorners: false, at: 0.7, size: 0.1, fill: '#bfefff', outline: '#e8ffff', outlineWidth: 0.12, opacity: 0.55, raised: false, shaded: false, jitterSize: 0.7, skipChance: 0.35, alternateSides: 0.12, clip: 'band' },
      { ...repeatLayer(), name: 'Pearls', mode: 'spacing', spacing: 0.24, snapToCorners: false, at: 0.03, size: 0.11, fill: '#f4f0ea', raised: true },
    ],
  },
  {
    id: 'archmage',
    name: 'Archmage’s sigil ring',
    description: 'Midnight blue with gold contour lines, a glowing runic inscription and star sigils at the four quarters.',
    stage: { bloom: 0.35 },
    make: () => [
      { ...bandFillLayer(), name: 'Midnight band', paint: { kind: 'lit', color: '#243070', light: 0.7, dark: 0.75, pressed: false, highlight: '#6a7ad0' }, effects: [bevel({ size: 0.25, gloss: 0.5, highlightOpacity: 0.4 })] },
      { ...contoursLayer(), name: 'Gold lines', count: 4, from: 0.04, spacing: 0.3, width: 0.06, taper: 0.5, paint: solid('#e0b040'), effects: [bevel({ size: 0.8, gloss: 0.9 })] },
      { ...textLayer(), name: 'Runic inscription', font: 'runes', text: 'FATE AND FIRE BEND TO THE WILL OF THE WISE · STARS AND STORM OBEY THE WORD OF THE WISE · ALL THINGS END · ALL THINGS BEGIN ·', size: 0.24, spacing: 0.22, at: 0.5, fill: '#a8e8ff', effects: [glow({ inner: true, color: '#ffffff', opacity: 0.5, size: 0.04 }), glow({ color: '#5ab8ff', opacity: 0.9, size: 0.18 })] },
      { ...shapeLayer(), name: 'Star sigils', shape: 'star', sides: 8, innerRatio: 0.4, along: 0.125, across: 0.5, size: 0.75, fill: '#e8c050', outline: null, raised: false, faceted: true, facetTable: 0, mirror: 'four', effects: [glow({ color: '#ffd870', opacity: 0.6, size: 0.15 })] },
    ],
  },
  {
    id: 'hellfire-ring',
    name: 'Hellfire ring',
    description: 'Molten rock split by burning cracks, licked by flames and wreathed in embers.',
    stage: { bloom: 0.6, bleed: 0.45 },
    make: () => [
      { ...bandFillLayer(), name: 'Magma beneath', paint: { kind: 'acrossBand', stops: [{ at: 0, color: '#ff4a00', opacity: 1 }, { at: 0.5, color: '#ffb020', opacity: 1 }, { at: 1, color: '#ff4a00', opacity: 1 }] } },
      { ...cellsLayer(), name: 'Cooling rock', gap: 0.06, size: 0.62, vary: 0.4, color: '#3a2420', effects: [bevel({ size: 0.15, gloss: 0.2, surface: 'grain', surfaceDepth: 0.6 })] },
      { ...fractureLayer(), name: 'Burning cracks', count: 9, width: 0.05, color: '#ffc040', effects: [glow({ color: '#ff5a00', opacity: 0.9, size: 0.15 })] },
      { ...repeatLayer(), name: 'Flames', element: 'spike', mode: 'spacing', spacing: 0.32, snapToCorners: false, at: -0.12, size: 0.38, stretch: 0.45, fill: '#ff7a10', shaded: false, raised: false, jitterSize: 0.5, jitterAngle: 12, effects: [distort(0.05, 0.15, 3), glow({ inner: true, color: '#ffe080', opacity: 0.7, size: 0.1 }), glow({ color: '#ff3a00', opacity: 0.8, size: 0.2 })] },
    ],
  },
  {
    id: 'storm-ring',
    name: 'Stormcaller',
    description: 'A thundercloud ring of swirling grey, crackling with forked lightning and a storm-blue glow.',
    stage: { bloom: 0.5 },
    make: () => [
      { ...bandFillLayer(), name: 'Storm clouds', paint: grey, effects: [bevel({ size: 0.5, depth: 0.6, gloss: 0, surface: 'grain', surfaceDepth: 1.4, surfaceScale: 0.6 }), material('stone'), adjust({ hue: -160, saturation: 0.2, brightness: -0.15 })] },
      { ...textureLayer('marble'), name: 'Swirling cloud', color: '#5a6478', amount: 1.6, strength: 1.4, where: 'everywhere', clip: 'band', effects: [distort(0.08, 0.5, 7)] },
      { ...fractureLayer(), name: 'Lightning', kind: 'lightning', count: 4, length: 4.5, width: 0.04, jagged: 0.8, branching: 0.6, color: '#f0f8ff', effects: [glow({ inner: true, color: '#ffffff', opacity: 0.5, size: 0.02 }), glow({ color: '#5aa0ff', opacity: 0.9, size: 0.2 })] },
    ],
  },
  {
    id: 'clockwork',
    name: 'Clockwork brass',
    description: 'A brass ring of meshing gears over a steel chain, edged with rivets.',
    make: () => [
      { ...bandFillLayer(), name: 'Brass ring', paint: grey, effects: [bevel({ size: 0.04, gloss: 0.6, surface: 'brushed', surfaceDepth: 0.3 }), material('bronze'), adjust({ brightness: -0.2 }), wear({ chips: 0, polish: 0.3, grime: 0.3, grimeColor: '#3f6a4a' }), soft(0.6)] },
      // Depth from two gradient rings (lit outside, a reversed pressed-in step inside) rather than a bevel over the whole band.
      { ...bandFillLayer(), name: 'Shading', blend: 'overlay', opacity: 0.75, paint: { kind: 'linear', angle: 45, followLight: false, stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }] } },
      { ...bandFillLayer(), name: 'Pressed-in shading', from: 0.62, blend: 'overlay', opacity: 0.75, paint: { kind: 'linear', angle: 45, followLight: false, stops: [{ at: 0, color: '#000000', opacity: 1 }, { at: 1, color: '#ffffff', opacity: 1 }] } },
      { ...lineLayer(), name: 'Crease', at: 0.62, width: 0.03, opacity: 0.55, blend: 'overlay', paint: solid('#190500') },
      { ...chainLayer(), name: 'Steel chain', at: 0.06, linkLength: 0.24, thickness: 0.045, color: '#b0b8c0', effects: [soft(0.6)] },
      { ...gearsLayer(), name: 'Large gears', count: 10, at: 0.5, size: 1.3, teeth: 14, spokes: 5, hub: 0.3, altSize: 0.68, interlock: true, color: '#c89838', effects: [bevel({ size: 0.12, gloss: 0.7 }), material('gold', 0.8), shadow({ distance: 0.06, blur: 0.07, opacity: 0.8 })] },
      { ...repeatLayer(), name: 'Rivets', mode: 'spacing', spacing: 0.35, snapToCorners: false, at: 0.93, size: 0.09, fill: '#d8b060', raised: true },
    ],
  },
  {
    id: 'celtic-knot',
    name: 'Celtic knot',
    description: 'Silver knotwork woven over and under on green enamel, between bevelled silver rims.',
    make: () => [
      { ...bandFillLayer(), name: 'Green enamel', paint: solid('#1e5a34'), effects: [bevel({ direction: 'sunken', size: 0.1, gloss: 0.8, highlightOpacity: 0.4 })] },
      { ...knotworkLayer(), name: 'Knotwork', width: 0.2, amplitude: 0.26, waveLength: 1.1, color: '#c8ccd4', double: true, shine: false, outlineWidth: 0.025, effects: [bevel({ size: 0.4, gloss: 0.8 }), material('silver'), soft(0.6)] },
      { ...contoursLayer(), name: 'Silver rims', count: 2, from: 0.04, spacing: 0.92, width: 0.08, taper: 0, paint: grey, effects: [bevel({ size: 0.5, gloss: 0.8 }), material('silver')] },
    ],
  },
  {
    id: 'autumn-leaves',
    name: 'Autumn leaves',
    description: 'A birch-bark hoop with a scatter of tumbling red, orange and gold leaves.',
    make: () => [
      { ...bandFillLayer(), name: 'Birch bark', paint: { kind: 'lit', color: '#d8d0c0', light: 0.6, dark: 0.7, pressed: false, highlight: null }, effects: [bevel({ size: 0.3, gloss: 0.1, surface: 'brushed', surfaceDepth: 0.4 })] },
      { ...textureLayer('wear'), name: 'Bark marks', color: '#3a3028', strength: 1.4, clip: 'band' },
      { ...growthLayer('vine'), name: 'Twig', count: 1, thickness: 0.04, waveLength: 2.4, amplitude: 0.2, branching: 0.25, extra: 'none', color: '#4a3020', effects: [soft(0.5)] },
      { ...repeatLayer(), name: 'Leaves', element: 'leaf', mode: 'spacing', spacing: 0.32, snapToCorners: false, at: 0.5, size: 0.62, stretch: 0.6, fill: '#c83a14', altColors: ['#e88a1a', '#d8b030', '#a02810'], raised: true, jitterSize: 0.45, jitterAngle: 120, skipChance: 0.25, alternateSides: 0.18, seed: 21 },
    ],
  },
  {
    id: 'celestial-halo',
    name: 'Celestial halo',
    description: 'White gold with a radiant sunburst, faceted stars and a soft heavenly bloom.',
    stage: { bloom: 0.55, lights: [{ angle: 60, color: '#ffe8a0', strength: 0.6, height: 25 }] },
    make: () => [
      { ...repeatLayer(), name: 'Sun rays', element: 'triangle', count: 32, snapToCorners: false, at: -0.28, size: 0.95, stretch: 0.22, fill: '#fff0b0', shaded: false, raised: false, altSizes: [1, 0.6], effects: [glow({ color: '#ffe080', opacity: 0.7, size: 0.2 })] },
      { ...bandFillLayer(), name: 'White gold', paint: grey, effects: [bevel({ size: 0.22, gloss: 0.9 }), material('gold', 0.85), adjust({ brightness: 0.05, saturation: -0.15 })] },
      { ...contoursLayer(), name: 'Fine lines', count: 3, from: 0.2, spacing: 0.3, width: 0.025, taper: 0, paint: solid('#a07828') },
      { ...repeatLayer(), name: 'Stars', element: 'star', count: 12, offset: 0.5, at: 0.5, size: 0.5, fill: '#fff8d0', raised: false, effects: [glow({ color: '#ffffff', opacity: 0.8, size: 0.12 })] },
      { ...repeatLayer(), name: 'Diamonds', element: 'gem', count: 12, at: 0.5, size: 0.42, fill: '#e8f4ff', raised: false, gemSparkle: 1, gemFacets: 10, setting: 'bezel', settingEffects: styleEffects('gold') },
    ],
  },
];

/** A new project from a themed template: its layers, and its own lighting rig on the default stage. */
export function themedProject(t: ThemedTemplate): FrameProject {
  const p = createProject(t.make(), t.name);
  return { ...p, stage: { ...p.stage, ...t.stage } };
}
