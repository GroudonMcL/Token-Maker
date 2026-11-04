// Pictures used as effects and decorations (v8). The built-in ones are CC0
// sprites and icons from Kenney (kenney.nl; see ASSETS-CREDITS.md), saved in
// public/pictures/; the user's own are kept in IndexedDB
// (src/state/pictureLibrary.ts). Either way the picture is held in the asset
// store under pictureAssetId(), so the renderer only ever reads the assets.

import type { BlendMode, EffectPlacement, PictureSource, SnapPoint } from '../document/types';

/** The effect picker's groups (document/defaults.ts lists them in order). */
export type EffectPictureGroup = 'Elemental' | 'Conditions' | 'Atmosphere' | 'Overlays' | 'Pictures';

/** How scattered copies of a picture effect turn. */
export type PictureOrient = 'random' | 'outward' | 'upright';

export interface LibraryEffectPicture {
  id: string;
  name: string;
  /** Where the effect picker lists it. */
  group: EffectPictureGroup;
  orient: PictureOrient;
  /** Starting settings. A picture with its own colours starts with `tint: false`; one stretched over the area with `layout: 'fill'`. */
  defaults: {
    placement: EffectPlacement;
    color: string;
    blend: BlendMode;
    size: number;
    spread: number;
    intensity: number;
    layout?: 'scatter' | 'fill';
    tint?: boolean;
    blur?: number;
  };
  swatches: string[];
}

export interface LibraryDecorationPicture {
  id: string;
  name: string;
  color: string;
  swatches: string[];
  /** Coloured by the decoration's colour (single-colour pictures); false keeps the picture's own colours. */
  tint: boolean;
  group: 'Ornaments' | 'Treasure' | 'Creatures' | 'Trims' | 'Pictures';
  /** Where it starts (else the picture decoration's own defaults). */
  start?: { place: SnapPoint; size: number; mirror: boolean };
}

const fx = (
  id: string,
  name: string,
  orient: PictureOrient,
  defaults: LibraryEffectPicture['defaults'],
  swatches: string[] = [],
  group: EffectPictureGroup = 'Pictures',
): LibraryEffectPicture => ({ id: `fx-${id}`, name, group, orient, defaults, swatches: [defaults.color, ...swatches.filter((c) => c !== defaults.color)] });

/** Picture effects: white sprites, coloured by the effect's colour and scattered round the token. */
export const EFFECT_PICTURES: readonly LibraryEffectPicture[] = [
  fx('smoke-puffs', 'Smoke puffs', 'random', { placement: 'over', color: '#c9ccd6', blend: 'screen', size: 0.3, spread: 40, intensity: 70 }, ['#5b5f6b', '#76ff4a', '#8b5cd6']),
  fx('flame-licks', 'Flame licks', 'outward', { placement: 'border', color: '#ff8a2a', blend: 'screen', size: 0.22, spread: 60, intensity: 95 }, ['#ff3b1a', '#4aa8ff', '#76ff4a', '#c05aff']),
  fx('wisps', 'Wisps', 'random', { placement: 'over', color: '#9fd8ff', blend: 'screen', size: 0.3, spread: 35, intensity: 80 }, ['#76ff4a', '#b06aff', '#ffffff']),
  fx('crackles', 'Crackles', 'random', { placement: 'border', color: '#8fd0ff', blend: 'screen', size: 0.3, spread: 40, intensity: 95 }, ['#ffffff', '#ffe36a', '#c08aff']),
  fx('twinkles', 'Twinkles', 'random', { placement: 'over', color: '#fff4c4', blend: 'screen', size: 0.18, spread: 40, intensity: 95 }, ['#ffffff', '#9fd8ff', '#ff9ad2']),
  fx('orbs', 'Orbs', 'random', { placement: 'over', color: '#ffd76a', blend: 'screen', size: 0.12, spread: 50, intensity: 85 }, ['#9fd8ff', '#76ff4a', '#ff6fb5']),
  fx('swirls', 'Swirls', 'random', { placement: 'over', color: '#b06aff', blend: 'screen', size: 0.4, spread: 30, intensity: 80 }, ['#6fc3ff', '#76ff4a', '#ffffff']),
  fx('arcane-circle', 'Arcane circle', 'upright', { placement: 'over', color: '#b06aff', blend: 'screen', size: 0.9, spread: 0, intensity: 85 }, ['#6fc3ff', '#ffd76a', '#ff3b3b']),
  fx('hearts', 'Hearts', 'random', { placement: 'over', color: '#ff6fb5', blend: 'normal', size: 0.14, spread: 30, intensity: 90 }, ['#ff3b6a', '#ff9ad2', '#c08aff']),
  fx('claw-marks', 'Claw marks', 'random', { placement: 'over', color: '#8a0b0b', blend: 'normal', size: 0.5, spread: 10, intensity: 85 }, ['#5a0606', '#1c1c1c', '#ffffff']),
  fx('splatter', 'Splatter', 'random', { placement: 'over', color: '#8a0b0b', blend: 'normal', size: 0.35, spread: 25, intensity: 85 }, ['#3a6a1a', '#1c1c1c', '#5b2a86']),
  fx('scorch', 'Scorch marks', 'random', { placement: 'over', color: '#1c1410', blend: 'multiply', size: 0.35, spread: 25, intensity: 80 }, ['#000000', '#3a1a0a']),
];

const METAL = ['#e0b23a', '#c9d2de', '#b5813a', '#1c1c1c', '#ffffff'];
const deco = (id: string, name: string, color: string, swatches: string[] = METAL): LibraryDecorationPicture => ({
  id: `deco-${id}`,
  name,
  color,
  swatches: [color, ...swatches.filter((c) => c !== color)],
  tint: true,
  group: 'Pictures',
});

const GOLD = '#d9ad4f';
/**
 * Ornaments (owner's choice after the asset review): Openclipart's CC0
 * filigree, heraldry and flourishes, drawn from their SVGs. The single-colour
 * ones are tinted (gold to start); the coloured ones keep their own colours.
 */
const orn = (id: string, name: string, colourful: boolean): LibraryDecorationPicture => ({
  id: `deco-orn-${id}`,
  name,
  color: colourful ? '#ffffff' : GOLD,
  swatches: colourful ? ['#ffffff'] : [GOLD, ...METAL.filter((c) => c !== GOLD), '#8a1c1c'],
  tint: !colourful,
  group: 'Ornaments',
});

/**
 * Treasure, creatures and trims (owner request: these replace the code-drawn
 * ones): shaded Openclipart CC0 clipart, kept in its own colours to start.
 * "Colour it in" tints them with the decoration's colour instead.
 */
const art = (
  id: string,
  name: string,
  group: 'Treasure' | 'Creatures' | 'Trims',
  color: string,
  start: LibraryDecorationPicture['start'],
  tint = false,
): LibraryDecorationPicture => ({ id: `deco-art-${id}`, name, color, swatches: [color, ...METAL.filter((c) => c !== color)], tint, group, start });

/** Picture decorations: ornaments, treasure, creatures and trims, then flat icons with a dark outline (coloured by the decoration's colour). */
export const DECORATION_PICTURES: readonly LibraryDecorationPicture[] = [
  orn('celtic-vine-corner', 'Celtic vine corner', false),
  orn('leaf-ornament', 'Leaf ornament', false),
  orn('corner-decoration', 'Corner decoration', false),
  orn('engraved-lion', 'Engraved lion', false),
  orn('bejeweled-lion', 'Bejeweled lion', false),
  orn('golden-laurel', 'Golden laurel', true),
  orn('gold-victorian-ring', 'Gold victorian ring', true),
  orn('filigree-circle', 'Filigree circle', false),
  orn('corner-flourish', 'Corner flourish', false),
  orn('flourish-divider', 'Flourish divider', false),
  orn('laurel-wreath', 'Laurel wreath', false),
  orn('heraldic-dragon', 'Heraldic dragon', false),
  orn('heraldic-griffin', 'Heraldic griffin', false),
  orn('heraldic-unicorn', 'Heraldic unicorn', false),
  orn('heraldic-wyvern', 'Heraldic wyvern', false),
  orn('lion-rampant', 'Lion rampant', true),
  orn('gold-griffin', 'Gold griffin', true),
  orn('royal-crown', 'Royal crown', true),
  orn('celtic-knot', 'Celtic knot', false),
  orn('gold-fleur-de-lis', 'Gold fleur de lis', true),
  orn('fleur-de-lis', 'Fleur de lis', false),
  orn('knotwork-divider', 'Knotwork divider', false),
  orn('antique-corner', 'Antique corner', false),
  orn('dragon-head', 'Dragon head', false),
  art('gem', 'Gem', 'Treasure', '#d0202a', { place: 'top', size: 0.34, mirror: false }),
  art('round-gem', 'Round gem', 'Treasure', '#2e8b57', { place: 'bottom', size: 0.3, mirror: false }),
  art('crown', 'Crown', 'Treasure', '#e0b84a', { place: 'top', size: 0.4, mirror: false }),
  art('star', 'Star', 'Treasure', '#e8c35a', { place: 'topRight', size: 0.3, mirror: true }),
  art('skull', 'Skull', 'Creatures', '#e8e2cc', { place: 'bottom', size: 0.42, mirror: false }),
  art('horn', 'Horn', 'Creatures', '#b89a86', { place: 'topRight', size: 0.3, mirror: true }),
  art('wing', 'Wing', 'Creatures', '#f2f2f2', { place: 'right', size: 0.4, mirror: true }),
  art('ribbon', 'Ribbon', 'Trims', '#b3202c', { place: 'bottom', size: 0.24, mirror: false }),
  art('laurel', 'Laurel', 'Trims', '#d9a520', { place: 'bottomLeft', size: 0.6, mirror: true }),
  art('chain', 'Chain', 'Trims', '#b8bcc4', { place: 'bottom', size: 0.2, mirror: false }),
  art('leaf', 'Leaf', 'Trims', '#3f9a3a', { place: 'topLeft', size: 0.3, mirror: false }),
  deco('skull-icon', 'Skull icon', '#e9e1cc', ['#e9e1cc', '#3a3a3a', '#76ff4a', '#c0263a']),
  deco('heart', 'Heart', '#c0263a', ['#c0263a', '#ff6fb5', '#ffffff']),
  deco('broken-heart', 'Broken heart', '#c0263a', ['#c0263a', '#5a0606', '#8a8a8a']),
  deco('shield-icon', 'Shield icon', '#3f6fd8', ['#3f6fd8', '#b8322a', '#2f7a3a', '#e0b23a']),
  deco('sword-icon', 'Sword icon', '#c9d2de'),
  deco('crown-icon', 'Crown icon', '#e0b23a'),
  deco('flame', 'Flame', '#ff7a1a', ['#ff7a1a', '#ffd24a', '#4aa8ff', '#76ff4a']),
  deco('potion', 'Potion', '#c0263a', ['#c0263a', '#2f7fd8', '#2fae5a', '#8a3fd0']),
  deco('hourglass', 'Hourglass', '#e0b23a'),
  deco('padlock', 'Padlock', '#c9d2de'),
  deco('spellbook', 'Spellbook', '#8a3fd0', ['#8a3fd0', '#b8322a', '#2f5fa8', '#b5813a']),
  deco('pouch', 'Pouch', '#b5813a', ['#b5813a', '#e0b23a', '#8a5a32']),
  deco('flag', 'Flag', '#b8322a', ['#b8322a', '#2f5fa8', '#2f7a3a', '#ffffff']),
  deco('award', 'Award', '#e0b23a'),
];

export const pictureUrl = (id: string) => `/pictures/${id}.webp`;
/** A small copy for the pickers' tiles (scripts/token-maker/picture-thumbs.ts), so the panels don't load every full-size picture. */
export const pictureThumbUrl = (id: string) => `/pictures/thumbs/${id}.webp`;

/** The asset-store key of a picture. */
export const pictureAssetId = (source: PictureSource) => `picture:${source.type}:${source.id}`;

export const effectPicture = (id: string) => EFFECT_PICTURES.find((p) => p.id === id);
export const decorationPicture = (id: string) => DECORATION_PICTURES.find((p) => p.id === id);
/**
 * How a library picture starts out as a decoration (owner request: any effect
 * picture can be a decoration too). Effect sprites are white, so they are
 * tinted with the effect's starting colour.
 */
export function decorationLook(id: string): Pick<LibraryDecorationPicture, 'name' | 'color' | 'swatches' | 'tint'> | undefined {
  const deco = decorationPicture(id);
  if (deco) return deco;
  const fx = effectPicture(id);
  return fx && { name: fx.name, color: fx.defaults.color, swatches: fx.swatches, tint: true };
}
export const isLibraryPicture = (id: string) => !!effectPicture(id) || !!decorationPicture(id);
