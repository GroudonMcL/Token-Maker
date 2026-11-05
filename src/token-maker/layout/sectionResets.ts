// "Revert to default" for each tab (owner request): the button at the top
// right of a tab's heading puts that tab's settings back as a new token has
// them, in one undo step. Tabs that hold no settings (Import, Presets) have none.

import { createDocument } from '../document/defaults';
import type { TokenDocument } from '../document/types';
import { updateFrameAndArt } from '../editor/artActions';
import { DEFAULT_EXPORT, setExportSettings } from '../export/exportSettings';
import { selectDecoration } from '../editor/tools';
import type { SectionId } from './sections';

type Recipe = (doc: TokenDocument, fresh: TokenDocument) => TokenDocument;

const RECIPES: Partial<Record<SectionId, Recipe>> = {
  image: (d, f) => ({ ...d, art: { ...d.art, adjust: f.art.adjust } }),
  cutout: (d, f) => ({ ...d, art: { ...d.art, removal: f.art.removal, strokes: [] } }),
  background: (d, f) => ({ ...d, background: f.background }),
  popout: (d, f) => ({ ...d, art: { ...d.art, popOut: f.art.popOut }, shadows: { ...d.shadows, popOut: f.shadows.popOut } }),
  // The outer spacing belongs to the Export tab's size settings, so the frame's reset leaves it.
  frame: (d, f) => ({ ...d, shape: f.shape, frame: { ...f.frame, outerSpacing: d.frame.outerSpacing } }),
  lighting: (d, f) => ({ ...d, lighting: f.lighting }),
  shadows: (d, f) => ({ ...d, shadows: { ...f.shadows, popOut: d.shadows.popOut } }),
  effects: (d) => ({ ...d, effects: [] }),
  decorations: (d) => ({ ...d, decorations: [] }),
  label: (d) => ({ ...d, label: null }),
  export: (d, f) => ({ ...d, size: f.size, frame: { ...d.frame, outerSpacing: f.frame.outerSpacing } }),
};

/** Whether this section has a "Revert to default" button. */
export const canReset = (id: SectionId) => id in RECIPES;

/** Puts this section's settings back to a new token's. */
export function resetSection(id: SectionId): void {
  const recipe = RECIPES[id];
  if (!recipe) return;
  const fresh = createDocument();
  updateFrameAndArt((d) => recipe(d, fresh));
  if (id === 'decorations') selectDecoration(null);
  if (id === 'export') {
    const { format, pxPerSquare, quality } = DEFAULT_EXPORT;
    setExportSettings({ format, pxPerSquare, quality });
  }
}
