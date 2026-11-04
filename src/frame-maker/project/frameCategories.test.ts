import { describe, expect, it } from 'vitest';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { BUILT_IN_FRAMES, builtInFramesByCategory } from './builtInFrames';
import { FRAME_CATEGORIES, isFiled } from './frameCategories';

describe('frame categories', () => {
  it('give every frame its own id', () => {
    const ids = BUILT_IN_FRAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of FRAME_PRESETS) expect(ids, p.id).not.toContain(p.id);
  });

  it('file every frame and drawn frame under one of the broad categories, with no class categories', () => {
    for (const f of BUILT_IN_FRAMES) {
      expect(FRAME_CATEGORIES, f.id).toContain(f.group);
      if (f.group !== 'Essentials') expect(isFiled(f.id), f.id).toBe(true);
    }
    for (const p of FRAME_PRESETS) expect(isFiled(p.id), p.id).toBe(true);
    expect(FRAME_CATEGORIES.some((c) => /class/i.test(c))).toBe(false);
  });

  it('file each version by its own look, not the frame it was made from', () => {
    const group = (id: string) => BUILT_IN_FRAMES.find((f) => f.id === id)?.group;
    expect(group('wizard-starweave')).toBe('Sky & Stars');
    expect(group('stamped-leather')).toBe('Hide, Cloth & Rope');
    expect(group('knotwork-carved-stone')).toBe('Stone & Earth');
  });

  it('list each frame before the versions made from it', () => {
    for (const { frames } of builtInFramesByCategory()) {
      frames.forEach((f, i) => {
        const head = frames.findIndex((x) => x.id === f.after);
        if (head >= 0) expect(head, f.id).toBeLessThan(i);
      });
    }
  });

  it('no longer list the frames the owner removed', () => {
    const ids = new Set([...BUILT_IN_FRAMES.map((f) => f.id), ...FRAME_PRESETS.map((p) => p.id)]);
    for (const gone of ['cleric', 'dragon-scales', 'raven-plume', 'riveted-plates', 'guild-silver', 'brass-beads', 'jewelled', 'overgrown-ruin', 'enamel-gold', 'amethyst-geode'])
      expect(ids.has(gone), gone).toBe(false);
  });
});
