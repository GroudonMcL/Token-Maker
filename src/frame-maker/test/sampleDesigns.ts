// Test fixtures: the full set of Frame Maker starting designs from before the
// frame review removed the ones the owner didn't keep. The app no longer lists
// most of these; the tests use them as rich sample projects that exercise the
// renderer (generators, height maps, gem settings, paths, groups…).
// Nothing in the app imports this file.

import {
  bandFillLayer,
  cellsLayer,
  chainLayer,
  contoursLayer,
  fractureLayer,
  gearsLayer,
  GEM_POINTS,
  groupLayer,
  growthLayer,
  knotworkLayer,
  lineLayer,
  NEW_EFFECT,
  pathLayer,
  repeatLayer,
  shapeLayer,
  textLayer,
  textureLayer,
  type LayeredTemplate,
} from '../project/defaults';
import { adjust, bevel, glow, material, shadow, styleEffects, wear } from '../project/styles';
import type { ThemedTemplate } from '../project/themedTemplates';
import type { Effect, Paint } from '../project/types';

const solid = (color: string): Paint => ({ kind: 'solid', color });
const grey = solid('#909090');
const distort = (amount: number, scale = 0.3, seed = 1): Effect => ({ ...NEW_EFFECT.distort(), amount, scale, seed }) as Effect;
const extrude = (depth: number, shade = 0.55): Effect => ({ kind: 'extrude', on: true, depth, shade });
const soft = (opacity = 0.6) => shadow({ distance: 0.04, blur: 0.05, opacity });

/** Every Layered starting design there was, in its old order (Brass & beads first). */
export const SAMPLE_LAYERED: LayeredTemplate[] = [
  {
    id: 'brass-beads',
    name: 'Brass & beads',
    description: 'A lit brass band, a pressed-in step, two rims and a ring of beads.',
    make: () => [
      { ...bandFillLayer(), name: 'Brass band', paint: { kind: 'lit', color: '#b88635', light: 0.9, dark: 0.8, pressed: false, highlight: null } },
      { ...bandFillLayer(), name: 'Pressed-in step', from: 0.6, to: 1, paint: { kind: 'lit', color: '#6e4a1c', light: 0.6, dark: 0.5, pressed: true, highlight: null } },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'linear', angle: 45, stops: [{ at: 0, color: '#fff6e0', opacity: 1 }, { at: 0.5, color: '#b88635', opacity: 1 }, { at: 1, color: '#2a1a08', opacity: 1 }], followLight: false } },
      { ...lineLayer(), name: 'Inner rim', at: 0.99, width: 0.03, paint: { kind: 'solid', color: '#1a0e04' } },
      { ...repeatLayer(), name: 'Beads', at: 0.6, size: 0.16, count: 24, fill: '#d9b060' },
    ],
  },
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
    id: 'jewelled',
    name: 'Jewelled',
    description: 'Silver with a vine, alternating diamonds and a pair of drawn gems, grouped.',
    make: () => [
      { ...bandFillLayer(), name: 'Silver band', paint: { kind: 'lit', color: '#9aa3ad', light: 0.9, dark: 0.75, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Vine', at: 0.5, width: 0.05, paint: { kind: 'solid', color: '#2f5d36' }, waveAmplitude: 0.18, waves: 16 },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#e8ecf0' } },
      { ...lineLayer(), name: 'Inner rim', at: 0.98, width: 0.04, paint: { kind: 'solid', color: '#2a2e36' } },
      {
        ...groupLayer([
          { ...repeatLayer(), name: 'Diamonds', element: 'diamond', count: 24, size: 0.32, stretch: 0.7, fill: '#d94a4a', altColors: ['#3a7bd5'], altSizes: [1, 0.7] },
          {
            ...pathLayer(GEM_POINTS),
            name: 'Gems',
            along: 0.25,
            size: 1.2,
            fill: '#3fbf7f',
            mirror: 'leftRight',
          },
        ]),
        name: 'Jewels',
      },
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
    id: 'dwarven-bronze',
    name: 'Dwarven bronze',
    description: 'Hammered bronze with faceted plates, engraved runes, rivets and a forge glow from its cracks.',
    make: () => [
      { ...bandFillLayer(), name: 'Bronze band', paint: { kind: 'solid', color: '#808080' }, effects: styleEffects('hammered-bronze') },
      { ...textureLayer('cracks'), name: 'Forge cracks', color: '#ff9a3a', amount: 0.5, strength: 0.8, clip: 'band', seed: 0xd3a, effects: [glow({ color: '#ff6a1a', opacity: 0.7, size: 0.12 })] },
      { ...lineLayer(), name: 'Outer rim', at: 0.035, width: 0.08, paint: { kind: 'solid', color: '#808080' }, effects: [bevel({ size: 0.5, gloss: 0.5 }), material('bronze'), shadow({ distance: 0.03, blur: 0.04 })] },
      { ...lineLayer(), name: 'Inner rim', at: 0.965, width: 0.08, paint: { kind: 'solid', color: '#808080' }, effects: [bevel({ size: 0.5, gloss: 0.5 }), material('bronze'), shadow({ distance: 0.03, blur: 0.04 })] },
      { ...repeatLayer(), name: 'Runes', element: 'rune', count: 8, offset: 0.5, snapToCorners: false, size: 0.44, stretch: 0.75, outlineWidth: 0.14, fill: '#4a3018', raised: false, seed: 7, effects: styleEffects('engraved') },
      { ...repeatLayer(), name: 'Plates', element: 'plate', count: 8, size: 0.62, fill: '#9a9a9a', raised: false, effects: [wear({ chips: 0.15, polish: 0.4, grime: 0.35, scale: 0.2 }), material('bronze'), shadow({ distance: 0.05, blur: 0.06, opacity: 0.7 })] },
      { ...repeatLayer(), name: 'Rivets', count: 8, offset: 0.5, at: 0.17, size: 0.1, fill: '#c89858', raised: true },
      { ...repeatLayer(), name: 'Inner rivets', count: 8, offset: 0.5, at: 0.83, size: 0.1, fill: '#c89858', raised: true },
    ],
  },
  {
    id: 'eldritch-crystal',
    name: 'Eldritch crystal',
    description: 'Obsidian wound with dark tendrils, ringed by glowing violet crystal shards.',
    make: () => [
      { ...bandFillLayer(), name: 'Obsidian band', paint: { kind: 'solid', color: '#404040' }, effects: styleEffects('obsidian') },
      {
        ...groupLayer([
          { ...lineLayer(), name: 'Tendril', at: 0.5, width: 0.14, paint: { kind: 'solid', color: '#4a1a66' }, waveAmplitude: 0.3, waves: 9, effects: [bevel({ size: 0.6, gloss: 0.35, highlightOpacity: 0.5 }), shadow({ distance: 0.05, blur: 0.06, opacity: 0.8 })] },
          { ...lineLayer(), name: 'Tendril', at: 0.5, width: 0.11, paint: { kind: 'solid', color: '#5e2a7e' }, waveAmplitude: 0.26, waves: 7, wavePhase: 0.4, effects: [bevel({ size: 0.6, gloss: 0.35, highlightOpacity: 0.5 }), shadow({ distance: 0.05, blur: 0.06, opacity: 0.8 })] },
        ]),
        name: 'Tendrils',
      },
      { ...lineLayer(), name: 'Glow line', at: 0.94, width: 0.025, paint: { kind: 'solid', color: '#e0c0ff' }, effects: [glow({ color: '#9a5aff', opacity: 0.9, size: 0.15 })] },
      {
        ...repeatLayer(),
        name: 'Crystals',
        element: 'shard',
        count: 14,
        at: -0.02,
        size: 0.85,
        stretch: 0.55,
        fill: '#9a5ad0',
        altSizes: [1, 0.6],
        raised: false,
        snapToCorners: false,
        effects: [glow({ inner: true, color: '#f0d8ff', opacity: 0.35, size: 0.08 }), glow({ color: '#a060ff', opacity: 0.55, size: 0.22 })],
      },
    ],
  },
  {
    id: 'radiant-gold',
    name: 'Radiant gold',
    description: 'Polished gold with a stepped rim, faceted stars in holy light, sapphires and pearls.',
    make: () => [
      { ...bandFillLayer(), name: 'Gold band', paint: { kind: 'solid', color: '#909090' }, effects: styleEffects('gold') },
      { ...bandFillLayer(), name: 'Stepped rim', to: 0.24, paint: { kind: 'solid', color: '#909090' }, effects: [bevel({ profile: 'stepped', size: 0.7, depth: 1.6, gloss: 0.7 }), material('gold')] },
      { ...repeatLayer(), name: 'Pearls', count: 36, at: 0.64, size: 0.11, fill: '#f2eee4', raised: true },
      { ...repeatLayer(), name: 'Sapphires', element: 'gem', count: 8, offset: 0.5, at: 0.6, size: 0.42, fill: '#2a5ab8', raised: false, effects: [shadow({ distance: 0.04, blur: 0.04 })] },
      { ...shapeLayer(), name: 'Stars', shape: 'star', sides: 4, innerRatio: 0.35, faceted: true, facetTable: 0, along: 0.125, across: 0.6, size: 1.3, fill: '#e8c050', outline: null, raised: false, mirror: 'four', effects: styleEffects('holy') },
    ],
  },
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
  {
    id: 'royal-inscription',
    name: 'Royal inscription',
    description: 'Gold with an engraved inscription, fine contour lines and rubies in claw settings riding a wave.',
    make: () => {
      const wave = { ...lineLayer(), name: 'Gem path', visible: false, at: 0.68, waveAmplitude: 0.13, waves: 8 };
      return [
        { ...bandFillLayer(), name: 'Gold band', paint: { kind: 'solid', color: '#909090' }, effects: styleEffects('gold') },
        { ...contoursLayer(), name: 'Contour lines', count: 2, from: 0.06, spacing: 0.88, width: 0.035, taper: 0, paint: { kind: 'solid', color: '#5a3a10' }, effects: styleEffects('engraved') },
        { ...textLayer(), name: 'Inscription', text: 'BY CROWN AND OATH · EVER LOYAL ·', size: 0.24, at: 0.24, spacing: 0.12, fill: '#6a4a18', effects: styleEffects('engraved') },
        wave,
        {
          ...repeatLayer(),
          name: 'Rubies',
          element: 'gem',
          follow: wave.id,
          count: 24,
          size: 0.3,
          fill: '#b0182a',
          raised: false,
          gemSparkle: 0.6,
          setting: 'claws4',
          settingEffects: styleEffects('gold'),
          effects: [shadow({ distance: 0.03, blur: 0.04, opacity: 0.6 })],
        },
      ];
    },
  },
  // Phase 9: a shared height map.
  {
    id: 'rune-plates',
    name: 'Rune-carved plates',
    description: 'Thick bronze plates with runes carved through them: the plates and the runes are lit as one sculpted surface.',
    make: () => [
      { ...bandFillLayer(), name: 'Iron band', paint: { kind: 'solid', color: '#7a7a7a' }, effects: styleEffects('blackened-iron') },
      {
        ...groupLayer([
          { ...repeatLayer(), name: 'Plates', element: 'square', count: 8, snapToCorners: true, size: 0.78, stretch: 1.6, fill: '#9a9a9a', shaded: false, raised: false },
          { ...textLayer(), name: 'Carved runes', font: 'runes', text: 'ANSUZ RAIDO KAUNAN GEBO WUNJO HAGALAZ NAUDIZ ISAZ JERA EIHWAZ PERTH ALGIZ SOWILO TIWAZ BERKANAN EHWAZ MANNAZ LAGUZ INGWAZ DAGAZ OTHALA FEHU URUZ THURISAZ', size: 0.36, spacing: 0.3, at: 0.5, opacity: 0, heightMode: 'carve', heightDepth: 1.4, heightSize: 0.05 },
        ]),
        name: 'Runic plates',
        effects: [bevel({ size: 0.12, gloss: 0.45, depth: 1.2 }), material('bronze'), { kind: 'extrude', on: true, depth: 0.07, shade: 0.6 }, shadow({ distance: 0.05, blur: 0.06 })],
      },
    ],
  },
  // Phase 8: made only from generators and styles.
  {
    id: 'overgrown-ruin',
    name: 'Overgrown ruin',
    description: 'Cracked stone plates with missing pieces, a verdigris knotwork band and roots growing through.',
    make: () => {
      const plates = { ...cellsLayer(), name: 'Stone plates', from: 0.2, to: 1, size: 0.42, gap: 0.05, missing: 0.12, vary: 0.45, color: '#8a8478', seed: 7, effects: styleEffects('carved-stone') };
      return [
        plates,
        { ...fractureLayer(), name: 'Cracks', from: 0.2, to: 1, count: 9, length: 1.4, width: 0.035, color: '#14100c', clip: 'below', seed: 3 },
        { ...knotworkLayer(), name: 'Knotwork band', at: 0.1, width: 0.075, amplitude: 0.075, waveLength: 0.42, color: '#909090', outlineWidth: 0.02, shine: false, effects: styleEffects('verdigris') },
        {
          ...growthLayer('roots'),
          name: 'Roots',
          at: 0.62,
          thickness: 0.09,
          branchLength: 0.6,
          color: '#5a3c22',
          seed: 4,
          effects: [bevel({ size: 0.4, gloss: 0.15, surface: 'grain', surfaceDepth: 0.4 }), shadow({ distance: 0.05, blur: 0.06, opacity: 0.7 })],
        },
        { ...growthLayer('vine'), name: 'Creeper', at: 0.45, count: 1, waveLength: 2.6, amplitude: 0.3, thickness: 0.035, branching: 0.2, extraSpacing: 1.1, extraSize: 0.4, color: '#2e4a1c', extraColor: '#5a8a32', seed: 9, effects: [shadow({ distance: 0.04, blur: 0.05, opacity: 0.6 })] },
      ];
    },
  },
  // More to build with (from the Phase 6–7 branch, version 10): new ornaments, textures and wave shapes.
  {
    id: 'moon-stars',
    name: 'Moon & stars',
    description: 'Midnight blue with sparkles, crescent moons and stars in turn, and a scalloped silver edge.',
    make: () => [
      { ...bandFillLayer(), name: 'Midnight', paint: { kind: 'lit', color: '#1f2a5a', light: 0.6, dark: 0.75, pressed: false, highlight: '#5a6ab0' } },
      { ...textureLayer('sparkle'), name: 'Sparkles', color: '#fff6d0', seed: 0x5a2c, amount: 0.8, scale: 0.8 },
      { ...lineLayer(), name: 'Scalloped edge', at: 0.08, width: 0.04, paint: { kind: 'solid', color: '#d8dcf0' }, waveAmplitude: 0.06, waveFit: 0.45, waveShape: 'scallop' },
      { ...repeatLayer(), name: 'Moons', element: 'crescent', count: 8, at: 0.55, size: 0.5, fill: '#f4e7a8', glow: '#fff2b0', show: [true, false] },
      { ...repeatLayer(), name: 'Stars', element: 'star', count: 8, at: 0.55, size: 0.36, fill: '#f4e7a8', glow: '#fff2b0', show: [false, true] },
      { ...lineLayer(), name: 'Inner rim', at: 0.985, width: 0.03, paint: { kind: 'solid', color: '#0a0e24' } },
    ],
  },
  {
    id: 'frostbound',
    name: 'Frostbound',
    description: 'Icy steel with frost, snowflakes and a zigzag line.',
    make: () => [
      { ...bandFillLayer(), name: 'Ice', paint: { kind: 'lit', color: '#6f93b8', light: 0.9, dark: 0.7, pressed: false, highlight: '#f0faff' } },
      { ...textureLayer('frost'), name: 'Frost', color: '#e6f6ff', seed: 0xf205 },
      { ...lineLayer(), name: 'Zigzag', at: 0.5, width: 0.035, paint: { kind: 'solid', color: '#dff4ff' }, waveAmplitude: 0.3, waveFit: 0.5, waveShape: 'zigzag', glow: '#9fd8ff' },
      { ...repeatLayer(), name: 'Snowflakes', element: 'snowflake', count: 6, at: 0.5, size: 0.62, fill: '#ffffff', outlineWidth: 0.07, raised: false, glow: '#9fd8ff' },
      { ...lineLayer(), name: 'Outer rim', at: 0.02, width: 0.04, paint: { kind: 'solid', color: '#f0faff' } },
      { ...lineLayer(), name: 'Inner rim', at: 0.985, width: 0.03, paint: { kind: 'solid', color: '#1a2a3a' } },
    ],
  },
  {
    id: 'celtic',
    name: 'Celtic knots',
    description: 'Green and gold, with knots, a woven cord and battlement edges.',
    make: () => [
      { ...bandFillLayer(), name: 'Green band', paint: { kind: 'lit', color: '#2f6a3c', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Battlements', at: 0.12, width: 0.05, paint: { kind: 'solid', color: '#d9b45a' }, waveAmplitude: 0.05, waveFit: 0.3, waveShape: 'square' },
      { ...lineLayer(), name: 'Cord', at: 0.55, width: 0.08, paint: { kind: 'solid', color: '#d9b45a' }, waveAmplitude: 0.18, waveFit: 0.7, raised: true },
      { ...lineLayer(), name: 'Cord (other strand)', at: 0.55, width: 0.08, paint: { kind: 'solid', color: '#b8923a' }, waveAmplitude: 0.18, waveFit: 0.7, wavePhase: 0.5, raised: true },
      { ...repeatLayer(), name: 'Knots', element: 'knot', count: 8, at: 0.55, size: 0.7, fill: '#f0d080', detail: '#5a3a10', outlineWidth: 0.08 },
      { ...lineLayer(), name: 'Inner rim', at: 0.985, width: 0.03, paint: { kind: 'solid', color: '#10200f' } },
    ],
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Crimson and gold: gold dust, fleurs-de-lis between gems, and a crown at the top.',
    make: () => [
      { ...bandFillLayer(), name: 'Crimson', paint: { kind: 'lit', color: '#8a1a2a', light: 0.75, dark: 0.8, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Outer gold', at: 0.06, width: 0.1, paint: { kind: 'lit', color: '#d4a64a', light: 0.95, dark: 0.8, pressed: false, highlight: '#fff6c8' } },
      { ...lineLayer(), name: 'Inner gold', at: 0.94, width: 0.1, paint: { kind: 'lit', color: '#d4a64a', light: 0.95, dark: 0.8, pressed: false, highlight: '#fff6c8' } },
      { ...repeatLayer(), name: 'Fleurs-de-lis', element: 'fleur', count: 8, at: 0.5, size: 0.8, fill: '#e2b85a', show: [false, true] },
      { ...repeatLayer(), name: 'Gems', element: 'jewel', count: 8, at: 0.5, size: 0.42, stretch: 0.8, fill: '#2a5ad8', show: [true, false] },
      { ...shapeLayer(), name: 'Crown', shape: 'ornament', element: 'crown', across: 0.1, size: 1.1, stretch: 1.3, fill: '#e2b85a', outline: '#5a3a10', outlineWidth: 0.04, detail: '#a01a2a' },
    ],
  },
  {
    id: 'grim-iron',
    name: 'Grim iron',
    description: 'Rusty iron over chainmail, with skulls and paw prints in turn.',
    make: () => [
      { ...bandFillLayer(), name: 'Iron', paint: { kind: 'lit', color: '#55524f', light: 0.6, dark: 0.8, pressed: false, highlight: null } },
      { ...textureLayer('chainmail'), name: 'Chainmail', color: '#9aa0aa', from: 0.2, to: 0.8, seed: 1 },
      { ...textureLayer('rust'), name: 'Rust', color: '#8a3b12', seed: 0x2057 },
      { ...lineLayer(), name: 'Outer band', at: 0.08, width: 0.16, paint: { kind: 'lit', color: '#55524f', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
      { ...lineLayer(), name: 'Inner band', at: 0.92, width: 0.16, paint: { kind: 'lit', color: '#55524f', light: 0.7, dark: 0.8, pressed: false, highlight: null } },
      { ...repeatLayer(), name: 'Skulls', element: 'skull', count: 6, at: 0.5, size: 0.75, stretch: 0.85, fill: '#e8dcc0', show: [true, false] },
      { ...repeatLayer(), name: 'Paw prints', element: 'paw', count: 6, at: 0.5, size: 0.55, fill: '#c9b48a', shaded: false, raised: false, opacity: 0.75, show: [false, true] },
    ],
  },
];

/** Every Themed starting design there was. */
export const SAMPLE_THEMED: ThemedTemplate[] = [
  {
    id: 'enamel-gold',
    name: 'Enamelled gold',
    description: 'A polished gold ring with a deep blue enamel channel, gold beading and four cut sapphires in claws.',
    make: () => [
      { ...bandFillLayer(), name: 'Gold ring', paint: grey, effects: styleEffects('gold') },
      { ...bandFillLayer(), name: 'Enamel', from: 0.26, to: 0.74, paint: solid('#1d3f8f'), effects: [bevel({ direction: 'sunken', size: 0.12, gloss: 1, highlightOpacity: 0.5 }), glow({ inner: true, color: '#7aa8ff', opacity: 0.25, size: 0.15 })] },
      { ...repeatLayer(), name: 'Gold beading', mode: 'spacing', spacing: 0.28, snapToCorners: false, at: 0.13, size: 0.13, fill: '#e8c060', raised: false, effects: [bevel({ size: 0.5, gloss: 0.8 }), material('gold')] },
      { ...repeatLayer(), name: 'Inner beading', mode: 'spacing', spacing: 0.28, snapToCorners: false, at: 0.87, size: 0.13, fill: '#e8c060', raised: false, effects: [bevel({ size: 0.5, gloss: 0.8 }), material('gold')] },
      { ...repeatLayer(), name: 'Sapphires', element: 'gem', count: 4, at: 0.5, size: 0.95, fill: '#2a5ad0', raised: false, gemSparkle: 0.7, setting: 'claws4', settingEffects: styleEffects('gold'), effects: [soft()] },
    ],
  },
  {
    id: 'worn-iron',
    name: 'Worn iron ring',
    description: 'A battered blackened-iron ring: chipped, scratched and grimy, with heavy rivets and a riveted inner rim.',
    make: () => [
      { ...bandFillLayer(), name: 'Iron ring', paint: grey, effects: [wear({ chips: 0.35, polish: 0.6, grime: 0.45, scratches: 0.7, scale: 0.25 }), bevel({ profile: 'chisel', size: 0.12, gloss: 0.3, surface: 'hammered', surfaceDepth: 0.45 }), material('iron')] },
      { ...lineLayer(), name: 'Inner rim', at: 0.92, width: 0.12, paint: grey, effects: [bevel({ size: 0.5, gloss: 0.4 }), material('steel'), soft(0.7)] },
      { ...repeatLayer(), name: 'Rivets', count: 12, at: 0.42, size: 0.28, fill: '#8a8f99', raised: false, effects: [bevel({ size: 0.5, gloss: 0.6 }), material('steel'), extrude(0.04), soft(0.8)] },
    ],
  },
  {
    id: 'rose-wreath',
    name: 'Rose wreath',
    description: 'A wooden hoop twined with a leafy vine, berries and four red roses made from a ring of petals.',
    make: () => {
      const petal = (r: number, n: number, size: number, color: string) => ({
        ...shapeLayer(),
        name: 'Rose petals',
        shape: 'circle' as const,
        across: 0.5,
        along: 0.125,
        size,
        stretch: 0.75,
        fill: color,
        outline: null,
        raised: false,
        mirror: 'four' as const,
        radialCount: n,
        radialRadius: r,
        radialStart: 20,
      });
      return [
        { ...bandFillLayer(), name: 'Wooden hoop', paint: { kind: 'lit', color: '#7a5230', light: 0.6, dark: 0.75, pressed: false, highlight: null }, effects: [bevel({ size: 0.25, gloss: 0.1, surface: 'grain', surfaceDepth: 0.4 })] },
        { ...textureLayer('wood'), name: 'Grain', color: '#7a5230', clip: 'band' },
        { ...growthLayer('vine'), name: 'Vine', count: 2, thickness: 0.06, waveLength: 2.2, amplitude: 0.25, branching: 0.3, extraSpacing: 0.55, extraSize: 0.42, color: '#3a5220', extraColor: '#5a9a3a', effects: [soft(0.55)] },
        { ...growthLayer('vine'), name: 'Berries', kind: 'vine', count: 1, thickness: 0.02, waveLength: 3.1, amplitude: 0.3, branching: 0, extra: 'berries', extraSpacing: 0.9, extraSize: 0.28, color: '#3a5220', extraColor: '#c8283a', seed: 5, effects: [soft(0.5)] },
        {
          ...groupLayer([petal(0.3, 7, 0.5, '#a01828'), petal(0.14, 5, 0.38, '#d02838'), { ...petal(0, 1, 0.24, '#f04858'), radialCount: 1 }]),
          name: 'Roses',
          effects: [bevel({ size: 0.25, gloss: 0.35, depth: 0.8 }), soft(0.6)],
        },
      ];
    },
  },
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
    id: 'starship',
    name: 'Starship hull',
    description: 'Sci-fi armour plating in gunmetal tiles with cyan running lights and charged arcs between them.',
    stage: { bloom: 0.4, lights: [{ angle: 45, color: '#40d0ff', strength: 0.6, height: 18 }] },
    make: () => [
      { ...cellsLayer(), name: 'Hull plates', pattern: 'grid', size: 0.55, gap: 0.035, rounding: 0.15, vary: 0.25, color: '#6a7480', effects: [bevel({ profile: 'chisel', size: 0.08, gloss: 0.6, surface: 'brushed', surfaceDepth: 0.2 }), material('steel', 0.85)] },
      { ...lineLayer(), name: 'Running light', at: 0.5, width: 0.045, paint: solid('#a0f4ff'), dash: 'dashed', effects: [glow({ color: '#20c8ff', opacity: 0.9, size: 0.18 })] },
      { ...fractureLayer(), name: 'Charge arcs', kind: 'lightning', count: 3, length: 3, width: 0.025, jagged: 0.7, branching: 0.3, color: '#e0faff', from: 0.2, to: 0.8, effects: [glow({ color: '#30a0ff', opacity: 0.8, size: 0.12 })] },
      { ...repeatLayer(), name: 'Status lights', element: 'square', count: 8, offset: 0.5, at: 0.2, size: 0.1, stretch: 2.2, fill: '#ff8a20', shaded: false, raised: false, effects: [glow({ color: '#ff6a00', opacity: 0.8, size: 0.12 })] },
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
    id: 'frost-ring',
    name: 'Frostbound ring',
    description: 'Glacier ice in hexagonal crystals, with icicle shards round the rim and a cold blue rim light.',
    stage: { lights: [{ angle: 45, color: '#a0e0ff', strength: 0.8, height: 20 }] },
    make: () => [
      { ...cellsLayer(), name: 'Ice crystals', pattern: 'hex', size: 0.62, gap: 0.03, vary: 0.3, color: '#9fd4ee', effects: [bevel({ profile: 'chisel', size: 0.15, gloss: 0.95, highlightOpacity: 0.8 }), material('ice', 0.8)] },
      { ...fractureLayer(), name: 'Frost cracks', count: 7, width: 0.03, color: '#3a7ab8', jagged: 0.8, effects: [glow({ color: '#c0f0ff', opacity: 0.6, size: 0.06 })] },
      { ...repeatLayer(), name: 'Icicles', element: 'shard', mode: 'spacing', spacing: 0.75, snapToCorners: false, at: -0.12, size: 0.6, stretch: 0.45, fill: '#bfe8ff', raised: false, altSizes: [1, 0.6, 0.8], effects: [glow({ inner: true, color: '#ffffff', opacity: 0.35, size: 0.06 }), glow({ color: '#8ad8ff', opacity: 0.5, size: 0.15 })] },
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
    id: 'necropolis',
    name: 'Necropolis',
    description: 'Yellowed bone plates bound with rusted chains and grasping dead roots, under a sickly green glow.',
    stage: { ambient: '#1a3a14', ambientStrength: 0.5, bleed: 0.3 },
    make: () => [
      { ...cellsLayer(), name: 'Bone plates', pattern: 'brick', size: 0.5, gap: 0.05, rounding: 0.6, vary: 0.35, color: '#b8a888', effects: [...styleEffects('bone')] },
      { ...growthLayer('roots'), name: 'Dead roots', thickness: 0.07, color: '#2a2418', seed: 11, effects: [bevel({ size: 0.4, gloss: 0.2 }), soft(0.8)] },
      { ...chainLayer(), name: 'Rusted chain', at: 0.5, linkLength: 0.42, thickness: 0.07, color: '#7a4a2a', effects: [wear({ chips: 0, polish: 0.2, grime: 0.6, grimeColor: '#3a1a0a' }), soft(0.7)] },
      { ...lineLayer(), name: 'Necrotic glow', at: 1, width: 0.02, paint: solid('#a0ff7a'), effects: [glow({ color: '#5aff3a', opacity: 0.7, size: 0.35 })] },
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
    id: 'dragon-scale',
    name: 'Dragonscale',
    description: 'Overlapping crimson scales with a gold-tipped horn ridge and a single dragon’s-eye gem.',
    make: () => [
      { ...cellsLayer(), name: 'Scales', pattern: 'scales', size: 0.55, vary: 0.25, color: '#a02018', effects: [bevel({ size: 0.25, gloss: 0.6 }), soft(0.6)] },
      { ...repeatLayer(), name: 'Horn ridge', element: 'spike', count: 16, at: -0.2, size: 0.6, stretch: 0.5, fill: '#e8d8b0', raised: false, scaleEnd: 0.5, effects: [bevel({ profile: 'chisel', size: 0.35, gloss: 0.4 }), material('bone'), soft(0.7)] },
      { ...repeatLayer(), name: 'Dragon’s eye', element: 'gem', gemCut: 'cabochon', count: 1, at: 0.5, size: 0.8, stretch: 0.7, fill: '#e8b020', raised: false, setting: 'bezel', settingEffects: styleEffects('gold'), effects: [glow({ color: '#ffb000', opacity: 0.5, size: 0.15 })] },
    ],
  },
  {
    id: 'druid-circle',
    name: 'Mossy stone circle',
    description: 'Weathered standing stones with moss creeping over them and a creeper threading between.',
    make: () => [
      { ...cellsLayer(), name: 'Standing stones', pattern: 'brick', size: 0.85, gap: 0.08, rounding: 0.5, vary: 0.4, color: '#8a8a80', effects: [...styleEffects('carved-stone'), distort(0.02, 0.2, 2)] },
      { ...textureLayer('scatter'), name: 'Moss', color: '#5a8a2a', color2: '#3a5a1a', amount: 2.5, scale: 1.6, clip: 'below' },
      { ...growthLayer('vine'), name: 'Creeper', count: 1, thickness: 0.035, waveLength: 1.6, amplitude: 0.35, branching: 0.5, extraSpacing: 0.4, extraSize: 0.3, color: '#2e4a1c', extraColor: '#6a9a3a', seed: 3, effects: [soft(0.6)] },
    ],
  },
  {
    id: 'nautical',
    name: 'Nautical rope',
    description: 'Weathered timber with a twisted rope, brass portholes and gold doubloons.',
    make: () => [
      { ...bandFillLayer(), name: 'Ship timber', paint: { kind: 'lit', color: '#6a4a2a', light: 0.55, dark: 0.75, pressed: false, highlight: null }, effects: [wear({ chips: 0.15, polish: 0, grime: 0.35, grimeColor: '#2a1a0a' })] },
      { ...textureLayer('wood'), name: 'Grain', color: '#6a4a2a', clip: 'band' },
      { ...bandFillLayer(), name: 'Rope', from: 0.3, to: 0.7, paint: { kind: 'lit', color: '#b08a50', light: 0.6, dark: 0.8, pressed: false, highlight: null }, effects: [soft(0.6)] },
      { ...textureLayer('rope'), name: 'Rope twist', color: '#b08a50', from: 0.3, to: 0.7 },
      { ...repeatLayer(), name: 'Portholes', element: 'circle', count: 4, at: 0.5, size: 0.62, fill: '#2a4a5a', setting: 'bezel', settingEffects: [bevel({ size: 0.4, gloss: 0.7 }), material('bronze')], raised: false, effects: [bevel({ direction: 'sunken', size: 0.4, gloss: 1, highlightOpacity: 0.4 })] },
      { ...repeatLayer(), name: 'Doubloons', element: 'gem', gemCut: 'cabochon', count: 4, offset: 0.5, at: 0.5, size: 0.56, fill: '#e0b030', raised: false, effects: [bevel({ profile: 'ridge', size: 0.3, gloss: 0.8 }), material('gold'), soft(0.6)] },
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
  {
    id: 'desert-tomb',
    name: 'Desert tomb',
    description: 'Sandstone blocks carved with glyphs, lapis inlay and golden scarab gems.',
    make: () => [
      { ...cellsLayer(), name: 'Sandstone', pattern: 'brick', size: 0.75, gap: 0.035, rounding: 0.2, vary: 0.25, color: '#c8a870', effects: [wear({ chips: 0.3, polish: 0, grime: 0.25, grimeColor: '#6a4a2a' }), bevel({ profile: 'chisel', size: 0.08, gloss: 0, surface: 'grain', surfaceDepth: 0.5 })] },
      { ...contoursLayer(), name: 'Lapis inlay', count: 2, from: 0.12, spacing: 0.76, width: 0.07, taper: 0, paint: solid('#1a3a8a'), effects: [bevel({ direction: 'sunken', size: 0.4, gloss: 0.9 })] },
      { ...textLayer(), name: 'Carved glyphs', font: 'runes', text: 'HERE SLEEPS THE KING OF THE SANDS · MAY THE SUN GUARD HIS REST · ', size: 0.3, spacing: 0.3, at: 0.5, fill: '#5a3a18', effects: styleEffects('engraved') },
      { ...repeatLayer(), name: 'Scarabs', element: 'gem', gemCut: 'cabochon', count: 4, at: 0.5, size: 0.62, stretch: 0.75, fill: '#2a8a6a', raised: false, setting: 'bezel', settingEffects: styleEffects('gold'), effects: [soft(0.6)] },
    ],
  },
  {
    id: 'amethyst-geode',
    name: 'Amethyst geode',
    description: 'A split geode: a grey stone crust lined with glittering violet crystal points.',
    stage: { bleed: 0.35 },
    make: () => [
      { ...bandFillLayer(), name: 'Stone crust', paint: grey, effects: [...styleEffects('carved-stone'), distort(0.03, 0.4, 5)] },
      { ...cellsLayer(), name: 'Crystal lining', from: 0.3, to: 1, pattern: 'voronoi', size: 0.3, gap: 0.02, vary: 0.4, color: '#8a4ac8', effects: [bevel({ profile: 'chisel', size: 0.2, gloss: 1 }), material('amethyst', 0.8), glow({ inner: true, color: '#f0d0ff', opacity: 0.3, size: 0.05 })] },
      { ...repeatLayer(), name: 'Crystal points', element: 'shard', mode: 'spacing', spacing: 0.6, snapToCorners: false, at: 0.9, size: 0.5, stretch: 0.5, rotation: 180, fill: '#b080f0', raised: false, jitterSize: 0.4, jitterAngle: 20, effects: [glow({ color: '#c080ff', opacity: 0.5, size: 0.12 })] },
    ],
  },
];
