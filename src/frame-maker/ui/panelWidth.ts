// The side panels' widths: dragged wider or narrower with their handles
// (PanelResizer) and remembered in this browser.

export type PanelSide = 'layers' | 'properties';

export const PANEL_MIN = 220;
const PANEL_MAX = 640;
const KEYS: Record<PanelSide, string> = { layers: 'fs.layersWidth', properties: 'fs.propertiesWidth' };

/** Widest a panel may be: both together leave at least 40 % of the window to the canvas. */
export const panelMax = () => Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.round(window.innerWidth * 0.3)));
export const clampPanel = (w: number) => Math.round(Math.min(panelMax(), Math.max(PANEL_MIN, w)));

/** The saved width of a panel, or null for the layout's own. */
export function readPanelWidth(side: PanelSide): number | null {
  try {
    const n = Number(localStorage.getItem(KEYS[side]));
    return n >= PANEL_MIN ? n : null;
  } catch {
    return null;
  }
}

export function savePanelWidth(side: PanelSide, w: number | null): void {
  try {
    if (w === null) localStorage.removeItem(KEYS[side]);
    else localStorage.setItem(KEYS[side], String(w));
  } catch {
    /* storage blocked: the width just won't be remembered */
  }
}
