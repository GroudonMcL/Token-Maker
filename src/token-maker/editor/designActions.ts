// Opening Frame Maker designs and using them as the token's frame
// (DESIGN.md §6.12). A design is read by Frame Maker's own reader, kept in
// this browser's design library, and copied into the document.

import type { DesignFrame } from '../document/types';
import type { BuiltInBand } from '../render/defaultDesign';
import { readFrameDesign, type FrameProject } from '../frameMaker/share/frameDesign';
import { saveDesign } from '../state/designLibrary';
import { toast } from '../ui/toast';
import { updateFrameAndArt } from './artActions';

/** Design files bigger than this aren't read. */
const MAX_DESIGN_BYTES = 5_000_000;

/** Uses a design as the frame (one undo step). The band keeps the token's thickness and spacing. */
export function applyDesignFrame(id: string, name: string, project: FrameProject): void {
  const design: DesignFrame = { id, name, project };
  updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, kind: 'design', design } }));
}

/**
 * Uses a built-in design as the frame (one undo step), with the band
 * thickness it was made for, and enough room outside it for anything that
 * reaches past the band (the Celestial star's points).
 */
export function applyBuiltInDesign(design: DesignFrame | null, band: BuiltInBand | null): void {
  if (!design || !band) return;
  updateFrameAndArt((d) => ({
    ...d,
    frame: { ...d.frame, kind: 'design', design, thickness: band.thickness, outerSpacing: Math.max(d.frame.outerSpacing, band.outerSpacing) },
  }));
}

/** Reads a .framemaker.json file, keeps it in the design library and uses it as the frame. */
export async function openDesignFile(file: File): Promise<boolean> {
  if (file.size > MAX_DESIGN_BYTES) {
    toast("That file is too big to be a Frame Maker design.", 'error');
    return false;
  }
  return openDesignText(await file.text());
}

/** Reads a design's text (a file, or one sent from Frame Maker), keeps it in the design library and uses it as the frame. */
export async function openDesignText(text: string): Promise<boolean> {
  if (text.length > MAX_DESIGN_BYTES) {
    toast("That design is too big to use.", 'error');
    return false;
  }
  const result = readFrameDesign(text);
  if (!result.ok) {
    toast(result.error.replace('project file', 'design'), 'error');
    return false;
  }
  const id = await saveDesign(text, result.project.name);
  applyDesignFrame(id, result.project.name, result.project);
  toast(result.warnings.length ? `Opened "${result.project.name}". ${result.warnings.join(' ')}` : `Opened "${result.project.name}" as the frame.`);
  return true;
}
