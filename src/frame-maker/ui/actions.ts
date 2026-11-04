// Small pieces shared by the panels and dialogs.

import type { KeyboardEvent } from 'react';
import { pickedSet } from '../state/clipboard';
import { saveToLibrary } from '../state/library';
import { showMessage } from '../state/messages';

/** Moves focus between the items of an open menu with the arrow keys, Home and End; Escape closes it. */
export function menuKeys(e: KeyboardEvent<HTMLElement>, close: () => void): void {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const go = (i: number) => items[(i + items.length) % items.length]?.focus();
  if (e.key === 'ArrowDown') go(at + 1);
  else if (e.key === 'ArrowUp') go(at - 1);
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(items.length - 1);
  else if (e.key === 'Escape') close();
  else return;
  e.preventDefault();
  e.stopPropagation();
}

export async function saveSelectionToLibrary(): Promise<void> {
  const set = pickedSet();
  if (!set) return;
  await saveToLibrary(set);
  showMessage(`Saved "${set.name}" to your library. Add it to any design from Add layer → From your library.`);
}
