// Token Maker's themes (palettes.css). The choice is kept in this browser as
// 'ts.palette' and set as <html data-palette> (and data-theme, light or dark)
// on the page and in both apps; each page's index.html applies it before
// painting (keep THEME_SCRIPT's list in step), and a change in one app reaches
// the others through the storage event. There is no separate light/dark
// switch any more: Light and Day are the light themes.

import { useEffect, useState } from 'react';

export const PALETTES = [
  { id: 'midnight', name: 'Dark', mode: 'dark', note: 'Graphite panels on a navy page. The default.' },
  { id: 'light', name: 'Light', mode: 'light', note: 'Bright paper and white panels, brass for what matters.' },
  { id: 'lamplit', name: 'Rustic', mode: 'dark', note: 'Warm charcoal and brass under a navy sky.' },
  { id: 'obsidian', name: 'Night', mode: 'dark', note: 'Near-black, with a gold glow on what is chosen.' },
  { id: 'day', name: 'Day', mode: 'light', note: 'Light but soft: parchment and leather browns.' },
  { id: 'sunset', name: 'Sunset', mode: 'dark', note: 'Plum dusk glowing into orange, amber highlights.' },
  { id: 'ocean', name: 'Ocean', mode: 'dark', note: 'Deep water rising to shallow teal, aqua highlights.' },
] as const;

export type PaletteId = (typeof PALETTES)[number]['id'];

export const PALETTE_KEY = 'ts.palette';
export const DEFAULT_PALETTE: PaletteId = 'midnight';

/** Token Maker's old light/dark switch: someone who had picked light starts on Light. */
export const OLD_THEME_KEY = 'tm.theme';

const isPalette = (v: unknown): v is PaletteId => PALETTES.some((p) => p.id === v);

/** Light or dark: what the apps' own light and dark colours follow (tokens.css). */
export const paletteMode = (id: PaletteId): 'light' | 'dark' => PALETTES.find((p) => p.id === id)!.mode;

/** The saved theme. A scheme that has been removed, or none, falls back to Dark (or Light, if the old switch was on light). */
export function readPalette(): PaletteId {
  try {
    const v = localStorage.getItem(PALETTE_KEY);
    if (isPalette(v)) return v;
    return localStorage.getItem(OLD_THEME_KEY) === 'light' ? 'light' : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function applyPalette(id: PaletteId): void {
  document.documentElement.setAttribute('data-palette', id);
  document.documentElement.setAttribute('data-theme', paletteMode(id));
}

/**
 * The same as readPalette + applyPalette, as plain script for each page's
 * <head>, so the theme is there before the page paints (no flash).
 * palettes.test.ts checks every page has it, in step with PALETTES.
 */
export const THEME_SCRIPT = `try{var p=localStorage.getItem('ts.palette'),l=[${PALETTES.map((p) => `'${p.id}'`).join(',')}],m=[${PALETTES.filter((p) => p.mode === 'light')
  .map((p) => `'${p.id}'`)
  .join(',')}];if(l.indexOf(p)<0)p=localStorage.getItem('tm.theme')==='light'?'light':'midnight';document.documentElement.setAttribute('data-palette',p);document.documentElement.setAttribute('data-theme',m.indexOf(p)<0?'dark':'light')}catch(e){}`;

/** The chosen scheme and a setter that applies and remembers it; follows changes made in the other app. */
export function usePalette() {
  const [palette, setPalette] = useState<PaletteId>(readPalette);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PALETTE_KEY) return;
      const next = readPalette();
      applyPalette(next);
      setPalette(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const choose = (id: PaletteId) => {
    applyPalette(id);
    setPalette(id);
    try {
      // Always saved (even Dark), so an old light/dark choice never overrides it.
      localStorage.setItem(PALETTE_KEY, id);
      localStorage.removeItem(OLD_THEME_KEY);
    } catch {
      /* storage blocked: the choice just won't be remembered */
    }
  };
  return [palette, choose] as const;
}
