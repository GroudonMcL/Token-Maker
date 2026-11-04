// Small previews of every frame for the frame picker, drawn once per shape
// by the real renderer (cached).

import { createDocument } from '../document/defaults';
import type { DesignFrame } from '../document/types';
import { FRAME_PRESETS, type ShapeId } from '../render/catalog';
import { renderToken } from '../render/render';
import { sampleArt } from '../render/sampleArt';

const cache = new Map<string, Map<string, string>>();

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

let sample: ReturnType<typeof sampleArt> | null = null;
const sampleAssets = () => new Map([['asset:sample', (sample ??= sampleArt(makeCanvas, 128))]]);

/**
 * A data URL of one drawn frame's thumbnail on `shape` (cached), or null
 * without a canvas (tests). One at a time, so the panel can draw only the
 * frame it shows, and the gallery a few at a time (each takes a few ms).
 */
export function frameThumbnail(presetId: string, shape: ShapeId, px = 96): string | null {
  const key = `${shape}|${px}`;
  const hit = cache.get(key)?.get(presetId);
  if (hit) return hit;
  const p = FRAME_PRESETS.find((x) => x.id === presetId);
  if (!p) return null;
  const canvas = makeCanvas(px, px);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const doc = createDocument();
  doc.shape = shape;
  doc.art.assetId = 'asset:sample';
  doc.frame = { ...doc.frame, presetId: p.id, style: p.style, color: p.color };
  renderToken(ctx, doc, sampleAssets(), px);
  const url = canvas.toDataURL('image/png');
  if (!cache.has(key)) cache.set(key, new Map());
  cache.get(key)!.set(presetId, url);
  return url;
}

/** Data URLs of every frame preset's thumbnail for `shape`, keyed by preset id. */
export function frameThumbnails(shape: ShapeId, px = 96): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of FRAME_PRESETS) {
    const url = frameThumbnail(p.id, shape, px);
    if (url) out.set(p.id, url);
  }
  return out;
}

const designCache = new Map<string, string>();

/** A data URL of a Frame Maker design as a frame on `shape`, drawn by the real renderer on a default token (cached by design id). */
/** Forgets the thumbnails of these designs (after their photo textures arrive, so they are drawn with them). */
export function clearDesignThumbnails(ids: string[]): void {
  for (const key of [...designCache.keys()]) if (ids.some((id) => key.startsWith(`${id}|`))) designCache.delete(key);
}

export function designThumbnail(id: string, project: DesignFrame['project'], shape: ShapeId, px = 96): string | null {
  const key = `${id}|${shape}|${px}`;
  const hit = designCache.get(key);
  if (hit) return hit;
  const canvas = makeCanvas(px, px);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const doc = createDocument();
  doc.shape = shape;
  doc.art.assetId = 'asset:sample';
  doc.frame = { ...doc.frame, kind: 'design', design: { id, name: project.name, project } };
  renderToken(ctx, doc, sampleAssets(), px);
  const url = canvas.toDataURL('image/png');
  designCache.set(key, url);
  return url;
}
