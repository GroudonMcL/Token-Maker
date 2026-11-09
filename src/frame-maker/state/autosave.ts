// Keeps the open project in IndexedDB so a refresh or a closed tab loses
// nothing (as token-maker does). Only the project's JSON is stored.

import { del, get, set } from 'idb-keyval';
import { parseProject, serializeProject } from '../project/migrate';
import type { FrameProject } from '../project/types';
import { showMessage } from './messages';
import { history } from './projectStore';

export const AUTOSAVE_KEY = 'frame-studio:project';
const DELAY_MS = 400;

/** A saved project that couldn't be read, set aside so autosave doesn't overwrite it. */
export const UNREADABLE_KEY = 'frame-studio:unreadable-project';

/**
 * The autosaved project, or null if there is none. One that can't be read
 * is first copied to UNREADABLE_KEY (`unreadable: true`), because autosave
 * overwrites the saved project as soon as the editor starts; a later version
 * of the site may be able to open it.
 */
export async function loadAutosave(): Promise<{ project: FrameProject | null; unreadable?: true }> {
  let text: unknown;
  try {
    text = await get(AUTOSAVE_KEY);
  } catch {
    // Storage is blocked (private windows): there is nothing to lose.
    return { project: null };
  }
  if (!text) return { project: null };
  try {
    if (typeof text !== 'string') throw new Error('Not a saved project');
    const result = parseProject(text);
    if (result.ok) return { project: result.project };
  } catch {
    // Kept below, like a project the reader refuses.
  }
  await set(UNREADABLE_KEY, { text, savedAt: Date.now() }).catch(() => {});
  return { project: null, unreadable: true };
}

/** Saves the project. False when the browser wouldn't store it (storage full, or blocked in a private window). */
export async function saveNow(project: FrameProject): Promise<boolean> {
  try {
    await set(AUTOSAVE_KEY, serializeProject(project));
    return true;
  } catch {
    return false;
  }
}

export const clearAutosave = () => del(AUTOSAVE_KEY).catch(() => {});

export const SAVE_FAILED_MESSAGE = "Your design couldn't be kept in this browser (its storage is full or blocked). Use Save to download a copy.";

/**
 * Saves shortly after every change, and at once when the page is hidden or
 * closed, so the last change isn't lost. Says so (once, until saving works
 * again) when the browser won't store it. Returns a function that stops it.
 */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = history.getState().present;
  let warned = false;
  const save = async () => {
    timer = undefined;
    const ok = await saveNow(last);
    if (!ok && !warned) showMessage(SAVE_FAILED_MESSAGE, true);
    warned = !ok;
  };
  const stop = history.subscribe((s) => {
    if (s.present === last) return;
    last = s.present;
    clearTimeout(timer);
    timer = setTimeout(() => void save(), DELAY_MS);
  });
  const flush = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    void save();
  };
  const onVisibility = () => document.visibilityState === 'hidden' && flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearTimeout(timer);
    stop();
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
