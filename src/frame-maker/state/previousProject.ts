// The design that New, Open or a template last replaced, kept in IndexedDB so
// a design replaced by mistake can still be reopened after the page is
// closed (the New dialog lists it first). Undo brings it back while the page
// is open; this is for afterwards. One design is kept: the latest replaced.

import { get, set } from 'idb-keyval';
import { parseProject, serializeProject } from '../project/migrate';
import type { FrameProject } from '../project/types';

export const PREVIOUS_KEY = 'frame-studio:previous-project';

export interface PreviousProject {
  project: FrameProject;
  /** When it was replaced (ms since 1970). */
  replacedAt: number;
}

/** Keeps the design being replaced. Storage can be blocked (private windows): then only Undo has it. */
export async function keepPrevious(project: FrameProject, now = Date.now()): Promise<void> {
  try {
    await set(PREVIOUS_KEY, { text: serializeProject(project), replacedAt: now });
  } catch {
    // Nothing to do: the editor still works, and Undo still brings it back.
  }
}

/** The design last replaced, or null if there is none or it can't be read. */
export async function loadPrevious(): Promise<PreviousProject | null> {
  try {
    const saved = await get<{ text: string; replacedAt: number }>(PREVIOUS_KEY);
    if (!saved || typeof saved.text !== 'string') return null;
    const result = parseProject(saved.text);
    return result.ok ? { project: result.project, replacedAt: Number(saved.replacedAt) || 0 } : null;
  } catch {
    return null;
  }
}
