// Copy, cut and paste layers, within a project, between projects and between
// browser tabs (DESIGN.md §6.2). Copied layers go on the system clipboard as
// text (a small layers file, project/transfer.ts) and into localStorage,
// which every Frame Maker tab of this browser shares, for when the
// clipboard can't be read without asking.

import { cloneAllWithNewIds, findLayer, flatten, isLocked, locate } from '../project/tree';
import { newId } from '../project/defaults';
import { parseLayers, serializeLayers, type LayerSet } from '../project/transfer';
import type { Layer } from '../project/types';
import { showMessage } from './messages';
import { addLayers, deleteLayer, history, ui } from './projectStore';

export const CLIPBOARD_KEY = 'frame-studio:clipboard';

/** The picked layers, bottom first, leaving out ones inside a picked group (they come with it). */
export function pickedLayers(): Layer[] {
  const all = history.getState().present.layers;
  const ids = ui.getState().selectedIds.filter((id) => findLayer(all, id));
  const picked = ids.filter((id) => !locate(all, id)!.ancestors.some((g) => ids.includes(g.id)));
  const order = flatten(all).map((l) => l.id);
  return picked.sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((id) => findLayer(all, id)!);
}

/** A name for some layers: the layer's own name, or "3 layers". */
export const nameFor = (layers: Layer[]) => (layers.length === 1 ? layers[0].name : `${layers.length} layers`);

/** The picked layers as a layer set, or null if none are picked. */
export function pickedSet(): LayerSet | null {
  const layers = pickedLayers();
  return layers.length ? { name: nameFor(layers), layers, stage: history.getState().present.stage } : null;
}

function remember(text: string): void {
  try {
    localStorage.setItem(CLIPBOARD_KEY, text);
  } catch {
    // Storage can be blocked; the system clipboard still has them.
  }
}

function remembered(): string | null {
  try {
    return localStorage.getItem(CLIPBOARD_KEY);
  } catch {
    return null;
  }
}

/** The text to put on the clipboard for the picked layers (and remembers it for other tabs), or null if none are picked. */
export function copyPicked(): string | null {
  const set = pickedSet();
  if (!set) return null;
  const text = serializeLayers(set);
  remember(text);
  return text;
}

/** Copies the picked layers, then deletes the ones that aren't locked. */
export function cutPicked(): string | null {
  const text = copyPicked();
  if (text === null) return null;
  const layers = history.getState().present.layers;
  for (const l of pickedLayers()) if (!isLocked(layers, l.id)) deleteLayer(l.id);
  return text;
}

/**
 * Pastes copied layers just above the selected one, with new ids, as one
 * undo step. `text` is the clipboard's text; when it is empty or couldn't
 * be read, the layers last copied in any tab are used. Returns false if
 * there were no layers to paste (other text on the clipboard is left alone).
 */
export function pasteLayers(text: string | null): boolean {
  let result = text ? parseLayers(text) : null;
  if (!text) {
    // Nothing could be read from the clipboard: use the layers last copied in a Frame Maker tab.
    const kept = remembered();
    result = kept ? parseLayers(kept) : null;
  }
  if (!result?.ok) return false;
  const layers = cloneAllWithNewIds(result.set.layers, newId);
  addLayers(layers);
  showMessage(`Pasted ${layers.length === 1 ? `"${layers[0].name}"` : `${layers.length} layers`}.${result.warnings.length ? ` ${result.warnings.join(' ')}` : ''}`);
  return true;
}

/** Copy from a button: the system clipboard if it allows, and always the shared copy. */
export async function copyToClipboard(cut = false): Promise<void> {
  const text = cut ? cutPicked() : copyPicked();
  if (text === null) return;
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // Not allowed (or not focused): the shared copy is enough for Frame Maker tabs.
  }
  showMessage(cut ? 'Cut. Paste it with Ctrl+V, here or in another Frame Maker tab.' : 'Copied. Paste it with Ctrl+V, here or in another Frame Maker tab.');
}

/** Paste from a button or menu: the system clipboard if it can be read, otherwise the shared copy. */
export async function pasteFromClipboard(): Promise<void> {
  let text: string | null = null;
  try {
    text = (await navigator.clipboard?.readText()) ?? null;
  } catch {
    text = null;
  }
  if (!pasteLayers(text)) showMessage('There are no copied layers to paste yet. Pick a layer and press Copy (Ctrl+C) first.', true);
}
