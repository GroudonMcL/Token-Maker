// Not copied from token-maker: its render.ts draws whole tokens. sampleArt.ts
// only needs this one type from it, so this stands in for it.

/** A decoded image the renderer can draw. */
export interface RenderSource {
  image: CanvasImageSource;
  width: number;
  height: number;
}
