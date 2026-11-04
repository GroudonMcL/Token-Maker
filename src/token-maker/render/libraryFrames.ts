// Built-in picture frames (owner request): every Essentials frame, drawn
// once as a round picture with a see-through middle by
// scripts/token-maker/raster-frames.ts and saved in public/frames/. They are
// listed in Frame → Picture next to the user's own uploads, and used just
// like them (the hole is found when one is picked).

export interface LibraryFrame {
  /** Its file name in public/frames/ (without .webp) and its id in a document. */
  id: string;
  name: string;
  /** The Essentials frame it was drawn from (a frame picker id). */
  from: string;
}

const frame = (from: string, name: string): LibraryFrame => ({ id: `essentials-${from.replace(/^builtin:/, '')}`, name, from });

export const LIBRARY_FRAMES: readonly LibraryFrame[] = [
  frame('builtin:simple', 'Simple'),
  frame('builtin:clean-gradient', 'Clean gradient'),
  frame('builtin:rainbow', 'Rainbow'),
  frame('builtin:small-gradient', 'Small gradient'),
  frame('builtin:glowing-ice', 'Glowing ice'),
  frame('builtin:dual-tone', 'Dual-tone gradient'),
  frame('builtin:glowing-lava', 'Glowing lava'),
  frame('builtin:marble', 'Marble'),
  frame('builtin:gold-red-marble', 'Gold and red marble'),
];

export const libraryFrameById = (id: string) => LIBRARY_FRAMES.find((f) => f.id === id);
export const libraryFrameUrl = (id: string) => `/frames/${id}.webp`;
export const libraryFrameThumbUrl = (id: string) => `/frames/thumbs/${id}.webp`;
