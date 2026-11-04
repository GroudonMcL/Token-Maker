// The built-in Frame Maker designs (src/frame-maker/project/builtInFrames.ts,
// copied into frameMaker/): the owner's Essentials, the new versions of the
// drawn frames, and the old picture frames (gilded laurel, iron rivets…).
// They are listed with the drawn frames and used like any Frame Maker
// design, so they follow the token's shape and thickness; their colour
// slots each get a colour picker.

import type { DesignFrame, FrameSettings, TokenDocument } from '../document/types';
import { createDocument } from '../document/defaults';
import { BUILT_IN_FRAMES, type BuiltInGroup } from '../frameMaker/project/builtInFrames';
import { cleanChoices, recolourProject, type ColourChoices, type ColourSlot } from '../frameMaker/project/colourSlots';

/** The id a built-in design has in a document (`builtin:gilded-laurel`). */
const PREFIX = 'builtin:';

export interface BuiltInDesign {
  id: string;
  name: string;
  group: BuiltInGroup;
  /** Listed straight after this drawn frame, if any. */
  after?: string;
  colours: ColourSlot[];
  /** The band it was made for, in the same units as the token's frame settings. */
  band: Pick<FrameSettings, 'thickness' | 'outerSpacing'>;
}

const projects = new Map(BUILT_IN_FRAMES.map((f) => [f.id, f.project()]));

export const BUILT_IN_DESIGNS: readonly BuiltInDesign[] = BUILT_IN_FRAMES.map((f) => {
  const stage = projects.get(f.id)!.stage;
  return { id: PREFIX + f.id, name: f.name, group: f.group, after: f.after, colours: f.colours, band: { thickness: stage.thickness, outerSpacing: stage.outerSpacing } };
});

export const isBuiltInDesign = (id: string | null | undefined): boolean => !!id?.startsWith(PREFIX);
export const builtInDesignById = (id: string | null | undefined) => BUILT_IN_DESIGNS.find((b) => b.id === id || b.id === PREFIX + id);

/**
 * A built-in design as the frame, by its id, in the chosen colours. The old
 * picture frames' ids (`gilded-laurel`) work too, so tokens saved with them
 * get the new design.
 */
export function builtInDesignFrame(id: string, colours: ColourChoices = {}): DesignFrame | null {
  const key = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id;
  const f = BUILT_IN_FRAMES.find((x) => x.id === key);
  if (!f) return null;
  const chosen = cleanChoices(colours, f.colours);
  const project = recolourProject(structuredClone(projects.get(f.id)!), f.colours, chosen);
  return { id: PREFIX + f.id, name: f.name, project, ...(Object.keys(chosen).length ? { colours: chosen } : {}) };
}

/** The frame a new token starts with: the Essentials' Simple design. */
export const DEFAULT_DESIGN_ID = 'builtin:simple';

/**
 * A new token as the app starts it: a blank document (createDocument) with
 * the Simple design as its frame. The drawn-frame settings stay as they are,
 * for when a drawn frame is picked.
 */
export function newTokenDocument(name?: string): TokenDocument {
  const doc = createDocument(name);
  const design = builtInDesignFrame(DEFAULT_DESIGN_ID);
  const band = builtInDesignById(DEFAULT_DESIGN_ID)?.band;
  if (!design || !band) return doc;
  return { ...doc, frame: { ...doc.frame, kind: 'design', design, thickness: band.thickness, outerSpacing: Math.max(doc.frame.outerSpacing, band.outerSpacing) } };
}
