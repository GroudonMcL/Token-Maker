import { useEffect } from 'react';
import { redo, undo } from '../state/tokenStore';

/** Input types that edit text, and so have their own undo. */
const TEXT_INPUTS = new Set(['', 'text', 'search', 'url', 'email', 'tel', 'password', 'number']);

/** True for a box the user types in (it keeps Ctrl+Z for its own text). */
export function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable]:not([contenteditable="false"])') || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUTS.has(target.getAttribute('type')?.toLowerCase() ?? '');
}

/** Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z (Cmd on Mac) for undo and redo (DESIGN.md §4.3). */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      // Text boxes keep their own undo, and a modal dialog (the frame gallery) covers the token.
      if (isTextField(e.target) || document.querySelector('[aria-modal="true"], dialog[open]')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
