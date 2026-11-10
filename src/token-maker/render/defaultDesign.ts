// The frame a new token starts with: the Essentials' Simple design. It is
// kept on its own (config/defaultDesign.json, written by
// `npm run tm:default-design`) so the editor's first load doesn't carry
// every built-in frame: the rest of the catalogue (builtInDesigns.ts) loads
// when the frame gallery opens or a token needs it (frameCatalogue.ts).

import defaultDesign from '../config/defaultDesign.json';
import { createDocument } from '../document/defaults';
import type { DesignFrame, FrameSettings, TokenDocument } from '../document/types';
import type { BuiltInGroup } from '../frameMaker/project/houseStyle';
import { cleanChoices, recolourProject, type ColourChoices, type ColourSlot } from '../frameMaker/project/colourSlots';
import type { FrameProject } from '../frameMaker/project/types';

/** The id a built-in design has in a document (`builtin:gilded-laurel`). */
export const BUILT_IN_PREFIX = 'builtin:';

export interface BuiltInDesign {
  id: string;
  name: string;
  group: BuiltInGroup;
  /** Listed straight after this drawn frame, if any. */
  after?: string;
  colours: ColourSlot[];
}

/** The band a built-in design was made for, in the same units as the token's frame settings. */
export type BuiltInBand = Pick<FrameSettings, 'thickness' | 'outerSpacing'>;

export const isBuiltInDesign = (id: string | null | undefined): boolean => !!id?.startsWith(BUILT_IN_PREFIX);

export const DEFAULT_DESIGN_ID = 'builtin:simple';
export const DEFAULT_DESIGN = defaultDesign.info as BuiltInDesign;
const BAND: BuiltInBand = defaultDesign.band;

/** The Simple design as the frame, in the chosen colours. */
export function defaultDesignFrame(colours: ColourChoices = {}): DesignFrame {
  const chosen = cleanChoices(colours, DEFAULT_DESIGN.colours);
  const project = recolourProject(structuredClone(defaultDesign.project) as unknown as FrameProject, DEFAULT_DESIGN.colours, chosen);
  return { id: DEFAULT_DESIGN_ID, name: DEFAULT_DESIGN.name, project, ...(Object.keys(chosen).length ? { colours: chosen } : {}) };
}

/**
 * A new token as the app starts it: a blank document (createDocument) with
 * the Simple design as its frame. The drawn-frame settings stay as they are,
 * for when a drawn frame is picked.
 */
export function newTokenDocument(name?: string): TokenDocument {
  const doc = createDocument(name);
  return { ...doc, frame: { ...doc.frame, kind: 'design', design: defaultDesignFrame(), thickness: BAND.thickness, outerSpacing: Math.max(doc.frame.outerSpacing, BAND.outerSpacing) } };
}
