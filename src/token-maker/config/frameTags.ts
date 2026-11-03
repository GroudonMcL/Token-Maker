// The tags the owner can give each frame while ranking them (FrameRanker.tsx):
// what it is made of, its effects, its details and its overall style.
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
      t('stone', 'Stone'),
      t('crystal', 'Crystal / ice'),
      t('wood', 'Wood'),
      t('plants', 'Plants / leaves'),
      t('bone', 'Bone'),
      t('energy', 'Magic / energy'),
    ],
  },
  {
    id: 'effect',
    label: 'Effects',
    tags: [
      t('glow', 'Glow'),
      t('transparent', 'Transparent'),
      t('fire', 'Fire / lava'),
      t('water', 'Water'),
      t('smoke', 'Cloud / smoke'),
      t('gradient', 'Gradient'),
    ],
  },
  {
    id: 'detail',
    label: 'Details',
    tags: [t('gems', 'Gems'), t('runes', 'Runes / text')],
  },
  {
    id: 'style',
    label: 'Style',
    tags: [
      t('simple', 'Simple'),
      t('rustic', 'Rustic'),
      t('elegant', 'Elegant'),
      t('grim', 'Grim'),
      t('whimsical', 'Whimsical'),
      t('scifi', 'Sci-fi'),
    ],
  },
];

const BY_ID = new Map(FRAME_TAG_GROUPS.flatMap((g) => g.tags.map((tag) => [tag.id, tag] as const)));

/**
 * Tags from the longer first list and the tag they became (null: dropped),
 * so rankings saved before the list was slimmed down still read.
 */
const RETIRED: Record<string, string | null> = {
  gold: 'metal',
  silver: 'metal',
  bronze: 'metal',
  iron: 'metal',
  enamel: 'metal',
  marble: 'stone',
  frost: 'crystal',
  vines: 'plants',
  thorns: 'plants',
  flowers: 'plants',
  skulls: 'bone',
  lightning: 'energy',
  text: 'runes',
};

/** A tag id as the current list has it: itself, the tag it became, or null if it is gone. */
export function currentTag(id: string): string | null {
  if (BY_ID.has(id)) return id;
  return RETIRED[id] ?? null;
}

/** A tag's label (or its id, for a tag no longer listed). */
export const tagLabel = (id: string): string => BY_ID.get(id)?.label ?? id;
export const isKnownTag = (id: string): boolean => BY_ID.has(id);
