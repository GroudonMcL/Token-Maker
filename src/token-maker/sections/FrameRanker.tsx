// Ranking and tagging the frames (owner's request). Two steps, both optional:
// - Tiers: one frame at a time; one click puts it in a tier (S … D), with
//   tag buttons beside it (material, effects, decorations, style). A rough
//   order after one click per frame, and every frame tagged on the way.
// - Compare: two frames side by side, pick the better one. A binary insertion
//   sort (state/frameRanking.ts): about log2(n) choices per frame, and only
//   against frames of the same tier. Stop and carry on any time.
// The frame picker then lists the frames in this order (its "My ranking" tab,
// and each group in that order), and can filter them by tag.

import { ArrowLeft, ArrowRight, Download, Layers, ListOrdered, RotateCcw, Shuffle, SkipForward, Tags, Undo2, Upload, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FRAME_TAG_GROUPS, tagLabel } from '../config/frameTags';
import type { ShapeId } from '../render/catalog';
import {
  cancelRanking,
  choose,
  comparisonsLeft,
  exportRanking,
  frameRanking,
  importRanking,
  newSession,
  opponentOf,
  rankIndex,
  rerankFrame,
  resetRanking,
  setTier,
  startRanking,
  tierLabel,
  TIERS,
  toggleTag,
  undoChoice,
  useFrameRanking,
} from '../state/frameRanking';
import { useDoc } from '../state/tokenStore';
import { loadFramePictures, thumbOf, TILES, tileById } from './frameTiles';

const ALL_IDS = TILES.map((t) => t.id);
const BIG = 240;
const SMALL = 96;

type View = 'rank' | 'tiers' | 'list';

/** Keys for a view, wherever the focus is (a picked frame's button goes away with it); handled keys go no further. */
function useKeys(onKey: (key: string) => boolean) {
  const ref = useRef(onKey);
  useEffect(() => {
    ref.current = onKey;
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
      if (ref.current(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', listener, true);
    return () => document.removeEventListener('keydown', listener, true);
  }, []);
}

/** One frame's thumbnail, drawn on the next frame and again once its photo textures arrive. */
function useThumb(id: string | null, shape: ShapeId, px: number): string | null {
  const [state, setState] = useState<{ key: string; url: string | null }>({ key: '', url: null });
  const key = `${id}|${shape}|${px}`;
  useEffect(() => {
    if (!id) return;
    let live = true;
    const draw = () => live && setState({ key, url: thumbOf(id, shape, px) });
    const raf = requestAnimationFrame(draw);
    void loadFramePictures([id]).then((redraw) => redraw && draw());
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [id, shape, px, key]);
  return state.key === key ? state.url : null;
}

/** Small thumbnails for a long list, drawn a few at a time so the page never freezes. */
function useListThumbs(ids: readonly string[], shape: ShapeId): Map<string, string> {
  const [map, setMap] = useState<{ shape: ShapeId; urls: Map<string, string> }>({ shape, urls: new Map() });
  const idsKey = ids.join('|');
  useEffect(() => {
    let i = 0;
    let timer = 0;
    const list = idsKey ? idsKey.split('|') : [];
    const step = () => {
      const start = performance.now();
      const done: [string, string][] = [];
      while (i < list.length && performance.now() - start < 12) {
        const id = list[i++]!;
        const url = thumbOf(id, shape, SMALL);
        if (url) done.push([id, url]);
      }
      if (done.length) setMap((m) => ({ shape, urls: new Map([...(m.shape === shape ? m.urls : []), ...done]) }));
      if (i < list.length) timer = window.setTimeout(step, 0);
    };
    timer = window.setTimeout(step, 0);
    return () => clearTimeout(timer);
  }, [idsKey, shape]);
  return map.shape === shape ? map.urls : new Map();
}

function Img({ src, size }: { src: string | null | undefined; size: number }) {
  return src ? <img src={src} alt="" width={size} height={size} /> : <span className="tile__blank" style={{ width: size, height: size }} />;
}

const nameOf = (id: string) => tileById.get(id)?.label ?? id;

/** Tag buttons for one frame, a row per group. */
function TagButtons({ frameId }: { frameId: string }) {
  const tags = useFrameRanking((s) => s.tags[frameId]);
  const on = new Set(tags ?? []);
  return (
    <div className="ranker__tags" role="group" aria-label={`Tags for ${nameOf(frameId)}`}>
      {FRAME_TAG_GROUPS.map((g) => (
        <div key={g.id} className="ranker__tag-group">
          <span className="ranker__tag-group-label">{g.label}</span>
          <div className="ranker__chips">
            {g.tags.map((t) => (
              <button key={t.id} type="button" className="ranker__chip" aria-pressed={on.has(t.id)} onClick={() => toggleTag(frameId, t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The tags a frame has, as plain chips. */
function TagList({ frameId }: { frameId: string }) {
  const tags = useFrameRanking((s) => s.tags[frameId]);
  if (!tags?.length) return <span className="ranker__untagged">No tags yet</span>;
  return (
    <span className="ranker__tag-list">
      {tags.map((t) => (
        <span key={t} className="ranker__tag">
          {tagLabel(t)}
        </span>
      ))}
    </span>
  );
}

/** The five tier buttons for one frame. */
function TierButtons({ frameId, onPick, big }: { frameId: string; onPick?: (tier: number) => void; big?: boolean }) {
  const tier = useFrameRanking((s) => s.tiers[frameId]);
  return (
    <div className={`ranker__tiers${big ? ' ranker__tiers--big' : ''}`} role="group" aria-label={`Tier for ${nameOf(frameId)}`}>
      {TIERS.map((t, i) => (
        <button
          key={t.tier}
          type="button"
          className={`ranker__tier ranker__tier--${t.label.toLowerCase()}`}
          aria-pressed={tier === t.tier}
          aria-keyshortcuts={big ? String(i + 1) : undefined}
          onClick={() => (onPick ? onPick(t.tier) : setTier(frameId, tier === t.tier ? null : t.tier))}
        >
          <strong>{t.label}</strong>
          {big && <small>{t.hint}</small>}
        </button>
      ))}
    </div>
  );
}

// ── Step 1: tiers ───────────────────────────────────────────────────────────

/** Each frame in turn: a tier for it, and its tags. */
function TierPass({ shape }: { shape: ShapeId }) {
  const tiers = useFrameRanking((s) => s.tiers);
  const firstUntiered = () => ALL_IDS.findIndex((id) => !frameRanking.getState().tiers[id]);
  const [everyFrame, setEveryFrame] = useState(false);
  const [idx, setIdx] = useState(() => Math.max(firstUntiered(), 0));
  const [history, setHistory] = useState<number[]>([]);
  const id = ALL_IDS[idx];
  const url = useThumb(id ?? null, shape, BIG);
  const tiered = ALL_IDS.filter((x) => tiers[x]).length;
  const doneAll = !everyFrame && tiered === ALL_IDS.length;

  const next = (from: number) => {
    const t = frameRanking.getState().tiers;
    for (let j = from + 1; j < ALL_IDS.length; j++) if (everyFrame || !t[ALL_IDS[j]!]) return j;
    // Round again from the start for any frame skipped.
    for (let j = 0; j < from; j++) if (!t[ALL_IDS[j]!]) return j;
    return -1;
  };
  const go = (to: number) => {
    setHistory((h) => [...h, idx]);
    setIdx(to);
  };
  const pick = (tier: number) => {
    if (!id) return;
    setTier(id, tier);
    go(next(idx));
  };
  const back = () => {
    const prev = history.at(-1);
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    setIdx(prev);
  };
  useKeys((k) => {
    const n = Number(k);
    if (n >= 1 && n <= TIERS.length) pick(TIERS[n - 1]!.tier);
    else if ('sabcd'.includes(k.toLowerCase()) && k.length === 1) pick(TIERS['sabcd'.indexOf(k.toLowerCase())]!.tier);
    else if (k === 'Backspace' || k === 'ArrowLeft') back();
    else if (k === 'ArrowRight' && id) go(next(idx));
    else return false;
    return true;
  });

  if (!id || doneAll)
    return (
      <div className="ranker__home">
        <p>
          <strong>Every frame is in a tier.</strong> The frame picker lists them by tier now. Next, compare frames to rank them within their tiers, or go
          through them again.
        </p>
        <div className="ranker__start">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setEveryFrame(true);
              setHistory([]);
              setIdx(0);
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Go through every frame again
          </button>
        </div>
      </div>
    );

  const tile = tileById.get(id);
  return (
    <div className="ranker__tier-pass">
      <div className="ranker__tier-frame">
        <Img src={url} size={BIG} />
        <strong>{tile?.label}</strong>
        <small>
          {tile?.group} · frame {idx + 1} of {ALL_IDS.length}
        </small>
        <TierButtons frameId={id} onPick={pick} big />
        <div className="ranker__actions">
          <button type="button" className="btn btn--small" disabled={!history.length} onClick={back} aria-keyshortcuts="Backspace">
            <ArrowLeft size={14} aria-hidden="true" />
            Back
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => go(next(idx))} aria-keyshortcuts="ArrowRight">
            Skip
            <SkipForward size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="ranker__tier-tags">
        <TagButtons frameId={id} />
      </div>
      <div className="ranker__progress ranker__progress--wide">
        <progress max={ALL_IDS.length} value={tiered} aria-label="Frames in a tier" />
        <span>
          {tiered} of {ALL_IDS.length} frames in a tier. Keys: 1–5 (or S, A, B, C, D) for a tier, ← or Backspace to go back, → to skip.
        </span>
      </div>
    </div>
  );
}

// ── Step 2: comparisons ─────────────────────────────────────────────────────

/** One side of a comparison: the frame, the button to pick it, and its tags. */
function Contender({ id, shape, side, onPick }: { id: string; shape: ShapeId; side: 'new' | 'ranked'; onPick: () => void }) {
  const url = useThumb(id, shape, BIG);
  const tile = tileById.get(id);
  const tier = useFrameRanking((s) => s.tiers[id]);
  // The frame being placed comes up once: its tag buttons are open if it has no tags yet.
  const [showTags, setShowTags] = useState(() => side === 'new' && !frameRanking.getState().tags[id]?.length);
  return (
    <div className={`ranker__side ranker__side--${side}`}>
      <span className="ranker__badge">
        {side === 'new' ? 'Placing now' : 'Already ranked'}
        {tier ? ` · tier ${tierLabel(tier)}` : ''}
      </span>
      <button type="button" className="ranker__pick" onClick={onPick} aria-label={`${tile?.label ?? id} is better`} aria-keyshortcuts={side === 'new' ? 'ArrowLeft 1' : 'ArrowRight 2'}>
        <Img src={url} size={BIG} />
        <strong>{tile?.label ?? id}</strong>
        <small>{tile?.group}</small>
        <span className="ranker__pick-hint">
          {side === 'new' ? <ArrowLeft size={14} aria-hidden="true" /> : null}
          This one is better
          {side === 'ranked' ? <ArrowRight size={14} aria-hidden="true" /> : null}
        </span>
      </button>
      {showTags ? (
        <TagButtons frameId={id} />
      ) : (
        <div className="ranker__tag-summary">
          <TagList frameId={id} />
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setShowTags(true)}>
            <Tags size={14} aria-hidden="true" />
            Edit tags
          </button>
        </div>
      )}
    </div>
  );
}

/** The comparison in progress. */
function Compare({ shape }: { shape: ShapeId }) {
  const sort = useFrameRanking((s) => s.sort)!;
  const tiers = useFrameRanking((s) => s.tiers);
  const canUndo = useFrameRanking((s) => s.undo.length > 0);
  const challenger = sort.pending[0]!;
  const opponent = opponentOf(sort)!;
  const left = comparisonsLeft(sort, tiers);
  const done = sort.answered;
  const placed = sort.sorted.length;
  const total = placed + sort.pending.length;
  const view = useRef<HTMLDivElement>(null);
  // A new pair: the picked frame's button is gone, so put the focus back on the left frame.
  useEffect(() => {
    if (!view.current?.contains(document.activeElement)) view.current?.querySelector<HTMLElement>('.ranker__pick')?.focus();
  }, [challenger, opponent]);
  useKeys((k) => {
    if (k === 'ArrowLeft' || k === '1') choose(true);
    else if (k === 'ArrowRight' || k === '2') choose(false);
    else if (k === 'Backspace' || k === 'z' || k === 'Z') undoChoice();
    else return false;
    return true;
  });
  return (
    <div ref={view} className="ranker__compare-view">
      <p className="ranker__question">Which frame do you like better?</p>
      <div className="ranker__compare">
        <Contender key={`new|${challenger}`} id={challenger} shape={shape} side="new" onPick={() => choose(true)} />
        <Contender key={`ranked|${opponent}`} id={opponent} shape={shape} side="ranked" onPick={() => choose(false)} />
      </div>
      <div className="ranker__progress">
        <progress max={done + left} value={done} aria-label="Ranking progress" />
        <span>
          {placed} of {total} frames placed · about {left} {left === 1 ? 'choice' : 'choices'} left
        </span>
      </div>
      <div className="ranker__actions">
        <button type="button" className="btn btn--small" disabled={!canUndo} onClick={undoChoice} aria-keyshortcuts="Backspace">
          <Undo2 size={14} aria-hidden="true" />
          Undo
        </button>
        <span className="ranker__keys">Keys: ← or 1 for the left frame, → or 2 for the right, Backspace to undo. Close any time and carry on later.</span>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => window.confirm('Throw away this ranking session? The ranking goes back to how it was before you started.') && cancelRanking()}
        >
          Throw away this session
        </button>
      </div>
    </div>
  );
}

// ── Home, the list, and the dialog ──────────────────────────────────────────

/** About how many choices placing these frames would take. */
function estimate(only?: readonly string[], fresh = false): number {
  const { order, tiers } = frameRanking.getState();
  const known = new Set(ALL_IDS);
  const kept = fresh ? [] : order.filter((id) => known.has(id));
  const placed = new Set(kept);
  const wanted = only ? new Set(only) : null;
  const pending = ALL_IDS.filter((id) => !placed.has(id) && (!wanted || wanted.has(id)));
  return comparisonsLeft(newSession(kept, pending, tiers), tiers);
}

/** Before ranking: what has been done, and the ways to start. */
function Home({ onView }: { onView: (v: View) => void }) {
  const order = useFrameRanking((s) => s.order);
  const tiers = useFrameRanking((s) => s.tiers);
  const tags = useFrameRanking((s) => s.tags);
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const known = new Set(ALL_IDS);
  const rankedIds = new Set(order.filter((id) => known.has(id)));
  const ranked = rankedIds.size;
  const unranked = ALL_IDS.length - ranked;
  const tiered = ALL_IDS.filter((id) => tiers[id]).length;
  const tagged = ALL_IDS.filter((id) => tags[id]?.length).length;
  const tierTodo = TIERS.map((t) => ({ ...t, ids: ALL_IDS.filter((id) => tiers[id] === t.tier && !rankedIds.has(id)) })).filter((t) => t.ids.length);
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportRanking()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frameRanking.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="ranker__home">
      <dl className="ranker__stats">
        <div>
          <dt>Frames</dt>
          <dd>{ALL_IDS.length}</dd>
        </div>
        <div>
          <dt>In a tier</dt>
          <dd>{tiered}</dd>
        </div>
        <div>
          <dt>Ranked</dt>
          <dd>{ranked}</dd>
        </div>
        <div>
          <dt>Tagged</dt>
          <dd>{tagged}</dd>
        </div>
      </dl>

      <section className="ranker__step">
        <h3>1. Sort into tiers</h3>
        <p>
          One frame at a time: one click puts it in a tier, S (the best) to D, and you tag it while it's in front of you. One click per frame gives the
          picker a rough order straight away, and makes the comparisons much quicker, because frames are only compared within their tier.
        </p>
        <div className="ranker__start">
          <button type="button" className={`btn${tiered < ALL_IDS.length ? ' btn--primary' : ''}`} onClick={() => onView('tiers')}>
            <Layers size={16} aria-hidden="true" />
            {tiered === 0 ? 'Sort into tiers' : tiered < ALL_IDS.length ? `Carry on (${ALL_IDS.length - tiered} left)` : 'Change tiers'}
          </button>
        </div>
      </section>

      <section className="ranker__step">
        <h3>2. Rank by comparing</h3>
        <p>
          Two frames side by side: pick the one you like better. Each frame is placed by halving the part of the ranking it could go in, so it takes only
          a handful of choices per frame. Close any time and carry on later.
        </p>
        <div className="ranker__start">
          {unranked > 0 && (
            <button type="button" className={`btn${tiered === ALL_IDS.length || tiered === 0 ? ' btn--primary' : ''}`} onClick={() => startRanking(ALL_IDS)}>
              <ListOrdered size={16} aria-hidden="true" />
              {ranked === 0 ? 'Rank every frame' : `Rank the ${unranked} not ranked yet`} (about {estimate()} choices)
            </button>
          )}
          {tierTodo.length > 1 &&
            tierTodo.map((t) => (
              <button key={t.tier} type="button" className="btn btn--small" onClick={() => startRanking(ALL_IDS, { only: t.ids })}>
                Tier {t.label} only: {t.ids.length} {t.ids.length === 1 ? 'frame' : 'frames'} (~{estimate(t.ids)})
              </button>
            ))}
        </div>
        {ranked > 0 && (
          <div className="ranker__start">
            <button type="button" className="btn btn--small" onClick={() => onView('list')}>
              <Tags size={14} aria-hidden="true" />
              See the ranking and tags
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => window.confirm('Rank every frame again from scratch? Tiers and tags are kept.') && startRanking(ALL_IDS, { fresh: true })}
            >
              <Shuffle size={14} aria-hidden="true" />
              Rank all again from scratch
            </button>
          </div>
        )}
      </section>

      <section className="ranker__step">
        <h3>Keep it</h3>
        <div className="ranker__file">
          <button type="button" className="btn btn--small" onClick={download} disabled={!ranked && !tagged && !tiered}>
            <Download size={14} aria-hidden="true" />
            Save ranking & tags
          </button>
          <button type="button" className="btn btn--small" onClick={() => file.current?.click()}>
            <Upload size={14} aria-hidden="true" />
            Open a saved ranking
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => window.confirm("Forget this browser's ranking, tiers and tags?") && (resetRanking(), setMessage('Ranking, tiers and tags cleared.'))}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Clear
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            data-testid="ranking-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void f.text().then((text) => setMessage(importRanking(text) ? `Opened ${f.name}.` : `${f.name} isn't a saved ranking.`));
            }}
          />
        </div>
        <p className="control__hint">
          Everything is kept in this browser as you go. Save a copy to keep it safe or move it to another browser; to ship it with the app for everyone,
          put the saved file in src/token-maker/config/frameRanking.json.
        </p>
        {message && (
          <p className="ranker__message" role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

/** The ranking as a list, with each frame's tier and tags (editable) and a way to place a frame again. */
function RankList({ shape, onRank }: { shape: ShapeId; onRank: () => void }) {
  const order = useFrameRanking((s) => s.order);
  const sort = useFrameRanking((s) => s.sort);
  const tiers = useFrameRanking((s) => s.tiers);
  const tags = useFrameRanking((s) => s.tags);
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const rank = useMemo(() => rankIndex({ order, sort, tiers }), [order, sort, tiers]);
  const compared = new Set(sort?.sorted ?? order);
  const listed = ALL_IDS.filter((id) => rank.has(id)).sort((a, b) => rank.get(a)! - rank.get(b)!);
  const rest = ALL_IDS.filter((id) => !rank.has(id));
  const keep = (id: string) => !untaggedOnly || !tags[id]?.length;
  const thumbs = useListThumbs([...listed, ...rest], shape);
  const row = (id: string, place: number | null) => (
    <li key={id} className="ranker__row">
      <div className="ranker__row-main">
        <span className="ranker__rank">{place === null ? '–' : place + 1}</span>
        <Img src={thumbs.get(id)} size={56} />
        <div className="ranker__row-text">
          <strong>
            {nameOf(id)}
            {tiers[id] ? <span className="ranker__tier-badge">{tierLabel(tiers[id])}</span> : null}
            {!compared.has(id) && place !== null ? <small className="ranker__untagged"> not compared yet</small> : null}
          </strong>
          <TagList frameId={id} />
        </div>
        <button type="button" className="btn btn--ghost btn--small" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
          <Tags size={14} aria-hidden="true" />
          Edit
        </button>
        {compared.has(id) && !sort && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              rerankFrame(id);
              onRank();
            }}
          >
            <Shuffle size={14} aria-hidden="true" />
            Place again
          </button>
        )}
      </div>
      {open === id && (
        <div className="ranker__row-edit">
          <TierButtons frameId={id} />
          <TagButtons frameId={id} />
        </div>
      )}
    </li>
  );
  return (
    <div className="ranker__list-view">
      <label className="ranker__filter">
        <input type="checkbox" checked={untaggedOnly} onChange={(e) => setUntaggedOnly(e.target.checked)} />
        Only frames with no tags
      </label>
      <ol className="ranker__list" aria-label="Your ranking">
        {listed.filter(keep).map((id) => row(id, rank.get(id)!))}
      </ol>
      {rest.some(keep) && (
        <>
          <h3 className="ranker__subhead">Not ranked yet</h3>
          <ul className="ranker__list">{rest.filter(keep).map((id) => row(id, null))}</ul>
        </>
      )}
    </div>
  );
}

export function FrameRanker({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const shape = useDoc((d) => d.shape);
  const sorting = useFrameRanking((s) => !!s.sort && opponentOf(s.sort) !== null);
  const [view, setView] = useState<View>('rank');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.querySelector<HTMLElement>('.ranker__body .ranker__pick, .ranker__body .ranker__tier, .ranker__body .btn--primary, .ranker__body .btn')?.focus();
  }, [view, sorting]);

  // Escape closes only the ranker (not the gallery under it).
  useKeys((k) => {
    if (k !== 'Escape') return false;
    onClose();
    return true;
  });

  const tab = (v: View, label: string) => (
    <button type="button" role="tab" aria-selected={view === v} className="frame-pick__tab" onClick={() => setView(v)}>
      {label}
    </button>
  );

  return createPortal(
    <div className="frame-pick__backdrop ranker__backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className="frame-pick__gallery ranker" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="frame-pick__head">
          <h2 id={titleId}>Rank & tag frames</h2>
          <div className="ranker__views" role="tablist" aria-label="Ranker views">
            {tab('rank', sorting ? 'Compare' : 'Start')}
            {tab('tiers', 'Tiers')}
            {tab('list', 'Ranking & tags')}
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="ranker__body">
          {view === 'list' ? (
            <RankList shape={shape} onRank={() => setView('rank')} />
          ) : view === 'tiers' ? (
            <TierPass shape={shape} />
          ) : sorting ? (
            <Compare shape={shape} />
          ) : (
            <Home onView={setView} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
