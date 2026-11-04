// Crafted borders (the "Crafted borders" section of New): designs made to
// look like the kinds of ring frames people paint by hand for tokens —
// gilded filigree, a guild ring with arrow studs, black plumes between
// copper rims, ember-lit iron, storm wisps and riveted plates. They show off
// what version 11 added: blend modes and blur on layers, the crystal, lava,
// smoke, feather, filigree and mottled textures, and the new shapes. Every
// part is an ordinary editable layer.

import { bandFillLayer, contoursLayer, groupLayer, lineLayer, NEW_EFFECT, repeatLayer, textureLayer } from './defaults';
import { bevel, material, shadow, styleEffects } from './styles';
import type { ThemedTemplate } from './themedTemplates';
import type { BlurEffect, Effect, Paint } from './types';

const solid = (color: string): Paint => ({ kind: 'solid', color });
const grey = solid('#909090');
const blur = (amount: number, mode: BlurEffect['mode'] = 'soft', keepShape = false): Effect => ({ ...(NEW_EFFECT.blur() as BlurEffect), amount, mode, keepShape });
const distort = (amount: number, scale = 0.3, seed = 1): Effect => ({ ...NEW_EFFECT.distort(), amount, scale, seed }) as Effect;
const soft = (opacity = 0.6) => shadow({ distance: 0.04, blur: 0.05, opacity });
/** A material colour from five stops, dark to light. */
const ramp = (...colors: string[]): Effect => ({ kind: 'recolour', on: true, amount: 1, stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color, opacity: 1 })) });
const paleGold = () => ramp('#3a2c12', '#8a7444', '#ccb47e', '#f0e4bc', '#fffcf2');
const yellowGold = () => ramp('#2e1800', '#8a5600', '#dca214', '#ffd850', '#fff8c8');
const blackIron = () => ramp('#020203', '#0c0d10', '#24262c', '#6a6e78', '#e0e4ec');

/** A gold or silver guild ring: a rounded band cut into blocks, with four arrow studs pointing in. */
function guildRing(metal: 'gold' | 'silver'): ThemedTemplate {
  const metalColour = () => (metal === 'gold' ? yellowGold() : material('silver'));
  const tone = metal === 'gold' ? { fill: '#c8a040', groove: '#4a2c08', lip: '#6a4410' } : { fill: '#b8bcc4', groove: '#3a3e46', lip: '#50545c' };
  return {
    id: `guild-${metal}`,
    name: metal === 'gold' ? 'Guild ring (gold)' : 'Guild ring (silver)',
    description: `A rounded ${metal} band cut into blocks, with four studs pointing inwards, each with a sunken arrow.`,
    stage: { thickness: 0.15, outerSpacing: 0.02 },
    make: () => [
      { ...bandFillLayer(), name: `${metal === 'gold' ? 'Gold' : 'Silver'} band`, paint: grey, effects: [bevel({ size: 0.45, depth: 1.4, gloss: 0.75 }), metalColour(), soft(0.5)] },
      { ...bandFillLayer(), name: 'Inner lip', from: 0.66, to: 1, paint: solid(tone.lip), opacity: 0.7, blend: 'multiply', effects: [bevel({ direction: 'sunken', size: 0.25, gloss: 0.4 })] },
      { ...repeatLayer(), name: 'Block lines', element: 'tick', count: 36, snapToCorners: false, at: 0.42, size: 0.84, stretch: 0.1, rotation: 20, fill: tone.groove, raised: false, shaded: false, blend: 'multiply', effects: styleEffects('engraved') },
      { ...lineLayer(), name: 'Middle groove', at: 0.62, width: 0.05, paint: solid(tone.groove), opacity: 0.5, blend: 'multiply', effects: styleEffects('engraved') },
      { ...repeatLayer(), name: 'Studs', element: 'triangle', count: 4, at: 0.5, size: 1.75, stretch: 1.25, rotation: 180, fill: tone.fill, raised: false, effects: [bevel({ profile: 'chisel', size: 0.4, depth: 1.6, gloss: 0.7 }), metalColour(), soft(0.55)] },
      { ...repeatLayer(), name: 'Sunken arrows', element: 'triangle', count: 4, at: 0.42, size: 0.62, stretch: 1.1, rotation: 180, fill: tone.groove, raised: false, shaded: false, opacity: 0.8, effects: styleEffects('engraved') },
    ],
  };
}

export const CRAFTED_TEMPLATES: ThemedTemplate[] = [
  {
    id: 'filigree-border',
    name: 'Gilded filigree',
    description: 'Pale gold bands chased with scrolling filigree round a channel of red enamel mottled with gold leaf.',
    stage: { thickness: 0.25, outerSpacing: 0.01 },
    make: () => [
      { ...bandFillLayer(), name: 'Red enamel', from: 0.3, to: 0.72, paint: solid('#c04a22'), effects: [bevel({ direction: 'sunken', size: 0.15, gloss: 0.5, highlightOpacity: 0.4 })] },
      { ...textureLayer('mottled'), name: 'Orange glaze', from: 0.3, to: 0.72, color: '#ee8a40', color2: '#f4a858', amount: 1.2, scale: 3, strength: 0.7, seed: 0x6012 },
      { ...textureLayer('mottled'), name: 'Gold leaf', from: 0.3, to: 0.72, color: '#ecd496', color2: '#fff8e0', amount: 0.9, scale: 2.8, seed: 0x6011 },
      { ...textureLayer('mottled'), name: 'Dark spots', from: 0.3, to: 0.72, color: '#4a1206', color2: '#6a1a0a', amount: 0.5, scale: 1.2, strength: 0.7, seed: 0x5b07 },
      { ...bandFillLayer(), name: 'Outer gold', to: 0.32, paint: grey, effects: [bevel({ size: 0.3, gloss: 0.5, shadowOpacity: 0.45 }), paleGold(), soft(0.5)] },
      { ...bandFillLayer(), name: 'Inner gold', from: 0.7, paint: grey, effects: [bevel({ size: 0.3, gloss: 0.5, shadowOpacity: 0.45 }), paleGold(), soft(0.5)] },
      { ...textureLayer('filigree'), name: 'Outer filigree', to: 0.32, color: '#c0a868', amount: 0.8, scale: 1.5, strength: 1.2, seed: 0xf11, blend: 'multiply' },
      { ...textureLayer('filigree'), name: 'Inner filigree', from: 0.7, color: '#c0a868', amount: 0.8, scale: 1.5, strength: 1.2, seed: 0xf12, blend: 'multiply' },
    ],
  },
  guildRing('gold'),
  {
    id: 'emberforged',
    name: 'Emberforged',
    description: 'Glossy black iron rimed with frost, deep grooves, and a molten ring of glassy lava inside.',
    stage: { thickness: 0.18, outerSpacing: 0.09 },
    make: () => [
      { ...bandFillLayer(), name: 'Black iron', to: 0.56, paint: grey, effects: [bevel({ size: 0.3, gloss: 0.9, highlightOpacity: 0.45 }), blackIron()] },
      { ...textureLayer('frost'), name: 'Frost ferns', to: 0.56, color: '#c8ccd4', amount: 0.8, scale: 1.3, strength: 0.6, where: 'lit', seed: 0xf205, blend: 'screen' },
      { ...contoursLayer(), name: 'Grooves', count: 3, from: 0.57, spacing: 0.05, width: 0.04, taper: 0, paint: solid('#121216'), altColor: '#030304', effects: [bevel({ size: 0.45, gloss: 0.8 })] },
      { ...bandFillLayer(), name: 'Lava', from: 0.7, to: 1, paint: solid('#8a0e0c') },
      { ...textureLayer('lava'), name: 'Molten glass', from: 0.7, to: 1, color: '#ff3c2c', color2: '#5a0606', scale: 2.6, amount: 1.4, seed: 0x1a7a },
      { ...textureLayer('crystal'), name: 'Glassy facets', from: 0.7, to: 1, color: '#ffa090', scale: 1.8, strength: 0.4, seed: 0x1a7b, blend: 'screen' },
      { ...lineLayer(), name: 'Lava rim', at: 0.7, width: 0.04, paint: solid('#08080a'), effects: [shadow({ distance: 0.03, blur: 0.04, opacity: 0.8 })] },
    ],
  },
  {
    id: 'storm-wisps',
    name: 'Storm wisps',
    description: 'A soft, lumpy whirl of dark cloud and blue light, blurred round the token like a storm caught in a ring.',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    make: () => [
      {
        ...groupLayer([
          { ...lineLayer(), name: 'Dark cloud', at: 0.5, width: 0.5, paint: solid('#10161c'), opacity: 0.7 },
          { ...lineLayer(), name: 'Grey veil', at: 0.3, width: 0.1, paint: solid('#7a8088'), waveAmplitude: 0.5, waveFit: 4, wavePhase: 0.25, opacity: 0.4 },
          { ...lineLayer(), name: 'Blue edge', at: 0.18, width: 0.2, paint: solid('#3a8ad0'), waveAmplitude: 0.08, waveFit: 3, blend: 'screen', opacity: 0.9 },
          { ...lineLayer(), name: 'Blue edge', at: 0.82, width: 0.16, paint: solid('#3a8ad0'), waveAmplitude: 0.08, waveFit: 2.5, wavePhase: 0.5, blend: 'screen', opacity: 0.7 },
          { ...lineLayer(), name: 'Grey veil', at: 0.4, width: 0.12, paint: solid('#8a9098'), waveAmplitude: 0.4, waveFit: 3.4, opacity: 0.45 },
          { ...lineLayer(), name: 'Grey veil', at: 0.6, width: 0.1, paint: solid('#a0a6ae'), waveAmplitude: 0.35, waveFit: 2.6, wavePhase: 0.5, opacity: 0.4 },
          { ...textureLayer('smoke'), name: 'Wisps', from: 0.05, to: 0.95, color: '#c0dcf0', color2: null, amount: 0.7, strength: 0.7, seed: 0x5e0c, blend: 'screen' },
          { ...lineLayer(), name: 'Bright thread', at: 0.5, width: 0.02, paint: solid('#e8f2fa'), waveAmplitude: 0.4, waveFit: 2.8, wavePhase: 0.2, opacity: 0.5 },
        ]),
        name: 'Storm',
        effects: [distort(0.2, 2.2, 7), blur(0.3, 'spin'), blur(0.08)],
      },
    ],
  },
];
