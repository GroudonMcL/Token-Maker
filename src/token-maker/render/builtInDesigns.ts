// The built-in Frame Maker designs (src/frame-maker/project/builtInFrames.ts,
// copied into frameMaker/): the owner's Essentials, the new versions of the
// drawn frames, and the old picture frames (gilded laurel, iron rivets…).
// They are listed with the drawn frames and used like any Frame Maker
// design, so they follow the token's shape and thickness; their colour
// slots each get a colour picker.
//
// This is the whole catalogue, hundreds of designs: the editor loads it only
// when it is needed (frameCatalogue.ts), never with the first page. Only the
// frame a new token starts with comes with the first page (defaultDesign.ts).

import type { DesignFrame } from '../document/types';
import { BUILT_IN_FRAMES, type BuiltInFrame } from '../frameMaker/project/builtInFrames';
import { cleanChoices, recolourProject, type ColourChoices } from '../frameMaker/project/colourSlots';
import type { FrameProject } from '../frameMaker/project/types';
import { BUILT_IN_PREFIX as PREFIX, type BuiltInBand, type BuiltInDesign } from './defaultDesign';

export type { BuiltInDesign } from './defaultDesign';

export const BUILT_IN_DESIGNS: readonly BuiltInDesign[] = BUILT_IN_FRAMES.map((f) => ({ id: PREFIX + f.id, name: f.name, group: f.group, after: f.after, colours: f.colours }));

const byId = new Map<string, BuiltInFrame>(BUILT_IN_FRAMES.map((f) => [f.id, f]));
const find = (id: string | null | undefined) => (id ? byId.get(id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id) : undefined);

// Each design's project is made the first time it is used, not all of them when the catalogue loads.
const projects = new Map<string, FrameProject>();
function projectOf(f: BuiltInFrame): FrameProject {
  let p = projects.get(f.id);
  if (!p) projects.set(f.id, (p = f.project()));
  return p;
}

export const builtInDesignById = (id: string | null | undefined) => {
  const f = find(id);
  return f ? BUILT_IN_DESIGNS.find((b) => b.id === PREFIX + f.id) : undefined;
};

/** The band a built-in design was made for. */
export function builtInBand(id: string | null | undefined): BuiltInBand | null {
  const f = find(id);
  if (!f) return null;
  const { thickness, outerSpacing } = projectOf(f).stage;
  return { thickness, outerSpacing };
}

/**
 * A built-in design as the frame, by its id, in the chosen colours. The old
 * picture frames' ids (`gilded-laurel`) work too, so tokens saved with them
 * get the new design.
 */
export function builtInDesignFrame(id: string, colours: ColourChoices = {}): DesignFrame | null {
  const f = find(id);
  if (!f) return null;
  const chosen = cleanChoices(colours, f.colours);
  const project = recolourProject(structuredClone(projectOf(f)), f.colours, chosen);
  return { id: PREFIX + f.id, name: f.name, project, ...(Object.keys(chosen).length ? { colours: chosen } : {}) };
}
