// The broad categories Token Maker's frames are listed under (owner's request:
// by look and material, no class categories). Every frame is filed on its own
// (owner's request: no stacks of versions behind the frame they came from).

export const FRAME_CATEGORIES = [
  'Essentials',
  'Metal & Gems',
  'Stone & Earth',
  'Wood & Nature',
  'Elements',
  'Magic',
  'Sky & Stars',
  'Dark & Grim',
  'Hide, Cloth & Rope',
] as const;
export type FrameCategory = (typeof FRAME_CATEGORIES)[number];

/** The category of each drawn frame (its preset id) and each built-in design that isn't a version. */
const ORIGINALS: Record<string, FrameCategory> = {
  // The owner's Essentials designs. Four were moved out by look (owner's
  // request): the glowing ones to Elements, the marbles to Stone & Earth.
  simple: 'Essentials',
  'dual-tone': 'Essentials',
  'small-gradient': 'Essentials',
  'clean-gradient': 'Essentials',
  rainbow: 'Essentials',
  'glowing-ice': 'Elements',
  'glowing-lava': 'Elements',
  marble: 'Stone & Earth',
  'gold-red-marble': 'Stone & Earth',
  // Drawn frames (Token Maker's presets).
  none: 'Essentials',
  stamped: 'Metal & Gems',
  gilded: 'Metal & Gems',
  engraved: 'Metal & Gems',
  double: 'Metal & Gems',
  minimal: 'Metal & Gems',
  knotwork: 'Metal & Gems',
  fighter: 'Metal & Gems',
  paladin: 'Metal & Gems',
  artificer: 'Metal & Gems',
  cleric: 'Metal & Gems',
  cobblestone: 'Stone & Earth',
  oak: 'Wood & Nature',
  druid: 'Wood & Nature',
  ranger: 'Wood & Nature',
  magma: 'Elements',
  infernal: 'Elements',
  arcane: 'Magic',
  wizard: 'Magic',
  sorcerer: 'Magic',
  bard: 'Magic',
  starfield: 'Sky & Stars',
  warlock: 'Dark & Grim',
  barbarian: 'Hide, Cloth & Rope',
  harlequin: 'Hide, Cloth & Rope',
  monk: 'Hide, Cloth & Rope',
  rogue: 'Hide, Cloth & Rope',
  // The old picture frames.
  'gilded-laurel': 'Metal & Gems',
  runestone: 'Stone & Earth',
  thorns: 'Wood & Nature',
  celestial: 'Sky & Stars',
  'dragon-scales': 'Hide, Cloth & Rope',
  rope: 'Hide, Cloth & Rope',
  // Frame Maker's Crafted borders.
  'filigree-border': 'Metal & Gems',
  'guild-gold': 'Metal & Gems',
  'riveted-plates': 'Metal & Gems',
  emberforged: 'Elements',
  'storm-wisps': 'Elements',
  'raven-plume': 'Hide, Cloth & Rope',
  // Frame Maker's Layered designs.
  'brass-beads': 'Metal & Gems',
  jewelled: 'Metal & Gems',
  'dwarven-bronze': 'Metal & Gems',
  'radiant-gold': 'Metal & Gems',
  'royal-inscription': 'Metal & Gems',
  'rune-plates': 'Metal & Gems',
  royal: 'Metal & Gems',
  celtic: 'Stone & Earth',
  frostbound: 'Elements',
  'glowing-runes': 'Magic',
  'eldritch-crystal': 'Magic',
  'night-sky': 'Sky & Stars',
  'moon-stars': 'Sky & Stars',
  'grim-iron': 'Dark & Grim',
  // Frame Maker's Themed designs.
  'enamel-gold': 'Metal & Gems',
  'worn-iron': 'Metal & Gems',
  starship: 'Metal & Gems',
  clockwork: 'Metal & Gems',
  'celtic-knot': 'Metal & Gems',
  'druid-circle': 'Stone & Earth',
  'desert-tomb': 'Stone & Earth',
  'amethyst-geode': 'Stone & Earth',
  'rose-wreath': 'Wood & Nature',
  'fey-glade': 'Wood & Nature',
  'tidal-ring': 'Elements',
  'hellfire-ring': 'Elements',
  'frost-ring': 'Elements',
  'storm-ring': 'Elements',
  archmage: 'Magic',
  'celestial-halo': 'Sky & Stars',
  'gothic-thorns': 'Dark & Grim',
  necropolis: 'Dark & Grim',
  'dragon-scale': 'Hide, Cloth & Rope',
  nautical: 'Hide, Cloth & Rope',
};

/**
 * The category of each version made in the frame review (frameVersions.ts),
 * filed by its own look rather than the frame it was made from.
 */
const VERSIONS: Record<string, FrameCategory> = {
  // Made from wizard.
  'wizard-sapphire': 'Magic',
  'wizard-starweave': 'Sky & Stars',
  'wizard-ley-lines': 'Magic',
  'wizard-grimoire': 'Magic',
  // Made from stamped.
  'stamped-veined': 'Metal & Gems',
  'stamped-leather': 'Hide, Cloth & Rope',
  'stamped-enamel': 'Metal & Gems',
  'stamped-ember': 'Metal & Gems',
  // Made from gilded.
  'gilded-filigree': 'Metal & Gems',
  'gilded-lacquer': 'Metal & Gems',
  // Made from engraved.
  'engraved-scrollwork': 'Metal & Gems',
  'engraved-inlay': 'Metal & Gems',
  'engraved-damascus': 'Metal & Gems',
  'engraved-knotwork': 'Metal & Gems',
  'engraved-bronze': 'Metal & Gems',
  // Made from arcane.
  'arcane-sigil': 'Magic',
  'arcane-crystal': 'Magic',
  'arcane-spellbook': 'Magic',
  'arcane-circuitry': 'Magic',
  // Made from infernal.
  'infernal-hellfire': 'Elements',
  'infernal-brimstone': 'Elements',
  'infernal-iron': 'Dark & Grim',
  'infernal-blood-pact': 'Dark & Grim',
  // Made from double.
  'double-gold-enamel': 'Metal & Gems',
  'double-twin-rings': 'Metal & Gems',
  'double-studded': 'Metal & Gems',
  'double-fine-lines': 'Metal & Gems',
  'double-cord': 'Metal & Gems',
  // Made from minimal.
  'polished-titanium': 'Metal & Gems',
  'polished-pearl': 'Metal & Gems',
  'polished-obsidian': 'Stone & Earth',
  // Made from oak.
  'oak-varnished': 'Wood & Nature',
  'oak-brass-bound': 'Wood & Nature',
  'oak-rune-carved': 'Wood & Nature',
  'oak-living-bark': 'Wood & Nature',
  // Made from magma.
  'magma-crust': 'Elements',
  'magma-obsidian-fire': 'Elements',
  'magma-embers': 'Elements',
  'magma-script': 'Elements',
  // Made from harlequin.
  'harlequin-jester': 'Hide, Cloth & Rope',
  'harlequin-velvet': 'Hide, Cloth & Rope',
  'harlequin-checker': 'Metal & Gems',
  'harlequin-stained-glass': 'Metal & Gems',
  'harlequin-carnival': 'Hide, Cloth & Rope',
  // Made from knotwork.
  'knotwork-celtic-gold': 'Metal & Gems',
  'knotwork-silver': 'Metal & Gems',
  'knotwork-carved-stone': 'Stone & Earth',
  'knotwork-leather': 'Hide, Cloth & Rope',
  'knotwork-fey': 'Magic',
  // Made from starfield.
  'starfield-deep-space': 'Sky & Stars',
  'starfield-star-chart': 'Sky & Stars',
  'starfield-galaxy': 'Sky & Stars',
  'starfield-aurora': 'Sky & Stars',
  // Made from bard.
  'bard-lute': 'Wood & Nature',
  'bard-velvet': 'Hide, Cloth & Rope',
  'bard-starlit': 'Sky & Stars',
  'bard-lyre': 'Metal & Gems',
  // Made from cleric.
  'cleric-holy-light': 'Metal & Gems',
  'cleric-temple': 'Stone & Earth',
  'cleric-dawn': 'Sky & Stars',
  // Made from druid.
  'druid-stone-circle': 'Stone & Earth',
  // Made from fighter.
  'fighter-battle-steel': 'Metal & Gems',
  'fighter-shield-wall': 'Metal & Gems',
  'fighter-chainmail': 'Metal & Gems',
  'fighter-champion': 'Metal & Gems',
  // Made from monk.
  'monk-saffron': 'Hide, Cloth & Rope',
  'monk-jade': 'Metal & Gems',
  'monk-ink': 'Hide, Cloth & Rope',
  // Made from cobblestone.
  'cobblestone-mossy': 'Stone & Earth',
  // Made from barbarian.
  'barbarian-fur': 'Hide, Cloth & Rope',
  'barbarian-bone': 'Dark & Grim',
  'barbarian-club': 'Wood & Nature',
  // Made from bard.
  'bard-chorus': 'Metal & Gems',
  'bard-aria': 'Hide, Cloth & Rope',
  'bard-moon-verse': 'Sky & Stars',
  // Made from druid.
  'druid-bramble': 'Wood & Nature',
  'druid-meadow': 'Wood & Nature',
  // Made from cobblestone.
  'cobblestone-forest-path': 'Stone & Earth',
  'cobblestone-lichen-granite': 'Stone & Earth',
  // Made from paladin.
  'paladin-oathbound': 'Metal & Gems',
  'paladin-tabard': 'Hide, Cloth & Rope',
  'paladin-radiant': 'Metal & Gems',
  'paladin-crowns': 'Metal & Gems',
  'paladin-dawnsteel': 'Metal & Gems',
  // Made from ranger.
  'ranger-fletching': 'Hide, Cloth & Rope',
  'ranger-cloak': 'Hide, Cloth & Rope',
  'ranger-bowstave': 'Wood & Nature',
  'ranger-trail': 'Wood & Nature',
  'ranger-pine': 'Wood & Nature',
  // Made from rogue.
  'rogue-shadow-leather': 'Hide, Cloth & Rope',
  'rogue-cant': 'Dark & Grim',
  'rogue-poison': 'Hide, Cloth & Rope',
  'rogue-smoke': 'Dark & Grim',
  // Made from sorcerer.
  'sorcerer-wild-magic': 'Magic',
  'sorcerer-bloodline': 'Magic',
  'sorcerer-storm': 'Elements',
  'sorcerer-crystal': 'Metal & Gems',
  // Made from warlock.
  'warlock-pact': 'Dark & Grim',
  'warlock-tendrils': 'Dark & Grim',
  'warlock-eyes': 'Dark & Grim',
  'warlock-void': 'Dark & Grim',
  'warlock-sigils': 'Dark & Grim',
  // Made from artificer.
  'artificer-pipes': 'Metal & Gems',
  'artificer-workshop': 'Metal & Gems',
  // Made from gilded-laurel.
  'gilded-laurel-enamel': 'Metal & Gems',
  'gilded-laurel-wreath': 'Metal & Gems',
  'gilded-laurel-jewelled': 'Metal & Gems',
  'gilded-laurel-silver-olive': 'Metal & Gems',
  'gilded-laurel-oath': 'Metal & Gems',
  // Made from iron-rivets.
  'iron-rivets-blackened': 'Metal & Gems',
  'iron-rivets-rusted': 'Metal & Gems',
  'iron-rivets-dwarven': 'Metal & Gems',
  'iron-rivets-forge-script': 'Metal & Gems',
  'iron-rivets-gunmetal': 'Metal & Gems',
  // Made from runestone.
  'runestone-mossy': 'Stone & Earth',
  'runestone-ember': 'Stone & Earth',
  'runestone-frost': 'Stone & Earth',
  'runestone-gilded-slate': 'Stone & Earth',
  // Made from thorns.
  'thorns-rose-briar': 'Wood & Nature',
  'thorns-bark-bramble': 'Wood & Nature',
  'thorns-silverwork': 'Metal & Gems',
  // Made from dragon-scales.
  'dragon-scales-red': 'Hide, Cloth & Rope',
  'dragon-scales-black': 'Hide, Cloth & Rope',
  'dragon-scales-wyrm-script': 'Hide, Cloth & Rope',
  // Made from celestial.
  'celestial-sun-moon': 'Sky & Stars',
  'celestial-astrolabe': 'Sky & Stars',
  // Made from rope.
  'rope-sailors': 'Hide, Cloth & Rope',
  'rope-braided-leather': 'Hide, Cloth & Rope',
  // Made from shield-rim.
  'shield-rim-viking': 'Metal & Gems',
  'shield-rim-hoplite': 'Metal & Gems',
  'shield-rim-heraldry': 'Metal & Gems',
  'shield-rim-battle-worn': 'Metal & Gems',
  'shield-rim-leather-bound': 'Metal & Gems',
  // Made from filigree-border.
  'gilded-filigree-sapphire': 'Metal & Gems',
  'gilded-filigree-emerald-script': 'Metal & Gems',
  // Made from guild-gold.
  'guild-gold-shaded': 'Metal & Gems',
  'guild-silver-sapphire': 'Metal & Gems',
  'guild-bronze-enamel': 'Metal & Gems',
  // Made from raven-plume.
  'raven-plume-sheen': 'Hide, Cloth & Rope',
  'raven-plume-bone': 'Hide, Cloth & Rope',
  'raven-plume-owl': 'Hide, Cloth & Rope',
  // Made from emberforged.
  'emberforged-forge-runes': 'Elements',
  'emberforged-frostfire': 'Elements',
  // Made from storm-wisps.
  'storm-wisps-arcane': 'Magic',
  'storm-wisps-sea-squall': 'Elements',
  // Made from riveted-plates.
  'riveted-plates-ordered': 'Metal & Gems',
  'riveted-plates-forge-seams': 'Metal & Gems',
  'riveted-plates-bulwark': 'Metal & Gems',
  'riveted-plates-ordered-curved': 'Metal & Gems',
  'riveted-plates-forge-seams-curved': 'Metal & Gems',
  // Made from brass-beads.
  'brass-beads-polished': 'Metal & Gems',
  'brass-beads-jet': 'Metal & Gems',
  // Made from glowing-runes.
  'glowing-runes-runic': 'Magic',
  'glowing-runes-emerald': 'Magic',
  'glowing-runes-fire': 'Magic',
  'glowing-runes-twin-circle': 'Magic',
  // Made from jewelled.
  'jewelled-silver': 'Metal & Gems',
  // Made from battle-steel.
  'battle-steel-bloodied': 'Dark & Grim',
  // Made from night-sky.
  'night-sky-dusk': 'Sky & Stars',
  'night-sky-constellations': 'Sky & Stars',
  'night-sky-aurora': 'Sky & Stars',
  // Made from dwarven-bronze.
  'dwarven-bronze-forged': 'Metal & Gems',
  'dwarven-bronze-steel-gold': 'Metal & Gems',
  'dwarven-bronze-runic': 'Metal & Gems',
  // Made from dragon-scales.
  'dragon-scales-serpent': 'Hide, Cloth & Rope',
  // Made from jewelled.
  'jewelled-art-deco': 'Metal & Gems',
  'jewelled-garnets': 'Metal & Gems',
  // Made from radiant-gold.
  'radiant-gold-rose': 'Metal & Gems',
  'radiant-gold-prayer': 'Metal & Gems',
  // Made from hellforged-iron.
  'hellforged-iron-shaded': 'Elements',
  // Made from royal-inscription.
  'royal-inscription-gold': 'Metal & Gems',
  'royal-inscription-crimson': 'Metal & Gems',
  'royal-inscription-silver': 'Metal & Gems',
  'royal-inscription-velvet': 'Hide, Cloth & Rope',
  // Made from rune-plates.
  'rune-plates-bronze': 'Metal & Gems',
  'rune-plates-stone': 'Stone & Earth',
  'rune-plates-silver-gold': 'Metal & Gems',
  // Made from moon-stars.
  'moon-stars-midnight': 'Sky & Stars',
  'moon-stars-phases': 'Sky & Stars',
  // Made from frostbound.
  'frostbound-snowfall': 'Elements',
  // Made from celtic.
  'celtic-emerald-gold': 'Metal & Gems',
  'celtic-carved-stone': 'Stone & Earth',
  // Made from royal.
  'royal-crimson': 'Metal & Gems',
  'royal-blue': 'Metal & Gems',
  'royal-purple-silver': 'Metal & Gems',
  'royal-ermine': 'Hide, Cloth & Rope',
  // Made from grim-iron.
  'grim-iron-crowned-skulls': 'Dark & Grim',
  // Made from enamel-gold.
  'enamel-gold-sapphire': 'Metal & Gems',
  'enamel-gold-cloisonne': 'Metal & Gems',
  'enamel-gold-silver-green': 'Metal & Gems',
  // Made from worn-iron.
  'worn-iron-battered': 'Metal & Gems',
  'worn-iron-smouldering': 'Metal & Gems',
  'worn-iron-rusted': 'Metal & Gems',
  // Made from rose-wreath.
  'rose-wreath-briar': 'Wood & Nature',
  'rose-wreath-golden': 'Metal & Gems',
  // Made from fey-glade.
  'fey-glade-twilight': 'Wood & Nature',
  'fey-glade-moonlit': 'Wood & Nature',
  'fey-glade-fireflies': 'Wood & Nature',
  // Made from gothic-thorns.
  'gothic-thorns-shaded': 'Dark & Grim',
  'gothic-thorns-bone': 'Dark & Grim',
  // Made from tidal-ring.
  'tidal-ring-lagoon': 'Elements',
  // Made from archmage.
  'archmage-midnight': 'Magic',
  'archmage-panels': 'Magic',
  'archmage-blood': 'Dark & Grim',
  // Made from starship.
  'starship-gunmetal': 'Metal & Gems',
  'starship-living': 'Metal & Gems',
  'starship-white': 'Metal & Gems',
  // Made from hellfire-ring.
  'hellfire-ring-shaded': 'Elements',
  'hellfire-ring-blue': 'Elements',
  'hellfire-ring-lava': 'Elements',
  // Made from frost-ring.
  'frost-ring-glacier': 'Elements',
  'frost-ring-silver': 'Elements',
  // Made from storm-ring.
  'storm-ring-thunderhead': 'Elements',
  'storm-ring-arcane': 'Magic',
  'storm-ring-blood': 'Elements',
  // Made from necropolis.
  'necropolis-bone': 'Dark & Grim',
  'necropolis-gilded': 'Dark & Grim',
  // Made from clockwork.
  'clockwork-brass': 'Metal & Gems',
  'clockwork-watchwork': 'Metal & Gems',
  'clockwork-steampunk': 'Metal & Gems',
  // Made from celtic-knot.
  'celtic-knot-silver': 'Metal & Gems',
  'celtic-knot-gold': 'Metal & Gems',
  'celtic-knot-bronze': 'Metal & Gems',
  // Made from dragon-scale.
  'dragon-scale-crimson': 'Hide, Cloth & Rope',
  'dragon-scale-emerald': 'Hide, Cloth & Rope',
  'dragon-scale-shadow': 'Hide, Cloth & Rope',
  // Made from druid-circle.
  'druid-circle-stones': 'Stone & Earth',
  'druid-circle-runes': 'Stone & Earth',
  // Made from nautical.
  'nautical-timber': 'Hide, Cloth & Rope',
  'nautical-driftwood': 'Wood & Nature',
  'nautical-pirate': 'Hide, Cloth & Rope',
  // Made from autumn-leaves.
  'autumn-leaves-maple': 'Wood & Nature',
  'autumn-leaves-gilded': 'Metal & Gems',
  // Made from celestial-halo.
  'celestial-halo-white-gold': 'Sky & Stars',
  // Made from desert-tomb.
  'desert-tomb-sandstone': 'Stone & Earth',
  'desert-tomb-lapis': 'Stone & Earth',
  // Made from amethyst-geode.
  'amethyst-geode-amethyst': 'Stone & Earth',
  'amethyst-geode-agate': 'Stone & Earth',
  // Library pictures (version 13): stone frames built like Marble.
  'veined-stone': 'Stone & Earth',
  'weathered-stone': 'Stone & Earth',
  'grey-stone': 'Stone & Earth',
  // Frame review, version 13: new frames with the library pictures.
  'cobblestone-stone': 'Stone & Earth',
  'glowing-ice-snowflake': 'Elements',
  'cracked-earth': 'Stone & Earth',
  'ember-stone': 'Elements',
  'flame-wreath': 'Elements',
  starlit: 'Sky & Stars',
  'celtic-knotwork': 'Metal & Gems',
  'victors-laurel': 'Metal & Gems',
  'storm-ring-storm-clouds': 'Elements',
  'paladin-oath': 'Metal & Gems',
  'fighter-plates': 'Metal & Gems',
  'druid-oak': 'Wood & Nature',
  'druid-vine': 'Wood & Nature',
  'mossy-ruin': 'Stone & Earth',
  'dragon-crest': 'Hide, Cloth & Rope',
  ossuary: 'Dark & Grim',
  'rose-cameo': 'Wood & Nature',
  'tudor-rose': 'Wood & Nature',
  'thorns-silverwork-bare': 'Wood & Nature',
  'cleric-dawn-pearls': 'Metal & Gems',
  'artificer-brass': 'Metal & Gems',
  'sorcerer-scales': 'Magic',
  'storm-ring-arcane-clouds': 'Elements',
  'storm-ring-blood-clouds': 'Elements',
  'warlock-void-onyx': 'Dark & Grim',
  'amethyst-geode-violet': 'Stone & Earth',
  'gilded-laurel-sapphire': 'Metal & Gems',
  'frost-fracture': 'Elements',
};

const FILED: Record<string, FrameCategory> = { ...ORIGINALS, ...VERSIONS };

/** The category a frame is listed under. */
export function categoryOf(id: string): FrameCategory {
  return FILED[id] ?? 'Metal & Gems';
}

/** Whether a frame has been given a category (every frame should be). */
export const isFiled = (id: string) => id in FILED;

/** Where a category comes in the list. */
export const categoryRank = (c: string) => {
  const i = (FRAME_CATEGORIES as readonly string[]).indexOf(c);
  return i < 0 ? FRAME_CATEGORIES.length : i;
};
