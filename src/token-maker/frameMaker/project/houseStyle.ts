// Building blocks for the built-in frames, in the owner's house style (the
// Essentials designs): a two-tone gradient band with a reversed "pressed-in step",
// a crease, a lit outer rim, a shadowed inner rim and one soft drop shadow.
// Materials (photo textures, glows, ornaments) go on top of that base.
import {
  bandFillLayer,
  contoursLayer,
  createProject,
  groupLayer,
  fractureLayer,
  growthLayer,
  lineLayer,
  repeatLayer,
  shapeLayer,
  textLayer,
  textureLayer,
} from './defaults';
import { bevel, glow, shadow } from './styles';
import type { Effect, FrameProject, GradientStop, Layer, Paint, StageSettings, TextFont } from './types';
import type { PictureId } from './pictures';
import type { ColourSlot } from './colourSlots';
import type { FrameCategory } from './frameCategories';

export { bandFillLayer, contoursLayer, fractureLayer, growthLayer, lineLayer, repeatLayer, shapeLayer, textLayer, textureLayer, bevel, glow, shadow };
export type { Layer, Paint, Effect, StageSettings };

/** A candidate design shown in the frame review (scripts/frame-maker/candidates). */
export interface Candidate {
  id: string;
  name: string;
  /** One line: what is different about it. */
  pitch: string;
  stage?: Partial<StageSettings>;
  layers: () => Layer[];
  colours?: ColourSlot[];
}

export const solid = (color: string): Paint => ({ kind: 'solid', color });
const stops = (colors: string[], opacity: number[] = []): GradientStop[] =>
  colors.map((color, i) => ({ at: colors.length === 1 ? 0 : i / (colors.length - 1), color, opacity: opacity[i] ?? 1 }));
export const lin = (colors: string[], angle = 45, followLight = false): Paint => ({ kind: 'linear', angle, stops: stops(colors), followLight });
export const across = (colors: string[]): Paint => ({ kind: 'acrossBand', stops: stops(colors) });
export const photo = (picture: PictureId, scale: number, patch: Partial<Extract<Paint, { kind: 'picture' }>> = {}): Paint => ({
  kind: 'picture',
  picture,
  scale,
  angle: 0,
  bend: true,
  tint: null,
  lighting: 0,
  ...patch,
});
export const recolour = (colors: string[], amount = 1): Effect => ({ kind: 'recolour', on: true, stops: stops(colors), amount });
export const blur = (amount: number): Effect => ({ kind: 'blur', on: true, mode: 'soft', amount, keepShape: false });
export const adjust = (patch: Partial<Extract<Effect, { kind: 'adjust' }>>): Effect => ({ kind: 'adjust', on: true, hue: 0, saturation: 0, brightness: 0, contrast: 0, ...patch });

/** The owner's drop shadow, on every frame's bottom layer. */
export const DROP: Effect = shadow({ opacity: 0.6, distance: 0.06, blur: 0.08 });
/** A smaller contact shadow for ornaments sitting on the band. */
export const contact = (opacity = 0.55): Effect => shadow({ opacity, distance: 0.035, blur: 0.04 });

export interface BaseOptions {
  /** Lit colour (top left) and shaded colour (bottom right). */
  light: string;
  dark: string;
  /** Where the pressed-in step starts (0 outside – 1 inside); null for no step. */
  step?: number | null;
  /** Colours for the step, if not the band's reversed. */
  stepLight?: string;
  stepDark?: string;
  crease?: boolean;
  rims?: boolean;
}

/** The owner's base band (FM_Simple), in any two colours. */
export function base(o: BaseOptions): Layer[] {
  const step = o.step === undefined ? 0.55 : o.step;
  const out: Layer[] = [{ ...bandFillLayer(), name: 'Band', paint: lin([o.light, o.dark]), effects: [DROP] }];
  if (step !== null) {
    out.push({ ...bandFillLayer(), name: 'Pressed-in step', from: step, to: 1, paint: lin([o.stepDark ?? o.dark, o.stepLight ?? o.light]) });
    if (o.crease !== false) out.push({ ...lineLayer(), name: 'Crease', at: step, width: 0.03, opacity: 0.55, blend: 'overlay', paint: solid('#190500') });
  }
  if (o.rims !== false) out.push(...rims());
  return out;
}

/** The lit outer rim and shadowed inner rim from the owner's designs. */
export function rims(): Layer[] {
  return [
    {
      ...lineLayer(),
      name: 'Outer rim (lit)',
      at: 0.02,
      width: 0.04,
      blend: 'overlay',
      paint: { kind: 'linear', angle: 45, followLight: true, stops: [{ at: 0, color: '#ebf5ff', opacity: 0.9 }, { at: 0.45, color: '#fff0dc', opacity: 0.15 }, { at: 1, color: '#000000', opacity: 0 }] },
    },
    { ...lineLayer(), name: 'Inner rim (shadow)', at: 0.988, width: 0.024, opacity: 0.6, blend: 'overlay', paint: solid('#0a0200') },
  ];
}

/** The owner's glowing contour lines (FM_GlowingIce / Lava): soft, blurred, glowing rings. */
export function glowLines(colors: string[], glowColor: string, o: { count?: number; from?: number; spacing?: number; width?: number; size?: number; opacity?: number } = {}): Layer {
  return {
    ...contoursLayer(),
    name: 'Glowing lines',
    count: o.count ?? 3,
    from: o.from ?? 0.02,
    spacing: o.spacing ?? 0.48,
    width: o.width ?? 0.07,
    taper: 0,
    opacity: o.opacity ?? 1,
    paint: lin(colors, 45, true),
    effects: [glow({ color: glowColor, opacity: 0.8, size: o.size ?? 0.22 }), blur(0.08)],
  };
}

/** The owner's glowing cracks (FM_GlowingLava): colour-dodged fracture lines with an inner and outer glow. */
export function glowCracks(color: string, inner: string, outer: string, seed = 24305, opacity = 1): Layer {
  return {
    ...fractureLayer(),
    name: 'Glowing cracks',
    kind: 'cracks',
    from: 0.04,
    to: 0.95,
    count: 40,
    length: 4.95,
    branching: 0.985,
    jagged: 0.61,
    width: 0.08,
    color,
    seed,
    opacity,
    blend: 'color-dodge',
    effects: [glow({ inner: true, color: inner, opacity: 1, size: 0.225 }), glow({ color: outer, opacity: 0.3, size: 0.205 })],
  };
}

/** A photo texture laid over the band in a blend mode. */
export function overlay(picture: PictureId, scale: number, blend: Layer['blend'], opacity: number, patch: Partial<Extract<Paint, { kind: 'picture' }>> = {}, from = 0, to = 1): Layer {
  return { ...bandFillLayer(), name: 'Texture', from, to, blend, opacity, paint: photo(picture, scale, patch) };
}

/** The owner's gold (FM_GoldAndRedMarble): green painted metal photo, rounded, recoloured to gold. */
export const GOLD_STOPS = ['#3a2c12', '#8a7444', '#ccb47e', '#f0e4bc', '#fffcf2'];
export const goldPaint = (scale = 2.1): Paint => photo('green-rust', scale, { lighting: 0.5 });
export const goldFx = (size = 0.3, stopsList = GOLD_STOPS): Effect[] => [
  bevel({ profile: 'rounded', size, depth: 1, gloss: 0.5, highlightOpacity: 0.75, shadowOpacity: 0.45, soften: 0.02 }),
  recolour(stopsList),
  shadow({ opacity: 0.5, distance: 0.04, blur: 0.05 }),
];
export const SILVER_STOPS = ['#1e2228', '#5a606a', '#a8aeb8', '#e4e8f0', '#ffffff'];

// ── Built-in frames ─────────────────────────────────────────────────────────

/** Where a frame is listed in Token Maker's picker: one of the broad categories. */
export type BuiltInGroup = FrameCategory;

export interface BuiltInFrame {
  id: string;
  name: string;
  description: string;
  group: BuiltInGroup;
  /** Made from this frame (a drawn frame's preset id or a built-in design's id) and stacked behind it, if any. */
  after?: string;
  colours: ColourSlot[];
  /** The design in its own colours. */
  project: () => FrameProject;
}

export const fromLayers = (name: string, layers: () => Layer[], stage: Partial<StageSettings> = {}) => () => {
  const p = createProject(layers(), name);
  return { ...p, stage: { ...p.stage, ...stage } };
};

export const slot = (id: string, name: string, colour: string, layers: string[]): ColourSlot => ({ id, name, default: colour, layers });


// ── Inscriptions ────────────────────────────────────────────────────────────

/** Words for inscriptions in the fictional alphabets (owner's request): the owner's names and phrases. */
export const INSCRIPTION_WORDS = [
  'TOKEN MAKER',
  'CRYSTAL FROG MAPS',
  'GREYHAWK',
  'SAMMY SMELLS',
  'FORTUNE FAVOURS THE BOLD',
  'ROLL FOR INITIATIVE',
  'THE MAP IS NOT THE TERRITORY',
  'BEWARE THE FROG BENEATH THE CRYSTAL',
  'WHAT IS DRAWN IS REMEMBERED',
  'EVERY HERO NEEDS A FRAME',
];

/** An inscription long enough to go all the way round: the words from `start`, joined by dots, repeated. */
export const inscriptionText = (start = 0, times = 2) => {
  const words = [...INSCRIPTION_WORDS.slice(start), ...INSCRIPTION_WORDS.slice(0, start)];
  return `${words.join(' · ')} · `.repeat(times);
};

/** A text layer running round the band in one of the fonts. */
export function inscription(font: TextFont, fill: string, o: { at?: number; size?: number; spacing?: number; start?: number; name?: string; effects?: Effect[] } = {}): Layer {
  return {
    ...textLayer(),
    name: o.name ?? 'Inscription',
    font,
    text: inscriptionText(o.start ?? 0),
    size: o.size ?? 0.36,
    spacing: o.spacing ?? 0.14,
    at: o.at ?? 0.5,
    fill,
    effects: o.effects ?? [],
  };
}

/** Short words for one-word-per-panel inscriptions. */
const PANEL_WORDS = ['TOKEN', 'MAKER', 'FROG', 'MAPS', 'GREY', 'HAWK', 'SAMMY', 'BOLD', 'HERO', 'ROLL', 'FATE', 'MAP'];

/**
 * One word in each of `count` panels round the band (between plates, or on
 * them), so the text never runs under or over the plates: word i is centred at
 * (i + 0.5) / count of the way round, clockwise from the top (`offset` slides
 * them, as a share of one panel). A group of text layers; effects go on the group.
 */
export function panelWords(font: TextFont, fill: string, o: { count?: number; at?: number; size?: number; spacing?: number; start?: number; offset?: number; name?: string; effects?: Effect[] } = {}): Layer {
  const n = o.count ?? 8;
  return {
    ...groupLayer(Array.from({ length: n }, (_v, i) => ({
      ...textLayer(),
      name: 'Word',
      font,
      text: PANEL_WORDS[((o.start ?? 0) + i) % PANEL_WORDS.length],
      size: o.size ?? 0.36,
      spacing: o.spacing ?? 0.1,
      at: o.at ?? 0.5,
      along: (i + 0.5 + (o.offset ?? 0)) / n,
      align: 'centre' as const,
      fit: false,
      fill,
    }))),
    name: o.name ?? 'Runes',
    effects: o.effects ?? [],
  };
}

// ── More metals ──────────────────────────────────────────────────────────────

export const ROSE_STOPS = ['#3a1a14', '#8a4a3a', '#d8907a', '#f6d0c0', '#fff4ee'];
export const STEEL_STOPS = ['#101418', '#3a4048', '#7a828c', '#c8ced6', '#f4f8fc'];
export const BRONZE_STOPS = ['#1e1206', '#5a3a18', '#a87a3a', '#e0c08a', '#fff0d0'];
/** Polished metal on any shape: gently rounded, glossy, recoloured. */
export const metalFx = (stops: string[], size = 0.35, gloss = 0.7): Effect[] => [
  bevel({ profile: 'rounded', size, depth: 1, gloss, highlightOpacity: 0.75, shadowOpacity: 0.45, soften: 0.02 }),
  recolour(stops),
  shadow({ opacity: 0.5, distance: 0.04, blur: 0.05 }),
];
/** A warmer, deeper gold than the Essentials' champagne gold. */
export const WARM_GOLD = ['#241402', '#6e4a0e', '#c8952e', '#f4d27a', '#fff8e0'];

// ── Shading with gradient bands (owner's preference) ─────────────────────────

export interface BandShading {
  /** Where the pressed-in step starts (0 outside – 1 inside); null for one band. */
  step?: number | null;
  /** How strong the shading bands are (their opacity). */
  strength?: number;
}

const SURFACE_TYPES = new Set(['bandFill', 'texture', 'cells', 'fracture']);
const RIM_NAMES = new Set(['Outer rim (lit)', 'Inner rim (shadow)', 'Crease']);
const coversBand = (l: Layer) => l.type === 'bandFill' && l.from <= 0.02 && l.to >= 0.98;

/**
 * The owner's twin-band shading instead of a bevel over the whole band: the
 * material's full-band bevels come off, and a lit-to-shaded gradient band
 * (and a reversed one on the pressed-in step) shade it through the overlay
 * blend, with a crease and the lit and shadowed rims. Ornaments drawn after
 * the band's surface keep their own bevels and sit on top.
 */
export function bandShading(layers: Layer[], o: BandShading = {}): Layer[] {
  const step = o.step === undefined ? 0.55 : o.step;
  const strength = o.strength ?? 0.7;
  const kept = layers
    .filter((l) => !RIM_NAMES.has(l.name))
    .map((l) => (coversBand(l) ? { ...l, effects: l.effects.filter((e) => e.kind !== 'bevel') } : l));
  let at = 0;
  while (at < kept.length && SURFACE_TYPES.has(kept[at].type)) at++;
  const shading: Layer[] = [{ ...bandFillLayer(), name: 'Shading', blend: 'overlay', opacity: strength, paint: lin(['#ffffff', '#000000']) }];
  if (step !== null) {
    shading.push({ ...bandFillLayer(), name: 'Pressed-in shading', from: step, to: 1, blend: 'overlay', opacity: strength, paint: lin(['#000000', '#ffffff']) });
    shading.push({ ...lineLayer(), name: 'Crease', at: step, width: 0.03, opacity: 0.55, blend: 'overlay', paint: solid('#190500') });
  }
  return [...kept.slice(0, at), ...shading, ...rims(), ...kept.slice(at)];
}

