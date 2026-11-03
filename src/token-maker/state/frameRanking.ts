// The owner's ranking of the frames, best first, and the tags given to each
// (FrameRanker.tsx). Kept in localStorage; until something is saved there,
// the ranking shipped with the app (config/frameRanking.json) is used, so a
// ranking exported from the ranker can be committed and every visitor sees
// the frames in that order.
//
// Ranking takes two steps, both optional:
// 1. Tiers: each frame on its own, one click to put it in a tier (S best, D
//    worst), tagging it at the same time. One click per frame gives a rough
//    order straight away.
// 2. Comparisons: a binary insertion sort, one comparison at a time. Each
//    frame still to place (the challenger) is compared with the middle of the
//    part of the ranking it could still go in, halving it each time, so
//    placing a frame among n takes about log2(n) comparisons (close to the
//    fewest any comparison sort needs). A frame with a tier is only compared
//    with frames in its own tier, which saves more. It can stop and carry on
//    at any point, take back answers, and place new frames into a finished
//    ranking without starting again.

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import shipped from '../config/frameRanking.json';

export const TIERS = [
  { tier: 1, label: 'S', hint: 'The best' },
  { tier: 2, label: 'A', hint: 'Great' },
  { tier: 3, label: 'B', hint: 'Good' },
  { tier: 4, label: 'C', hint: 'Okay' },
  { tier: 5, label: 'D', hint: 'The worst' },
] as const;
export const tierLabel = (tier: number | undefined) => TIERS.find((t) => t.tier === tier)?.label ?? '';

type Tiers = Record<string, number>;

/** A sort in progress: the frames ranked so far, those still to place, and where the challenger (pending[0]) could still go. */
export interface SortSession {
  sorted: string[];
  pending: string[];
  /** The challenger goes somewhere in sorted[lo..hi] (hi = sorted.length means "after the last"). */
  lo: number;
  hi: number;
  /** Comparisons answered in this session. */
  answered: number;
}

export interface RankingData {
  /** Frame ids, best first. */
  order: string[];
  /** Each frame's tier (1 = S, the best … 5 = D). */
  tiers: Tiers;
  /** Tag ids for each frame id. */
  tags: Record<string, string[]>;
  sort: SortSession | null;
}

const KEY = 'tm.frameRanking';
const UNDO_LIMIT = 200;

// ── The sort itself (pure) ──────────────────────────────────────────────────

/** The frame the challenger is compared with next, or null if it has found its place. */
export const opponentOf = (s: SortSession): string | null => (s.pending.length && s.lo < s.hi ? s.sorted[(s.lo + s.hi) >> 1]! : null);

/** Where in `sorted` a frame could go: among the frames of its tier, or anywhere without one. */
function room(sorted: readonly string[], id: string | undefined, tiers: Tiers): [number, number] {
  const t = id === undefined ? undefined : tiers[id];
  if (!t) return [0, sorted.length];
  let lo = 0;
  sorted.forEach((x, i) => {
    if (tiers[x] && tiers[x] < t) lo = i + 1;
  });
  let hi = sorted.length;
  for (let i = sorted.length - 1; i >= lo; i--) if (tiers[sorted[i]!] && tiers[sorted[i]!]! > t) hi = i;
  return [lo, hi];
}

/** Places challengers that have nowhere left to go (the first frame of a tier, or a finished search). */
function settle(s: SortSession, tiers: Tiers): SortSession {
  let { sorted, pending, lo, hi } = s;
  while (pending.length && lo >= hi) {
    sorted = [...sorted.slice(0, lo), pending[0]!, ...sorted.slice(lo)];
    pending = pending.slice(1);
    [lo, hi] = room(sorted, pending[0], tiers);
  }
  return { ...s, sorted, pending, lo, hi };
}

/** A session that places `pending` into `sorted` (which is kept as it is). */
export function newSession(sorted: readonly string[], pending: readonly string[], tiers: Tiers = {}): SortSession {
  const [lo, hi] = room(sorted, pending[0], tiers);
  return settle({ sorted: [...sorted], pending: [...pending], lo, hi, answered: 0 }, tiers);
}

/** The answer to one comparison: is the challenger better than its opponent? */
export function answer(s: SortSession, challengerBetter: boolean, tiers: Tiers = {}): SortSession {
  if (opponentOf(s) === null) return s;
  const mid = (s.lo + s.hi) >> 1;
  return settle({ ...s, lo: challengerBetter ? s.lo : mid + 1, hi: challengerBetter ? mid : s.hi, answered: s.answered + 1 }, tiers);
}

/** About how many comparisons are left (log2 of the room each frame still to place will have). */
export function comparisonsLeft(s: SortSession, tiers: Tiers = {}): number {
  if (!s.pending.length) return 0;
  const size = new Map<number, number>();
  for (const id of s.sorted) size.set(tiers[id] ?? 0, (size.get(tiers[id] ?? 0) ?? 0) + 1);
  let total = s.sorted.length;
  let n = Math.ceil(Math.log2(s.hi - s.lo + 1));
  const grow = (id: string) => {
    size.set(tiers[id] ?? 0, (size.get(tiers[id] ?? 0) ?? 0) + 1);
    total++;
  };
  grow(s.pending[0]!);
  for (const id of s.pending.slice(1)) {
    const t = tiers[id];
    n += Math.ceil(Math.log2((t ? (size.get(t) ?? 0) : total) + 1));
    grow(id);
  }
  return n;
}

/** The ids in a random order (so the first frames ranked don't all come from one category). */
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ── Reading and saving ──────────────────────────────────────────────────────

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function cleanTags(v: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (v && typeof v === 'object') {
    for (const [id, list] of Object.entries(v)) {
      // An empty list is kept: it means "no tags", not "the shipped ones".
      if (Array.isArray(list)) out[id] = [...new Set(strings(list))];
    }
  }
  return out;
}

function cleanTiers(v: unknown): Tiers {
  const out: Tiers = {};
  if (v && typeof v === 'object') for (const [id, t] of Object.entries(v)) if (TIERS.some((x) => x.tier === t)) out[id] = t as number;
  return out;
}

function cleanSession(v: unknown, tiers: Tiers): SortSession | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const sorted = strings(o.sorted);
  const pending = strings(o.pending);
  const lo = typeof o.lo === 'number' ? o.lo : -1;
  const hi = typeof o.hi === 'number' ? o.hi : -1;
  if (!(lo >= 0 && hi <= sorted.length && lo <= hi)) return newSession(sorted, pending, tiers);
  return settle({ sorted, pending, lo, hi, answered: typeof o.answered === 'number' ? o.answered : 0 }, tiers);
}

/** A ranking read from a file or localStorage (anything unexpected is dropped). */
export function readRanking(v: unknown): RankingData {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const tiers = cleanTiers(o.tiers);
  return { order: [...new Set(strings(o.order))], tiers, tags: cleanTags(o.tags), sort: cleanSession(o.sort, tiers) };
}

/**
 * This browser's ranking over the shipped one: the shipped tags and tiers
 * fill in any frame this browser hasn't given its own (so tags added to the
 * shipped file reach a browser that has already ranked), and the shipped
 * order is used until this browser has one.
 */
function load(): RankingData {
  const base = readRanking(shipped);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const local = readRanking(JSON.parse(raw));
      return {
        order: local.order.length || local.sort ? local.order : base.order,
        tiers: { ...base.tiers, ...local.tiers },
        tags: { ...base.tags, ...local.tags },
        sort: local.sort,
      };
    }
  } catch {
    // No localStorage, or something unreadable in it: use the shipped ranking.
  }
  return base;
}

function save({ order, tiers, tags, sort }: RankingData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ order, tiers, tags, sort }));
  } catch {
    // Private browsing with storage blocked: the ranking lasts until the page closes.
  }
}

// ── The store ───────────────────────────────────────────────────────────────

type State = RankingData & { undo: SortSession[] };
export const frameRanking = createStore<State>(() => ({ ...load(), undo: [] }));
export const useFrameRanking = <T>(pick: (s: State) => T) => useStore(frameRanking, pick);

function set(patch: Partial<State>) {
  frameRanking.setState(patch);
  save(frameRanking.getState());
}

/**
 * Starts comparing. `fresh` ranks the frames again from scratch; otherwise the
 * finished ranking is kept and only the frames not in it yet are placed.
 * `only` limits the frames placed (one tier's, say). Frames that no longer
 * exist are dropped from the ranking.
 */
export function startRanking(allIds: readonly string[], { fresh = false, only }: { fresh?: boolean; only?: readonly string[] } = {}) {
  const { order, tiers } = frameRanking.getState();
  const known = new Set(allIds);
  const kept = fresh ? [] : order.filter((id) => known.has(id));
  const placed = new Set(kept);
  const wanted = only ? new Set(only) : null;
  const pending = shuffled(allIds.filter((id) => !placed.has(id) && (!wanted || wanted.has(id))));
  set({ sort: newSession(kept, pending, tiers), undo: [] });
  finishIfDone();
}

/** Takes one frame out of the ranking and places it again (to fix where it ended up). */
export function rerankFrame(id: string) {
  const { order, sort, tiers } = frameRanking.getState();
  if (sort) return;
  set({ sort: newSession(order.filter((x) => x !== id), [id], tiers), undo: [] });
  finishIfDone();
}

/** Answers the current comparison. */
export function choose(challengerBetter: boolean) {
  const { sort, undo, tiers } = frameRanking.getState();
  if (!sort || opponentOf(sort) === null) return;
  set({ sort: answer(sort, challengerBetter, tiers), undo: [...undo.slice(-UNDO_LIMIT + 1), sort] });
  finishIfDone();
}

/** Takes back the last answer. */
export function undoChoice() {
  const { undo } = frameRanking.getState();
  const last = undo.at(-1);
  if (last) set({ sort: last, undo: undo.slice(0, -1) });
}

/** Throws away the sort in progress; the ranking goes back to how it was before it started. */
export function cancelRanking() {
  set({ sort: null, undo: [] });
}

/** Saves the ranking once every frame has been placed. */
function finishIfDone() {
  const { sort } = frameRanking.getState();
  if (sort && !sort.pending.length) set({ order: sort.sorted, sort: null, undo: [] });
}

/**
 * Puts a frame in a tier (or none). A frame already ranked whose tier changes
 * leaves the ranking, so it is placed again among its new tier.
 */
export function setTier(frameId: string, tier: number | null) {
  const { tiers, order, sort } = frameRanking.getState();
  if ((tiers[frameId] ?? null) === tier) return;
  const next = { ...tiers };
  if (tier) next[frameId] = tier;
  else delete next[frameId];
  // In a sort in progress, the frame goes to the back of the queue, to be placed among its new tier.
  let nextSort = sort;
  if (sort && (sort.sorted.includes(frameId) || sort.pending.includes(frameId))) {
    const pending = [...sort.pending.filter((x) => x !== frameId), frameId];
    nextSort = { ...newSession(sort.sorted.filter((x) => x !== frameId), pending, next), answered: sort.answered };
  }
  set({ tiers: next, order: order.filter((x) => x !== frameId), sort: nextSort, undo: nextSort === sort ? frameRanking.getState().undo : [] });
}

export function toggleTag(frameId: string, tagId: string) {
  const { tags } = frameRanking.getState();
  const now = tags[frameId] ?? [];
  const next = now.includes(tagId) ? now.filter((x) => x !== tagId) : [...now, tagId];
  set({ tags: { ...tags, [frameId]: next } });
}

/** The ranking, tiers and tags as a file's text (to keep, move to another browser, or ship with the app as config/frameRanking.json). */
export function exportRanking(): string {
  const { order, tiers, tags } = frameRanking.getState();
  return `${JSON.stringify({ order, tiers, tags }, null, 2)}\n`;
}

/** Replaces the ranking, tiers and tags with a file's. */
export function importRanking(text: string): boolean {
  try {
    const read = readRanking(JSON.parse(text));
    set({ order: read.order, tiers: read.tiers, tags: read.tags, sort: null, undo: [] });
    return true;
  } catch {
    return false;
  }
}

/** Reads the ranking again from localStorage and the shipped file, as a page load does. */
export function reloadRanking() {
  frameRanking.setState({ ...load(), undo: [] });
}

/** Forgets this browser's ranking, tiers and tags (back to the ones shipped with the app). */
export function resetRanking() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing saved anyway.
  }
  frameRanking.setState({ ...load(), undo: [] });
}

/** The ranking being made while a sort is in progress (it carries on where it was left), else the finished one. */
const baseOrder = (s: Pick<RankingData, 'order' | 'sort'>): string[] => s.sort?.sorted ?? s.order;

/**
 * Each frame's place in the order to show (0 = best): by tier first (frames
 * with no tier after those with one), then by the ranking. A frame with a
 * tier but not compared yet goes after the compared ones in its tier.
 * Frames with neither aren't in it.
 */
export function rankIndex(s: Pick<RankingData, 'order' | 'sort' | 'tiers'>): Map<string, number> {
  const base = baseOrder(s);
  const pos = new Map(base.map((id, i) => [id, i]));
  const ids = [...new Set([...base, ...Object.keys(s.tiers)])];
  const tier = (id: string) => s.tiers[id] ?? TIERS.length + 1;
  ids.sort((a, b) => tier(a) - tier(b) || (pos.get(a) ?? Infinity) - (pos.get(b) ?? Infinity));
  return new Map(ids.map((id, i) => [id, i]));
}

/** `items` in ranking order (ranked first, best first), the rest after them in the order they came. */
export function byRank<T>(items: readonly T[], idOf: (t: T) => string, rank: Map<string, number>): T[] {
  return items
    .map((t, i) => ({ t, i, r: rank.get(idOf(t)) ?? Infinity }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ t }) => t);
}
