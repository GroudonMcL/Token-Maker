import { sampleArt } from '../engine/legacy/sampleArt';
import type { RenderSource } from '../engine/legacy/render';

let art: RenderSource | null = null;

/** The stand-in portrait from token-maker, made once. */
export function stageArt(): RenderSource {
  art ??= sampleArt((w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }), 512);
  return art;
}
