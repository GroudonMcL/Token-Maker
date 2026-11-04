// The frame picker (owner's choice in the frame review, "P1"): the panel
// shows only the chosen frame and a Change button; Change pops out a gallery
// with a tab per group, search and large thumbnails. Every frame is a tile of
// its own (owner's request: no versions stacked behind another frame).
// The gallery opens on "All frames", every frame in the owner's ranking
// (config/frameOrder.json), and each group lists its frames in that order
// too. The owner's tags (config/frameTags.ts) filter the frames, and the
// search finds them.

import { Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ControlLabel } from '../components';
import { FRAME_TAG_GROUPS, tagLabel } from '../config/frameTags';
import { FRAME_TAGS, rankOf } from './frameTiles';

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
    <div className="frame-pick" data-control="frame-picker">
      <ControlLabel label="Frame" />
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

/** The gallery tab listing every frame, in the owner's ranking. */
const ALL = 'All frames';

function Gallery({ tiles: allTiles, thumbs, value, onPick, onClose }: { tiles: readonly FrameTile[]; thumbs: Map<string, string> | null; value: string; onPick: (id: string) => void; onClose: () => void }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  // Every frame best first; the groups keep their own order, with their frames in the same ranking.
  const ranked = useMemo(() => allTiles.map((t, i) => ({ t, i })).sort((a, b) => rankOf(a.t.id) - rankOf(b.t.id) || a.i - b.i).map(({ t }) => t), [allTiles]);
  const groups = useMemo(() => [ALL, ...new Set(allTiles.map((t) => t.group))], [allTiles]);
  const [tab, setTab] = useState(ALL);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string[]>([]);
  // The tags in use, in the order they are listed in.
  const usedTags = useMemo(() => {
    const used = new Set(allTiles.flatMap((t) => FRAME_TAGS[t.id] ?? []));
    return FRAME_TAG_GROUPS.flatMap((g) => g.tags.filter((t) => used.has(t.id)));
  }, [allTiles]);
  const tiles = filter.length ? ranked.filter((t) => filter.every((f) => FRAME_TAGS[t.id]?.includes(f))) : ranked;
  const inTab = (g: string) => (g === ALL ? tiles : tiles.filter((t) => t.group === g));

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
      <Thumb src={thumbs?.get(t.id)} size={72} />
      <span>{t.label}</span>
    </button>
  );
  const words = (t: FrameTile) => `${t.label} ${t.group} ${(FRAME_TAGS[t.id] ?? []).map(tagLabel).join(' ')}`.toLowerCase();
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
                className="frame-pick__chip"
                aria-pressed={filter.includes(t.id)}
                onClick={() => setFilter((f) => (f.includes(t.id) ? f.filter((x) => x !== t.id) : [...f, t.id]))}
              >
                {t.label}
              </button>
            ))}
            {filter.length > 0 && (
              <button type="button" className="btn btn--ghost btn--small frame-pick__clear" onClick={() => setFilter([])}>
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
    </div>
  );
}
