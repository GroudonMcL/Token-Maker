// The tags the owner can give each frame while ranking them (FrameRanker.tsx):
// what it is made of, its effects, its decorations and its overall style.
// The frame picker can filter by them, and its search finds them too.
// Add a tag by adding it to a group; ids are what is saved, so keep them.

export interface FrameTag {
  id: string;
  label: string;
}

export interface FrameTagGroup {
  id: string;
  label: string;
  tags: readonly FrameTag[];
}

const t = (id: string, label: string): FrameTag => ({ id, label });

export const FRAME_TAG_GROUPS: readonly FrameTagGroup[] = [
  {
    id: 'material',
    label: 'Material',
    tags: [
      t('metal', 'Metal'),
      t('gold', 'Gold'),
      t('silver', 'Silver'),
      t('bronze', 'Bronze / copper'),
      t('iron', 'Iron / steel'),
      t('stone', 'Stone'),
      t('marble', 'Marble'),
      t('crystal', 'Crystal / ice'),
      t('wood', 'Wood'),
      t('plants', 'Plants / leaves'),
      t('bone', 'Bone'),
      t('leather', 'Leather / hide'),
      t('cloth', 'Cloth'),
      t('rope', 'Rope'),
      t('energy', 'Energy / magic'),
    ],
  },
  {
    id: 'effect',
    label: 'Effects',
    tags: [
      t('glow', 'Glow'),
      t('transparent', 'Transparent'),
      t('shiny', 'Shiny'),
      t('fire', 'Fire / lava'),
      t('frost', 'Frost'),
      t('lightning', 'Lightning'),
      t('water', 'Water'),
      t('smoke', 'Smoke / shadow'),
      t('sparkle', 'Sparkle'),
      t('gradient', 'Gradient / rainbow'),
      t('cracked', 'Cracked / worn'),
    ],
  },
  {
    id: 'decoration',
    label: 'Decorations',
    tags: [
      t('gems', 'Gems'),
      t('runes', 'Runes'),
      t('text', 'Text / inscription'),
      t('rivets', 'Rivets / studs'),
      t('beads', 'Beads'),
      t('filigree', 'Filigree'),
      t('knotwork', 'Knotwork'),
      t('vines', 'Vines / leaves'),
      t('thorns', 'Thorns'),
      t('flowers', 'Flowers'),
      t('stars', 'Stars / moons'),
      t('skulls', 'Skulls'),
      t('spikes', 'Spikes'),
      t('scales', 'Scales'),
      t('feathers', 'Feathers'),
      t('chains', 'Chains'),
    ],
  },
  {
    id: 'style',
    label: 'Style',
    tags: [
      t('simple', 'Simple'),
      t('ornate', 'Ornate'),
      t('rustic', 'Rustic'),
      t('elegant', 'Elegant'),
      t('grim', 'Grim'),
      t('whimsical', 'Whimsical'),
      t('scifi', 'Sci-fi'),
    ],
  },
];

const BY_ID = new Map(FRAME_TAG_GROUPS.flatMap((g) => g.tags.map((tag) => [tag.id, tag] as const)));

/** A tag's label (or its id, for a tag no longer listed). */
export const tagLabel = (id: string): string => BY_ID.get(id)?.label ?? id;
export const isKnownTag = (id: string): boolean => BY_ID.has(id);
