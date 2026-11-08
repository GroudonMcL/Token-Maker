// The one renderer (DESIGN.md §5). The live preview and every export come
// from renderToken with the same document; only the pixel size differs.
// It is a pure function of (document, assets, size): it reads nothing else.

import { computeInsets, perSquareToPx } from '../document/sizing';
import { artEdits } from '../image/process';
import { hasPopOut, popOutArt } from '../image/popOut';
import { newCanvas, processedArt } from '../image/processedArt';
import type { ClipTarget, OuterShadow, TokenDocument } from '../document/types';
import { parseHex, rgba } from './color';
import { tracePolygon, type Ctx, type FrameGeometry } from './frameKit';
import type { FrameStyle } from './catalog';
import { drawBackground, lightLayer } from './background';
import { drawFrame } from './frames';
import { drawEffects, needsSubject, type EffectArea, type Subject } from './effects';
import { baseScale, imageClipPolygon } from './geometry';
import { drawDecorations } from './decorations';
import { drawLabel } from './label';
import { activeImageFrame, drawImageFrame, frameAssetId, imageFrameScale } from './imageFrames';
import { shapePolygon } from './shapes';
import { pictureEpoch } from '../frameMaker/render/pictures';
import { drawFrameDesign } from '../frameMaker/share/frameDesign';
import type { DesignFrame } from '../document/types';

/** A decoded image the renderer can draw. */
export interface RenderSource {
  image: CanvasImageSource;
  width: number;
  height: number;
}

/** Images referenced by the document, by asset id. */
export type AssetMap = ReadonlyMap<string, RenderSource>;

export interface RenderOptions {
  /**
   * The processed art to draw instead of computing it, e.g. the quick
   * low-resolution copy the preview uses while a slider is dragged.
   */
  processedArt?: RenderSource;
  /**
   * Draw the frame (and its shadow onto the art) see-through, 0–1: 0.5 while
   * the brush is on, so the art under it can be seen. Editor only.
   */
  frameAlpha?: number;
  /**
   * Pixels of extra room round the square that may be drawn into (the canvas
   * must reach that far): nothing is clipped to the square, so what would be
   * cut off at its edge can be found (src/render/overflow.ts). Never in exports.
   */
  bleed?: number;
  /**
   * Draw a drawn frame or Frame Maker design at this many pixels across and
   * scale it to the token, instead of at the token's own size. The editor's
   * view passes one fixed size, so zooming doesn't change how the frame
   * looks (Frame Maker's bevels and blurs work in whole pixels, so a frame
   * drawn at another size differs a little) and doesn't redraw it.
   */
  frameSize?: number;
  /**
   * With `frameSize`: while something is being dragged, a frame not yet
   * drawn at that size (a Thickness drag makes a new one every step) is
   * drawn quickly at the token's own size instead. Editor only.
   */
  frameDraft?: boolean;
}

// Drawn frames, kept so that changing anything else (a slider, the art)
// doesn't redraw the frame's texture every time (Phase 10). A few recent
// ones are kept; large ones (exports) are drawn and let go.
const frameLayers = new Map<string, CanvasImageSource>();
const MAX_FRAME_LAYERS = 6;
const MAX_CACHED_SIDE = 2048;

/**
 * The frame drawn on a transparent square layer of `size`, centred: a drawn
 * frame of `style`, or a Frame Maker design (keyed by the design object
 * itself, which only changes when the design does).
 */
// A design is drawn again once a photo texture it uses has arrived (pictureEpoch).
const frameKey = (style: FrameStyle | DesignFrame, g: FrameGeometry, size: number) =>
  `${typeof style === 'string' ? style : `design:${objectId(style.project)}:${pictureEpoch()}`}|${size}|${JSON.stringify(g)}`;

function frameLayer(style: FrameStyle | DesignFrame, g: FrameGeometry, size: number): CanvasImageSource {
  const key = frameKey(style, g, size);
  const hit = frameLayers.get(key);
  if (hit) {
    // Most recently used goes last.
    frameLayers.delete(key);
    frameLayers.set(key, hit);
    return hit;
  }
  const cache = size <= MAX_CACHED_SIDE;
  // Reuse the oldest layer's canvas when it is let go anyway (a Thickness drag
  // makes a new frame every step), which is much quicker than a new canvas.
  let layer: ReturnType<typeof newCanvas> | null = null;
  if (cache && frameLayers.size >= MAX_FRAME_LAYERS) {
    const oldest = frameLayers.keys().next().value!;
    const old = frameLayers.get(oldest) as ReturnType<typeof newCanvas>;
    frameLayers.delete(oldest);
    if (old.width === size && old.height === size) layer = old;
  }
  layer ??= newCanvas(size, size);
  const lctx = layer.getContext('2d') as Ctx;
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.clearRect(0, 0, size, size);
  lctx.translate(size / 2, size / 2);
  if (typeof style === 'string') drawFrame(lctx, style, g);
  // Frame Maker keeps its own per-layer cache (up to 2048 px, like this one).
  else drawFrameDesign(lctx, style.project, g);
  if (cache) frameLayers.set(key, layer as CanvasImageSource);
  return layer as CanvasImageSource;
}

/** Paints `doc` into a `size`×`size` area starting at the context's origin. */
export function renderToken(ctx: Ctx, doc: TokenDocument, assets: AssetMap, size: number, options: RenderOptions = {}): void {
  const R = size / 2;
  const sq = doc.size.squares;
  const px = (perSquare: number) => perSquareToPx(perSquare, sq, size);
  const insets = computeInsets(doc);
  // A picture frame (Phase 7) fills the square; its hole is the art's clipping shape.
  const imageFrame = activeImageFrame(doc.frame);
  const frameImage = imageFrame ? assets.get(frameAssetId(imageFrame.source)) : undefined;
  // A picture frame is drawn smaller by the outer spacing (v13), like every other frame.
  const frameR = imageFrame ? R * imageFrameScale(doc) : R;
  // A Frame Maker design (v9) sits on the same band as a drawn frame.
  const design = doc.frame.kind === 'design' ? doc.frame.design : null;
  // Frame Maker chosen but no design opened yet: no frame.
  const hasFrame = imageFrame ? true : (doc.frame.kind === 'design' ? !!design : doc.frame.style !== 'none') && insets.frameInner > insets.frameOuter;
  const art = doc.art.assetId ? assets.get(doc.art.assetId) : undefined;
  const clip = imageFrame ? imageClipPolygon(doc).map((p) => ({ x: p.x * R, y: p.y * R })) : shapePolygon(doc.shape, R, insets.image * R);
  // The token's outline: the frame's outer edge, or the art's edge without a frame.
  const silhouette = imageFrame ? clip : shapePolygon(doc.shape, R, (hasFrame ? insets.frameOuter : insets.image) * R);

  // Layers that can reach past the square (pop-out, decorations) are this much bigger on each side when bleeding.
  const B = Math.max(0, Math.round(options.bleed ?? 0));
  const L = size + 2 * B;
  /** Draws one of those layers centred on the token, `dx` to the side. */
  const putLayer = (c: Ctx, layer: ReturnType<typeof newCanvas>, dx = 0) => c.drawImage(layer as CanvasImageSource, -R - B + dx, -R - B);

  ctx.save();
  ctx.clearRect(0, 0, size, size);
  // Nothing is ever drawn outside the square (DESIGN.md §5), so the token
  // lines up 1:1 with the grid, even when drawn into a bigger canvas.
  if (!B) {
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.clip();
  }
  ctx.translate(R, R);

  // The processed art (step 5), and the pop-out parts of it (step 13) on a
  // layer of their own: the outer shadow and the pop-out shadow need them too.
  const shown = art ? (options.processedArt ?? processedArt(art, artEdits(doc)).source) : null;
  const placeArt = (c: Ctx) => {
    const t = doc.art.transform;
    const unitClip = clip.map((p) => ({ x: p.x / R, y: p.y / R }));
    const s = baseScale(art!.width, art!.height, unitClip) * t.zoom * R;
    c.translate(t.offsetX * R, t.offsetY * R);
    c.rotate((t.rotation * Math.PI) / 180);
    c.scale(t.flipX ? -s : s, t.flipY ? -s : s);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
  };
  let pop: ReturnType<typeof newCanvas> | null = null;
  if (art && shown && clip.length && hasPopOut(doc.art.popOut)) {
    const parts = popOutArt(art, shown, doc.art.popOut.strokes);
    pop = newCanvas(L, L);
    const pctx = pop.getContext('2d') as Ctx;
    pctx.translate(R + B, R + B);
    placeArt(pctx);
    pctx.drawImage(parts.image, -art.width / 2, -art.height / 2, art.width, art.height);
  }
  // The geometry effects grow from (layers 4, 7 and 10), and the art's own
  // outline for glows round a cut-out creature.
  const holeRadius = clip.length ? clip.reduce((sum, p) => sum + Math.hypot(p.x, p.y), 0) / clip.length : 0;
  const area: EffectArea = imageFrame
    ? {
        // A picture frame: effects follow a ring between its hole and its outer edge.
        shape: doc.shape,
        R,
        unit: px(1),
        opening: Math.max(0, R - holeRadius),
        bandOuter: Math.max(0, R - imageFrame.outer * frameR),
        bandInner: Math.max(Math.max(0, R - imageFrame.outer * frameR) + 1, R - holeRadius),
      }
    : {
        shape: doc.shape,
        R,
        unit: px(1),
        // The art runs under the inner half of the frame; effects grow from where it shows.
        opening: (hasFrame ? Math.max(insets.image, insets.frameInner) : insets.image) * R,
        bandOuter: insets.frameOuter * R,
        bandInner: hasFrame ? insets.frameInner * R : insets.frameOuter * R + px(0.08),
      };
  let subject: Subject | null = null;
  if (art && shown && clip.length && doc.effects.some(needsSubject)) {
    const c = newCanvas(size, size);
    const sctx = c.getContext('2d') as Ctx;
    sctx.translate(R, R);
    tracePolygon(sctx, clip);
    sctx.clip();
    placeArt(sctx);
    sctx.drawImage(shown.image, -art.width / 2, -art.height / 2, art.width, art.height);
    subject = { image: c as CanvasImageSource, key: `${objectId(shown.image)}|${doc.art.assetId}|${JSON.stringify(doc.art.transform)}` };
  }

  // The frame as drawn (before lighting), shared by step 9 and the Frame clip.
  const frameGeometry: FrameGeometry = {
    shape: doc.shape,
    R,
    outer: insets.frameOuter * R,
    inner: insets.frameInner * R,
    color: doc.frame.color,
    accent: doc.frame.highlightColor ?? undefined,
  };
  const frameStyle = design ?? doc.frame.style;
  const fk = options.frameSize && options.frameSize > 0 ? options.frameSize / size : 1;
  const bigGeometry: FrameGeometry = { ...frameGeometry, R: R * fk, outer: frameGeometry.outer * fk, inner: frameGeometry.inner * fk };
  const wanted = Math.round(size * fk);
  // Dragging and not drawn at the wanted size yet: drawn at the token's size for now.
  const frameSize = fk === 1 || (options.frameDraft && !frameLayers.has(frameKey(frameStyle, bigGeometry, wanted))) ? size : wanted;
  const drawnFrame = () => (frameSize === size ? frameLayer(frameStyle, frameGeometry, size) : frameLayer(frameStyle, bigGeometry, frameSize));
  /** The drawn frame, scaled to the token. */
  const putFrame = (c: Ctx, frame: CanvasImageSource) => {
    if (frameSize === size) return c.drawImage(frame, -R, -R);
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(frame, -R, -R, size, size);
    c.restore();
  };

  // Where an effect or decoration's Keep inside lets it show (v14: several at once), each part drawn once when first asked for.
  // The background and the art stop at the frame's inner edge, and the frame's own pixels are cut out of them,
  // so nothing kept inside them spills onto the frame.
  const opening = hasFrame && !imageFrame ? shapePolygon(doc.shape, R, Math.max(insets.image, insets.frameInner) * R) : clip;
  const cutFrame = (c: Ctx) => {
    c.save();
    c.globalCompositeOperation = 'destination-out';
    if (frameImage) drawImageFrame(c, frameImage, frameR);
    else if (hasFrame) putFrame(c, drawnFrame());
    c.restore();
  };
  const parts = new Map<ClipTarget, CanvasImageSource | null>();
  const clipPart = (target: ClipTarget): CanvasImageSource | null => {
    if (parts.has(target)) return parts.get(target)!;
    const c = newCanvas(size, size);
    const mctx = c.getContext('2d') as Ctx;
    mctx.translate(R, R);
    mctx.fillStyle = '#000';
    let ok = true;
    const paintToken = () => {
      // The token's outline: the frame's outer edge, or a picture frame and its hole.
      tracePolygon(mctx, silhouette);
      mctx.fill();
      if (frameImage) drawImageFrame(mctx, frameImage, frameR);
    };
    if (target === 'token') paintToken();
    else if (target === 'outside') {
      // Everything in the square but the token (pop-out parts and decorations may still cover it).
      mctx.fillRect(-R, -R, size, size);
      mctx.globalCompositeOperation = 'destination-out';
      paintToken();
    } else if (target === 'background') {
      if (opening.length) {
        tracePolygon(mctx, opening);
        mctx.fill();
        cutFrame(mctx);
      } else ok = false;
    } else if (target === 'frame') {
      if (frameImage) drawImageFrame(mctx, frameImage, frameR);
      else if (hasFrame) putFrame(mctx, drawnFrame());
      else ok = false;
    } else if (target === 'art') {
      // The art where it shows in the opening, with its see-through parts left out.
      if (art && shown && opening.length) {
        mctx.save();
        tracePolygon(mctx, opening);
        mctx.clip();
        placeArt(mctx);
        mctx.drawImage(shown.image, -art.width / 2, -art.height / 2, art.width, art.height);
        mctx.restore();
        cutFrame(mctx);
      } else ok = false;
    } else if (target === 'popOut') {
      // The parts of the art popping out over the frame.
      if (pop) putLayer(mctx, pop);
      else ok = false;
    }
    const part = ok ? (c as CanvasImageSource) : null;
    parts.set(target, part);
    return part;
  };
  const masks = new Map<string, CanvasImageSource | null>();
  const clipMask = (targets: readonly ClipTarget[]): CanvasImageSource | null => {
    const key = targets.join('+');
    if (masks.has(key)) return masks.get(key)!;
    const shownParts = targets.map(clipPart).filter((p): p is CanvasImageSource => !!p);
    let mask: CanvasImageSource | null = null;
    if (shownParts.length === 1) mask = shownParts[0]!;
    else if (shownParts.length > 1) {
      const c = newCanvas(size, size);
      const mctx = c.getContext('2d') as Ctx;
      for (const p of shownParts) mctx.drawImage(p, 0, 0);
      mask = c as CanvasImageSource;
    }
    masks.set(key, mask);
    return mask;
  };

  // The decorations (layer 11) on layers of their own: they are part of the outer shadow's silhouette too.
  // Those set to go under the frame (layer 7½) get a layer of their own.
  const decorLayer = (under: boolean) => {
    if (!doc.decorations.some((d) => d.visible && !!d.underFrame === under)) return null;
    const c = newCanvas(L, L);
    const dctx = c.getContext('2d') as Ctx;
    dctx.translate(R + B, R + B);
    drawDecorations(dctx, doc, R, assets, under, clipMask);
    return c;
  };
  const decor = decorLayer(false);
  const decorUnder = decorLayer(true);

  /** Fills the token's whole outline: the shape (or the picture frame), plus pop-out parts and decorations. */
  const paintSilhouette = (c: Ctx, dx = 0) => {
    tracePolygon(c, silhouette.map((p) => ({ x: p.x + dx, y: p.y })));
    c.fillStyle = '#000';
    c.fill();
    if (frameImage) {
      c.save();
      c.translate(dx, 0);
      drawImageFrame(c, frameImage, frameR);
      c.restore();
    }
    if (pop) putLayer(c, pop, dx);
    if (decorUnder) putLayer(c, decorUnder, dx);
    if (decor) putLayer(c, decor, dx);
  };

  // 1. Outer drop shadow of the whole silhouette.
  if (doc.shadows.outer.enabled && silhouette.length) {
    outerShadow(ctx, paintSilhouette, doc.shadows.outer, doc.lighting.direction, px, size);
  }

  // 2. Backing: no longer offered (v12 moved it into the background), kept for files that still have one.
  const backing = imageFrame ? clip : shapePolygon(doc.shape, R, insets.backing * R);
  if (doc.frame.backingOpacity > 0 && backing.length) {
    const { r, g, b } = parseHex(doc.frame.backingColor);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, doc.frame.backingOpacity)})`;
    tracePolygon(ctx, backing);
    ctx.fill();
  }

  // 3. Background (src/render/background.ts), lit like the art when lighting asks for it.
  // It fills the inner spacing too, where the backing used to show.
  drawBackground(ctx, doc, assets, clip, R, backing);
  // 4. Effects behind the art (src/render/effects.ts).
  if (doc.effects.length) drawEffects(ctx, doc.effects, 'behind', area, size, subject, 0, assets, clipMask);

  // 5. Processed art, clipped to the inner shape: the picture after
  // adjustments, background removal and brush strokes (src/image/), drawn
  // with the move/zoom/rotate transform, then lit (Phase 4).
  if (art && shown && clip.length) {
    ctx.save();
    tracePolygon(ctx, clip);
    ctx.clip();
    placeArt(ctx);
    ctx.drawImage(shown.image, -art.width / 2, -art.height / 2, art.width, art.height);
    ctx.restore();
  }

  // 6–7. Effects over the art, including the overlays that were once the Foreground section (v8).
  if (doc.effects.length) drawEffects(ctx, doc.effects, 'over', area, size, subject, 0, assets, clipMask);

  // 7½. Decorations set to go under the frame: over the art, covered by the frame.
  if (decorUnder) putLayer(ctx, decorUnder);

  // 8–9 go on their own layer when the frame is to be see-through, so its
  // overlapping strokes fade evenly (editor only, never in exports).
  const fade = options.frameAlpha !== undefined && options.frameAlpha < 1 && hasFrame;
  const layer = fade ? newCanvas(size, size) : null;
  const fctx = layer ? (layer.getContext('2d') as Ctx) : ctx;
  if (layer) fctx.translate(R, R);

  // 8. Inner shadow: the frame's shadow onto the art.
  const inner = doc.shadows.inner;
  if (imageFrame && inner.enabled && inner.strength > 0 && clip.length) {
    // A picture frame: everything outside the hole casts its shadow in.
    const fall = shadowVector(doc.shadows.outer, doc.lighting.direction);
    fctx.save();
    tracePolygon(fctx, clip);
    fctx.clip();
    fctx.shadowColor = `rgba(0, 0, 0, ${inner.strength})`;
    fctx.shadowBlur = px(inner.softness);
    fctx.shadowOffsetX = fall.x * px(0.024);
    fctx.shadowOffsetY = fall.y * px(0.024);
    fctx.beginPath();
    fctx.rect(-R * 3, -R * 3, R * 6, R * 6);
    traceInto(fctx, clip);
    fctx.fillStyle = '#000';
    fctx.fill('evenodd');
    fctx.restore();
  } else if (hasFrame && inner.enabled && inner.strength > 0 && clip.length) {
    const band = (insets.frameInner - insets.frameOuter) * R;
    const fall = shadowVector(doc.shadows.outer, doc.lighting.direction);
    fctx.save();
    tracePolygon(fctx, clip);
    fctx.clip();
    fctx.shadowColor = `rgba(0, 0, 0, ${inner.strength})`;
    fctx.shadowBlur = px(inner.softness);
    fctx.shadowOffsetX = fall.x * px(0.024);
    fctx.shadowOffsetY = fall.y * px(0.024);
    // A thick ring just outside the clip whose shadow falls inwards.
    const ring = Math.max(band, px(0.1));
    tracePolygon(fctx, shapePolygon(doc.shape, R, Math.max(0, insets.image * R - ring / 2)));
    fctx.lineWidth = ring;
    fctx.strokeStyle = '#000';
    fctx.stroke();
    fctx.restore();
  }

  // 9. Frame: a picture frame, one drawn by code, or a Frame Maker design,
  // lit like the art when "Light the frame" is on.
  const drawFrameLayer = (paint: (c: Ctx) => void) => {
    if (!doc.lighting.frame) return paint(fctx);
    const lit = newCanvas(size, size);
    const lctx = lit.getContext('2d') as Ctx;
    lctx.translate(R, R);
    paint(lctx);
    lightLayer(lctx, doc.lighting, size);
    fctx.drawImage(lit as CanvasImageSource, -R, -R);
  };
  if (frameImage) {
    drawFrameLayer((c) => {
      c.save();
      drawImageFrame(c, frameImage, frameR);
      c.restore();
    });
  } else if (hasFrame && !imageFrame) {
    const drawn = drawnFrame();
    drawFrameLayer((c) => putFrame(c, drawn));
  }

  if (layer) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, options.frameAlpha!);
    ctx.drawImage(layer as CanvasImageSource, -R, -R);
    ctx.restore();
  }

  // 10. Effects on the border.
  if (doc.effects.length) drawEffects(ctx, doc.effects, 'border', area, size, null, 0, assets, clipMask);
  // 11. Decorations (src/render/decorations.ts).
  if (decor) putLayer(ctx, decor);

  if (pop) {
    // 12. Pop-out shadow: cast by the pop-out parts onto the frame band only
    // (the outer drop shadow already covers the space around the token).
    if (frameImage && doc.shadows.popOut.enabled) {
      // A picture frame: the shadow lands only where the picture is solid.
      const shadow = newCanvas(size, size);
      const sctx = shadow.getContext('2d') as Ctx;
      sctx.translate(R, R);
      castShadow(sctx, (c, dx) => putLayer(c, pop!, dx), doc.shadows.popOut, doc.lighting.direction, px, size);
      sctx.globalCompositeOperation = 'destination-in';
      drawImageFrame(sctx, frameImage, frameR);
      ctx.drawImage(shadow as CanvasImageSource, -R, -R);
    } else if (hasFrame && !imageFrame && doc.shadows.popOut.enabled) {
      ctx.save();
      ctx.beginPath();
      traceInto(ctx, shapePolygon(doc.shape, R, insets.frameOuter * R));
      traceInto(ctx, shapePolygon(doc.shape, R, insets.frameInner * R));
      ctx.clip('evenodd');
      castShadow(ctx, (c, dx) => putLayer(c, pop!, dx), doc.shadows.popOut, doc.lighting.direction, px, size);
      ctx.restore();
    }
    // 13. Pop-out art: the same processed bitmap as step 5, drawn through the
    // pop-out mask and clipped only to the square.
    putLayer(ctx, pop);
  }

  // 14. Label (src/render/label.ts).
  if (doc.label) drawLabel(ctx, doc, R, size);

  ctx.restore();
}

const ids = new WeakMap<object, number>();
let nextId = 1;
/** A number that stays the same for the same object (for cache keys). */
function objectId(o: object): number {
  let id = ids.get(o);
  if (!id) ids.set(o, (id = nextId++));
  return id;
}

/** Unit vector of the direction a shadow falls. */
function shadowVector(shadow: OuterShadow, lightFrom: number): { x: number; y: number } {
  // Light from the top left (225°) casts shadows down and to the right.
  const deg = shadow.followLight ? lightFrom - 180 : shadow.angle;
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Adds a closed polygon to the current path (for clips with holes). */
function traceInto(ctx: Ctx, points: { x: number; y: number }[]): void {
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/**
 * Draws only the shadow of whatever `paint` draws: the shape is painted far
 * off the canvas and only its shadow is moved back onto it.
 */
function castShadow(
  ctx: Ctx,
  paint: (c: Ctx, dx: number) => void,
  shadow: OuterShadow,
  lightFrom: number,
  px: (v: number) => number,
  size: number,
): void {
  const fall = shadowVector(shadow, lightFrom);
  const far = size * 4; // draw the shape off-canvas; only its shadow lands on it
  ctx.save();
  ctx.shadowColor = rgba(shadow.color, shadow.opacity);
  ctx.shadowBlur = px(shadow.blur);
  ctx.shadowOffsetX = fall.x * px(shadow.distance) + far;
  ctx.shadowOffsetY = fall.y * px(shadow.distance);
  if (shadow.spread > 0) {
    // A bigger shadow: the off-canvas shape is scaled round its own centre
    // (shadow offsets and blur ignore the transform, so they stay as set).
    ctx.translate(-far, 0);
    ctx.scale(1 + shadow.spread, 1 + shadow.spread);
    paint(ctx, 0);
  } else paint(ctx, -far);
  ctx.restore();
}

/**
 * The outer drop shadow: only the shadow of the silhouette, then the area
 * under the silhouette is cleared so the shadow never shows through
 * transparent parts of the token.
 */
function outerShadow(
  ctx: Ctx,
  paint: (c: Ctx, dx?: number) => void,
  shadow: OuterShadow,
  lightFrom: number,
  px: (v: number) => number,
  size: number,
): void {
  castShadow(ctx, paint, shadow, lightFrom, px, size);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  paint(ctx);
  ctx.restore();
}

/** Creates a canvas in the browser (main thread or worker). */
export function createCanvas(size: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }
  return new OffscreenCanvas(size, size);
}

/** render(doc, assets, outputSize) → canvas (DESIGN.md §4.1). */
export function render(doc: TokenDocument, assets: AssetMap, outputSize: number): HTMLCanvasElement | OffscreenCanvas {
  const canvas = createCanvas(outputSize);
  const ctx = canvas.getContext('2d') as Ctx;
  renderToken(ctx, doc, assets, outputSize);
  return canvas;
}
