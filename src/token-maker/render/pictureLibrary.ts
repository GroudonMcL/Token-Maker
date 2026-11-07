// Pictures used as effects and decorations (v8). The built-in ones are CC0
// sprites and icons from Kenney (kenney.nl; see ASSETS-CREDITS.md), saved in
// public/pictures/; the user's own are kept in IndexedDB
// (src/state/pictureLibrary.ts). Either way the picture is held in the asset
// store under pictureAssetId(), so the renderer only ever reads the assets.

import type { BlendMode, ClipTarget, EffectPlacement, PictureSource, SnapPoint } from '../document/types';

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
    /** Where it is kept inside to start (Keep inside), e.g. fire only outside the token and on the frame. */
    clip?: ClipTarget[];
  };
  swatches: string[];
  /**
   * Which pickers offer it (effect pictures review, owner's picks): the
   * effect picker, the decoration picker's Effect pictures, both (the
   * default) or neither. One offered nowhere is kept, with its file, so
   * tokens that already use it still draw it.
   */
  offer?: PictureOffer;
}

export type PictureOffer = 'both' | 'effect' | 'decoration' | 'none';
/** Whether the effect picker offers this picture. */
export const offeredAsEffect = (p: LibraryEffectPicture) => (p.offer ?? 'both') === 'both' || p.offer === 'effect';
/** Whether the decoration picker's Effect pictures offers this picture. */
export const offeredAsDecoration = (p: LibraryEffectPicture) => (p.offer ?? 'both') === 'both' || p.offer === 'decoration';

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
  /**
   * Replaced by the owner's later picks: no longer offered in the picker,
   * but kept (with its file) so tokens that already use it still draw it.
   */
  retired?: boolean;
}

const fx = (
  id: string,
  name: string,
  orient: PictureOrient,
  defaults: LibraryEffectPicture['defaults'],
  swatches: string[] = [],
  group: EffectPictureGroup = 'Pictures',
): LibraryEffectPicture => ({ id: `fx-${id}`, name, group, orient, defaults, swatches: [defaults.color, ...swatches.filter((c) => c !== defaults.color)] });

/** The same picture, offered only where `offer` says. */
const only = (offer: PictureOffer, p: LibraryEffectPicture): LibraryEffectPicture => ({ ...p, offer });


/**
 * Picture effects: mostly white pictures, coloured by the effect's colour and
 * scattered round the token or stretched over it. Since v12 they include the
 * elemental effects, conditions, embers, sparkles, vines and cobwebs, once
 * drawn by code (owner request: real pictures look better). Sources and
 * licences are in ASSETS-CREDITS.md.
 */
const FIRST_PICTURES: readonly LibraryEffectPicture[] = [
  // Elemental (v12: real pictures instead of the code-drawn fire, frost, lightning…).
  only('none', fx('fire', 'Fire', 'outward', { placement: 'border', color: '#ff7a1f', blend: 'screen', size: 0.32, spread: 70, intensity: 95 }, ['#ff3b1a', '#ffb347', '#4aa8ff', '#76ff4a', '#c05aff'], 'Elemental')),
  fx('flame-licks', 'Flame licks', 'outward', { placement: 'border', color: '#ff8a2a', blend: 'screen', size: 0.22, spread: 60, intensity: 95 }, ['#ff3b1a', '#4aa8ff', '#76ff4a', '#c05aff'], 'Elemental'),
  fx('frost-edge', 'Frost', 'outward', { placement: 'border', color: '#bfe6ff', blend: 'screen', size: 0.22, spread: 60, intensity: 90, clip: ['outside', 'frame'] }, ['#ffffff', '#7fd0ff', '#9be7e0'], 'Elemental'),
  only('none', fx('frost', 'Frost ring', 'upright', { placement: 'over', color: '#bfe6ff', blend: 'screen', size: 0.3, spread: 50, intensity: 85, layout: 'fill' }, ['#ffffff', '#7fd0ff', '#9be7e0'], 'Elemental')),
  fx('frost-fern', 'Ice ferns', 'random', { placement: 'over', color: '#d6f0ff', blend: 'screen', size: 0.32, spread: 20, intensity: 85 }, ['#ffffff', '#7fd0ff'], 'Elemental'),
  fx('snowflakes', 'Snowflakes', 'random', { placement: 'over', color: '#e8f6ff', blend: 'screen', size: 0.1, spread: 40, intensity: 90 }, ['#ffffff', '#9fd8ff'], 'Elemental'),
  fx('lightning', 'Lightning', 'random', { placement: 'border', color: '#b8ccff', blend: 'screen', size: 0.5, spread: 20, intensity: 95, clip: ['token'] }, ['#ffffff', '#ffe36a', '#c08aff', '#76ff4a'], 'Elemental'),
  fx('crackles', 'Crackles', 'random', { placement: 'border', color: '#8fd0ff', blend: 'screen', size: 0.3, spread: 40, intensity: 95 }, ['#ffffff', '#ffe36a', '#c08aff'], 'Elemental'),
  only('decoration', fx('poison', 'Poison gas', 'random', { placement: 'over', color: '#7dff4a', blend: 'screen', size: 0.45, spread: 30, intensity: 80 }, ['#a8e23a', '#3ad27b', '#b05ad2'], 'Elemental')),
  only('none', fx('necrotic', 'Necrotic', 'random', { placement: 'over', color: '#3a1d4a', blend: 'multiply', size: 0.5, spread: 25, intensity: 85 }, ['#2a1a3a', '#1a3a22', '#1a1a1a'], 'Elemental')),
  only('decoration', fx('light-rays', 'Radiant', 'upright', { placement: 'over', color: '#ffe08a', blend: 'screen', size: 0.3, spread: 50, intensity: 60, layout: 'fill' }, ['#fff4c4', '#ffffff', '#ffb347', '#9fd8ff'], 'Elemental')),
  // Radiant (effect pictures review): a ring of soft beams round the frame, pointing out; over the art they shine in from the edge.
  fx('light-ring', 'Radiant', 'outward', { placement: 'border', color: '#ffe08a', blend: 'screen', size: 0.35, spread: 70, intensity: 85 }, ['#fff4c4', '#ffffff', '#ffb347', '#9fd8ff'], 'Elemental'),
  fx('scorch', 'Scorch marks', 'random', { placement: 'over', color: '#1c1410', blend: 'multiply', size: 0.35, spread: 25, intensity: 80 }, ['#000000', '#3a1a0a'], 'Elemental'),

  // Conditions.
  only('decoration', fx('blood-splatter', 'Blood spatter', 'random', { placement: 'over', color: '#7a0a0a', blend: 'normal', size: 0.42, spread: 15, intensity: 85 }, ['#5a0606', '#3a6a1a', '#2a2a6a'], 'Conditions')),
  fx('blood-drips', 'Blood drips', 'upright', { placement: 'over', color: '#7a0a0a', blend: 'normal', size: 0.5, spread: 8, intensity: 85 }, ['#5a0606', '#3a6a1a', '#2a2a6a'], 'Conditions'),
  only('none', fx('claw-marks', 'Claw marks', 'random', { placement: 'over', color: '#8a0b0b', blend: 'normal', size: 0.5, spread: 10, intensity: 85 }, ['#5a0606', '#1c1c1c', '#ffffff'], 'Conditions')),
  only('decoration', fx('splatter', 'Splatter', 'random', { placement: 'over', color: '#8a0b0b', blend: 'normal', size: 0.35, spread: 25, intensity: 85 }, ['#3a6a1a', '#1c1c1c', '#5b2a86'], 'Conditions')),
  only('none', fx('stone', 'Petrified', 'upright', { placement: 'over', color: '#c8c4bc', blend: 'overlay', size: 0.3, spread: 50, intensity: 100, layout: 'fill' }, ['#ffffff', '#a59a86', '#8d8a84'], 'Conditions')),
  fx('cracks', 'Cracks', 'upright', { placement: 'over', color: '#ffffff', blend: 'multiply', size: 0.3, spread: 50, intensity: 85, layout: 'fill', tint: false }, ['#ffffff'], 'Conditions'),
  only('decoration', fx('ghost-wisps', 'Ghostly wisps', 'outward', { placement: 'over', color: '#cfe8ff', blend: 'screen', size: 0.45, spread: 20, intensity: 80 }, ['#ffffff', '#b8f0e0', '#e0c8ff'], 'Conditions')),
  fx('wisps', 'Wisps', 'random', { placement: 'over', color: '#9fd8ff', blend: 'screen', size: 0.3, spread: 35, intensity: 80 }, ['#76ff4a', '#b06aff', '#ffffff'], 'Conditions'),
  only('none', fx('hearts', 'Hearts', 'random', { placement: 'over', color: '#ff6fb5', blend: 'normal', size: 0.14, spread: 30, intensity: 90 }, ['#ff3b6a', '#ff9ad2', '#c08aff'], 'Conditions')),

  // Atmosphere (beside the drawn mist and smoke).
  only('none', fx('embers', 'Embers', 'upright', { placement: 'over', color: '#ffffff', blend: 'screen', size: 0.3, spread: 50, intensity: 90, layout: 'fill', tint: false }, ['#ffffff'], 'Atmosphere')),
  fx('sparkle', 'Sparkles', 'random', { placement: 'over', color: '#fff6d0', blend: 'screen', size: 0.16, spread: 35, intensity: 95 }, ['#ffffff', '#ffd76a', '#9fd8ff', '#ff9ad2'], 'Atmosphere'),
  fx('twinkles', 'Twinkles', 'random', { placement: 'over', color: '#fff4c4', blend: 'screen', size: 0.18, spread: 40, intensity: 95 }, ['#ffffff', '#9fd8ff', '#ff9ad2'], 'Atmosphere'),
  fx('lens-flare', 'Lens flare', 'upright', { placement: 'over', color: '#ffffff', blend: 'screen', size: 1, spread: 0, intensity: 90, tint: false }, ['#ffffff'], 'Atmosphere'),
  fx('smoke-puffs', 'Smoke puffs', 'random', { placement: 'over', color: '#c9ccd6', blend: 'screen', size: 0.3, spread: 40, intensity: 70 }, ['#5b5f6b', '#76ff4a', '#8b5cd6'], 'Atmosphere'),
  fx('orbs', 'Orbs', 'random', { placement: 'over', color: '#ffd76a', blend: 'screen', size: 0.12, spread: 50, intensity: 85 }, ['#9fd8ff', '#76ff4a', '#ff6fb5'], 'Atmosphere'),

  // Overlays (beside the vignette, gradient and edge shadow).
  fx('ivy-vine', 'Ivy', 'upright', { placement: 'over', color: '#ffffff', blend: 'normal', size: 0.3, spread: 50, intensity: 100, layout: 'fill', tint: false }, ['#ffffff'], 'Overlays'),
  only('decoration', fx('ivy', 'Creeping vine', 'outward', { placement: 'over', color: '#ffffff', blend: 'normal', size: 0.5, spread: 16, intensity: 100, tint: false }, ['#ffffff'], 'Overlays')),
  fx('cobweb-corner', 'Cobwebs', 'upright', { placement: 'over', color: '#e8e8e8', blend: 'screen', size: 0.3, spread: 50, intensity: 85, layout: 'fill' }, ['#ffffff', '#c9ccd6', '#9a9aa6'], 'Overlays'),
  only('none', fx('cobweb', 'Spider web', 'random', { placement: 'over', color: '#ffffff', blend: 'screen', size: 0.7, spread: 4, intensity: 85 }, ['#c9ccd6', '#9a9aa6'], 'Overlays')),

  // Pictures.
  fx('swirls', 'Swirls', 'random', { placement: 'over', color: '#b06aff', blend: 'screen', size: 0.4, spread: 30, intensity: 80 }, ['#6fc3ff', '#76ff4a', '#ffffff']),
  only('none', fx('arcane-circle', 'Arcane circle', 'upright', { placement: 'over', color: '#b06aff', blend: 'screen', size: 0.9, spread: 0, intensity: 85 }, ['#6fc3ff', '#ffd76a', '#ff3b3b'])),
];

/**
 * New pictures for existing effects (effect pictures review, owner's picks):
 * [the effect it joins, id, name, settings that differ, where it's offered].
 * Each starts with that effect's settings and is listed right after it.
 */
const MORE_PICTURES: [string, string, string, Partial<LibraryEffectPicture['defaults']>, PictureOffer?][] = [
  // Elemental and light (page A).
  ['fire', 'fire-sparks', 'Fire', { clip: ['outside', 'frame'] }],
  ['fire', 'fire-bonfire', 'Bonfire flame', {}, 'decoration'],
  ['fire', 'fire-row', 'Row of flames', {}, 'decoration'],
  ['frost-edge', 'frost-thicket', 'Ice thicket', {}],
  ['frost', 'frost-mixed', 'Frost ring', {}],
  ['snowflakes', 'snowflakes-fern', 'Fern snowflakes', {}],
  ['lightning', 'lightning-glow', 'Glowing bolts', {}],
  ['crackles', 'crackles-arc', 'Arcs', {}],
  ['light-rays', 'light-corona', 'Corona burst', {}, 'decoration'],
  ['light-rays', 'light-sun-wheel', 'Sun wheel', {}, 'decoration'],
  ['light-rays', 'light-burst', 'Light burst', {}, 'decoration'],
  ['light-rays', 'light-from-above', 'Light from above', {}, 'decoration'],
  ['lens-flare', 'lens-flare-streak', 'Flare streak', {}],
  ['lens-flare', 'lens-flare-blue', 'Blue flare', {}],
  ['embers', 'embers-rising', 'Rising sparks', {}],
  ['embers', 'embers-spray', 'Bonfire spray', {}],
  ['hearts', 'hearts-classic', 'Hearts', {}],
  ['hearts', 'hearts-shine', 'Shiny hearts', {}, 'effect'],
  // Conditions, magic and atmosphere (pages B and C).
  ['necrotic', 'necrotic-ink', 'Ink plume', {}],
  ['necrotic', 'necrotic-tendrils', 'Necrotic tendrils', { intensity: 95 }],
  ['scorch', 'scorch-charred', 'Charred patch', {}],
  ['blood-splatter', 'blood-burst', 'Blood burst', {}, 'decoration'],
  ['blood-splatter', 'blood-splat', 'Blood splat', {}],
  ['blood-drips', 'blood-drips-runs', 'Blood runs', {}],
  ['claw-marks', 'claw-rakes', 'Claw rakes', {}, 'decoration'],
  ['splatter', 'splatter-specks', 'Scattered specks', {}, 'decoration'],
  ['splatter', 'splatter-heavy', 'Heavy splat', {}, 'decoration'],
  ['stone', 'stone-marble', 'Petrified marble', { intensity: 85 }],
  ['stone', 'stone-weathered', 'Petrified stone', {}],
  ['cracks', 'cracks-impact', 'Impact cracks', {}],
  ['cracks', 'cracks-glass', 'Shattered glass', { intensity: 70 }],
  ['ghost-wisps', 'ghost-twin-wisps', 'Ghostly twin wisps', { size: 0.35 }],
  ['wisps', 'wisps-incense', 'Incense wisps', {}, 'decoration'],
  ['wisps', 'wisps-ribbon', 'Smoke ribbon', { size: 0.35 }, 'decoration'],
  ['sparkle', 'sparkle-starburst', 'Starburst', {}, 'decoration'],
  ['sparkle', 'sparkle-glow', 'Star glow', {}, 'decoration'],
  ['orbs', 'orbs-sphere', 'Glowing spheres', {}],
  ['cobweb', 'web-intricate', 'Intricate web', {}, 'decoration'],
  ['cobweb', 'web-bold', 'Bold web', {}, 'decoration'],
  ['cobweb', 'web-strung', 'Strung web', {}, 'decoration'],
  ['swirls', 'swirls-twirl', 'Twirl rings', {}],
  ['swirls', 'swirls-smoke', 'Smoke curls', {}],
  ['arcane-circle', 'arcane-seal', 'Geometric seal', {}],
  ['arcane-circle', 'arcane-triangle', 'Triangle seal', {}],
  ['arcane-circle', 'arcane-spiral', 'Spiral rune ring', {}],
];

export const EFFECT_PICTURES: readonly LibraryEffectPicture[] = FIRST_PICTURES.flatMap((base) => [
  base,
  ...MORE_PICTURES.filter(([joins]) => `fx-${joins}` === base.id).map(([, id, name, change, offer]): LibraryEffectPicture => ({
    ...base,
    id: `fx-${id}`,
    name,
    defaults: { ...base.defaults, ...change },
    offer: offer ?? 'both',
  })),
]);


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
  retired = false,
): LibraryDecorationPicture => ({ id: `deco-art-${id}`, name, color, swatches: [color, ...METAL.filter((c) => c !== color)], tint, group, start, ...(retired ? { retired } : {}) });

/** No longer offered in the picker (owner's decoration review), but kept so tokens that use it still draw. */
const retire = (p: LibraryDecorationPicture): LibraryDecorationPicture => ({ ...p, retired: true });

/** Light silver: tinted pictures drawn in grey start this colour, so they look like silver until recoloured. */
const SILVER = '#e8ecf2';

/** Picture decorations: ornaments, treasure, creatures and trims, then flat icons with a dark outline (coloured by the decoration's colour). */
export const DECORATION_PICTURES: readonly LibraryDecorationPicture[] = [
  orn('celtic-vine-corner', 'Celtic vine corner', false),
  // Decoration review (owner's picks): retired ornaments and every flat icon below.
  retire(orn('leaf-ornament', 'Leaf ornament', false)),
  orn('corner-decoration', 'Corner decoration', false),
  retire(orn('engraved-lion', 'Engraved lion', false)),
  retire(orn('bejeweled-lion', 'Bejeweled lion', false)),
  orn('golden-laurel', 'Golden laurel', true),
  orn('gold-victorian-ring', 'Gold victorian ring', true),
  orn('filigree-circle', 'Filigree circle', false),
  orn('corner-flourish', 'Corner flourish', false),
  orn('flourish-divider', 'Flourish divider', false),
  orn('laurel-wreath', 'Laurel wreath', false),
  retire(orn('heraldic-dragon', 'Heraldic dragon', false)),
  retire(orn('heraldic-griffin', 'Heraldic griffin', false)),
  retire(orn('heraldic-unicorn', 'Heraldic unicorn', false)),
  retire(orn('heraldic-wyvern', 'Heraldic wyvern', false)),
  retire(orn('lion-rampant', 'Lion rampant', true)),
  retire(orn('gold-griffin', 'Gold griffin', true)),
  retire(orn('royal-crown', 'Royal crown', true)),
  retire(orn('celtic-knot', 'Celtic knot', false)),
  retire(orn('gold-fleur-de-lis', 'Gold fleur de lis', true)),
  retire(orn('fleur-de-lis', 'Fleur de lis', false)),
  retire(orn('knotwork-divider', 'Knotwork divider', false)),
  retire(orn('antique-corner', 'Antique corner', false)),
  retire(orn('dragon-head', 'Dragon head', false)),
  // Decoration art round, part 1 (owner's picks): new gems, crowns, stars, skulls and a horn replace the first set.
  art('gem', 'Gem', 'Treasure', '#d0202a', { place: 'top', size: 0.34, mirror: false }, false, true),
  art('diamond', 'Diamond', 'Treasure', '#d0202a', { place: 'top', size: 0.3, mirror: false }, true),
  art('cut-stone', 'Cut stone', 'Treasure', '#2f7fd8', { place: 'top', size: 0.32, mirror: false }, true, true),
  art('round-gem', 'Round gem', 'Treasure', '#2e8b57', { place: 'bottom', size: 0.3, mirror: false }, false, true),
  art('round-brilliant', 'Round brilliant', 'Treasure', '#2e8b57', { place: 'bottom', size: 0.3, mirror: false }, true),
  art('pearl', 'Pearl', 'Treasure', '#f4efe6', { place: 'bottom', size: 0.26, mirror: false }, true),
  art('crown', 'Crown', 'Treasure', '#e0b84a', { place: 'top', size: 0.4, mirror: false }, false, true),
  art('circlet', 'Circlet', 'Treasure', '#e0b84a', { place: 'top', size: 0.2, mirror: false }),
  art('crown-gold', 'Gold crown', 'Treasure', '#e0b84a', { place: 'top', size: 0.3, mirror: false }),
  art('coronet', 'Coronet', 'Treasure', '#e0b84a', { place: 'top', size: 0.28, mirror: false }, true),
  art('star', 'Star', 'Treasure', '#e8c35a', { place: 'topRight', size: 0.3, mirror: true }, false, true),
  art('star-gold', 'Gold star', 'Treasure', '#e8c35a', { place: 'topRight', size: 0.3, mirror: true }),
  art('star-ornate', 'Ornate star', 'Treasure', '#e8c35a', { place: 'topRight', size: 0.3, mirror: true }, true),
  art('skull', 'Skull', 'Creatures', '#e8e2cc', { place: 'bottom', size: 0.42, mirror: false }, false, true),
  art('skull-painted', 'Painted skull', 'Creatures', '#e8e2cc', { place: 'bottom', size: 0.42, mirror: false }),
  art('skull-engraved', 'Engraved skull', 'Creatures', '#e8e2cc', { place: 'bottom', size: 0.42, mirror: false }, true),
  art('skull-crossbones', 'Skull and crossbones', 'Creatures', '#e8e2cc', { place: 'bottom', size: 0.4, mirror: false }, true),
  art('horn', 'Horn', 'Creatures', '#b89a86', { place: 'topRight', size: 0.3, mirror: true }),
  art('horn-smooth', 'Smooth horn', 'Creatures', '#d8c9a8', { place: 'topRight', size: 0.32, mirror: true }, true),
  art('wing', 'Wing', 'Creatures', '#f2f2f2', { place: 'right', size: 0.4, mirror: true }),
  // Decoration art round, part 2 (owner's picks): more wings, ribbons, laurels and a leaf; chain retired.
  art('wing-gold', 'Gold wing', 'Creatures', '#e0b84a', { place: 'right', size: 0.4, mirror: true }),
  art('wing-silver', 'Silver wing', 'Creatures', SILVER, { place: 'right', size: 0.4, mirror: true }, true),
  art('ribbon', 'Ribbon', 'Trims', '#b3202c', { place: 'bottom', size: 0.24, mirror: false }),
  art('scroll', 'Parchment scroll', 'Trims', '#d9c27a', { place: 'bottom', size: 0.18, mirror: false }),
  art('sash', 'Red sash', 'Trims', '#d42a2a', { place: 'bottom', size: 0.28, mirror: false }),
  art('laurel', 'Laurel', 'Trims', '#d9a520', { place: 'bottomLeft', size: 0.6, mirror: true }, false, true),
  art('laurel-gold', 'Gold laurel', 'Trims', '#d9a520', { place: 'bottomLeft', size: 0.6, mirror: true }),
  art('laurel-silver', 'Silver laurel', 'Trims', SILVER, { place: 'bottomLeft', size: 0.6, mirror: true }, true),
  art('chain', 'Chain', 'Trims', '#b8bcc4', { place: 'bottom', size: 0.2, mirror: false }, false, true),
  art('leaf', 'Leaf', 'Trims', '#3f9a3a', { place: 'topLeft', size: 0.3, mirror: false }, false, true),
  art('oak-sprig', 'Oak sprig', 'Trims', '#5e9a3a', { place: 'topLeft', size: 0.3, mirror: false }, true),
  retire(deco('skull-icon', 'Skull icon', '#e9e1cc', ['#e9e1cc', '#3a3a3a', '#76ff4a', '#c0263a'])),
  retire(deco('heart', 'Heart', '#c0263a', ['#c0263a', '#ff6fb5', '#ffffff'])),
  retire(deco('broken-heart', 'Broken heart', '#c0263a', ['#c0263a', '#5a0606', '#8a8a8a'])),
  retire(deco('shield-icon', 'Shield icon', '#3f6fd8', ['#3f6fd8', '#b8322a', '#2f7a3a', '#e0b23a'])),
  retire(deco('sword-icon', 'Sword icon', '#c9d2de')),
  retire(deco('crown-icon', 'Crown icon', '#e0b23a')),
  retire(deco('flame', 'Flame', '#ff7a1a', ['#ff7a1a', '#ffd24a', '#4aa8ff', '#76ff4a'])),
  retire(deco('potion', 'Potion', '#c0263a', ['#c0263a', '#2f7fd8', '#2fae5a', '#8a3fd0'])),
  retire(deco('hourglass', 'Hourglass', '#e0b23a')),
  retire(deco('padlock', 'Padlock', '#c9d2de')),
  retire(deco('spellbook', 'Spellbook', '#8a3fd0', ['#8a3fd0', '#b8322a', '#2f5fa8', '#b5813a'])),
  retire(deco('pouch', 'Pouch', '#b5813a', ['#b5813a', '#e0b23a', '#8a5a32'])),
  retire(deco('flag', 'Flag', '#b8322a', ['#b8322a', '#2f5fa8', '#2f7a3a', '#ffffff'])),
  retire(deco('award', 'Award', '#e0b23a')),
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
