// The personal layer library (DESIGN.md §6.1): layers and groups saved for
// reuse in any design, kept in IndexedDB in this browser. Each item is stored
// as the text of a layers file (project/transfer.ts), so it is read with the
// same checks and migrations as a project file when Frame Maker is updated.

import { get, set } from 'idb-keyval';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { newId } from '../project/defaults';
import { parseLayers, parseLibrary, serializeLayers, type LayerSet } from '../project/transfer';
import { cloneAllWithNewIds } from '../project/tree';
import { addLayers } from './projectStore';
import { addUserStyles } from './styles';

export const LIBRARY_KEY = 'frame-studio:library';

export interface LibraryItem extends LayerSet {
  id: string;
  savedAt: number;
}

interface Stored {
  id: string;
  savedAt: number;
  text: string;
}

export const library = createStore<{ items: LibraryItem[]; loaded: boolean }>(() => ({ items: [], loaded: false }));
export const useLibrary = () => useStore(library, (s) => s.items);

const write = async (items: LibraryItem[]) => {
  library.setState({ items });
  try {
    await set(
      LIBRARY_KEY,
      items.map((i): Stored => ({ id: i.id, savedAt: i.savedAt, text: serializeLayers(i) })),
    );
  } catch {
    // Storage can be blocked (private windows); the library lasts until the tab closes.
  }
};

/** Reads the library from IndexedDB (once; later calls reuse it). */
export async function loadLibrary(): Promise<LibraryItem[]> {
  if (library.getState().loaded) return library.getState().items;
  let stored: Stored[] = [];
  try {
    stored = (await get<Stored[]>(LIBRARY_KEY)) ?? [];
  } catch {
    stored = [];
  }
  const items = (Array.isArray(stored) ? stored : []).flatMap((s): LibraryItem[] => {
    const r = parseLayers(s?.text);
    return r.ok ? [{ ...r.set, id: typeof s.id === 'string' ? s.id : newId(), savedAt: typeof s.savedAt === 'number' ? s.savedAt : 0 }] : [];
  });
  // Something may have been saved while it was loading.
  const merged = [...items, ...library.getState().items.filter((i) => !items.some((x) => x.id === i.id))];
  library.setState({ items: merged, loaded: true });
  return merged;
}

/** Saves layers (bottom first) as a new library item, newest first. */
export async function saveToLibrary(set: LayerSet): Promise<LibraryItem> {
  await loadLibrary();
  const item: LibraryItem = { ...structuredClone(set), id: newId(), savedAt: Date.now() };
  await write([item, ...library.getState().items]);
  return item;
}

export async function removeFromLibrary(id: string): Promise<void> {
  await write(library.getState().items.filter((i) => i.id !== id));
}

export async function renameLibraryItem(id: string, name: string): Promise<void> {
  await write(library.getState().items.map((i) => (i.id === id ? { ...i, name: name.trim() || i.name } : i)));
}

/** Adds the items (and styles) of a library file (or a layers or project file) to the library. Returns how many, or the reason it couldn't. */
export async function importLibrary(text: string): Promise<{ ok: true; count: number; styles: number; warnings: string[] } | { ok: false; error: string }> {
  const r = parseLibrary(text);
  if (!r.ok) return r;
  await loadLibrary();
  const now = Date.now();
  const added = r.sets.map((s, k): LibraryItem => ({ ...s, id: newId(), savedAt: now - k }));
  if (added.length) await write([...added, ...library.getState().items]);
  if (r.styles.length) await addUserStyles(r.styles);
  return { ok: true, count: added.length, styles: r.styles.length, warnings: r.warnings };
}

/** Puts an item's layers into the open project, just above the selected layer, with new ids (one undo step). */
export function insertLibraryItem(item: LayerSet): void {
  addLayers(cloneAllWithNewIds(item.layers, newId));
}

/** Forgets the library in memory (tests). */
export const resetLibrary = () => library.setState({ items: [], loaded: false });
