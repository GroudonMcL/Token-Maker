// Frames made with the library pictures (version 13, owner's picks from the
// frame review): the roses used by the rose frames in frameVersions.ts, and
// stone frames built like the Marble essential with the new stone pictures.

import type { ColourSlot } from './colourSlots';
import { repeatLayer } from './defaults';
import { NEW_EFFECT } from './effectDefaults';
import { ESSENTIALS_DATA } from './essentialsData';
import { slot, type BuiltInFrame } from './houseStyle';
import { parseProject } from './migrate';
import { categoryOf } from './frameCategories';
import type { Effect, FrameProject, Layer, RepeatLayer } from './types';

type Shadow = Extract<Effect, { kind: 'shadow' }>;
type Bevel = Extract<Effect, { kind: 'bevel' }>;
/** A short soft shadow, so a picture sits on what is under it. */
export const pictureContact = (opacity: number): Effect => ({ ...(NEW_EFFECT.shadow() as Shadow), opacity, distance: 0.03, blur: 0.05 });

/** Library pictures repeated round the band, in their own colours, tops pointing out. */
export const pictureRepeat = (name: string, picture: string, o: Partial<RepeatLayer>): Layer => ({
  ...repeatLayer(),
  name,
  element: 'picture',
  picture,
  pictureTint: false,
  snapToCorners: false,
  raised: false,
  shaded: false,
  orient: 'along',
  ...o,
});

/** Rose briar: seven shaded roses darkened to the old spirals' red (#a01828), with a soft bevel for depth. */
export const briarRoses = (): Layer =>
  pictureRepeat('Roses', 'deco-rose-shaded', {
    count: 7,
    at: 0.5,
    size: 1.3,
    jitterAngle: 18,
    seed: 4,
    effects: [
      { kind: 'adjust', on: true, hue: -10, saturation: -0.2, brightness: -0.42, contrast: 0.15 },
      { ...(NEW_EFFECT.bevel() as Bevel), size: 0.12, depth: 0.7, gloss: 0.5, highlightOpacity: 0.55, shadowOpacity: 0.5 },
      pictureContact(0.6),
    ],
  });

// ── Stone frames: the Marble essential with a stone picture ─────────────────

function marble(): FrameProject {
  const read = parseProject(ESSENTIALS_DATA.find((d) => d.id === 'marble')!.project);
  if (!read.ok) throw new Error(`Marble: ${read.error}`);
  return read.project;
}

/** The layer called `name` (anywhere) changed by `change`. */
function changeLayer(layers: Layer[], name: string, change: (l: Layer) => Layer): Layer[] {
  return layers.map((l) => (l.name === name ? change(l) : l.type === 'group' ? { ...l, children: changeLayer(l.children, name, change) } : l));
}

interface StoneLook {
  picture: string;
  light: string;
  dark: string;
  opacity: number;
  blend: 'overlay' | 'hard-light';
  scale: number;
}

function stoneProject(name: string, s: StoneLook): FrameProject {
  const p = marble();
  let layers = changeLayer(p.layers, 'Texture', (l) =>
    l.type === 'bandFill' ? { ...l, name: 'Stone', opacity: s.opacity, blend: s.blend, paint: { kind: 'picture', picture: s.picture, scale: s.scale, angle: 20, bend: true, tint: null, lighting: 0.2 } } : l,
  );
  // The band's gradients go from the stone's light to its dark (Marble's pink-white and deep red).
  layers = changeLayer(layers, 'Default', (g) =>
    g.type === 'group'
      ? {
          ...g,
          name: 'Band',
          children: g.children.map((c) =>
            c.type === 'bandFill' && c.paint.kind === 'linear' ? { ...c, paint: { ...c.paint, stops: c.paint.stops.map((st) => ({ ...st, color: st.color === '#e9ddde' ? s.light : s.dark })) } } : c,
          ),
        }
      : g,
  );
  return { ...p, name, stage: { ...p.stage, ambient: '#8a8a9a', ambientStrength: 0.4 }, layers };
}

const stone = (id: string, name: string, description: string, look: StoneLook, colours: ColourSlot[]): BuiltInFrame => ({
  id,
  name,
  description,
  group: categoryOf(id),
  colours,
  project: () => stoneProject(name, look),
});

/** The stone frames (owner's picks), filed under Stone & Earth. */
export const LIBRARY_FRAMES: BuiltInFrame[] = [
  stone(
    'veined-stone',
    'Veined stone',
    'Pale grey stone with dark veins and fine cracks, built like Marble.',
    { picture: 'fx-stone-marble', light: '#ecebe6', dark: '#2a2a30', opacity: 0.85, blend: 'overlay', scale: 7 },
    [slot('stone', 'Stone colour', '#ecebe6', ['Band'])],
  ),
  stone(
    'weathered-stone',
    'Weathered stone',
    'Pitted, weathered stone over a warm grey band.',
    { picture: 'fx-stone-weathered', light: '#d8d2c4', dark: '#2a2620', opacity: 1, blend: 'hard-light', scale: 6 },
    [slot('stone', 'Stone colour', '#d8d2c4', ['Band'])],
  ),
  stone(
    'grey-stone',
    'Grey stone',
    'Fine-grained grey stone, like dressed granite, over a cool grey band.',
    { picture: 'fx-stone', light: '#c8ccd2', dark: '#22262c', opacity: 1, blend: 'hard-light', scale: 5 },
    [slot('stone', 'Stone colour', '#c8ccd2', ['Band'])],
  ),
];
