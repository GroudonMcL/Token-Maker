import { Check, Eraser, ImagePlus, Paintbrush, PaintbrushVertical, ScanSearch, TriangleAlert, Undo2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useStore } from 'zustand';
import type { ArtTransform, Decoration, LabelSettings, MaskStroke, PopOutStroke, TokenDocument } from '../document/types';
import { aiStore } from '../image/aiRemoval';
import { requestFullArt, useProcessedVersion } from '../image/artWorker';
import { ghostOverlay, maskOverlay, popOutOverlay } from '../image/maskOverlay';
import { popOutMask } from '../image/popOut';
import { artEdits } from '../image/process';
import { DRAFT_SIDE, peekProcessedArt, processedArt, sourcePixels } from '../image/processedArt';
import { artCorners, baseScale, imageClipPolygon, imagePointAt, rotateAround, zoomAround } from '../render/geometry';
import { decorationCorners, decorationGeometry, nearestSnap, placements, type Placement } from '../render/decorations';
import { labelPlacement } from '../render/label';
import { renderToken } from '../render/render';
import { backgroundAssetId } from '../render/background';
import { useFontVersion } from '../fonts/fontLoader';
import { pointInPolygon, type Point } from '../render/shapes';
import { revealSection } from '../layout/reveal';
import { assetStore } from '../state/assets';
import { commitDoc, docHistory, undo, updateDoc, useCanUndo, useDoc } from '../state/tokenStore';
import { toast } from '../ui/toast';
import { setTransform, updateFrameAndArt } from './artActions';
import { MAX_OUTER_SPACING } from '../document/defaults';
import { draggedLabel } from './labelActions';
import { extendStroke, pickColour, pointerPressure, startStroke, type StrokeContext } from './brush';
import { selectDecoration, setBrush, setTool, toolStore, useTool } from './tools';
import { SampleButton } from './SampleButton';
import { useOverflow, useOverflowCheck } from './overflowCheck';
import { OVERFLOW_ADVICE } from '../render/overflow';
import { UploadButton } from './UploadButton';

const PADDING = 40;
const MIN_TOKEN = 160;
const MAX_TOKEN = 640;
const HANDLE_MARGIN = 18;
const VIEW_MAX = 8;
/**
 * The token canvas never gets bigger than this many pixels across, however
 * far the view is zoomed: past it the browser just scales the picture up.
 * Drawing the whole token at 4096px or more made zooming in laggy.
 */
const MAX_CANVAS = 2560;
/** …and while something is being dragged or painted, at most this many. */
const MAX_DRAG_CANVAS = 1536;
/** After the view stops zooming, wait this long before redrawing the token sharp for the new size. */
const ZOOM_SETTLE_MS = 160;
/** However far the view is moved, at least this much of the token stays on screen. */
const VIEW_KEEP = 64;
/**
 * Pixel density of the token preview while a slider or the art is being
 * dragged (Phase 10): drawing fewer pixels keeps phones smooth, and the
 * sharp preview comes back as soon as the drag ends. Exports never use it.
 */
const DRAG_DPR = 1.25;

/** How far the view (not the art) is zoomed in, and where the token centre has moved to. */
interface View {
  scale: number;
  x: number;
  y: number;
}
const HOME: View = { scale: 1, x: 0, y: 0 };

type Gesture =
  | { kind: 'pan'; start: ArtTransform; x: number; y: number; distance: number; angle: number }
  | { kind: 'view'; start: View; x: number; y: number }
  | { kind: 'scale' | 'rotate'; start: ArtTransform; centre: Point; startPoint: Point }
  | { kind: 'brush'; target: 'mask'; stroke: MaskStroke; index: number }
  | { kind: 'brush'; target: 'popout'; stroke: PopOutStroke; index: number }
  | { kind: 'background'; x: number; y: number; offsetX: number; offsetY: number }
  | { kind: 'bgScale'; zoom: number; centre: Point; startPoint: Point }
  | { kind: 'decor'; start: Decoration; from: Placement; x: number; y: number }
  | { kind: 'decorScale' | 'decorRotate'; start: Decoration; centre: Point; startPoint: Point }
  | { kind: 'label'; start: LabelSettings; from: Point; x: number; y: number }
  | { kind: 'pick' }
  | { kind: 'bounds'; spacing: number; d0: number };

/** The eyedropper's bubble: the colour under the pointer, shown while it is held down and dragged. */
interface Loupe {
  x: number;
  y: number;
  colour: string | null;
  touch: boolean;
}

/**
 * The canvas: the token (drawn by the same renderer as the export), the whole
 * art dimmed behind it, and handles to resize and rotate the art. Works with
 * mouse, touch and pen through pointer events.
 */
export function Stage({ reserveTop = 64, reserveBottom = 0 }: { reserveTop?: number; reserveBottom?: number }) {
  const doc = useDoc();
  const assets = useStore(assetStore, (s) => s.assets);
  const art = doc.art.assetId ? assets.get(doc.art.assetId) : undefined;
  const stageRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLCanvasElement>(null);
  const tokenRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const tool = useTool((s) => (art ? s.tool : 'move'));
  const brushSize = useTool((s) => s.brushSize);
  const showRemoved = useTool((s) => s.showRemoved);
  const showPopOut = useTool((s) => s.showPopOut);
  const showGhost = useTool((s) => s.showGhost);
  const painting = tool === 'brush' || tool === 'popout';
  const selectedId = useTool((s) => s.selectedDecoration);
  const selected = doc.decorations.find((d) => d.id === selectedId && d.visible) ?? null;
  const [cursor, setCursor] = useState<Point | null>(null);
  const [loupe, setLoupe] = useState<Loupe | null>(null);
  const [movingLabel, setMovingLabel] = useState(false);
  // Redraw when a label font finishes loading.
  const fontVersion = useFontVersion();

  // Processed art: the full-size result when ready, else a quick copy (DESIGN.md §5).
  const settling = useStore(docHistory, (s) => s.pendingBase !== null);
  const version = useProcessedVersion();
  // An AI cut-out mask arriving changes the art's edits without changing the document.
  useStore(aiStore, (s) => s.masks);
  const edits = artEdits(doc);
  const display = art ? (peekProcessedArt(art, edits) ?? processedArt(art, edits, DRAFT_SIDE)) : null;
  const needsFull = !!art && !peekProcessedArt(art, edits);
  useEffect(() => {
    // Ask the worker for the full-size art once a drag has finished.
    if (art && needsFull && !settling) void requestFullArt(art, edits);
  }, [art, edits, needsFull, settling, version]);
  // What would be cut off at the square's edge, checked once the token stops changing.
  useOverflowCheck(doc, assets, display?.source, settling || dragging);
  const overflow = useOverflow();
  const [viewState, setViewState] = useState({ key: '', view: HOME });
  const [spaceHeld, setSpaceHeld] = useState(false);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const availH = box.height - reserveTop - reserveBottom;
  const tokenCss = Math.round(Math.max(MIN_TOKEN, Math.min(MAX_TOKEN, Math.min(box.width, availH) - PADDING * 2)));

  // A new image or a resized window starts from the whole token in view.
  const viewKey = `${doc.art.assetId}|${box.width}|${box.height}`;
  const view = viewState.key === viewKey ? viewState.view : HOME;
  const setView = (next: View | ((v: View) => View)) =>
    setViewState((prev) => {
      const current = prev.key === viewKey ? prev.view : HOME;
      return { key: viewKey, view: typeof next === 'function' ? next(current) : next };
    });

  // Token centre in stage coordinates with the view at 100%.
  const cx0 = box.width / 2;
  const cy0 = reserveTop + availH / 2;
  // …and as currently viewed.
  const R = (tokenCss / 2) * view.scale;
  const cx = cx0 + view.x;
  const cy = cy0 + view.y;

  // The token is redrawn for a new view size only once zooming stops; until
  // then the browser scales the last drawing, so the wheel stays smooth.
  const [drawnScale, setDrawnScale] = useState(view.scale);
  useEffect(() => {
    if (drawnScale === view.scale) return;
    const timer = setTimeout(() => setDrawnScale(view.scale), ZOOM_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [view.scale, drawnScale]);
  const drawnR = (tokenCss / 2) * drawnScale;

  /**
   * Keeps the scale in range and part of the token on screen; at 100% the
   * token sits in the middle. Zoomed in, the token's centre may go off
   * screen, so its edge can be brought to the middle and zoomed in on.
   */
  const clampView = (v: View): View => {
    const scale = Math.min(VIEW_MAX, Math.max(1, v.scale));
    if (scale <= 1.001) return HOME;
    const r = (tokenCss / 2) * scale;
    const keepX = Math.min(VIEW_KEEP, box.width / 2);
    const keepY = Math.min(VIEW_KEEP, availH / 2);
    return {
      scale,
      x: Math.min(box.width - keepX + r - cx0, Math.max(keepX - r - cx0, v.x)),
      y: Math.min(box.height - reserveBottom - keepY + r - cy0, Math.max(reserveTop + keepY - r - cy0, v.y)),
    };
  };

  // Space + drag looks around a zoomed-in view, like most drawing apps.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]');
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e)) {
        if (e.target === stageRef.current) e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceHeld(false);
    const blur = () => setSpaceHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  const clip = imageClipPolygon(doc);

  /** Draws an image of the art's shape (the art, or its mask) where the art is on screen. */
  function drawArt(ctx: CanvasRenderingContext2D, image: CanvasImageSource, dpr: number) {
    if (!art) return;
    const t = doc.art.transform;
    const s = baseScale(art.width, art.height, clip) * t.zoom * R * dpr;
    ctx.save();
    ctx.translate((cx + t.offsetX * R) * dpr, (cy + t.offsetY * R) * dpr);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.flipX ? -s : s, t.flipY ? -s : s);
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(image, -art.width / 2, -art.height / 2, art.width, art.height);
    ctx.restore();
  }

  // The token itself: drawn on the next frame whenever it changes, but not
  // when the view only moves (the canvas is just placed somewhere else).
  const dpr = typeof window === 'undefined' ? 1 : Math.min(3, window.devicePixelRatio || 1);
  const tokenPx = Math.max(1, Math.round(Math.min(settling ? MAX_DRAG_CANVAS : MAX_CANVAS, drawnR * 2 * (settling ? Math.min(dpr, DRAG_DPR) : dpr))));
  useEffect(() => {
    if (!box.width || !box.height) return;
    const frame = requestAnimationFrame(() => {
      const token = tokenRef.current;
      if (!token) return;
      if (token.width !== tokenPx) {
        token.width = tokenPx;
        token.height = tokenPx;
      }
      const tctx = token.getContext('2d');
      if (tctx) renderToken(tctx, doc, assets, tokenPx, { processedArt: display?.source, frameAlpha: painting ? 0.5 : undefined });
    });
    return () => cancelAnimationFrame(frame);
  }, [box.width, box.height, tokenPx, doc, assets, display, painting, fontVersion]);

  // The art behind the token, and the brush overlays: cheap, so drawn for every view change.
  useEffect(() => {
    if (!box.width || !box.height) return;
    const frame = requestAnimationFrame(() => {
      const context = contextRef.current;
      if (context) {
        const w = Math.round(box.width * dpr);
        const h = Math.round(box.height * dpr);
        if (context.width !== w || context.height !== h) {
          context.width = w;
          context.height = h;
        }
        const ctx = context.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, w, h);
        if (ctx && art && display) drawArt(ctx, display.source.image, dpr);
      }
      // Removed parts tinted red while the brush is on; the pop-out mask tinted teal while it is painted.
      const maskCanvas = maskRef.current;
      if (maskCanvas) {
        const w = Math.round(box.width * dpr);
        const h = Math.round(box.height * dpr);
        if (maskCanvas.width !== w || maskCanvas.height !== h) {
          maskCanvas.width = w;
          maskCanvas.height = h;
        }
        const ctx = maskCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, w, h);
        if (ctx && art && display?.mask && tool === 'brush' && showGhost && clip.length) {
          // A see-through copy of the parts the brush has removed, as a guide (inside the opening).
          ctx.save();
          ctx.beginPath();
          clip.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo']((cx + p.x * R) * dpr, (cy + p.y * R) * dpr));
          ctx.closePath();
          ctx.clip();
          drawArt(ctx, ghostOverlay(art.image, display.mask, display.maskWidth, display.maskHeight), dpr);
          ctx.restore();
        }
        if (ctx && art && display?.mask && tool === 'brush' && showRemoved && clip.length) {
          // Only inside the frame's opening, where the art shows.
          ctx.save();
          ctx.beginPath();
          clip.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo']((cx + p.x * R) * dpr, (cy + p.y * R) * dpr));
          ctx.closePath();
          ctx.clip();
          drawArt(ctx, maskOverlay(display.mask, display.maskWidth, display.maskHeight), dpr);
          ctx.restore();
        }
        if (ctx && art && tool === 'popout' && showPopOut && doc.art.popOut.strokes.length) {
          // Not clipped: pop-out parts reach over the frame.
          const m = popOutMask(art, doc.art.popOut.strokes);
          drawArt(ctx, popOutOverlay(m.mask, m.w, m.h), dpr);
        }
      }
    });
    return () => cancelAnimationFrame(frame);
    // clip and drawArt are derived from doc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, R, cx, cy, doc, art, display, tool, showRemoved, showPopOut, showGhost, dpr]);

  const strokeContext = (): StrokeContext | null =>
    art ? { transform: doc.art.transform, width: art.width, height: art.height, clip, R } : null;

  /** Client position → R units from the token centre. */
  const toUnits = (clientX: number, clientY: number): Point => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - cx) / R, y: (clientY - rect.top - cy) / R };
  };

  const startPan = () => {
    const pts = [...pointers.current.values()];
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const [a, b] = pts;
    gesture.current = {
      kind: 'pan',
      start: doc.art.transform,
      x,
      y,
      distance: a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      angle: a && b ? Math.atan2(b.y - a.y, b.x - a.x) : 0,
    };
  };

  /** Removes a stroke that was just started (a second finger turned it into a pinch). */
  const cancelStroke = (g: Extract<Gesture, { kind: 'brush' }>) => {
    updateDoc((d) => withStroke(d, g.target, (list) => list.filter((_, i) => i !== g.index)), { transient: true });
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!art) return;
    if ((e.target as HTMLElement).closest('.float-toolbar, .stage__handle, .stage__toolbar, .stage__view, button, a, input')) return;
    // Middle button, or Space + drag: look around the zoomed view instead of moving the art.
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      stageRef.current?.setPointerCapture(e.pointerId);
      gesture.current = { kind: 'view', start: view, x: e.clientX, y: e.clientY };
      setDragging(true);
      return;
    }
    if (e.button > 0) return;
    stageRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
    const g = gesture.current;
    if (g?.kind === 'brush') cancelStroke(g); // two fingers: move and zoom instead
    if (pointers.current.size === 1 && tool === 'move') {
      // The label is drawn on top of everything, so it is picked first.
      const label = doc.label ? labelPlacement(doc) : null;
      if (label && doc.label && pointInPolygon(toUnits(e.clientX, e.clientY), label.outline)) {
        if (selectedId) selectDecoration(null);
        revealSection('label');
        gesture.current = { kind: 'label', start: doc.label, from: label.anchor, x: e.clientX, y: e.clientY };
        setMovingLabel(true);
        return;
      }
      const hit = decorationAt(e.clientX, e.clientY);
      if (hit) {
        selectDecoration(hit.d.id);
        revealSection('decorations');
        gesture.current = { kind: 'decor', start: hit.d, from: hit.p, x: e.clientX, y: e.clientY };
        return;
      }
      if (selectedId) selectDecoration(null);
    }
    if (pointers.current.size === 1 && tool === 'background') {
      gesture.current = { kind: 'background', x: e.clientX, y: e.clientY, offsetX: doc.background.offsetX, offsetY: doc.background.offsetY };
      return;
    }
    if (pointers.current.size === 1 && tool === 'eyedropper') {
      // Hold and drag to see the colour under the pointer in a bubble; letting go picks it.
      gesture.current = { kind: 'pick' };
      showLoupe(e);
      return;
    }
    if (gesture.current?.kind === 'pick') {
      // A second finger: no pick.
      gesture.current = null;
      setLoupe(null);
    }
    if (pointers.current.size === 1 && painting) {
      const c = strokeContext()!;
      const { brushMode, popOutMode, brushSize: sizePx, brushSoftness, usePressure } = toolStore.getState();
      const at = toUnits(e.clientX, e.clientY);
      const pressure = pointerPressure(e, usePressure);
      if (tool === 'popout') {
        const stroke = startStroke<PopOutStroke>(c, at, pressure, { mode: popOutMode, sizePx, softness: brushSoftness });
        gesture.current = { kind: 'brush', target: 'popout', stroke, index: doc.art.popOut.strokes.length };
      } else {
        const stroke = startStroke<MaskStroke>(c, at, pressure, { mode: brushMode, sizePx, softness: brushSoftness });
        gesture.current = { kind: 'brush', target: 'mask', stroke, index: doc.art.strokes.length };
      }
      const g = gesture.current;
      updateDoc((d) => withStroke(d, g.target, (list) => [...list, g.stroke]), { transient: true });
      return;
    }
    startPan();
  };

  /** The picture's colour under a point on screen, or null off the picture. */
  const colourAt = (clientX: number, clientY: number): string | null => {
    if (!art) return null;
    const q = imagePointAt(doc.art.transform, art.width, art.height, clip, toUnits(clientX, clientY));
    return pickColour(sourcePixels(art, DRAFT_SIDE), q.x, q.y);
  };

  const showLoupe = (e: ReactPointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    setLoupe({ x: e.clientX - rect.left, y: e.clientY - rect.top, colour: colourAt(e.clientX, e.clientY), touch: e.pointerType !== 'mouse' });
  };

  /** Eyedropper: the picked colour becomes the background colour to remove, or the colour to recolour. */
  const pickBackground = (clientX: number, clientY: number) => {
    if (!art) return;
    const colour = colourAt(clientX, clientY);
    const recolor = toolStore.getState().eyedropperFor === 'recolor';
    if (!colour) {
      toast(recolor ? 'Tap on the picture to pick the colour to change.' : 'Tap on the picture to pick its background colour.', 'error');
      return;
    }
    if (recolor) {
      const { index, end } = toolStore.getState().recolorTarget;
      updateDoc((d) => ({
        ...d,
        art: { ...d.art, adjust: { ...d.art.adjust, recolors: d.art.adjust.recolors.map((r, i) => (i === index ? { ...r, [end]: colour } : r)) } },
      }));
    }
    else updateDoc((d) => ({ ...d, art: { ...d.art, removal: { ...d.art.removal, enabled: true, color: colour } } }));
    setTool('move');
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (painting && e.pointerType !== 'touch') {
      const rect = stageRef.current!.getBoundingClientRect();
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    const g = gesture.current;
    if (g?.kind === 'view') {
      setView(clampView({ ...g.start, x: g.start.x + e.clientX - g.x, y: g.start.y + e.clientY - g.y }));
      return;
    }
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.kind === 'pick') {
      showLoupe(e);
      return;
    }
    if (g.kind === 'background') {
      // Offsets are fractions of the token's half-size; R here includes the view zoom.
      const offsetX = Math.min(5, Math.max(-5, g.offsetX + (e.clientX - g.x) / R));
      const offsetY = Math.min(5, Math.max(-5, g.offsetY + (e.clientY - g.y) / R));
      updateDoc((d) => ({ ...d, background: { ...d.background, offsetX, offsetY } }), { transient: true });
      return;
    }
    if (g.kind === 'decor') {
      moveDecoration(g, e.clientX, e.clientY, e.altKey);
      return;
    }
    if (g.kind === 'label') {
      // Snaps to the top or bottom of the frame unless Alt is held.
      const to = { x: g.from.x + (e.clientX - g.x) / R, y: g.from.y + (e.clientY - g.y) / R };
      const next = draggedLabel(doc, g.start, to, e.altKey);
      updateDoc((d) => ({ ...d, label: next }), { transient: true });
      return;
    }
    if (g.kind === 'brush') {
      const c = strokeContext()!;
      const next = extendStroke(c, g.stroke, toUnits(e.clientX, e.clientY), pointerPressure(e, toolStore.getState().usePressure));
      if (next === g.stroke) return;
      g.stroke = next;
      updateDoc((d) => withStroke(d, g.target, (list) => list.map((s, i) => (i === g.index ? next : s))), { transient: true });
      return;
    }
    if (g.kind !== 'pan') return;
    const pts = [...pointers.current.values()];
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    let next: ArtTransform = { ...g.start, offsetX: g.start.offsetX + (x - g.x) / R, offsetY: g.start.offsetY + (y - g.y) / R };
    const [a, b] = pts;
    if (a && b && g.distance > 0) {
      // Pinch to zoom and twist to rotate, both around the fingers' midpoint.
      const anchor = toUnits(x, y);
      next = zoomAround(next, Math.hypot(a.x - b.x, a.y - b.y) / g.distance, anchor);
      const turn = ((Math.atan2(b.y - a.y, b.x - a.x) - g.angle) * 180) / Math.PI;
      next = rotateAround(next, turn, anchor);
    }
    setTransform(() => next, { transient: true });
  };

  /** The top-most decoration (or mirrored copy) under a point on screen. */
  const decorationAt = (clientX: number, clientY: number): { d: Decoration; p: Placement } | null => {
    const at = toUnits(clientX, clientY);
    const geo = decorationGeometry(doc);
    for (const d of [...doc.decorations].reverse()) {
      if (!d.visible) continue;
      for (const p of placements(d, geo).reverse()) {
        if (pointInPolygon(at, decorationCorners(d, p, geo.squares))) return { d, p };
      }
    }
    return null;
  };

  /** Dragging a decoration: it snaps to the nearest snap point (hold Alt to place it freely). */
  const moveDecoration = (g: Extract<Gesture, { kind: 'decor' }>, clientX: number, clientY: number, free: boolean) => {
    const geo = decorationGeometry(doc);
    const dx = (clientX - g.x) / R;
    const dy = (clientY - g.y) / R;
    // Dragging the mirrored copy moves the original the other way.
    const at = { x: g.from.x + dx, y: g.from.y + dy };
    const target = g.from.mirrored ? { x: -at.x, y: at.y } : at;
    const snap = free ? null : nearestSnap(target, geo);
    const own = placements({ ...g.start, mirror: false }, geo)[0]!;
    let next: Decoration;
    if (snap) next = { ...g.start, place: snap, rotation: snap === g.start.place ? g.start.rotation : 0 };
    else next = { ...g.start, place: 'free', x: Math.max(-1.5, Math.min(1.5, target.x)), y: Math.max(-1.5, Math.min(1.5, target.y)), rotation: own.rotation };
    updateDoc((d) => ({ ...d, decorations: d.decorations.map((x) => (x.id === next.id ? next : x)) }), { transient: true });
  };

  const endPointer = (e: ReactPointerEvent) => {
    if (gesture.current?.kind === 'view') {
      gesture.current = null;
      setDragging(false);
      return;
    }
    if (!pointers.current.delete(e.pointerId)) return;
    if (gesture.current?.kind === 'pick') {
      gesture.current = null;
      setLoupe(null);
      setDragging(false);
      // Let go: the colour under the pointer is picked (not when the pointer was cancelled).
      if (e.type === 'pointerup') pickBackground(e.clientX, e.clientY);
      return;
    }
    if (pointers.current.size === 0) {
      setDragging(false);
      setMovingLabel(false);
      gesture.current = null;
      commitDoc(); // a whole stroke or drag is one undo step
    } else if (gesture.current?.kind !== 'brush') {
      startPan(); // a finger lifted: carry on with the rest
    }
  };

  // The art's corners on screen (for the wheel, the outline and the handles).
  const t = doc.art.transform;
  const corners = art ? artCorners(t, art.width, art.height, clip).map((p) => ({ x: cx + p.x * R, y: cy + p.y * R })) : [];

  // The wheel zooms the view (for close-up work) when over the token or the
  // art, and otherwise scrolls the side panel. It needs a non-passive
  // listener so the page doesn't scroll as well.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  useEffect(() => {
    wheelRef.current = (e: WheelEvent) => {
      const rect = stageRef.current!.getBoundingClientRect();
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const overArt = !!art && ((Math.abs(p.x - cx) <= R && Math.abs(p.y - cy) <= R) || insidePolygon(p, corners));
      if (!overArt) {
        const panel = document.querySelector<HTMLElement>('.side-panel');
        if (!panel) return;
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? panel.clientHeight : 1;
        panel.scrollBy({ top: e.deltaY * unit, left: 0 });
        return;
      }
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setView((v) => {
        const k = Math.min(VIEW_MAX, Math.max(1, v.scale * factor)) / v.scale;
        // Zoom around the pointer: the point under it stays put.
        return clampView({ scale: v.scale * k, x: p.x - (p.x - (cx0 + v.x)) * k - cx0, y: p.y - (p.y - (cy0 + v.y)) * k - cy0 });
      });
    };
  });
  useEffect(() => {
    const el = stageRef.current!;
    const onWheel = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && tool !== 'move') {
      setTool('move');
      return;
    }
    if (!art || e.target !== stageRef.current) return;
    if (selected && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      updateDoc((d) => ({ ...d, decorations: d.decorations.filter((x) => x.id !== selected.id) }));
      selectDecoration(null);
      return;
    }
    const step = e.shiftKey ? 0.08 : 0.015;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      setTransform((t) => ({ ...t, offsetX: t.offsetX + m[0], offsetY: t.offsetY + m[1] }));
    } else if (e.key === '+' || e.key === '=') {
      setTransform((t) => zoomAround(t, 1.1, { x: 0, y: 0 }));
    } else if (e.key === '-') {
      setTransform((t) => zoomAround(t, 1 / 1.1, { x: 0, y: 0 }));
    }
  };

  // ---- Resize and rotate handles ----
  const centre = { x: cx + t.offsetX * R, y: cy + t.offsetY * R };
  const keepIn = (p: Point) => ({
    x: Math.min(box.width - HANDLE_MARGIN, Math.max(HANDLE_MARGIN, p.x)),
    y: Math.min(box.height - reserveBottom - HANDLE_MARGIN, Math.max(reserveTop + HANDLE_MARGIN, p.y)),
  });
  // The rotate handle sits beyond the middle of the art's top edge.
  const top = corners.length ? { x: (corners[0]!.x + corners[1]!.x) / 2, y: (corners[0]!.y + corners[1]!.y) / 2 } : centre;
  const up = Math.hypot(top.x - centre.x, top.y - centre.y) || 1;
  const rotateAt = { x: top.x + ((top.x - centre.x) / up) * 28, y: top.y + ((top.y - centre.y) / up) * 28 };
  const rotateHandle = keepIn(rotateAt);
  // At 100% a handle beyond the edge is pulled back on screen; zoomed in, it is hidden instead.
  const offScreen = (p: Point) => view.scale > 1 && (p.x !== keepIn(p).x || p.y !== keepIn(p).y);

  const startHandle = (kind: 'scale' | 'rotate', e: ReactPointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const rect = stageRef.current!.getBoundingClientRect();
    gesture.current = { kind, start: t, centre, startPoint: { x: e.clientX - rect.left, y: e.clientY - rect.top } };
    setDragging(true);
  };
  const moveHandle = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || (g.kind !== 'scale' && g.kind !== 'rotate')) return;
    const rect = stageRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const from = { x: g.startPoint.x - g.centre.x, y: g.startPoint.y - g.centre.y };
    const to = { x: p.x - g.centre.x, y: p.y - g.centre.y };
    const anchor = { x: g.start.offsetX, y: g.start.offsetY };
    if (g.kind === 'scale') {
      const factor = Math.hypot(to.x, to.y) / Math.max(1, Math.hypot(from.x, from.y));
      setTransform(() => zoomAround(g.start, factor, anchor), { transient: true });
    } else {
      let turn = ((Math.atan2(to.y, to.x) - Math.atan2(from.y, from.x)) * 180) / Math.PI;
      if (e.shiftKey) turn = Math.round((g.start.rotation + turn) / 15) * 15 - g.start.rotation;
      setTransform(() => rotateAround(g.start, turn, anchor), { transient: true });
    }
  };
  // ---- The red export square's handles (Export tab): more or less room round the token ----
  // Shown with or without art, so the room round a frame can be set before a picture is added.
  const editBounds = useTool((s) => s.editBounds) && tool === 'move';
  const boundsDist = (e: ReactPointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return Math.max(Math.abs(e.clientX - rect.left - cx), Math.abs(e.clientY - rect.top - cy), 1);
  };
  const startBoundsHandle = (e: ReactPointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    gesture.current = { kind: 'bounds', spacing: doc.frame.outerSpacing, d0: boundsDist(e) };
    setDragging(true);
  };
  const moveBoundsHandle = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || g.kind !== 'bounds') return;
    // Dragging out makes the square bigger round the token: the frame keeps
    // its size on screen relative to where the drag started, so the room
    // round it (the outer spacing) grows.
    const sq = doc.size.squares;
    const m0 = Math.min(0.9, g.spacing / sq);
    const m = 1 - ((1 - m0) * g.d0) / boundsDist(e);
    const spacing = Math.round(Math.min(MAX_OUTER_SPACING, Math.max(0, m * sq)) * 1000) / 1000;
    updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, outerSpacing: spacing } }), { transient: true });
  };

  const endHandle = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setDragging(false);
    commitDoc();
  };

  // ---- The background picture's outline and resize handles, while it is being moved ----
  const bgSrc = doc.background.kind === 'image' ? assets.get(backgroundAssetId(doc) ?? '') : undefined;
  const bgCorners = (() => {
    if (!bgSrc || tool !== 'background' || !clip.length) return [];
    const bg = doc.background;
    const s = baseScale(bgSrc.width, bgSrc.height, clip) * bg.zoom;
    const hw = (bgSrc.width / 2) * s;
    const hh = (bgSrc.height / 2) * s;
    const mx = cx + bg.offsetX * R;
    const my = cy + bg.offsetY * R;
    return [
      { x: mx - hw * R, y: my - hh * R },
      { x: mx + hw * R, y: my - hh * R },
      { x: mx + hw * R, y: my + hh * R },
      { x: mx - hw * R, y: my + hh * R },
    ];
  })();
  const startBgHandle = (e: ReactPointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const rect = stageRef.current!.getBoundingClientRect();
    const bg = doc.background;
    gesture.current = { kind: 'bgScale', zoom: bg.zoom, centre: { x: cx + bg.offsetX * R, y: cy + bg.offsetY * R }, startPoint: { x: e.clientX - rect.left, y: e.clientY - rect.top } };
    setDragging(true);
  };
  const moveBgHandle = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || g.kind !== 'bgScale') return;
    const rect = stageRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left - g.centre.x, y: e.clientY - rect.top - g.centre.y };
    const from = { x: g.startPoint.x - g.centre.x, y: g.startPoint.y - g.centre.y };
    const factor = Math.hypot(p.x, p.y) / Math.max(1, Math.hypot(from.x, from.y));
    const zoom = Math.round(Math.min(8, Math.max(0.2, g.zoom * factor)) * 1000) / 1000;
    updateDoc((d) => ({ ...d, background: { ...d.background, zoom } }), { transient: true });
  };

  // ---- The selected decoration's outline and its resize and rotate handles ----
  const geo = decorationGeometry(doc);
  const decorPlacement = selected ? placements({ ...selected, mirror: false }, geo)[0]! : null;
  const decorBox = selected && decorPlacement ? decorationCorners(selected, decorPlacement, geo.squares).map((p) => ({ x: cx + p.x * R, y: cy + p.y * R })) : [];
  const decorAnchor = decorPlacement ? { x: cx + decorPlacement.x * R, y: cy + decorPlacement.y * R } : null;
  const decorTop = decorBox.length ? { x: (decorBox[0]!.x + decorBox[1]!.x) / 2, y: (decorBox[0]!.y + decorBox[1]!.y) / 2 } : null;
  const decorMid = decorBox.length ? { x: decorBox.reduce((s, p) => s + p.x, 0) / 4, y: decorBox.reduce((s, p) => s + p.y, 0) / 4 } : null;
  const decorRotateAt =
    decorTop && decorMid
      ? (() => {
          const len = Math.hypot(decorTop.x - decorMid.x, decorTop.y - decorMid.y) || 1;
          return { x: decorTop.x + ((decorTop.x - decorMid.x) / len) * 24, y: decorTop.y + ((decorTop.y - decorMid.y) / len) * 24 };
        })()
      : null;

  const startDecorHandle = (kind: 'decorScale' | 'decorRotate', e: ReactPointerEvent) => {
    if (!selected || !decorAnchor) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const rect = stageRef.current!.getBoundingClientRect();
    // Resize and turn around the middle of the picture as it is on screen.
    gesture.current = { kind, start: selected, centre: kind === 'decorScale' ? decorAnchor : decorMid!, startPoint: { x: e.clientX - rect.left, y: e.clientY - rect.top } };
    setDragging(true);
  };
  const moveDecorHandle = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || (g.kind !== 'decorScale' && g.kind !== 'decorRotate')) return;
    const rect = stageRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const from = { x: g.startPoint.x - g.centre.x, y: g.startPoint.y - g.centre.y };
    const to = { x: p.x - g.centre.x, y: p.y - g.centre.y };
    let next: Decoration;
    if (g.kind === 'decorScale') {
      const factor = Math.hypot(to.x, to.y) / Math.max(1, Math.hypot(from.x, from.y));
      next = { ...g.start, size: Math.max(0.04, Math.min(3, g.start.size * factor)) };
    } else {
      let rotation = g.start.rotation + ((Math.atan2(to.y, to.x) - Math.atan2(from.y, from.x)) * 180) / Math.PI;
      if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
      next = { ...g.start, rotation: ((((rotation + 180) % 360) + 360) % 360) - 180 };
    }
    updateDoc((d) => ({ ...d, decorations: d.decorations.map((x) => (x.id === next.id ? next : x)) }), { transient: true });
  };
  const decorHandles = tool === 'move' && !!art && decorBox.length === 4;

  return (
    <div
      ref={stageRef}
      className="stage"
      data-dragging={dragging || undefined}
      data-has-art={!!art || undefined}
      data-tool={tool}
      onPointerLeave={() => setCursor(null)}
      data-look={(spaceHeld && !!art) || undefined}
      data-view-zoomed={view.scale > 1 || undefined}
      tabIndex={art ? 0 : -1}
      aria-label={art ? 'Token preview. Drag to move the art, scroll to zoom the view, arrow keys to nudge.' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={onKeyDown}
    >
      <canvas ref={contextRef} className="stage__context" aria-hidden="true" />
      <canvas
        ref={tokenRef}
        className="stage__token"
        data-testid="token-canvas"
        role="img"
        aria-label={`Token preview: ${doc.name}`}
        style={{ width: R * 2, height: R * 2, left: cx - R, top: cy - R }}
      />
      <canvas ref={maskRef} className="stage__mask" aria-hidden="true" />
      {(art || editBounds) && (
        // The exported picture's edge: anything outside it is cut off.
        <svg className="stage__overlay" width={box.width} height={box.height} aria-hidden="true">
          <rect className="stage__bounds" data-testid="export-bounds" data-editing={editBounds || undefined} x={cx - R} y={cy - R} width={R * 2} height={R * 2} />
        </svg>
      )}
      {editBounds &&
        [
          { x: cx - R, y: cy - R },
          { x: cx + R, y: cy - R },
          { x: cx + R, y: cy + R },
          { x: cx - R, y: cy + R },
        ].map((p, i) => {
          if (offScreen(p)) return null;
          const q = keepIn(p);
          return (
            <span
              key={i}
              className="stage__handle stage__handle--bounds"
              style={{ left: q.x, top: q.y, cursor: i % 2 ? 'nesw-resize' : 'nwse-resize' }}
              data-testid={`bounds-handle-${i}`}
              title="Drag to give the token more or less room inside the picture"
              aria-hidden="true"
              onPointerDown={startBoundsHandle}
              onPointerMove={moveBoundsHandle}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            />
          );
        })}
      {art && corners.length === 4 && (
        <svg className="stage__overlay" width={box.width} height={box.height} aria-hidden="true">
          <polygon className="stage__outline" points={corners.map((p) => `${p.x},${p.y}`).join(' ')} />
        </svg>
      )}
      {bgCorners.length === 4 && (
        <>
          <svg className="stage__overlay" width={box.width} height={box.height} aria-hidden="true">
            <polygon className="stage__outline stage__outline--background" data-testid="background-outline" points={bgCorners.map((p) => `${p.x},${p.y}`).join(' ')} />
          </svg>
          {bgCorners.map((p, i) => {
            const q = keepIn(p);
            if (offScreen(p)) return null;
            return (
              <span
                key={i}
                className="stage__handle stage__handle--scale"
                style={{ left: q.x, top: q.y }}
                data-testid={`background-scale-handle-${i}`}
                onPointerDown={startBgHandle}
                onPointerMove={moveBgHandle}
                onPointerUp={endHandle}
                onPointerCancel={endHandle}
              />
            );
          })}
        </>
      )}
      {movingLabel && doc.label && (
        <svg className="stage__overlay" width={box.width} height={box.height} aria-hidden="true">
          <polygon
            className="stage__decor-outline"
            data-testid="label-outline"
            points={(labelPlacement(doc)?.outline ?? []).map((p) => `${cx + p.x * R},${cy + p.y * R}`).join(' ')}
          />
        </svg>
      )}
      {decorBox.length === 4 && tool === 'move' && (
        <svg className="stage__overlay" width={box.width} height={box.height} aria-hidden="true">
          <polygon className="stage__decor-outline" points={decorBox.map((p) => `${p.x},${p.y}`).join(' ')} />
        </svg>
      )}
      {decorHandles && (
        <>
          <span
            className="stage__handle stage__handle--decor"
            style={{ left: decorBox[2]!.x, top: decorBox[2]!.y }}
            data-testid="decor-scale-handle"
            aria-hidden="true"
            onPointerDown={(e) => startDecorHandle('decorScale', e)}
            onPointerMove={moveDecorHandle}
            onPointerUp={endHandle}
            onPointerCancel={endHandle}
          />
          <span
            className="stage__handle stage__handle--rotate stage__handle--decor"
            style={{ left: decorRotateAt!.x, top: decorRotateAt!.y }}
            data-testid="decor-rotate-handle"
            aria-hidden="true"
            onPointerDown={(e) => startDecorHandle('decorRotate', e)}
            onPointerMove={moveDecorHandle}
            onPointerUp={endHandle}
            onPointerCancel={endHandle}
          />
        </>
      )}
      {art &&
        tool === 'move' &&
        !selected &&
        !editBounds &&
        corners.map((p, i) => {
          const q = keepIn(p);
          if (offScreen(p)) return null;
          return (
            <span
              key={i}
              className="stage__handle stage__handle--scale"
              style={{ left: q.x, top: q.y }}
              data-testid={`scale-handle-${i}`}
              onPointerDown={(e) => startHandle('scale', e)}
              onPointerMove={moveHandle}
              onPointerUp={endHandle}
              onPointerCancel={endHandle}
            />
          );
        })}
      {art && tool === 'move' && !selected && !editBounds && !offScreen(rotateAt) && (
        <span
          className="stage__handle stage__handle--rotate"
          style={{ left: rotateHandle.x, top: rotateHandle.y }}
          data-testid="rotate-handle"
          onPointerDown={(e) => startHandle('rotate', e)}
          onPointerMove={moveHandle}
          onPointerUp={endHandle}
          onPointerCancel={endHandle}
        />
      )}
      {tool !== 'move' && <ToolBar bottom={reserveBottom + 12} />}
      {painting && cursor && (
        <span className="stage__brush-cursor" aria-hidden="true" style={{ left: cursor.x, top: cursor.y, width: brushSize, height: brushSize }} />
      )}
      {loupe && tool === 'eyedropper' && <PickLoupe loupe={loupe} width={box.width} />}
      {/* Not while a brush or tool is on, so it never gets in the way of painting near the bottom. */}
      {art && overflow.length > 0 && tool === 'move' && (
        <button
          type="button"
          className="stage__overflow"
          role="status"
          data-testid="overflow-warning"
          // Above the view's reset button when that is showing.
          style={{ bottom: reserveBottom + 12 + (view.scale > 1 ? 44 : 0) }}
          onClick={() => revealSection('export')}
          title="See what reaches past the edge and how to fix it"
        >
          <TriangleAlert size={14} aria-hidden="true" />
          {OVERFLOW_ADVICE[overflow[0]!].what} {overflow.length > 1 ? 'and more get' : 'gets'} cut off at the edge
        </button>
      )}
      {art && view.scale > 1 && (
        <button
          type="button"
          className="btn btn--ghost stage__view"
          style={{ bottom: reserveBottom + (tool !== 'move' ? 68 : 12) }}
          onClick={() => setView(HOME)}
          aria-label={`View zoomed to ${Math.round(view.scale * 100)}%. Reset view`}
          title="Zoom the view back out to the whole token"
        >
          <ScanSearch size={16} aria-hidden="true" />
          View <span className="num">{Math.round(view.scale * 100)}%</span> · Reset
        </button>
      )}
      {!art && (
        <div className="stage__empty" style={{ top: cy, left: cx, maxWidth: Math.max(260, R * 1.5) }}>
          <p className="canvas-area__hint">
            <strong>Drop, paste or upload an image</strong>
          </p>
          <div className="stage__empty-actions">
            <UploadButton>
              <ImagePlus size={18} aria-hidden="true" />
              Upload image
            </UploadButton>
            <SampleButton />
          </div>
          <ol className="stage__steps" aria-label="How it works">
            <li>Add a picture</li>
            <li>Style it</li>
            <li>Download for your VTT</li>
          </ol>
        </div>
      )}
    </div>
  );
}

/** Shown on the canvas while the brush or eyedropper is on: quick mode switch and Done. */
function ToolBar({ bottom }: { bottom: number }) {
  const tool = useTool((s) => s.tool);
  const mode = useTool((s) => s.brushMode);
  const popOutMode = useTool((s) => s.popOutMode);
  const eyedropperFor = useTool((s) => s.eyedropperFor);
  const recolorEnd = useTool((s) => s.recolorTarget.end);
  const canUndo = useCanUndo();
  const names: Record<string, string> = { brush: 'Brush', background: 'Move background', popout: 'Pop-out brush', eyedropper: 'Eyedropper' };
  return (
    <div className="stage__toolbar" role="toolbar" aria-label={names[tool]} style={{ bottom }}>
      {tool === 'popout' ? (
        <>
          <button type="button" className="stage__tool-btn" aria-pressed={popOutMode === 'add'} onClick={() => setBrush({ popOutMode: 'add' })}>
            <Paintbrush size={16} aria-hidden="true" />
            Add
          </button>
          <button type="button" className="stage__tool-btn" aria-pressed={popOutMode === 'erase'} onClick={() => setBrush({ popOutMode: 'erase' })}>
            <Eraser size={16} aria-hidden="true" />
            Erase
          </button>
          <button type="button" className="stage__tool-btn" aria-label="Undo the last change" disabled={!canUndo} onClick={undo}>
            <Undo2 size={16} aria-hidden="true" />
            Undo
          </button>
        </>
      ) : tool === 'brush' ? (
        <>
          <button type="button" className="stage__tool-btn" aria-pressed={mode === 'erase'} onClick={() => setBrush({ brushMode: 'erase' })}>
            <Eraser size={16} aria-hidden="true" />
            Erase
          </button>
          <button type="button" className="stage__tool-btn" aria-pressed={mode === 'restore'} onClick={() => setBrush({ brushMode: 'restore' })}>
            <PaintbrushVertical size={16} aria-hidden="true" />
            Restore
          </button>
          <button type="button" className="stage__tool-btn" aria-label="Undo the last change" disabled={!canUndo} onClick={undo}>
            <Undo2 size={16} aria-hidden="true" />
            Undo
          </button>
        </>
      ) : tool === 'background' ? (
        <span className="stage__tool-hint">Drag to move the background, or a corner to resize it</span>
      ) : (
        <span className="stage__tool-hint">
          {eyedropperFor === 'recolor' ? (recolorEnd === 'to' ? 'Tap the colour to change it to' : 'Tap the colour to change') : 'Tap the background colour'}, or hold and drag to look
        </span>
      )}
      <button type="button" className="btn btn--primary btn--small" onClick={() => setTool('move')}>
        <Check size={16} aria-hidden="true" />
        Done
      </button>
    </div>
  );
}

/**
 * The eyedropper's bubble: a swatch of the colour under the pointer and its
 * code. Above a finger (so the finger doesn't hide it), beside a mouse.
 */
function PickLoupe({ loupe, width }: { loupe: Loupe; width: number }) {
  const SIZE = 64;
  const lift = loupe.touch ? 84 : 52;
  // Kept on screen: below the point when the point is near the top, to the left near the right edge.
  const flipY = loupe.y - lift - SIZE / 2 < 4;
  const top = flipY ? loupe.y + lift : loupe.y - lift;
  const side = loupe.touch ? 0 : loupe.x + 40 + SIZE / 2 > width ? -40 : 40;
  const left = Math.min(width - SIZE / 2 - 4, Math.max(SIZE / 2 + 4, loupe.x + side));
  return (
    <>
      <span className="stage__pick-point" aria-hidden="true" style={{ left: loupe.x, top: loupe.y }} />
      <div
        className="stage__loupe"
        data-testid="pick-loupe"
        data-empty={!loupe.colour || undefined}
        role="status"
        aria-live="polite"
        style={{ left, top }}
      >
        <span className="stage__loupe-swatch" style={{ background: loupe.colour ?? undefined, width: SIZE, height: SIZE }} />
        <code className="stage__loupe-code">{loupe.colour ?? 'Off picture'}</code>
      </div>
    </>
  );
}

/** The document with one of the art's stroke lists changed: the erase/restore mask's or the pop-out's. */
function withStroke<S extends MaskStroke | PopOutStroke>(
  d: TokenDocument,
  target: 'mask' | 'popout',
  change: (list: S[]) => S[],
): TokenDocument {
  if (target === 'popout') return { ...d, art: { ...d.art, popOut: { ...d.art.popOut, strokes: change(d.art.popOut.strokes as S[]) as PopOutStroke[] } } };
  return { ...d, art: { ...d.art, strokes: change(d.art.strokes as S[]) as MaskStroke[] } };
}

/** Is `p` inside the convex polygon `poly` (either winding)? */
function insidePolygon(p: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}
