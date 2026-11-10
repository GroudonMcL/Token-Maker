// The owner's order and tags for the frames in the frame picker
// (config/frameOrder.json). Small, so the picker can use it before the frame
// catalogue (frameTiles.ts) has loaded.

import frameOrder from '../config/frameOrder.json';

/** One frame in the frame picker. */
export interface FrameTile {
  id: string;
  label: string;
  group: string;
}

/** Each frame's place in the owner's order (by category, then by look: similar frames next to each other). */
const RANK = new Map(frameOrder.order.map((id, i) => [id, i]));
export const rankOf = (id: string) => RANK.get(id) ?? Infinity;

/** Each frame's tags (config/frameTags.ts), as the owner gave them. */
export const FRAME_TAGS: Readonly<Record<string, readonly string[]>> = frameOrder.tags;
