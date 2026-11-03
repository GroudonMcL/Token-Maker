// The tags the owner gave each frame (config/frameOrder.json): what it is
// made of, its effects, its details and its overall style. The frame picker
// filters by them, in this order, and its search finds them too.

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

/** A tag's label (or its id, for a tag no longer listed). */
export const tagLabel = (id: string): string => BY_ID.get(id)?.label ?? id;
export const isKnownTag = (id: string): boolean => BY_ID.has(id);
