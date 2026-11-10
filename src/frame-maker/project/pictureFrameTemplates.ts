// Token Maker's built-in frames that used to be pictures (gilded laurel, iron
// rivets, runestone, thorns, dragon scales, celestial star, rope and shield
// rim), rebuilt as Frame Maker designs from ordinary editable layers, with
// photo textures where they help. Token Maker lists them with its drawn
// frames, so they follow the token's shape and thickness; here they are in
// the "Token Maker's built-in frames" section of New, ready to change.

import { bandFillLayer, growthLayer, lineLayer, repeatLayer, textureLayer } from './defaults';
import { bevel, glow, material, shadow } from './styles';
import type { ThemedTemplate } from './themedTemplates';
import type { Effect, Paint } from './types';

type PicturePaint = Extract<Paint, { kind: 'picture' }>;

const solid = (color: string): Paint => ({ kind: 'solid', color });
const photo = (picture: PicturePaint['picture'], scale: number, patch: Partial<PicturePaint> = {}): Paint => ({
  kind: 'picture',
  picture,
  scale,
  angle: 0,
  bend: true,
  tint: null,
  lighting: 0.6,
  ...patch,
});
const soft = (opacity = 0.6): Effect => shadow({ distance: 0.04, blur: 0.05, opacity });

export const PICTURE_FRAME_TEMPLATES: ThemedTemplate[] = [
  {
    id: 'gilded-laurel',
    name: 'Gilded laurel',
    description: 'A rounded gold band with a wreath of gilded laurel leaves along both edges.',
    stage: { thickness: 0.2, outerSpacing: 0.03 },
    make: () => [
      { ...repeatLayer(), name: 'Outer leaves', element: 'leaf', count: 24, snapToCorners: false, at: 0.26, size: 1.05, stretch: 0.42, rotation: -68, fill: '#d8a838', fillPaint: photo('gold', 0.6), raised: false, effects: [bevel({ size: 0.5, gloss: 0.8 }), material('gold', 0.6), soft(0.55)] },
      { ...repeatLayer(), name: 'Inner leaves', element: 'leaf', count: 24, snapToCorners: false, at: 0.74, offset: 0.5, size: 1.05, stretch: 0.42, rotation: 68, fill: '#d8a838', fillPaint: photo('gold', 0.6), raised: false, effects: [bevel({ size: 0.5, gloss: 0.8 }), material('gold', 0.6), soft(0.55)] },
      { ...lineLayer(), name: 'Gold band', at: 0.5, width: 0.3, paint: photo('gold', 1.2), effects: [bevel({ size: 0.6, depth: 1.4, gloss: 0.9 }), material('gold', 0.5), soft(0.6)] },
    ],
  },
  {
    id: 'runestone',
    name: 'Runestone',
    description: 'A ring of cracked grey stone carved with glowing blue runes.',
    stage: { thickness: 0.2, outerSpacing: 0.02 },
    make: () => [
      { ...bandFillLayer(), name: 'Stone', paint: photo('coral-stone', 1.6, { tint: '#a8a49a' }), effects: [bevel({ profile: 'chisel', size: 0.25, gloss: 0.2 }), soft(0.7)] },
      { ...textureLayer('cracks'), name: 'Cracks', color: '#3a362c', amount: 0.7, opacity: 0.45, blend: 'multiply', seed: 0x5701 },
      { ...repeatLayer(), name: 'Runes', element: 'rune', count: 16, snapToCorners: false, at: 0.5, size: 0.5, fill: '#7ae6ff', raised: false, shaded: false, effects: [bevel({ direction: 'sunken', size: 0.3, gloss: 0.3 }), glow({ color: '#3ac8ff', opacity: 0.8, size: 0.1 })] },
    ],
  },
  {
    id: 'thorns',
    name: 'Thorns',
    description: 'Two twisted brown briars wound round each other, bristling with sharp thorns.',
    stage: { thickness: 0.16, outerSpacing: 0.06 },
    make: () => [
      { ...growthLayer('thorns'), name: 'Briar', count: 2, thickness: 0.11, amplitude: 0.3, waveLength: 1.6, extraSize: 0.45, color: '#7a5030', extraColor: '#3a2414', effects: [bevel({ size: 0.5, gloss: 0.35 }), soft(0.8)] },
      { ...growthLayer('thorns'), name: 'Second briar', count: 1, thickness: 0.08, amplitude: 0.25, waveLength: 2.2, extraSize: 0.38, color: '#8a5c34', extraColor: '#2a1a0e', seed: 7, effects: [bevel({ size: 0.5, gloss: 0.35 }), soft(0.7)] },
    ],
  },
  {
    id: 'celestial',
    name: 'Celestial star',
    description: 'A deep blue band scattered with stars between silver rims, with eight silver points like a compass star.',
    stage: { thickness: 0.12, outerSpacing: 0.14, bleed: 0.5 },
    make: () => [
      { ...repeatLayer(), name: 'Star points', element: 'spike', count: 8, at: -0.5, size: 2.2, stretch: 0.5, rotation: 0, offset: 1, accentEvery: 2, accentScale: 1.36, fill: '#c8ccd8', raised: false, effects: [bevel({ profile: 'chisel', size: 0.5, gloss: 0.9 }), material('silver'), soft(0.6)] },
      { ...bandFillLayer(), name: 'Night blue', from: 0.2, to: 0.8, paint: solid('#1a2a78'), effects: [bevel({ direction: 'sunken', size: 0.2, gloss: 0.6 })] },
      { ...repeatLayer(), name: 'Stars', element: 'star', count: 24, snapToCorners: false, at: 0.5, size: 0.22, fill: '#f4f0ff', raised: false, shaded: false, effects: [glow({ color: '#c0d0ff', opacity: 0.7, size: 0.06 })] },
      { ...lineLayer(), name: 'Outer silver', at: 0.1, width: 0.2, paint: solid('#c8ccd4'), effects: [bevel({ size: 0.6, gloss: 0.9 }), material('silver'), soft(0.5)] },
      { ...lineLayer(), name: 'Inner silver', at: 0.9, width: 0.2, paint: solid('#c8ccd4'), effects: [bevel({ size: 0.6, gloss: 0.9 }), material('silver'), soft(0.5)] },
    ],
  },
  {
    id: 'rope',
    name: 'Rope',
    description: 'A thick twisted hemp rope, round and lit like the real thing.',
    stage: { thickness: 0.14, outerSpacing: 0.03 },
    make: () => [
      { ...bandFillLayer(), name: 'Rope', paint: solid('#a8885a'), effects: [bevel({ size: 0.9, depth: 1.5, gloss: 0.2 }), soft(0.75)] },
      { ...textureLayer('rope'), name: 'Twist', color: '#b8986a', amount: 1, strength: 1.2, seed: 0xbead },
      { ...bandFillLayer(), name: 'Fibres', paint: photo('hessian', 0.5), opacity: 0.45, blend: 'overlay' },
    ],
  },
];
