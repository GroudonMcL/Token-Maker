// The frames chosen in the frame reviews of version 13 (owner's picks):
// remakes of low-ranked frames and existing frames enhanced with the
// library pictures, which take the place of the frames they remake (same
// id), and new frames. Their projects are in reviewFramesData.ts.

import type { ColourSlot } from './colourSlots';
import { categoryOf } from './frameCategories';
import { slot, type BuiltInFrame } from './houseStyle';
import { parseProject } from './migrate';
import type { FrameProject } from './types';
import { REVIEW_FRAMES_DATA } from './reviewFramesData';

const DATA = new Map(REVIEW_FRAMES_DATA.map((d) => [d.id, d.project]));

/** A chosen frame's project, as saved. */
export function reviewProject(id: string): FrameProject {
  const read = parseProject(DATA.get(id));
  if (!read.ok) throw new Error(`Built-in frame ${id}: ${read.error}`);
  return read.project;
}
/** Has the review remade this frame? (Kept originals with this id draw the remake.) */
export const isRemade = (id: string) => DATA.has(id);

interface Info {
  name: string;
  description: string;
  after?: string;
  colours: ColourSlot[];
}

/** Remakes of frame versions (frameVersions.ts no longer has these ids) and new frames. Kept originals that were remade (guild-gold, celestial-halo) keep their own names in their template lists. */
const INFO: Record<string, Info> = {
  'necropolis-gilded': {
    name: 'Gilded tomb',
    description: 'Black stone with a gold chain hung with gilded skulls, for a lich’s sepulchre.',
    after: 'necropolis',
    colours: [slot('gold', 'Gold colour', '#d8a838', ['Chain', 'Skulls'])],
  },
  'paladin-crowns': {
    name: 'Royal crowns',
    description: 'Royal blue enamel between gold rims, with a gold imperial crown at each corner.',
    after: 'paladin',
    colours: [slot('enamel', 'Enamel colour', '#1e3a8a', ['Enamel']), slot('gold', 'Gold colour', '#e0c070', ['Outer gold', 'Inner gold', 'Crowns'])],
  },
  'autumn-leaves-maple': {
    name: 'Autumn oak',
    description: 'A warm wooden band with a dark twig and a garland of red and gold oak sprigs.',
    after: 'autumn-leaves',
    colours: [slot('wood', 'Wood colour', '#8a4a1e', ['Band', 'Pressed-in step']), slot('leaves', 'Leaf colour', '#d06a1a', ['Oak (red)', 'Oak (gold)'])],
  },
  'riveted-plates-bulwark': {
    name: 'Dwarven bulwark',
    description: 'Polished bronze plates on a gunmetal ring, each with a ruby boss between gold rivets.',
    after: 'riveted-plates',
    colours: [slot('bronze', 'Bronze colour', '#c87a30', ['Plate ring']), slot('gems', 'Gem colour', '#c0101a', ['Bosses'])],
  },
  'riveted-plates-forge-seams': {
    name: 'Forge seams',
    description: 'Blued-iron plates with molten light glowing from every seam and a hot inner rim.',
    after: 'riveted-plates',
    colours: [slot('iron', 'Iron colour', '#5a6474', ['Plate ring']), slot('glow', 'Glow colour', '#ff6a10', ['Molten', 'Seam glow', 'Hot rim'])],
  },
  'rune-plates-bronze': {
    name: 'Bronze rune plates',
    description: 'Polished bronze plates with runes inlaid in dark enamel.',
    after: 'rune-plates',
    colours: [slot('bronze', 'Bronze colour', '#c07428', ['Plate ring'])],
  },
  'rune-plates-stone': {
    name: 'Standing stones',
    description: 'Weathered grey stone slabs with runes glowing teal, over a dark mossy ring.',
    after: 'rune-plates',
    colours: [slot('glow', 'Rune colour', '#40e0c0', ['Runes'])],
  },
  'cobblestone-stone': {
    name: 'Stone cobbles',
    description: 'Rounded cobbles of real stone set in dark mortar, lit from the top left.',
    colours: [slot('stone', 'Stone colour', '#b09878', ['Cobbles'])],
  },
  'glowing-ice-snowflake': {
    name: 'Snowflake ice',
    description: 'Glowing ice with frost growing off its rim and a big snowflake at each corner.',
    after: 'glowing-ice',
    colours: [slot('glow', 'Glow colour', '#4db2ff', ['Band copy', 'Band copy copy', 'Cracks', 'Cracks copy', 'Contours copy', 'Snowflakes', 'Rime'])],
  },
  'cracked-earth': {
    name: 'Cracked earth',
    description: 'Sun-baked clay split all round by deep cracks.',
    colours: [slot('earth', 'Earth colour', '#d8a066', ['Default'])],
  },
  'ember-stone': {
    name: 'Ember stone',
    description: 'Dark weathered stone split by glowing molten cracks.',
    colours: [slot('stone', 'Stone colour', '#7a6e68', ['Default']), slot('glow', 'Glow colour', '#ff7a1a', ['Molten cracks', 'Contours'])],
  },
  'flame-wreath': {
    name: 'Flame wreath',
    description: 'A charred stone band wreathed in flames.',
    colours: [slot('band', 'Band colour', '#7a2a12', ['Default']), slot('flame', 'Flame colour', '#ff6a10', ['Flames (back)', 'Flames', 'Contours'])],
  },
  starlit: {
    name: 'Starlit',
    description: 'Night-violet stone with glowing stars and sparkles at the corners.',
    colours: [slot('band', 'Band colour', '#5a50d0', ['Default']), slot('glow', 'Star colour', '#e8dcff', ['Contours', 'Twinkles', 'Sparkles'])],
  },
  'celtic-knotwork': {
    name: 'Celtic knotwork',
    description: 'An emerald band with bevelled gold knotwork panels.',
    colours: [slot('band', 'Band colour', '#2fb070', ['Band', 'Pressed-in step']), slot('gold', 'Knot colour', '#e8c060', ['Knotwork'])],
  },
  'victors-laurel': {
    name: 'Victor’s laurel',
    description: 'A royal blue band wrapped in a garland of gold laurel sprigs.',
    colours: [slot('band', 'Band colour', '#3a6ad8', ['Band', 'Pressed-in step']), slot('gold', 'Laurel colour', '#e0c070', ['Laurel'])],
  },
};

export const REVIEW_FRAMES: BuiltInFrame[] = Object.entries(INFO).map(([id, info]) => ({
  id,
  ...info,
  group: categoryOf(id),
  project: () => ({ ...reviewProject(id), name: info.name }),
}));
