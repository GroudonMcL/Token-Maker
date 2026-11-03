// The frame picker (owner's choice in the frame review, "P1"): the panel
// shows only the chosen frame and a Change button; Change pops out a gallery
// with a tab per group, search and large thumbnails. Every frame is a tile of
// its own (owner's request: no versions stacked behind another frame).
// Once the frames are ranked (FrameRanker.tsx), the gallery opens on "My
// ranking", every frame best first, and each group lists its frames in that
// order too; the tags given while ranking filter the frames and are found by
// the search.

import { ListOrdered, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ControlLabel } from '../components';
import { FRAME_TAG_GROUPS, tagLabel } from '../config/frameTags';
import { byRank, rankIndex, tierLabel, useFrameRanking } from '../state/frameRanking';
import { FrameRanker } from './FrameRanker';

export interface FrameTile {
  id: string;
  label: string;
  group: string;
}

export function FramePicker({
  tiles,
  thumbs,
  value,
  onChange,
  onOpen,
}: {
  tiles: readonly FrameTile[];
  thumbs: Map<string, string> | null;
  value: string;
  onChange: (id: string) => void;
  /** The gallery is opening: time to draw every tile's thumbnail. */
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const current = tiles.find((t) => t.id === value);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  return (
    <div className="frame-pick" data-control="frame-picker" data-help-id="frame.style">
      <ControlLabel label="Frame" helpId="frame.style" />
      <div className="frame-pick__current" data-testid="current-frame">
        <Thumb src={thumbs?.get(value)} size={56} />
        <div className="frame-pick__current-text">
          <strong>{current?.label ?? 'Frame'}</strong>
          <small>{current?.group}</small>
        </div>
        <button ref={button} type="button" className="btn btn--primary frame-pick__change" aria-haspopup="dialog" aria-expanded={open} onClick={() => {
            onOpen?.();
            setOpen(true);
          }}>
          Change frame
        </button>
      </div>
      {open &&
        createPortal(
          <Gallery
            tiles={tiles}
            thumbs={thumbs}
            value={value}
            onPick={(id) => {
              onChange(id);
              close();
            }}
            onClose={close}
          />,
          document.body,
        )}
    </div>
  );
}

function Thumb({ src, size }: { src: string | undefined; size: number }) {
  return src ? <img src={src} alt="" width={size} height={size} /> : <span className="tile__blank" style={{ width: size, height: size }} />;
}

/** The gallery tab listing every frame in the owner's ranking. */
const RANKED = 'My ranking';

function Gallery({ tiles: allTiles, thumbs, value, onPick, onClose }: { tiles: readonly FrameTile[]; thumbs: Map<string, string> | null; value: string; onPick: (id: string) => void; onClose: () => void }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const order = useFrameRanking((s) => s.order);
  const sort = useFrameRanking((s) => s.sort);
  const tiers = useFrameRanking((s) => s.tiers);
  const tagsOf = useFrameRanking((s) => s.tags);
  const [ranking, setRanking] = useState(false);
  const rankButton = useRef<HTMLButtonElement>(null);
  const rank = useMemo(() => rankIndex({ order, sort, tiers }), [order, sort, tiers]);
  const hasRanking = allTiles.some((t) => rank.has(t.id));
  const ranked = useMemo(() => byRank(allTiles, (t) => t.id, rank), [allTiles, rank]);
  const groups = useMemo(() => [...(hasRanking ? [RANKED] : []), ...new Set(allTiles.map((t) => t.group))], [allTiles, hasRanking]);
  const chosen = allTiles.find((t) => t.id === value);
  const [picked, setTab] = useState(hasRanking ? RANKED : (chosen?.group ?? groups[0]));
  // (The ranking tab goes if the ranking is cleared while the gallery is open.)
  const tab = groups.includes(picked!) ? picked : groups[0];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string[]>([]);
  // The tags in use, in the order they are listed in.
  const usedTags = useMemo(() => {
    const used = new Set(allTiles.flatMap((t) => tagsOf[t.id] ?? []));
    return FRAME_TAG_GROUPS.flatMap((g) => g.tags.filter((t) => used.has(t.id)));
  }, [allTiles, tagsOf]);
  const tiles = filter.length ? ranked.filter((t) => filter.every((f) => tagsOf[t.id]?.includes(f))) : ranked;
  const inTab = (g: string) => (g === RANKED ? tiles : tiles.filter((t) => t.group === g));

  useEffect(() => {
    const start = box.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? box.current?.querySelector<HTMLElement>('input');
    start?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const tileButton = (t: FrameTile) => (
    <button
      key={t.id}
      type="button"
      role="radio"
      aria-checked={t.id === value}
      className="frame-pick__tile"
      onClick={() => onPick(t.id)}
    >
      {tab === RANKED && !q && rank.has(t.id) && (
        <span className="frame-pick__rank" title={tiers[t.id] ? `Tier ${tierLabel(tiers[t.id])}` : undefined}>
          {tiers[t.id] ? `${tierLabel(tiers[t.id])} · ` : ''}
          {rank.get(t.id)! + 1}
        </span>
      )}
      <Thumb src={thumbs?.get(t.id)} size={72} />
      <span>{t.label}</span>
    </button>
  );
  const words = (t: FrameTile) => `${t.label} ${t.group} ${(tagsOf[t.id] ?? []).map(tagLabel).join(' ')}`.toLowerCase();
  const shown = (q ? tiles.filter((t) => words(t).includes(q)) : inTab(tab)).map(tileButton);

  return (
    <div className="frame-pick__backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        className="frame-pick__gallery"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="frame-pick__head">
          <h2 id={titleId}>Choose a frame</h2>
          <label className="frame-pick__search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search frames" aria-label="Search frames" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button ref={rankButton} type="button" className="btn btn--small" onClick={() => setRanking(true)}>
            <ListOrdered size={14} aria-hidden="true" />
            Rank & tag
          </button>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {usedTags.length > 0 && (
          <div className="frame-pick__filters" role="group" aria-label="Show only frames tagged">
            {usedTags.map((t) => (
              <button
                key={t.id}
                type="button"
                className="ranker__chip"
                aria-pressed={filter.includes(t.id)}
                onClick={() => setFilter((f) => (f.includes(t.id) ? f.filter((x) => x !== t.id) : [...f, t.id]))}
              >
                {t.label}
              </button>
            ))}
            {filter.length > 0 && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setFilter([])}>
                Clear
              </button>
            )}
          </div>
        )}
        <div className="frame-pick__body">
          <div className="frame-pick__tabs" role="tablist" aria-label="Frame groups">
            {groups.map((g) => (
              <button key={g} type="button" role="tab" aria-selected={!q && g === tab} className="frame-pick__tab" onClick={() => (setTab(g), setQuery(''))}>
                {g}
                <small>{inTab(g).length}</small>
              </button>
            ))}
          </div>
          <div className="frame-pick__grid" role="radiogroup" aria-label={q ? 'Matching frames' : `${tab} frames`}>
            {shown.length ? shown : <p className="frame-pick__none">{q ? `No frames match “${query}”.` : 'No frames with all of these tags here.'}</p>}
          </div>
        </div>
      </div>
      {ranking && (
        <FrameRanker
          onClose={() => {
            setRanking(false);
            rankButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
