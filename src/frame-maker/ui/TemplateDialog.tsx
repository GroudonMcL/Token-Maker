// Picking a starting point, laid out like Token Maker's "Choose a frame"
// gallery (owner's request): a search, the owner's tags to filter by, and a
// tab per group. "All frames" lists every frame Token Maker lists (its
// ready-made designs and its drawn frames) in Token Maker's own ranking; the
// category tabs split them by look and material; "Editable layers" has the
// drawn frames rebuilt from layers. A blank project is a button of its own.
// The same dialog adds a Token Maker frame to the open project, as editable
// layers (a group) or as the original.
//
// The ranking and the tags are Token Maker's own (src/token-maker/config),
// read from there so both apps always agree.

import { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus2, Search, X } from 'lucide-react';
import frameOrder from '../../token-maker/config/frameOrder.json';
import { FRAME_TAG_GROUPS, tagLabel } from '../../token-maker/config/frameTags';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { canConvert, differenceNote, editableGroup, editableProject } from '../project/convert';
import { createProject, legacyFrameLayer, projectFromFrame } from '../project/defaults';
import { BUILT_IN_FRAMES } from '../project/builtInFrames';
import { categoryOf, categoryRank } from '../project/frameCategories';
import type { FrameProject } from '../project/types';
import { addLayer, loadProject } from '../state/projectStore';
import { Tile } from './Thumbnail';

/** One frame in the gallery. */
interface Item {
  /** The thumbnail's cache key. */
  key: string;
  name: string;
  badge?: string;
  description?: string;
  group: string;
  /** Token Maker's id for the frame: its rank and tags. */
  tmId: string;
  editable: boolean;
  make: () => FrameProject;
  pick: (mode: Mode) => void;
}

type Mode = 'new' | 'addFrame';

const ALL = 'All frames';
const EDITABLE = 'Editable layers';

const RANK = new Map(frameOrder.order.map((id, i) => [id, i]));
const TAGS: Readonly<Record<string, readonly string[]>> = frameOrder.tags;
const rankOf = (id: string) => RANK.get(id) ?? Infinity;

const editableNote = (style: (typeof FRAME_PRESETS)[number]['style']) => `Editable layers drawn to look like the Token Maker frame. ${differenceNote(style)}`.trim();

const designs: Item[] = BUILT_IN_FRAMES.map((t) => ({
  key: `builtin:${t.id}`,
  name: t.name,
  description: t.description,
  group: t.group,
  tmId: `builtin:${t.id}`,
  editable: false,
  make: t.project,
  pick: () => loadProject(t.project()),
}));

const originals: Item[] = FRAME_PRESETS.map((p) => ({
  key: `frame:${p.id}`,
  name: p.name,
  description: 'Drawn by Token Maker’s own code, as one layer: change its colour and add layers over or under it.',
  group: categoryOf(p.id),
  tmId: p.id,
  editable: false,
  make: () => projectFromFrame(p.id),
  pick: (mode) => (mode === 'new' ? loadProject(projectFromFrame(p.id)) : addLayer(legacyFrameLayer(p.id))),
}));

const editables: Item[] = FRAME_PRESETS.filter((p) => canConvert(p.style)).map((p) => ({
  key: `editable:${p.id}`,
  name: p.name,
  badge: 'Editable',
  description: editableNote(p.style),
  group: EDITABLE,
  tmId: p.id,
  editable: true,
  make: () => editableProject(p.id)!,
  pick: (mode) => (mode === 'new' ? loadProject(editableProject(p.id)!) : addLayer(editableGroup(p.id)!)),
}));

/** Best first (Token Maker's ranking), keeping the listed order between equals. */
const ranked = (items: Item[]) => items.map((t, i) => ({ t, i })).sort((a, b) => rankOf(a.t.tmId) - rankOf(b.t.tmId) || a.i - b.i).map(({ t }) => t);

/** Every frame the dialog offers in each mode: Token Maker's list (designs only when starting anew), then the editable ones. */
const ITEMS: Record<Mode, Item[]> = {
  new: [...ranked([...designs, ...originals]), ...ranked(editables)],
  addFrame: [...ranked(originals), ...ranked(editables)],
};

/** The tab and tags chosen, kept while the page is open (as Token Maker's gallery keeps them). */
const remembered = new Map<'tab' | 'filter', string | string[]>();
const rememberedTab = () => remembered.get('tab') as string | undefined;
const rememberedFilter = () => (remembered.get('filter') as string[] | undefined) ?? [];

const words = (t: Item) => `${t.name} ${t.badge ?? ''} ${t.group} ${(TAGS[t.tmId] ?? []).map(tagLabel).join(' ')}`.toLowerCase();

export function TemplateDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const all = ITEMS[mode];
  // "All frames", the categories in their usual order, then the editable layers.
  const groups = useMemo(() => {
    const categories = [...new Set(all.filter((t) => !t.editable).map((t) => t.group))].sort((a, b) => categoryRank(a) - categoryRank(b));
    return [ALL, ...categories, EDITABLE];
  }, [all]);
  const [tab, setTabState] = useState(() => {
    const t = rememberedTab();
    return t && groups.includes(t) ? t : ALL;
  });
  const [filter, setFilterState] = useState<string[]>(rememberedFilter);
  const [query, setQuery] = useState('');
  const setTab = (t: string) => {
    remembered.set('tab', t);
    setTabState(t);
  };
  const setFilter = (next: string[]) => {
    remembered.set('filter', next);
    setFilterState(next);
  };

  // The tags in use, in the order they are listed in.
  const usedTags = useMemo(() => {
    const used = new Set(all.flatMap((t) => TAGS[t.tmId] ?? []));
    return FRAME_TAG_GROUPS.flatMap((g) => g.tags.filter((t) => used.has(t.id)));
  }, [all]);
  const tagged = filter.length ? all.filter((t) => filter.every((f) => TAGS[t.tmId]?.includes(f))) : all;
  const inTab = (g: string) => (g === ALL ? tagged.filter((t) => !t.editable) : tagged.filter((t) => t.group === g));
  const q = query.trim().toLowerCase();
  const shown = q ? tagged.filter((t) => words(t).includes(q)) : inTab(tab);

  const pick = (t: Item) => {
    t.pick(mode);
    onClose();
  };
  const title = mode === 'new' ? 'Start a new frame' : 'Add a Token Maker frame';

  return (
    <dialog ref={ref} className="dialog templates frame-gallery" aria-label={mode === 'new' ? 'New project' : 'Add a Token Maker frame'} onClose={onClose} onCancel={onClose}>
      <div className="frame-gallery__head">
        <h2>{title}</h2>
        <label className="frame-gallery__search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search frames" aria-label="Search frames" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {mode === 'new' && (
          <button
            type="button"
            className="btn small"
            title="Start from nothing and add your own layers"
            onClick={() => {
              loadProject(createProject());
              onClose();
            }}
          >
            <FilePlus2 size={16} aria-hidden="true" />
            Blank project
          </button>
        )}
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {usedTags.length > 0 && (
        <div className="frame-gallery__filters" role="group" aria-label="Show only frames tagged">
          {usedTags.map((t) => (
            <button
              key={t.id}
              type="button"
              className="frame-gallery__chip"
              aria-pressed={filter.includes(t.id)}
              onClick={() => setFilter(filter.includes(t.id) ? filter.filter((x) => x !== t.id) : [...filter, t.id])}
            >
              {t.label}
            </button>
          ))}
          {filter.length > 0 && (
            <button type="button" className="btn small frame-gallery__clear" onClick={() => setFilter([])}>
              Clear
            </button>
          )}
        </div>
      )}
      <div className="frame-gallery__body">
        <div className="frame-gallery__tabs" role="tablist" aria-label="Frame groups">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={!q && g === tab}
              className="frame-gallery__tab"
              onClick={() => {
                setTab(g);
                setQuery('');
              }}
            >
              {g}
              <small>{inTab(g).length}</small>
            </button>
          ))}
        </div>
        <div className="frame-gallery__panel" role="tabpanel" aria-label={q ? 'Matching frames' : `${tab}`}>
          {!q && tab === EDITABLE && (
            <p className="note">
              Token Maker’s drawn frames rebuilt from layers you can change one by one, and they follow the light. They look like the originals; hover over a frame to
              see any small difference.{mode === 'addFrame' ? ' They are added as a group.' : ''}
            </p>
          )}
          {!q && tab === ALL && (
            <p className="note">
              {mode === 'new'
                ? 'Every frame Token Maker lists, with similar frames together. Open one to change it, save it, and open the file in Token Maker.'
                : 'Token Maker’s drawn frames, each added as one layer. The Editable layers tab has them rebuilt from layers.'}
            </p>
          )}
          <div className="tiles">
            {shown.map((t) => (
              <Tile key={t.key} id={t.key} name={t.name} badge={t.badge} description={t.description} make={t.make} onPick={() => pick(t)} />
            ))}
          </div>
          {!shown.length && <p className="frame-gallery__none">{q ? `No frames match “${query}”.` : 'No frames with all of these tags here.'}</p>}
        </div>
      </div>
    </dialog>
  );
}
