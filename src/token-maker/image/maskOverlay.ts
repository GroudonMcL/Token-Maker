// While the brush is on, removed parts of the art are tinted red on the
// canvas (like a "quick mask"), so you can see what the Restore brush would
// bring back; while the pop-out brush is on, the pop-out mask is tinted
// teal. Only for the editor: never part of the token or the export.

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

const cache = new WeakMap<Uint8Array, AnyCanvas>();
const popCache = new WeakMap<Uint8Array, AnyCanvas>();

/** The pop-out mask (255 = pops out) as a teal tint. */
export function popOutOverlay(mask: Uint8Array, width: number, height: number): AnyCanvas {
  const hit = popCache.get(mask);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(width, height);
    const d = img.data;
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      const on = mask[p]!;
      if (!on) continue;
      d[i] = 40;
      d[i + 1] = 210;
      d[i + 2] = 200;
      d[i + 3] = on * 0.5;
    }
    ctx.putImageData(img, 0, 0);
  }
  popCache.set(mask, c);
  return c;
}

export function maskOverlay(mask: Uint8Array, width: number, height: number): AnyCanvas {
  const hit = cache.get(mask);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(width, height);
    const d = img.data;
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      const removed = 255 - mask[p]!;
      if (!removed) continue;
      d[i] = 230;
      d[i + 1] = 40;
      d[i + 2] = 40;
      d[i + 3] = removed * 0.5;
    }
    ctx.putImageData(img, 0, 0);
  }
  cache.set(mask, c);
  return c;
}

const ghostCache = new WeakMap<Uint8Array, AnyCanvas>();
/** How strongly the ghost of the removed parts shows. */
const GHOST_ALPHA = 0.4;

/**
 * The picture as it was, see-through and only where the brush (or the cut-out)
 * has removed it: a guide to what Restore would bring back. Drawn under the
 * red tint while the brush is on.
 */
export function ghostOverlay(image: CanvasImageSource, mask: Uint8Array, width: number, height: number): AnyCanvas {
  const hit = ghostCache.get(mask);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (ctx) {
    const alpha = ctx.createImageData(width, height);
    const d = alpha.data;
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) d[i + 3] = (255 - mask[p]!) * GHOST_ALPHA;
    const a = document.createElement('canvas');
    a.width = width;
    a.height = height;
    a.getContext('2d')?.putImageData(alpha, 0, 0);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(a, 0, 0);
  }
  ghostCache.set(mask, c);
  return c;
}
