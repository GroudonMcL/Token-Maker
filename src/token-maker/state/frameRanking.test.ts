import { isKnownTag } from '../config/frameTags';
import { TILES } from '../sections/frameTiles';
import {
  answer,
  byRank,
  cancelRanking,
  choose,
  comparisonsLeft,
  exportRanking,
  frameRanking,
  importRanking,
  newSession,
  opponentOf,
  rankIndex,
  reloadRanking,
  readRanking,
  rerankFrame,
  shuffled,
  resetRanking,
  setTier,
  startRanking,
  toggleTag,
  undoChoice,
  type SortSession,
} from './frameRanking';

/** Runs a session to the end, answering as `better` says (lower number = better). */
function run(s: SortSession, better: (a: string, b: string) => boolean): { sorted: string[]; asked: number } {
  let asked = 0;
  while (opponentOf(s) !== null) {
    s = answer(s, better(s.pending[0]!, opponentOf(s)!));
    asked++;
  }
  return { sorted: s.sorted, asked };
}

const byNumber = (a: string, b: string) => Number(a) < Number(b);

describe('binary insertion ranking', () => {
  it('sorts by the answers given, best first', () => {
    const ids = ['5', '3', '9', '1', '7', '2', '8', '6', '4', '0'];
    const { sorted } = run(newSession([], ids), byNumber);
    expect(sorted).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('needs about n log2 n comparisons, well under every pair', () => {
    const ids = Array.from({ length: 200 }, (_, i) => String(i));
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const { sorted, asked } = run(newSession([], shuffled(ids, random)), byNumber);
    expect(sorted).toEqual(ids);
    expect(asked).toBeLessThanOrEqual(1600); // 200 · log2(200) ≈ 1529; every pair would be 19900
  });

  it('places new frames into a finished ranking without asking about the rest again', () => {
    const { sorted, asked } = run(newSession(['0', '2', '4', '6'], ['3']), byNumber);
    expect(sorted).toEqual(['0', '2', '3', '4', '6']);
    expect(asked).toBeLessThanOrEqual(3);
  });

  it('compares a frame with a tier only with frames of the same tier', () => {
    const tiers = { a: 1, b: 1, c: 2, d: 2, e: 3, x: 2 };
    const s = newSession(['a', 'b', 'c', 'd', 'e'], ['x'], tiers);
    expect([s.lo, s.hi]).toEqual([2, 4]);
    const opponents: string[] = [];
    const { sorted } = run(s, (_x, o) => (opponents.push(o), o === 'd'));
    expect(sorted).toEqual(['a', 'b', 'c', 'x', 'd', 'e']);
    expect(opponents.every((o) => tiers[o as keyof typeof tiers] === 2)).toBe(true);
  });

  it('needs far fewer comparisons with tiers', () => {
    const ids = Array.from({ length: 300 }, (_, i) => String(i));
    const tiers = Object.fromEntries(ids.map((id) => [id, 1 + Math.floor(Number(id) / 60)]));
    expect(comparisonsLeft(newSession([], ids, tiers), tiers)).toBeLessThan(comparisonsLeft(newSession([], ids)) * 0.8);
    let asked = 0;
    let s = newSession([], ids, tiers);
    while (opponentOf(s) !== null) {
      s = answer(s, byNumber(s.pending[0]!, opponentOf(s)!), tiers);
      asked++;
    }
    expect(s.sorted).toEqual(ids);
    expect(asked).toBeLessThan(1700);
  });

  it('estimates the comparisons left', () => {
    const s = newSession(['a'], ['b', 'c', 'd']);
    expect(comparisonsLeft(s)).toBe(1 + 2 + 2);
    expect(comparisonsLeft(newSession(['a'], []))).toBe(0);
  });

  it('orders items by rank, unranked after them in their own order', () => {
    const rank = new Map([
      ['c', 0],
      ['a', 1],
    ]);
    expect(byRank(['a', 'b', 'c', 'd'], (x) => x, rank)).toEqual(['c', 'a', 'b', 'd']);
  });
});

describe('the ranking store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRanking();
  });

  it('ranks, saves to localStorage and can undo an answer', () => {
    startRanking(['1', '2', '3'], { fresh: true });
    const first = frameRanking.getState().sort!;
    expect(opponentOf(first)).not.toBeNull();
    choose(true);
    undoChoice();
    expect(frameRanking.getState().sort).toEqual(first);
    while (frameRanking.getState().sort) {
      const s = frameRanking.getState().sort!;
      choose(byNumber(s.pending[0]!, opponentOf(s)!));
    }
    expect(frameRanking.getState().order).toEqual(['1', '2', '3']);
    expect(JSON.parse(localStorage.getItem('tm.frameRanking')!).order).toEqual(['1', '2', '3']);
  });

  it('keeps a session in progress, shows it, and can throw it away', () => {
    importRanking(JSON.stringify({ order: ['a', 'b'] }));
    startRanking(['a', 'b', 'c', 'd'], { fresh: true });
    expect(frameRanking.getState().sort).not.toBeNull();
    expect(readRanking(JSON.parse(localStorage.getItem('tm.frameRanking')!)).sort).not.toBeNull();
    expect(rankIndex(frameRanking.getState()).size).toBe(1);
    cancelRanking();
    expect([...rankIndex(frameRanking.getState()).keys()]).toEqual(['a', 'b']);
  });

  it('places one frame again', () => {
    importRanking(JSON.stringify({ order: ['a', 'b', 'c'] }));
    rerankFrame('a');
    const s = frameRanking.getState().sort!;
    expect(s.pending).toEqual(['a']);
    expect(s.sorted).toEqual(['b', 'c']);
  });

  it('orders by tier, then by the ranking; a new tier takes a frame out of the ranking', () => {
    importRanking(JSON.stringify({ order: ['a', 'b', 'c'], tiers: { a: 2, b: 2, c: 2 } }));
    setTier('z', 1);
    expect([...rankIndex(frameRanking.getState()).keys()]).toEqual(['z', 'a', 'b', 'c']);
    setTier('a', 3);
    expect(frameRanking.getState().order).toEqual(['b', 'c']);
    expect([...rankIndex(frameRanking.getState()).keys()]).toEqual(['z', 'b', 'c', 'a']);
  });

  it('places a frame again among its new tier when its tier changes mid-sort', () => {
    importRanking(JSON.stringify({ order: ['a', 'b'], tiers: { a: 1, b: 2 } }));
    startRanking(['a', 'b', 'c', 'd'], { fresh: false });
    setTier('a', 3);
    const s = frameRanking.getState().sort!;
    expect(s.sorted).not.toContain('a');
    expect(s.pending.at(-1)).toBe('a');
  });

  it('toggles tags, and saves and opens them with the ranking', () => {
    toggleTag('test-frame', 'wood');
    toggleTag('test-frame', 'glow');
    toggleTag('test-frame', 'glow');
    expect(frameRanking.getState().tags['test-frame']).toEqual(['wood']);
    setTier('test-frame', 2);
    const text = exportRanking();
    resetRanking();
    expect(frameRanking.getState().tags['test-frame']).toBeUndefined();
    expect(importRanking(text)).toBe(true);
    expect(frameRanking.getState().tags['test-frame']).toEqual(['wood']);
    expect(frameRanking.getState().tiers).toMatchObject({ 'test-frame': 2 });
    expect(importRanking('not json')).toBe(false);
  });

  it('ships tags for every frame, which fill in frames this browser has not tagged', () => {
    const shipped = frameRanking.getState().tags;
    for (const id of TILES.map((t) => t.id)) expect(shipped[id]?.length, id).toBeGreaterThan(0);
    for (const list of Object.values(shipped)) for (const tag of list) expect(isKnownTag(tag), tag).toBe(true);
    // A frame cleared in this browser stays cleared; the rest keep the shipped tags.
    const [first, second] = TILES.map((t) => t.id);
    for (const tag of shipped[first!]!) toggleTag(first!, tag);
    reloadRanking();
    expect(frameRanking.getState().tags[first!]).toEqual([]);
    expect(frameRanking.getState().tags[second!]).toEqual(shipped[second!]);
  });
});

