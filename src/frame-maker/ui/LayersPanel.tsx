// The layer list: top of the stack first, like Photoshop. Groups fold open
// and shut and their layers sit indented under them. Pick (Ctrl+click or
// Shift+click to pick several; ↑/↓ to move through the list), rename (double
// click or F2), show/hide, lock, reorder (buttons, Alt+arrows or drag), group
// (Ctrl+G), ungroup (Ctrl+Shift+G), duplicate, copy and paste, save to the
// library and delete.

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Copy,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Group,
  Library,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  TriangleAlert,
  Ungroup,
} from 'lucide-react';
import { LAYER_TYPE_NAMES } from '../project/defaults';
import { locate } from '../project/tree';
import type { EditableLayerType, Layer } from '../project/types';
import {
  addLayer,
  deleteLayer,
  duplicateLayer,
  groupSelected,
  moveLayer,
  moveLayerTo,
  renameLayer,
  select,
  selectRange,
  toggleCollapsed,
  toggleLocked,
  toggleSelect,
  toggleVisible,
  ungroup,
  useProject,
  useUi,
} from '../state/projectStore';
import { copyToClipboard, pasteFromClipboard } from '../state/clipboard';
import { menuKeys, saveSelectionToLibrary } from './actions';

const ADDABLE: { type: EditableLayerType; hint: string }[] = [
  { type: 'bandFill', hint: 'Colour all or part of the band: flat, metal or a gradient.' },
  { type: 'line', hint: 'A line running round the band: rims, grooves, glowing or wavy lines.' },
  { type: 'repeat', hint: 'One shape repeated round the band: beads, studs, gems, runes, leaves.' },
  { type: 'shape', hint: 'One circle, rectangle, polygon or star, placed on the band.' },
  { type: 'path', hint: 'Draw your own shape by clicking points on the canvas.' },
  { type: 'text', hint: 'Words or runes running round the band or along a path: inscriptions, names, spells.' },
  { type: 'contours', hint: 'Several lines round the band at once, one inside the other: a quick ring.' },
  { type: 'growth', hint: 'Vines, roots, thorns, tendrils or antlers grown round the band or along a path.' },
  { type: 'cells', hint: 'The band divided into plates: flagstones, honeycomb, bricks, tiles or scales.' },
  { type: 'fracture', hint: 'Branching cracks across the band, or lightning running round it.' },
  { type: 'knotwork', hint: 'Two strands woven round the band, over and under.' },
  { type: 'gears', hint: 'Gears with teeth, spokes and hubs, round the band or along a path.' },
  { type: 'chain', hint: 'A chain of interlocking links round the band or along a path.' },
  { type: 'group', hint: 'An empty group to keep layers together.' },
];

interface Row {
  layer: Layer;
  depth: number;
}

/** The rows of the list, top first, skipping the insides of folded groups. */
function rowsOf(layers: Layer[], depth = 0): Row[] {
  return [...layers].reverse().flatMap((layer) => [
    { layer, depth },
    ...(layer.type === 'group' && !layer.collapsed ? rowsOf(layer.children, depth + 1) : []),
  ]);
}

export function LayersPanel({ onAddFrame, onAddTexture, onOpenLibrary }: { onAddFrame: () => void; onAddTexture: () => void; onOpenLibrary?: () => void }) {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const selectedIds = useUi((s) => s.selectedIds);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const found = selectedId ? locate(project.layers, selectedId) : null;
  const selected = found?.layer;
  const rows = rowsOf(project.layers);

  const onDrop = (e: DragEvent, target: Layer) => {
    e.preventDefault();
    if (dragId && dragId !== target.id) {
      // Dropped on the top half of a row: above it. On a group's lower half: into it.
      const r = e.currentTarget.getBoundingClientRect();
      const upper = e.clientY < r.top + r.height / 2;
      moveLayerTo(dragId, target.id, upper ? 'above' : target.type === 'group' ? 'into' : 'below');
    }
    setDragId(null);
  };

  // When the focused row goes (deleted or cut), the focus moves to the row picked in its place rather than being lost.
  useEffect(() => {
    if (selectedId && document.activeElement === document.body) list.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)?.focus();
  }, [selectedId, project]);

  // An opened menu takes the focus to its first item; closing it gives it back.
  useEffect(() => {
    if (menuOpen) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);
  const closeMenu = (refocus = true) => {
    setMenuOpen(false);
    if (refocus) menuButton.current?.focus();
  };

  /** ↑/↓ pick the row above or below (Shift adds to the picked ones), Home/End the first and last; the focus follows. */
  const moveFocus = (e: KeyboardEvent, id: string) => {
    const i = rows.findIndex((r) => r.layer.id === id);
    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : -1;
    const next = rows[to]?.layer;
    if (!next) return false;
    if (e.shiftKey) selectRange(next.id);
    else select(next.id);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus());
    return true;
  };

  const siblings = found ? (found.parent ? found.parent.children : project.layers) : [];
  const atTop = !!found && found.index === siblings.length - 1 && !found.parent;
  const atBottom = !!found && found.index === 0 && !found.parent;

  return (
    <aside className="panel layers" aria-label="Layers">
      <div className="panel-head">
        <h2 className="panel-title">Layers</h2>
        {onOpenLibrary && (
          <button type="button" className="icon-btn" aria-label="Your library" title="Your library: layers and groups you saved, to reuse in any design" onClick={onOpenLibrary}>
            <Library size={18} />
          </button>
        )}
        <div className="add-menu">
          <button ref={menuButton} type="button" className="btn small primary" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <Plus size={16} /> Add layer
          </button>
          {menuOpen && (
            <div className="menu" role="menu" aria-label="Add layer" ref={menu} onKeyDown={(e) => menuKeys(e, closeMenu)}>
              {ADDABLE.map(({ type, hint }) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    addLayer(type);
                    closeMenu(false);
                  }}
                >
                  <strong>{LAYER_TYPE_NAMES[type]}</strong>
                  <span>{hint}</span>
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu(false);
                  onAddTexture();
                }}
              >
                <strong>Texture…</strong>
                <span>Marble, hammered metal, wood, stone, stars, rope, scales and more, from the library.</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu(false);
                  onAddFrame();
                }}
              >
                <strong>Token Maker frame…</strong>
                <span>Add one of the 27 existing frames as a layer.</span>
              </button>
              {onOpenLibrary && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu(false);
                    onOpenLibrary();
                  }}
                >
                  <strong>From your library…</strong>
                  <span>Layers and groups you saved, to reuse in this design.</span>
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu(false);
                  void pasteFromClipboard();
                }}
              >
                <strong>Paste layers</strong>
                <span>The layers you last copied (Ctrl+V), from this design, another one or another tab.</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="muted">No layers yet. Add one, or start from a template with New.</p>
      ) : (
        <ul className="layer-list" role="tree" aria-label="Layers, top first" aria-multiselectable="true" ref={list}>
          {rows.map(({ layer, depth }) => {
            const isSel = selectedIds.includes(layer.id);
            return (
              <li
                key={layer.id}
                role="treeitem"
                aria-selected={isSel}
                aria-level={depth + 1}
                aria-expanded={layer.type === 'group' ? !layer.collapsed : undefined}
                data-id={layer.id}
                tabIndex={layer.id === selectedId || (!selectedId && layer === rows[0].layer) ? 0 : -1}
                className={`layer-row${isSel ? ' selected' : ''}${layer.visible ? '' : ' hidden-layer'}${dragId === layer.id ? ' dragging' : ''}`}
                style={{ paddingLeft: `calc(var(--space-2) + ${depth * 18}px)` }}
                draggable={renaming !== layer.id}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragId(layer.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, layer)}
                onDragEnd={() => setDragId(null)}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) toggleSelect(layer.id);
                  else if (e.shiftKey) selectRange(layer.id);
                  else select(layer.id);
                }}
                onDoubleClick={() => setRenaming(layer.id)}
                onKeyDown={(e) => {
                  if (renaming || e.target !== e.currentTarget) return;
                  if (e.key === 'F2') setRenaming(layer.id);
                  else if (e.altKey && e.key === 'ArrowUp') moveLayer(layer.id, 'up');
                  else if (e.altKey && e.key === 'ArrowDown') moveLayer(layer.id, 'down');
                  else if (e.key === ' ' || e.key === 'Enter') {
                    if (e.ctrlKey || e.metaKey) toggleSelect(layer.id);
                    else select(layer.id);
                  } else if (layer.type === 'group' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                    if (layer.collapsed === (e.key === 'ArrowRight')) toggleCollapsed(layer.id);
                  } else if (e.altKey || e.ctrlKey || e.metaKey || !moveFocus(e, layer.id)) return;
                  e.preventDefault();
                }}
              >
                {layer.type === 'group' ? (
                  <button
                    type="button"
                    className="icon-btn fold-btn"
                    aria-label={layer.collapsed ? `Open ${layer.name}` : `Fold ${layer.name}`}
                    aria-expanded={!layer.collapsed}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(layer.id);
                    }}
                  >
                    {layer.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  aria-pressed={!layer.visible}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisible(layer.id);
                  }}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                {renaming === layer.id ? (
                  <input
                    className="rename"
                    aria-label="Layer name"
                    autoFocus
                    defaultValue={layer.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameLayer(layer.id, e.target.value);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <span className="layer-name">
                    {layer.name}
                    <small>
                      {layer.type === 'group' ? `Group of ${layer.children.length}` : LAYER_TYPE_NAMES[layer.type]}
                      {layer.clip === 'below' ? ' · clipped' : layer.clip === 'band' ? ' · in band' : ''}
                      {layer.effects?.some((e) => e.on) ? ' · effects' : ''}
                      {layer.blend === 'destination-out' ? ' · cuts a hole' : ''}
                    </small>
                  </span>
                )}
                {layer.type === 'group' && (layer.collapsed ? <Folder size={16} className="faint" aria-hidden="true" /> : <FolderOpen size={16} className="faint" aria-hidden="true" />)}
                {layer.type === 'unsupported' && <TriangleAlert size={16} aria-label="Can't be drawn by this version" />}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
                  aria-pressed={layer.locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLocked(layer.id);
                  }}
                >
                  {layer.locked ? <Lock size={16} /> : <LockOpen size={16} className="faint" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="layer-actions" aria-label="Selected layer">
          <button type="button" className="icon-btn" aria-label="Move up" title="Move up (Alt+↑); at the top of a group, out of it" disabled={atTop} onClick={() => moveLayer(selected.id, 'up')}>
            <ArrowUp size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Move down" title="Move down (Alt+↓); at the bottom of a group, out of it" disabled={atBottom} onClick={() => moveLayer(selected.id, 'down')}>
            <ArrowDown size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Rename" title="Rename (F2)" onClick={() => setRenaming(selected.id)}>
            Aa
          </button>
          <button type="button" className="icon-btn" aria-label="Group" title="Put the picked layers in a group (Ctrl+G). Ctrl+click layers to pick several." onClick={groupSelected}>
            <Group size={18} />
          </button>
          {selected.type === 'group' && (
            <button type="button" className="icon-btn" aria-label="Ungroup" title="Take the layers out of this group (Ctrl+Shift+G)" onClick={() => ungroup(selected.id)}>
              <Ungroup size={18} />
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Duplicate" title="Duplicate (Ctrl+D)" onClick={() => duplicateLayer(selected.id)}>
            <Copy size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Copy" title="Copy the picked layers (Ctrl+C), to paste here, in another design or in another tab (Ctrl+V)" onClick={() => void copyToClipboard()}>
            <ClipboardCopy size={18} />
          </button>
          <button type="button" className="icon-btn" aria-label="Add to library" title="Keep the picked layers in your library, to reuse in any design" onClick={() => void saveSelectionToLibrary()}>
            <BookmarkPlus size={18} />
          </button>
          <button type="button" className="icon-btn danger" aria-label="Delete" title="Delete (Del)" onClick={() => deleteLayer(selected.id)}>
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
