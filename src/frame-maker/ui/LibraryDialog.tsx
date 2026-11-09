// The personal layer library (Add layer → From your library, or the library
// button over the layer list): every saved item as a tile drawn by the real
// renderer. Picking one adds its layers to the design; items can be renamed,
// removed, and moved between browsers and people as a library file.

import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Download, Pencil, Trash2, Upload, X } from 'lucide-react';
import { LIBRARY_EXTENSION, PROJECT_EXTENSION, readTextFile, saveLibraryFile } from '../io/files';
import { bandFillLayer } from '../project/defaults';
import { projectOf } from '../project/transfer';
import { importLibrary, insertLibraryItem, loadLibrary, removeFromLibrary, renameLibraryItem, useLibrary, type LibraryItem } from '../state/library';
import { loadUserStyles, useUserStyles } from '../state/styles';
import { showMessage } from '../state/messages';
import { useUi } from '../state/projectStore';
import { saveSelectionToLibrary } from './actions';
import { Tile } from './Thumbnail';

const countOf = (item: LibraryItem) => {
  const n = item.layers.length;
  return n === 1 ? (item.layers[0].type === 'group' ? `A group of ${item.layers[0].children.length}` : 'One layer') : `${n} layers`;
};

/** An item drawn on a thick, plain band (not part of the item) without the sample picture, so a small picture shows it well. */
function thumbnailOf(item: LibraryItem) {
  const p = projectOf(item);
  const band = { ...bandFillLayer(), paint: { kind: 'solid' as const, color: '#3a332a' } };
  return { ...p, layers: [band, ...p.layers], stage: { ...p.stage, showArt: false, thickness: 0.3, outerSpacing: 0.05 } };
}

export function LibraryDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const items = useLibrary();
  const styles = useUserStyles();
  const [loaded, setLoaded] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const hasSelection = useUi((s) => s.selectedIds.length > 0);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    void loadLibrary().then(() => setLoaded(true));
    void loadUserStyles();
  }, []);

  const pick = (item: LibraryItem) => {
    insertLibraryItem(item);
    showMessage(`Added "${item.name}".`);
    onClose();
  };

  return (
    <dialog ref={ref} className="dialog templates" aria-label="Your library" onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>Your library</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">
        <p className="note">
          Layers and groups you saved, to use again in any design. Pick one to add it above the selected layer; it fits the band of the design it goes into. The library is kept
          in this browser: export it to keep a copy, or to give it to someone else.
        </p>
        <div className="row library-actions">
          <button type="button" className="btn small" disabled={!hasSelection} onClick={() => void saveSelectionToLibrary()} title="Keep the layers picked in the layer list">
            <BookmarkPlus size={16} /> Add the picked layers
          </button>
          <button type="button" className="btn small" onClick={() => fileInput.current?.click()} title={`Add the items of a library file (${LIBRARY_EXTENSION}), or a project's layers`}>
            <Upload size={16} /> Import…
          </button>
          <button type="button" className="btn small" disabled={items.length === 0 && styles.length === 0} onClick={() => saveLibraryFile(items, 'Frame Maker library', styles)} title="Download every item, and your own styles, as one library file">
            <Download size={16} /> Export all
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={`${LIBRARY_EXTENSION},${PROJECT_EXTENSION},.json,application/json`}
            hidden
            data-testid="import-library"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const failed = { ok: false, error: "That file couldn't be read or added to your library." } as const;
              const text = await readTextFile(file).catch(() => undefined);
              if (text === undefined) return showMessage(failed.error, true);
              const result = text === null ? ({ ok: false, error: 'That file is too big to be a Frame Maker library.' } as const) : await importLibrary(text).catch(() => failed);
              if (!result.ok) return showMessage(result.error, true);
              const what = [result.count ? (result.count === 1 ? 'one item' : `${result.count} items`) : '', result.styles ? (result.styles === 1 ? 'one style' : `${result.styles} styles`) : ''].filter(Boolean).join(' and ');
              showMessage(`Added ${what} to your library.${result.warnings.length ? ` ${result.warnings.join(' ')}` : ''}`);
            }}
          />
        </div>
        {loaded && items.length === 0 ? (
          <p className="muted library-empty">
            Nothing saved yet. Pick a layer or group in the layer list and press <strong>Add to library</strong> (the bookmark button under the list).
          </p>
        ) : (
          <ul className="tiles library-items" aria-label="Saved items">
            {items.map((item) => (
              <li key={item.id} className="library-item">
                <Tile id={`library:${item.id}`} name={item.name} description={`${countOf(item)}. Click to add it to the design.`} make={() => thumbnailOf(item)} onPick={() => pick(item)} />
                {renaming === item.id ? (
                  <input
                    className="rename"
                    aria-label="Item name"
                    autoFocus
                    defaultValue={item.name}
                    onBlur={(e) => {
                      void renameLibraryItem(item.id, e.target.value);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setRenaming(null);
                      }
                    }}
                  />
                ) : (
                  <div className="library-item-actions">
                    <button type="button" className="icon-btn" aria-label={`Rename ${item.name}`} onClick={() => setRenaming(item.id)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Export ${item.name}`} title="Download this item as a library file" onClick={() => saveLibraryFile([item], item.name)}>
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => {
                        void removeFromLibrary(item.id);
                        showMessage(`Removed "${item.name}" from your library.`);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
