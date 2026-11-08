// Token Maker's ready-made frames, as Frame Maker designs: the owner's
// Essentials, the new versions of Token Maker's frames chosen in the frame
// review before launch, and the old picture frames
// (pictureFrameTemplates.ts). Token Maker lists them in its frame picker,
// with a colour picker for each of a design's colour slots; Frame Maker
// offers them in New, ready to change.

import type { ColourSlot } from './colourSlots';
import { CRAFTED_TEMPLATES } from './craftedTemplates';
import { LAYERED_TEMPLATES } from './defaults';
import { THEMED_TEMPLATES } from './themedTemplates';
import { ESSENTIALS_DATA } from './essentialsData';
import { FRAME_VERSIONS } from './frameVersions';
import { LIBRARY_FRAMES } from './libraryFrames';
import { isRemade, remadeFrame, reviewFramesBesides } from './reviewFrames';
import { fromLayers, slot, type BuiltInFrame } from './houseStyle';
import { parseProject } from './migrate';
import { categoryOf, categoryRank, FRAME_CATEGORIES, type FrameCategory } from './frameCategories';
import type { Layer, StageSettings } from './types';
import { PICTURE_FRAME_TEMPLATES } from './pictureFrameTemplates';

// ── Essentials: the owner's designs ─────────────────────────────────────────

const ESSENTIAL_INFO: Record<string, { description: string; colours: ColourSlot[] }> = {
  simple: { description: 'A clean two-tone band with a pressed-in step.', colours: [slot('band', 'Frame colour', '#ff525a', ['Band', 'Pressed-in step'])] },
  'dual-tone': {
    description: 'The Simple band with a different colour on each step.',
    colours: [slot('outer', 'Outer colour', '#fd3e30', ['Band']), slot('inner', 'Inner colour', '#ffb833', ['Pressed-in step'])],
  },
  'small-gradient': { description: 'A silver band washed with a three-colour gradient.', colours: [slot('band', 'Frame colour', '#00ffe1', ['Band fill'])] },
  'clean-gradient': {
    description: 'A glowing gradient band with veined marbling in its shade.',
    colours: [slot('band', 'Frame colour', '#ff6c08', ['Band', 'Pressed-in step', 'Veins and marbling'])],
  },
  rainbow: { description: 'Every colour of the rainbow round a silver band.', colours: [] },
  marble: {
    description: 'Pale onyx marble with a soft coloured glow.',
    colours: [slot('band', 'Marble colour', '#e9ddde', ['Default']), slot('glow', 'Glow colour', '#fa1ec0', ['Contours'])],
  },
  'gold-red-marble': {
    description: 'Red marble set in two rounded gold rims, with gold tendrils.',
    colours: [slot('marble', 'Marble colour', '#c74829', ['Blue onyx']), slot('gold', 'Gold colour', '#ccb47e', ['Outer gold', 'Inner gold', 'Growth', 'Growth copy'])],
  },
  'glowing-ice': {
    description: 'A ring of cracked ice glowing from within.',
    colours: [slot('glow', 'Glow colour', '#4db2ff', ['Band copy', 'Band copy copy', 'Cracks', 'Cracks copy', 'Contours copy'])],
  },
  'glowing-lava': {
    description: 'Molten lava with glowing cracks and a hot glow.',
    colours: [slot('glow', 'Glow colour', '#fb6704', ['Band copy', 'Cracks', 'Cracks copy', 'Contours'])],
  },
};

const ESSENTIALS: BuiltInFrame[] = ESSENTIALS_DATA.map((d) => ({
  id: d.id,
  name: d.name,
  group: categoryOf(d.id),
  ...ESSENTIAL_INFO[d.id],
  project: () => {
    const read = parseProject(d.project);
    if (!read.ok) throw new Error(`Built-in frame ${d.id}: ${read.error}`);
    return read.project;
  },
}));

// ── The kept originals of the other built-in designs ────────────────────────
// The old picture frames, and Frame Maker's Crafted borders, Layered and
// Themed designs: the ones the owner kept in the frame review (the rest were
// removed from their template lists), each filed under its category.

const fromTemplate = (t: { id: string; name: string; description: string; make: () => Layer[]; stage?: Partial<StageSettings> }): BuiltInFrame => ({
  id: t.id,
  name: t.name,
  description: t.description,
  group: categoryOf(t.id),
  colours: [],
  project: fromLayers(t.name, t.make, t.stage ?? {}),
});
const ORIGINALS: BuiltInFrame[] = [...PICTURE_FRAME_TEMPLATES, ...CRAFTED_TEMPLATES, ...LAYERED_TEMPLATES, ...THEMED_TEMPLATES].map(fromTemplate);

/** Every built-in frame's band thickness, per square: 7% of a square, the same for all of them (owner's request). */
export const BUILT_IN_THICKNESS = 0.14;
const standardBand = (f: BuiltInFrame): BuiltInFrame => ({
  ...f,
  project: () => {
    const p = f.project();
    return { ...p, stage: { ...p.stage, thickness: BUILT_IN_THICKNESS } };
  },
});

/** Every built-in frame: the Essentials, the versions of the drawn frames and the other designs, and the kept originals, each on a band 7% of a square thick. */
// Frames remade in the frame reviews (version 13, reviewFrames.ts) are drawn from the chosen projects, in their old places; new ones go after.
const LISTED = [...ESSENTIALS, ...FRAME_VERSIONS, ...LIBRARY_FRAMES, ...ORIGINALS].map((f) => (isRemade(f.id) ? remadeFrame(f) : f));
const REVIEWED = reviewFramesBesides(new Set(LISTED.map((f) => f.id)));
export const BUILT_IN_FRAMES: readonly BuiltInFrame[] = [...LISTED, ...REVIEWED].map(standardBand);
export type { BuiltInFrame, BuiltInGroup } from './houseStyle';
export const builtInFrameById = (id: string) => BUILT_IN_FRAMES.find((f) => f.id === id);

/** The built-in frames by category, in order. Each is filed on its own; within a category, frames made from the same one stay next to each other. */
export function builtInFramesByCategory(): { category: FrameCategory; frames: BuiltInFrame[] }[] {
  const stack = (f: BuiltInFrame) => f.after ?? f.id;
  const first = new Map<string, number>();
  BUILT_IN_FRAMES.forEach((f, i) => first.has(stack(f)) || first.set(stack(f), i));
  const sorted = [...BUILT_IN_FRAMES].sort(
    (a, b) => categoryRank(a.group) - categoryRank(b.group) || first.get(stack(a))! - first.get(stack(b))! || Number(!!a.after) - Number(!!b.after),
  );
  return FRAME_CATEGORIES.map((category) => ({ category, frames: sorted.filter((f) => f.group === category) })).filter((g) => g.frames.length > 0);
}
