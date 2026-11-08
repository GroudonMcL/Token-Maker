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
  /** Required for new frames; a remake keeps the name of the frame it remakes unless given. */
  name?: string;
  description: string;
  after?: string;
  colours?: ColourSlot[];
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
  // ── Batch 4 (owner's picks) ──
  'grim-iron-crowned-skulls': {
    description: 'Dark chainmail iron with crowned bone skulls, slightly embossed.',
    colours: [slot('gold', 'Crown colour', '#e0c070', ['Crowns'])],
  },
  'frostbound-snowfall': {
    description: 'A starry midnight-blue band with crystal snowflakes glowing faintly.',
    colours: [slot('band', 'Band colour', '#2a5a9a', ['Band']), slot('glow', 'Snowflake colour', '#cfe8ff', ['Snowflakes', 'Snow'])],
  },
  'gilded-filigree': {
    name: 'Gilded scrollwork',
    description: 'A polished gold band carrying twelve raised gold scrollwork ornaments.',
    colours: [slot('gold', 'Gold colour', '#f0d080', ['Scrollwork', 'Outer bead line', 'Inner bead line'])],
  },
  'royal-crimson': {
    description: 'Crimson between gold edges, with gold fleurs-de-lis, faceted sapphires in gold bezels and a jewelled gold crown.',
    colours: [slot('band', 'Band colour', '#c02a3a', ['Band']), slot('gems', 'Gem colour', '#3a6ae8', ['Gems'])],
  },
  'royal-ermine': {
    description: 'White ermine with black tails between gold edges, under a jewelled imperial crown.',
    colours: [slot('gold', 'Gold colour', '#d8a838', ['Edges'])],
  },
  'riveted-plates-ordered-curved': {
    name: 'Riveted steel',
    description: 'Two staggered rows of curved blued-steel plates over a dark ring, with a brass rivet inside each plate.',
    colours: [slot('steel', 'Steel colour', '#6a7c96', ['Outer plates', 'Inner plates']), slot('rivets', 'Rivet colour', '#d8a838', ['Rivets'])],
  },
  'grim-iron-bone-ring': {
    name: 'Grim iron',
    description: 'Hammered iron with two rows of steel rivets and six embossed bone skulls.',
    colours: [slot('iron', 'Iron colour', '#6a707c', ['Band', 'Pressed-in step'])],
  },
  'nautical-pirate': {
    name: 'Pirate treasure',
    description: 'Oak planks between gold bands, a ring of gold doubloons, gems set in gold studs and a skull and crossbones.',
    colours: [slot('gold', 'Gold colour', '#d8a838', ['Doubloons', 'Gem studs'])],
  },
  'warlock-sigils': {
    name: 'Warlock seals',
    description: 'Purple with violet smoke, and six glowing rune sigils in dark sunken seals.',
    colours: [slot('band', 'Band colour', '#6a2a9a', ['Band', 'Pressed-in step']), slot('glow', 'Sigil colour', '#c070ff', ['Smoke', 'Sigils', 'Seal rings'])],
  },
  'storm-ring-thunderhead': {
    description: 'A clean storm-blue band with drifting clouds and real glowing lightning.',
    colours: [slot('band', 'Band colour', '#5a6c94', ['Band', 'Pressed-in step']), slot('glow', 'Lightning colour', '#9ac0ff', ['Lightning'])],
  },
  'storm-ring-storm-clouds': {
    name: 'Storm clouds',
    description: 'Thunderhead with its swirling storm-cloud texture over the whole band, and real glowing lightning.',
    after: 'storm-ring',
    colours: [slot('band', 'Band colour', '#56688c', ['Band', 'Pressed-in step']), slot('glow', 'Lightning colour', '#9ac0ff', ['Lightning'])],
  },
  clockwork: {
    description: 'A polished brass band with a sunken well of meshing brass and steel gears, each with a ruby bearing.',
    colours: [slot('brass', 'Brass colour', '#e0a840', ['Band', 'Pressed-in step', 'Brass gears']), slot('gems', 'Bearing colour', '#d01828', ['Ruby bearings'])],
  },
  'warlock-tendrils': {
    name: 'Eldritch tendrils',
    description: 'Purple with violet smoke and dark tendrils, and four glowing eldritch eyes set in iron wells.',
    colours: [slot('band', 'Band colour', '#5a2088', ['Band', 'Pressed-in step']), slot('glow', 'Glow colour', '#c080ff', ['Smoke', 'Eyes'])],
  },
  'filigree-border': {
    name: 'Filigree enamel',
    description: 'Ruby enamel between polished gold rails, with gold scrollwork filigree and pearls in gold bezels.',
    colours: [slot('enamel', 'Enamel colour', '#d0283a', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#e0b050', ['Outer gold', 'Inner gold', 'Filigree'])],
  },
  'gothic-thorns': {
    description: 'Black stone with glowing blood cracks, a black briar, steel spikes and red jewels at the corners.',
    colours: [slot('glow', 'Glow colour', '#ff3040', ['Bleeding cracks', 'Blood drops', 'Blood glow'])],
  },
  'clockwork-watchwork': {
    name: 'Watchwork dial',
    description: 'A watch dial: deep blue enamel between polished silver bezels, with gold Roman numerals and minute ticks.',
    colours: [slot('enamel', 'Dial colour', '#2a4a8a', ['Band', 'Pressed-in step']), slot('gold', 'Numeral colour', '#f4e2a8', ['Numerals', 'Minute ticks'])],
  },
  'thorns-silverwork': {
    name: 'Silver briar',
    description: 'A polished silver briar with claw-set amethysts on a dark plum band.',
    colours: [slot('band', 'Band colour', '#3a3048', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#8a2ad0', ['Amethysts', 'Small amethysts'])],
  },
  'guild-silver-sapphire': {
    name: 'Guild silver',
    description: 'A bright silver band with claw-set sapphires between silver scrollwork.',
    colours: [slot('gems', 'Gem colour', '#1840d0', ['Sapphires'])],
  },
  'necropolis-bone': {
    name: 'Necropolis',
    description: 'Ivory bone with a sunken blood-red vein, embossed skulls in dark niches and bone-set garnets.',
    colours: [slot('glow', 'Vein colour', '#c01010', ['Blood vein', 'Garnets'])],
  },
  'starship-gunmetal': {
    description: 'Teal gunmetal hull plates with cyan light glowing from every seam, running lights and bolts.',
    colours: [slot('glow', 'Light colour', '#20d0f0', ['Core', 'Seam glow', 'Inner light', 'Running lights'])],
  },
  'shield-rim-viking': {
    description: 'Red-painted planks inside a hammered iron rim full of rivets, with gold Celtic knot crests.',
    colours: [slot('paint', 'Paint colour', '#d83a26', ['Paint']), slot('gold', 'Crest colour', '#e8c060', ['Knotwork'])],
  },
  'paladin-oath': {
    name: 'Paladin’s oath',
    description: 'Bright silver with a royal-blue enamel channel, glowing gold crosses and pearls (remakes the drawn Paladin).',
    colours: [slot('enamel', 'Enamel colour', '#1a3490', ['Enamel']), slot('gold', 'Cross colour', '#e8b840', ['Crosses', 'Gold edge'])],
  },
  'warlock-watchers': {
    name: 'Warlock’s watchers',
    description: 'Saturated purple with necrotic smoke, a violet seam and six watching eyes in sunken sockets (remakes the drawn Warlock).',
    colours: [slot('band', 'Band colour', '#7a3aa8', ['Band', 'Pressed-in step']), slot('glow', 'Eye colour', '#c8e020', ['Eyes'])],
  },
  'fighter-plates': {
    name: 'Fighter’s plate',
    description: 'Curved polished steel plates over dark iron, each with rivets and a domed boss (remakes the drawn Fighter).',
    colours: [slot('steel', 'Steel colour', '#7a8698', ['Plates'])],
  },
  'druid-oak': {
    name: 'Druid’s oak',
    description: 'A lit wooden band with bark texture and eight oak sprigs with acorns (remakes the drawn Druid).',
    colours: [slot('wood', 'Wood colour', '#9a6a3a', ['Band', 'Pressed-in step'])],
  },
  'druid-vine': {
    name: 'Druid’s vine',
    description: 'Olive wood with a leafy green vine winding round the middle, as in the drawn Druid.',
    after: 'druid-oak',
    colours: [slot('leaves', 'Leaf colour', '#3a5a1c', ['Vine', 'Stem'])],
  },
  'mossy-ruin': {
    name: 'Mossy ruin',
    description: 'Grey-green granite with ivy creeping round its edges.',
    colours: [slot('stone', 'Stone colour', '#8a9478', ['Default'])],
  },
  'dragon-crest': {
    name: 'Dragon crest',
    description: 'A dark red band with gold dragon masks and gold scrollwork between them.',
    colours: [slot('band', 'Band colour', '#c0242e', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#f0c860', ['Gold scrolls', 'Dragon masks'])],
  },
  ossuary: {
    name: 'Ossuary',
    description: 'Dark violet with embossed skulls and bone beads, each set in a gold bezel round a sunken well.',
    colours: [slot('band', 'Band colour', '#5e4c74', ['Band', 'Pressed-in step']), slot('gold', 'Bezel colour', '#d8a838', ['Bead rings', 'Skull bezels'])],
  },
  'rose-cameo': {
    name: 'Rose cameo',
    description: 'Crimson with pale rose cameos, each set in a gold bezel.',
    colours: [slot('band', 'Band colour', '#e2384a', ['Band', 'Pressed-in step']), slot('gold', 'Bezel colour', '#d8a838', ['Cameo bezels'])],
  },
  'tudor-rose': {
    name: 'Tudor rose',
    description: 'Deep green with heraldic Tudor roses and small gold stars.',
    colours: [slot('band', 'Band colour', '#3f9a4c', ['Band', 'Pressed-in step']), slot('gold', 'Star colour', '#e0c070', ['Stars'])],
  },
  // ── Batch 5 (owner's picks) ──
  'thorns-silverwork-bare': {
    name: 'Silver briar, bare',
    description: 'The polished silver briar with claw-set amethysts on its own, with no band behind it.',
    after: 'thorns-silverwork',
    colours: [slot('gems', 'Gem colour', '#8a2ad0', ['Amethysts', 'Small amethysts'])],
  },
  'cleric-dawn-pearls': {
    name: 'Dawn pearls',
    description: 'The dawn band with four lustrous pearls in gold bezels, each with a soft sunburst behind it.',
    after: 'cleric-dawn',
    colours: [slot('band', 'Band colour', '#d0607a', ['Band', 'Pressed-in step'])],
  },
  'tidal-ring': {
    description: 'Deep water with a swell and foam crests that stay offset all the way round.',
    colours: [slot('sea', 'Sea colour', '#1f8ab0', ['Deep water', 'Swell'])],
  },
  'gilded-laurel-enamel': {
    description: 'Green enamel between two rows of polished gold laurel sprigs.',
    colours: [slot('band', 'Enamel colour', '#2e8a58', ['Band', 'Pressed-in step']), slot('gold', 'Laurel colour', '#e0c070', ['Outer laurel', 'Inner laurel'])],
  },
  'royal-inscription-gold': {
    description: 'A gold band with an inscription and faceted rubies in gold bezels.',
    colours: [slot('gems', 'Gem colour', '#e01830', ['Gems'])],
  },
  'royal-purple-silver': {
    description: 'Royal purple between silver edges, with silver fleurs-de-lis, faceted amethysts in silver bezels and a silver imperial crown.',
    colours: [slot('band', 'Band colour', '#6a2a9a', ['Band']), slot('gems', 'Gem colour', '#b040f0', ['Gems'])],
  },
  'bard-moon-verse': {
    name: 'Moonlit verse',
    description: 'Midnight blue between gold rails, with twinkling stars, gold notes and a glowing crescent moon in a gold medallion.',
    colours: [slot('band', 'Band colour', '#2a3a7a', ['Band', 'Pressed-in step']), slot('gold', 'Gold colour', '#e0b050', ['Gold rail', 'Notes', 'Moon bezel'])],
  },
  'artificer-brass': {
    name: 'Artificer’s brass',
    description: 'Polished brass with a gear-toothed inner edge and brass cogs with ruby hubs (remakes the drawn Artificer).',
    colours: [slot('brass', 'Brass colour', '#c8902e', ['Band', 'Pressed-in step', 'Gear teeth', 'Gears', 'Rivets']), slot('gems', 'Hub colour', '#c0101a', ['Hubs'])],
  },
  'riveted-plates-forge-seams-curved': {
    name: 'Burning seams',
    description: 'Hammered iron plates over a white-hot core, with fire glowing out of every seam.',
    colours: [slot('glow', 'Fire colour', '#ff8a1a', ['Core', 'Seam fire'])],
  },
  'riveted-plates-ordered': {
    name: 'Blued steel plates',
    description: 'Twelve curved, polished blued-steel plates over dark iron, each with four brass rivets.',
    colours: [slot('steel', 'Steel colour', '#4a6080', ['Plates']), slot('rivets', 'Rivet colour', '#d0a050', ['Rivets'])],
  },
  rope: {
    description: 'A warm twisted rope with brass whippings.',
    colours: [slot('rope', 'Rope colour', '#b08850', ['Rope', 'Twist']), slot('brass', 'Whipping colour', '#c89040', ['Whippings'])],
  },
  'barbarian-club-oak': {
    name: 'Iron-bound oak',
    description: 'Warm grained oak with hammered iron bands and bright domed steel studs.',
    after: 'barbarian-club',
    colours: [slot('wood', 'Wood colour', '#9a6a3a', ['Band', 'Pressed-in step'])],
  },
  'sorcerer-scales': {
    name: 'Dragon-blooded',
    description: 'Crimson with glossy dragon scales between gold rails and fiery red jewels.',
    after: 'sorcerer',
    colours: [slot('band', 'Scale colour', '#c83020', ['Band', 'Pressed-in step', 'Dragon scales']), slot('gems', 'Jewel colour', '#ff3010', ['Orbs'])],
  },
  'storm-ring-arcane-clouds': {
    name: 'Arcane thunder',
    description: 'A violet storm band with soft clouds and real glowing lightning.',
    after: 'storm-ring',
    colours: [slot('band', 'Band colour', '#7a4ab0', ['Band', 'Pressed-in step']), slot('glow', 'Lightning colour', '#d0a0ff', ['Lightning'])],
  },
  'storm-ring-blood-clouds': {
    name: 'Blood thunder',
    description: 'A crimson storm band with dark clouds and real red-glowing lightning.',
    after: 'storm-ring',
    colours: [slot('band', 'Band colour', '#b02a24', ['Band', 'Pressed-in step']), slot('glow', 'Lightning colour', '#ff8070', ['Lightning'])],
  },
  'warlock-void-onyx': {
    name: 'Void onyx',
    description: 'Black onyx with violet light breaking through glowing cracks, a glowing seam and faint stars.',
    after: 'warlock-void',
    colours: [slot('glow', 'Glow colour', '#e0a8ff', ['Glowing cracks', 'Void seam', 'Stars'])],
  },
  'amethyst-geode-violet': {
    name: 'Amethyst agate',
    description: 'Deep violet to lilac agate banding with a gold outer rim and a crystal lining.',
    after: 'amethyst-geode',
    colours: [slot('gem', 'Agate colour', '#6a30b0', ['Agate', 'Crystal lining'])],
  },
  // ── Batch 6 (owner's picks) ──
  'royal-blue': {
    description: 'Royal blue between gold edges, with gold fleurs-de-lis, faceted rubies in gold bezels and a gold imperial crown.',
    colours: [slot('band', 'Band colour', '#2a5ac0', ['Band']), slot('gems', 'Gem colour', '#e01830', ['Gems'])],
  },
  'artificer-pipes': {
    name: 'Artificer conduit',
    description: 'Two polished copper pipes either side of a glowing blue energy line, clamped with brass collars and steel bolts.',
    colours: [slot('glow', 'Energy colour', '#30b0ff', ['Energy']), slot('copper', 'Pipe colour', '#b8643a', ['Pipe'])],
  },
  'storm-wisps': {
    name: 'Blue storm',
    description: 'A clean deep-blue storm band with drifting clouds and real glowing lightning.',
    colours: [slot('band', 'Band colour', '#2a64b8', ['Band', 'Pressed-in step']), slot('glow', 'Lightning colour', '#a0c8ff', ['Lightning'])],
  },
  'thorns-bark-bramble': {
    name: 'Bramble',
    description: 'Warm bark with one thick glossy bramble stem winding round it, pale thorns and blackberries.',
    colours: [slot('wood', 'Bark colour', '#9a6a3e', ['Band', 'Pressed-in step']), slot('berries', 'Berry colour', '#3a0a40', ['Berries'])],
  },
  'celtic-knot-silver': {
    name: 'Celtic silver',
    description: 'A polished silver knot on deep emerald enamel.',
    colours: [slot('band', 'Enamel colour', '#1a8a5a', ['Band', 'Pressed-in step'])],
  },
  'druid-circle-runes': {
    name: 'Druid standing stones',
    description: 'Twelve chiselled, weathered standing stones on moss, each carved with a glowing green rune.',
    colours: [slot('glow', 'Rune colour', '#60e060', ['Runes'])],
  },
  'glowing-runes-runic': {
    name: 'Runic steel',
    description: 'Hammered blackened steel between steel rails, with big ice-blue runes glowing in a carved channel.',
    colours: [slot('glow', 'Rune colour', '#60b0ff', ['Runes', 'Channel light'])],
  },
  'gilded-laurel-sapphire': {
    name: 'Sapphire laurel',
    description: 'Sapphire-blue enamel between gold rails, with gold laurel sprigs and sapphires in gold bezels.',
    after: 'gilded-laurel',
    colours: [slot('band', 'Enamel colour', '#2a50c0', ['Band', 'Pressed-in step']), slot('gems', 'Gem colour', '#2050e0', ['Sapphires'])],
  },
  'frost-fracture': {
    name: 'Frost fracture',
    description: 'Ice-blue stone split all round by glowing white ice cracks.',
    colours: [slot('glow', 'Glow colour', '#3a9aff', ['Default', 'Contours'])],
  },
};

/** A remade frame's own name, description and colour slots, over the frame it remakes (which keeps its place, group and `after`). */
export function remadeFrame(f: BuiltInFrame): BuiltInFrame {
  const info = INFO[f.id] ?? {};
  const name = info.name ?? f.name;
  return { ...f, ...info, name, colours: info.colours ?? [], project: () => ({ ...reviewProject(f.id), name }) };
}

/** The chosen frames that are not remakes of a frame still in the lists (new frames, and remakes whose old entry was removed). */
export const reviewFramesBesides = (existing: ReadonlySet<string>): BuiltInFrame[] =>
  Object.entries(INFO)
    .filter(([id]) => !existing.has(id))
    .map(([id, info]) => ({ id, name: info.name!, description: info.description, after: info.after, colours: info.colours ?? [], group: categoryOf(id), project: () => ({ ...reviewProject(id), name: info.name! }) }));
