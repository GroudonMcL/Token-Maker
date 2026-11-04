// Your own styles (DESIGN.md §6.8): effect stacks saved under a name, next to
// the built-in ones in the style library. Kept in this browser's IndexedDB
// like the layer library, and carried by library files.

import { get, set } from 'idb-keyval';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { newId } from '../project/defaults';
import { checkEffects } from '../project/migrate';
import type { SavedStyle } from '../project/transfer';
import type { Effect } from '../project/types';

export const STYLES_KEY = 'frame-studio:styles';

export interface UserStyle extends SavedStyle {
  id: string;
  savedAt: number;
}

export const userStyles = createStore<{ styles: UserStyle[]; loaded: boolean }>(() => ({ styles: [], loaded: false }));
export const useUserStyles = () => useStore(userStyles, (s) => s.styles);

const write = async (styles: UserStyle[]) => {
  userStyles.setState({ styles });
  try {
    await set(STYLES_KEY, styles);
  } catch {
    // Storage can be blocked (private windows); the styles last until the tab closes.
  }
};

/** Reads your styles from IndexedDB (once), each checked like effects in a file. */
export async function loadUserStyles(): Promise<UserStyle[]> {
  if (userStyles.getState().loaded) return userStyles.getState().styles;
  let stored: unknown = [];
  try {
    stored = (await get(STYLES_KEY)) ?? [];
  } catch {
    stored = [];
  }
  const styles = (Array.isArray(stored) ? stored : []).flatMap((s): UserStyle[] => {
    if (!s || typeof s !== 'object') return [];
    const o = s as Record<string, unknown>;
    const effects = checkEffects(o.effects, 'style', []);
    return effects.length ? [{ id: typeof o.id === 'string' ? o.id : newId(), name: typeof o.name === 'string' ? o.name : 'Style', effects, savedAt: typeof o.savedAt === 'number' ? o.savedAt : 0 }] : [];
  });
  const merged = [...styles, ...userStyles.getState().styles.filter((s) => !styles.some((x) => x.id === s.id))];
  userStyles.setState({ styles: merged, loaded: true });
  return merged;
}

/** Saves a stack of effects as a style of your own, newest first. */
export async function saveUserStyle(name: string, effects: Effect[]): Promise<UserStyle> {
  await loadUserStyles();
  const style: UserStyle = { id: newId(), name: name.trim() || 'My style', effects: structuredClone(effects), savedAt: Date.now() };
  await write([style, ...userStyles.getState().styles]);
  return style;
}

export async function removeUserStyle(id: string): Promise<void> {
  await write(userStyles.getState().styles.filter((s) => s.id !== id));
}

/** Adds styles (from a library file). */
export async function addUserStyles(styles: SavedStyle[]): Promise<void> {
  await loadUserStyles();
  const now = Date.now();
  await write([...styles.map((s, k): UserStyle => ({ ...structuredClone(s), id: newId(), savedAt: now - k })), ...userStyles.getState().styles]);
}

/** Forgets your styles in memory (tests). */
export const resetUserStyles = () => userStyles.setState({ styles: [], loaded: false });
