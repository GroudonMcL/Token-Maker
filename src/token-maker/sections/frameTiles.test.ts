import frameOrder from '../config/frameOrder.json';
import { isKnownTag } from '../config/frameTags';
import { FRAME_TAGS, rankOf, TILES } from './frameTiles';

describe("the owner's frame order and tags", () => {
  it('ranks every frame once, and nothing else', () => {
    const ids = TILES.map((t) => t.id);
    expect(new Set(frameOrder.order).size).toBe(frameOrder.order.length);
    expect([...frameOrder.order].sort()).toEqual([...ids].sort());
  });

  it('tags every frame, only with tags in the list', () => {
    for (const t of TILES) {
      expect(FRAME_TAGS[t.id]?.length, t.id).toBeGreaterThan(0);
      for (const tag of FRAME_TAGS[t.id]!) expect(isKnownTag(tag), `${t.id}: ${tag}`).toBe(true);
    }
  });

  it('lists each group in the ranking, best first', () => {
    for (const group of new Set(TILES.map((t) => t.group))) {
      const ranks = TILES.filter((t) => t.group === group).map((t) => rankOf(t.id));
      expect(ranks, group).toEqual([...ranks].sort((a, b) => a - b));
    }
  });
});
