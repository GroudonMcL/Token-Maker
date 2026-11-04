// The fonts text layers use are web fonts: the canvas can only draw with them
// once they are loaded, so the editor loads them first and draws again.

import { FONT_FAMILIES, registerBundledFonts } from '../render/text';
import { clearLayerCache } from '../render/layerCache';

let ready: Promise<void> | null = null;

/** Loads every font text layers can use (once); pictures drawn before then are forgotten. */
export function loadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve();
  ready ??= registerBundledFonts()
    .then(() => Promise.all(Object.values(FONT_FAMILIES).map((f) => document.fonts.load(`${f.weight} 32px "${f.family}"`))))
    .then(() => clearLayerCache())
    .catch(() => {});
  return ready;
}
