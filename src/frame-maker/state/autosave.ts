// Keeps the open project in IndexedDB so a refresh or a closed tab loses
// nothing (as token-maker does). Only the project's JSON is stored.

import { del, get, set } from 'idb-keyval';
import { parseProject, serializeProject } from '../project/migrate';
import type { FrameProject } from '../project/types';
import { history } from './projectStore';

export const AUTOSAVE_KEY = 'frame-studio:project';
const DELAY_MS = 400;

/** The autosaved project, or null if there is none or it can't be read. */
export async function loadAutosave(): Promise<FrameProject | null> {
  try {
    const text = await get<string>(AUTOSAVE_KEY);
    if (!text) return null;
    const result = parseProject(text);
    return result.ok ? result.project : null;
  } catch {
    return null;
  }
}

export async function saveNow(project: FrameProject): Promise<void> {
  try {
    await set(AUTOSAVE_KEY, serializeProject(project));
  } catch {
    // Storage can be blocked (private windows); the editor still works.
  }
}

export const clearAutosave = () => del(AUTOSAVE_KEY).catch(() => {});

/** Saves shortly after every change. Returns a function that stops it. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = history.getState().present;
  const stop = history.subscribe((s) => {
    if (s.present === last) return;
    last = s.present;
    clearTimeout(timer);
    timer = setTimeout(() => void saveNow(last), DELAY_MS);
  });
  return () => {
    clearTimeout(timer);
    stop();
  };
}
