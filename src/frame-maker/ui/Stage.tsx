// The canvas: a live preview drawn by renderProject, with the selection and
// editing handles on a separate overlay (never exported). Click a layer to
// pick it; drag it in or out to move it across the band, or round the token
// to slide repeated shapes along it. Shapes and paths get handles to move,
// resize and turn them, and paths can be drawn and their points edited.
// Works with a finger too (handles are easier to catch), and from the
// keyboard: with the canvas focused, the arrow keys move the selected layer.

import { useEffect, useRef, useState } from 'react';
import { SHAPES } from '../engine/legacy/catalog';
import type { FrameGeometry } from '../engine/legacy/frameKit';
import type { Point } from '../engine/legacy/shapes';
import { DEFAULT_STAGE } from '../project/defaults';
import { findLayer, flatten, isLocked, isShown, locate } from '../project/tree';
import type { FrameProject, Layer, PathLayer, PlacedLayer } from '../project/types';
import { bandGeometry, outlineAt } from '../render/band';
import {
  dragLayer,
  finder,
  movePathPart,
  nudgeLayer,
  pathHandles,
  pathLocal,
  pickLayer,
  pickPathPart,
  placeAt,
  rotateBy,
  scaleBy,
  toggleSmooth,
  transformHandles,
  type PathPart,
} from '../render/hitTest';
import { contourLines, lineOutline, repeatPlacements } from '../render/layers';
import { textGlyphs } from '../render/text';
import { followed, tracksFor, type FindLayer } from '../render/track';
import { generatorReach } from '../render/generators';
import { loadFonts } from './fonts';
import { placements, localBounds, toCanvas } from '../render/placed';
import { renderStats } from '../render/layerCache';
import { onPictureLoaded } from '../render/pictures';
import { renderProject } from '../render/renderProject';
import { commit, finishDrawing, movableIn, select, setPathEdit, setPathPoints, updateLayer, updateLayers, updateStage, useProject, useUi, type PathEdit } from '../state/projectStore';
import { ColorField, Segmented, Select, Slider, Toggle } from './controls';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { RenderView } from '../render/effects';
import { stageArt } from './stageArt';

const GOLD = 'rgba(240, 196, 112, 0.95)';

function strokeOutline(ctx: CanvasRenderingContext2D, poly: Point[]): void {
  if (!poly.length) return;
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
}

function strokeOpen(ctx: CanvasRenderingContext2D, poly: Point[]): void {
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

/** The dashed outline showing where a layer is. */
function outlineLayer(ctx: CanvasRenderingContext2D, layer: Layer, g: FrameGeometry, find: FindLayer): void {
  switch (layer.type) {
    case 'repeat':
      for (const { p, h } of repeatPlacements(layer, g, find)) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (h * Math.max(1, layer.stretch)) / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'line':
      if (layer.waveAmplitude > 0) strokeOutline(ctx, lineOutline(layer, g));
      else {
        strokeOutline(ctx, outlineAt(g, layer.at - layer.width / 2));
        strokeOutline(ctx, outlineAt(g, layer.at + layer.width / 2));
      }
      break;
    case 'text': {
      const { glyphs, height } = textGlyphs(layer, g, find);
      for (const { p, width } of glyphs) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(height, width) * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'contours':
      for (const l of contourLines(layer)) {
        strokeOutline(ctx, outlineAt(g, l.at - l.width / 2));
        strokeOutline(ctx, outlineAt(g, l.at + l.width / 2));
      }
      break;
    case 'growth':
    case 'knotwork':
    case 'gears':
    case 'chain': {
      const reach = generatorReach(layer);
      if (followed(layer.follow, find)) for (const t of tracksFor(layer.follow, layer.at, g, find)) (t.closed ? strokeOutline : strokeOpen)(ctx, t.points);
      else {
        strokeOutline(ctx, outlineAt(g, layer.at - reach));
        strokeOutline(ctx, outlineAt(g, layer.at + reach));
      }
      break;
    }
    case 'fracture':
    case 'cells':
    case 'bandFill':
    case 'texture':
      strokeOutline(ctx, outlineAt(g, layer.from));
      strokeOutline(ctx, outlineAt(g, layer.to));
      break;
    case 'legacyFrame':
      strokeOutline(ctx, outlineAt(g, 0));
      strokeOutline(ctx, outlineAt(g, 1));
      break;
    case 'shape':
    case 'path': {
      const b = localBounds(layer);
      for (const t of placements(layer, g)) {
        strokeOutline(
          ctx,
          [
            { x: b.minX, y: b.minY },
            { x: b.maxX, y: b.minY },
            { x: b.maxX, y: b.maxY },
            { x: b.minX, y: b.maxY },
          ].map((p) => toCanvas(t, p)),
        );
      }
      break;
    }
    case 'group':
      for (const child of flatten(layer.children)) if (child.visible) outlineLayer(ctx, child, g, find);
      break;
  }
}

function dot(ctx: CanvasRenderingContext2D, p: Point, r: number, fill: string, square = false): void {
  ctx.beginPath();
  if (square) ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
  else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function drawOverlay(ctx: CanvasRenderingContext2D, project: FrameProject, ids: string[], primary: Layer | undefined, edit: PathEdit | null, size: number, zoom: number): void {
  const g = bandGeometry(project.stage, size);
  const find = finder(project);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.lineWidth = 1.5 * zoom;
  ctx.setLineDash([5 * zoom, 4 * zoom]);
  ctx.strokeStyle = GOLD;
  for (const id of ids) {
    const layer = findLayer(project.layers, id);
    if (layer && isShown(project.layers, id)) outlineLayer(ctx, layer, g, find);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = '#1a1208';
  ctx.lineWidth = 1.2 * zoom;
  if (primary && (primary.type === 'shape' || primary.type === 'path') && isShown(project.layers, primary.id) && !isLocked(project.layers, primary.id)) {
    if (primary.type === 'path' && edit) {
      // Points (squares) and curve handles (circles) of the path itself.
      const handles = pathHandles(primary, g);
      ctx.strokeStyle = GOLD;
      handles.forEach((h) => {
        for (const c of [h.in, h.out]) {
          if (!c) continue;
          ctx.beginPath();
          ctx.moveTo(h.at.x, h.at.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      });
      ctx.strokeStyle = '#1a1208';
      handles.forEach((h, i) => {
        if (h.in) dot(ctx, h.in, 3.5 * zoom, '#ffffff');
        if (h.out) dot(ctx, h.out, 3.5 * zoom, '#ffffff');
        const first = i === 0 && edit.drawing && primary.points.length >= 3;
        dot(ctx, h.at, (first ? 5.5 : 4.5) * zoom, i === edit.point ? '#ffd27a' : first ? '#7ad3ff' : '#ffffff', true);
      });
    } else {
      const h = transformHandles(primary, g, zoom);
      if (h) {
        ctx.strokeStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(h.stem.x, h.stem.y);
        ctx.lineTo(h.rotate.x, h.rotate.y);
        ctx.stroke();
        ctx.strokeStyle = '#1a1208';
        dot(ctx, h.anchor, 3 * zoom, GOLD);
        dot(ctx, h.scale, 5 * zoom, '#ffffff', true);
        dot(ctx, h.rotate, 5.5 * zoom, '#ffffff');
      }
    }
  }
  ctx.restore();
}

type Drag =
  | { kind: 'move'; layer: Layer; start: Point }
  | { kind: 'scale' | 'rotate'; layer: PlacedLayer; anchor: Point; start: Point }
  | { kind: 'pathPart'; layer: PathLayer; part: PathPart }
  | { kind: 'group'; layers: Layer[]; start: Point }
  | { kind: 'pan'; from: { x: number; y: number }; pan: { x: number; y: number } };

const ZOOMS = [1, 1.5, 2, 3, 4, 6, 8];
/** The biggest picture the zoomed preview is drawn at. */
const MAX_PX = 4096;
const VIEW_NAMES: Record<RenderView, string> = { picture: 'The picture', height: 'Height map', normals: 'Normal map' };

export function Stage() {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const selectedIds = useUi((s) => s.selectedIds);
  const pathEdit = useUi((s) => s.pathEdit);
  const advanced = useUi((s) => s.mode === 'advanced');
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [side, setSide] = useState(480);
  // Zoom (a CSS scale of the canvas, drawn sharper to match) and pan (CSS pixels).
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<RenderView>('picture');
  const drag = useRef<Drag | null>(null);
  const selected = findLayer(project.layers, selectedId);
  // Text layers draw with web fonts: once they are loaded, the preview is drawn again.
  const [fonts, setFonts] = useState(0);
  useEffect(() => {
    void loadFonts().then(() => setFonts((n) => n + 1));
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setSide(Math.max(160, Math.floor(Math.min(el.clientWidth, el.clientHeight) - 32)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  const px = Math.min(MAX_PX, Math.round(side * dpr * zoom));

  // A photo texture arriving draws the preview again.
  const [pictures, setPictures] = useState(0);
  useEffect(() => onPictureLoaded(() => setPictures((n) => n + 1)), []);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const art = project.stage.showArt ? stageArt() : null;
    const full = () => {
      renderProject(ctx, project, px, { art, view });
      // How many layers this render had to draw (the rest came from the cache): read by the end-to-end tests.
      el.dataset.drawn = String(renderStats.drawn);
      el.dataset.reused = String(renderStats.reused);
    };
    // Effects work on every pixel, so on a sharp (high-density) screen a design with
    // effects is drawn at the screen's own size first, then sharpened once editing pauses.
    if (px <= side || !flatten(project.layers).some((l) => l.visible && l.effects?.some((e) => e.on))) return full();
    const quick = document.createElement('canvas');
    quick.width = quick.height = side;
    const qctx = quick.getContext('2d');
    if (!qctx) return full();
    renderProject(qctx, project, side, { art, view });
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(quick, 0, 0, px, px);
    ctx.restore();
    const id = setTimeout(full, 300);
    return () => clearTimeout(id);
  }, [project, px, side, fonts, view, pictures]);

  useEffect(() => {
    const ctx = overlay.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, px, px);
    drawOverlay(ctx, project, selectedIds, selected, pathEdit, px, dpr);
  }, [project, selected, selectedIds, pathEdit, px, dpr]);

  const toPoint = (e: React.PointerEvent | React.MouseEvent): Point => {
    const r = overlay.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width - 0.5) * px, y: ((e.clientY - r.top) / r.height - 0.5) * px };
  };
  const g = bandGeometry(project.stage, px);
  // A finger is less exact than a mouse, so handles and points are easier to catch with one.
  const reach = (e: React.PointerEvent | React.MouseEvent) => ('pointerType' in e && e.pointerType !== 'mouse' ? 20 : 9) * dpr;
  const editable = (l: Layer | undefined): l is Layer => !!l && isShown(project.layers, l.id) && !isLocked(project.layers, l.id);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toPoint(e);
    const tolerance = reach(e);
    const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const near = (a: Point, b: Point) => dist(a, b) <= tolerance;
    const capture = () => e.currentTarget.setPointerCapture(e.pointerId);
    const sel = selected;

    // Drawing or editing a path's points.
    if (sel?.type === 'path' && pathEdit && editable(sel)) {
      const part = pickPathPart(sel, g, pt, pathEdit.point, tolerance * 0.9);
      if (pathEdit.drawing && part?.part === 'point' && part.point === 0 && sel.points.length >= 3) {
        finishDrawing(true);
        return;
      }
      if (part) {
        setPathEdit({ ...pathEdit, point: part.point });
        drag.current = { kind: 'pathPart', layer: sel, part };
        capture();
        return;
      }
      if (pathEdit.drawing) {
        if (sel.points.length === 0) {
          // The first point anchors the path where it was clicked.
          updateLayer(sel.id, { ...placeAt(sel, g, pt), points: [{ x: 0, y: 0, handle: null }] });
          setPathEdit({ drawing: true, point: 0 });
        } else {
          const l = pathLocal(sel, g, pt);
          if (l) {
            setPathPoints(sel.id, [...sel.points, { ...l, handle: null }]);
            setPathEdit({ drawing: true, point: sel.points.length });
          }
        }
        return;
      }
    }

    // The resize and turn handles of a shape or path.
    if ((sel?.type === 'shape' || sel?.type === 'path') && editable(sel) && !pathEdit) {
      const h = transformHandles(sel, g, dpr);
      // On a small shape a fingertip covers the shape and its handles: a handle wins only when it is nearer than the shape's centre.
      const handle = (at: Point) => !!h && near(pt, at) && dist(pt, at) < dist(pt, h.anchor);
      if (h && handle(h.scale)) {
        drag.current = { kind: 'scale', layer: sel, anchor: h.anchor, start: pt };
        capture();
        return;
      }
      if (h && handle(h.rotate)) {
        drag.current = { kind: 'rotate', layer: sel, anchor: h.anchor, start: pt };
        capture();
        return;
      }
    }

    const hit = pickLayer(project, px, pt);
    // A picked group moves as a whole when one of its layers is dragged.
    if (hit && sel?.type === 'group' && editable(sel) && locate(project.layers, hit.id)?.ancestors.some((a) => a.id === sel.id) && !e.ctrlKey && !e.metaKey) {
      drag.current = { kind: 'group', layers: movableIn(sel), start: pt };
      capture();
      return;
    }
    if (!hit && zoom > 1) {
      // Zoomed in, dragging the empty canvas moves the view.
      drag.current = { kind: 'pan', from: { x: e.clientX, y: e.clientY }, pan };
      capture();
      return;
    }
    if (!hit || hit.id !== selectedId || e.ctrlKey || e.metaKey) select(hit?.id ?? null);
    if (hit) {
      drag.current = { kind: 'move', layer: hit, start: pt };
      capture();
    }
  };

  /** Zooms to `next`, keeping the point under `at` (a screen position; the middle of the canvas if none) where it is. */
  const setZoomAround = (next: number, at?: { x: number; y: number }) => {
    const z = Math.min(8, Math.max(1, next));
    const r = canvas.current?.getBoundingClientRect();
    // How far `at` is from the canvas's untransformed middle.
    const m = at && r ? { x: at.x - (r.left + r.width / 2) + pan.x, y: at.y - (r.top + r.height / 2) + pan.y } : { x: 0, y: 0 };
    setZoom(z);
    if (z === 1) setPan({ x: 0, y: 0 });
    else setPan({ x: m.x - ((m.x - pan.x) * z) / zoom, y: m.y - ((m.y - pan.y) * z) / zoom });
  };
  // The wheel zooms towards the pointer (Shift + wheel moves the zoomed view
  // about). A native listener, since React's wheel listeners can't stop the page scrolling.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.stage-tools, .stage-hint')) return;
      e.preventDefault();
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (zoom > 1) setPan((p) => ({ x: p.x - (e.deltaX || e.deltaY), y: p.y - (e.deltaX ? e.deltaY : 0) }));
        return;
      }
      // Lines and pages scroll in bigger steps than pixels.
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      setZoomAround(zoom * Math.exp(-Math.max(-300, Math.min(300, dy)) * 0.0015), { x: e.clientX, y: e.clientY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const pt = toPoint(e);
    let patch: Partial<Layer> | null = null;
    if (d.kind === 'pan') {
      setPan({ x: d.pan.x + e.clientX - d.from.x, y: d.pan.y + e.clientY - d.from.y });
      return;
    }
    if (d.kind === 'group') {
      updateLayers(
        d.layers.flatMap((l) => {
          const q = dragLayer(l, project, px, d.start, pt);
          return q ? [{ id: l.id, patch: q }] : [];
        }),
        { transient: true },
      );
      return;
    }
    if (d.kind === 'move') patch = dragLayer(d.layer, project, px, d.start, pt);
    else if (d.kind === 'scale') patch = scaleBy(d.layer, d.anchor, d.start, pt);
    else if (d.kind === 'rotate') patch = rotateBy(d.layer, d.anchor, d.start, pt, e.shiftKey);
    else if (d.kind === 'pathPart') {
      // Alt makes a smooth point's two handles separate.
      const points = movePathPart(d.layer, g, d.part, pt, e.altKey);
      if (points) patch = { points } as Partial<Layer>;
    }
    if (patch) updateLayer(d.layer.id, patch, { transient: true });
  };

  const endDrag = () => {
    if (drag.current && drag.current.kind !== 'pan') commit();
    drag.current = null;
  };

  /** Arrow keys move the selected layer a little (Shift: more), one undo step each. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey || !editable(selected) || pathEdit) return;
    e.preventDefault();
    const step = px * (e.shiftKey ? 0.02 : 0.004);
    const patch = nudgeLayer(selected, project, px, dir[0] * step, dir[1] * step);
    if (patch) updateLayer(selected.id, patch);
  };

  return (
    <section className="stage" aria-label="Canvas">
      <div className="stage-well" ref={wrap}>
        <div className="stage-canvas" style={{ width: side, height: side, transform: zoom > 1 ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined }}>
          <canvas ref={canvas} width={px} height={px} aria-label={`Preview of ${project.name}`} role="img" data-testid="preview" />
          <canvas
            ref={overlay}
            width={px}
            height={px}
            className={`overlay${pathEdit?.drawing ? ' drawing' : ''}`}
            data-testid="overlay"
            tabIndex={0}
            role="application"
            aria-roledescription="canvas"
            aria-label={selected ? `Canvas. ${selected.name} is selected: the arrow keys move it, Shift for bigger steps.` : 'Canvas. Click a layer to pick it.'}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={(e) => {
              const sel = selected;
              if (sel?.type !== 'path' || !pathEdit || pathEdit.drawing || !editable(sel)) return;
              const part = pickPathPart(sel, g, toPoint(e), pathEdit.point, reach(e) * 0.9);
              if (part?.part === 'point') setPathPoints(sel.id, toggleSmooth(sel.points, part.point, sel.closed));
            }}
          />
        </div>
        <div className="stage-tools">
          <div className="zoom" role="group" aria-label="Zoom">
            <button type="button" className="icon-btn" aria-label="Zoom out" title="Zoom out (mouse wheel)" disabled={zoom <= 1} onClick={() => setZoomAround(ZOOMS.filter((z) => z < zoom).at(-1) ?? 1)}>
              <ZoomOut size={16} />
            </button>
            <button type="button" className="btn small zoom-level" aria-label={`${Math.round(zoom * 100)}%: fit the whole token`} title="Fit the whole token" onClick={() => setZoomAround(1)}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="icon-btn" aria-label="Zoom in" title="Zoom in (mouse wheel); drag the empty canvas to move about" disabled={zoom >= 8} onClick={() => setZoomAround(ZOOMS.find((z) => z > zoom) ?? 8)}>
              <ZoomIn size={16} />
            </button>
          </div>
          {advanced && (
            <Select
              label="Show"
              hint="The picture, or (to check how surfaces are shaped) every bevel's height map, lighter where higher, or its normal map."
              value={view}
              options={(Object.keys(VIEW_NAMES) as RenderView[]).map((v) => ({ value: v, label: VIEW_NAMES[v] }))}
              onChange={setView}
            />
          )}
        </div>
        {pathEdit?.drawing && (
          <p className="stage-hint" role="status">
            Click to add points{selected?.type === 'path' && selected.points.length >= 3 ? '; click the first point or press Enter to finish' : ''}.
          </p>
        )}
      </div>
      <div className="stage-bar" aria-label="Preview settings">
        <Segmented label="Token shape" value={project.stage.shape} options={SHAPES.map((s) => ({ value: s.id, label: s.name }))} onChange={(shape) => updateStage({ shape })} />
        <div className="stage-sliders">
          <Slider
            label="Band thickness"
            hint="Designs follow the band, so try them thick and thin."
            value={project.stage.thickness}
            min={0.04}
            max={0.4}
            step={0.005}
            scale={100}
            unit="%"
            defaultValue={DEFAULT_STAGE.thickness}
            onChange={(thickness, t) => updateStage({ thickness }, { transient: t })}
            onCommit={commit}
          />
          {advanced && (
            <Slider
              label="Outer spacing"
              value={project.stage.outerSpacing}
              min={0}
              max={0.3}
              step={0.005}
              scale={100}
              unit="%"
              defaultValue={DEFAULT_STAGE.outerSpacing}
              onChange={(outerSpacing, t) => updateStage({ outerSpacing }, { transient: t })}
              onCommit={commit}
            />
          )}
          <Toggle label="Show sample picture" checked={project.stage.showArt} onChange={(showArt) => updateStage({ showArt })} />
          {advanced && project.stage.showArt && <ColorField label="Backing colour" value={project.stage.backingColor} defaultValue={DEFAULT_STAGE.backingColor} onChange={(backingColor, t) => updateStage({ backingColor }, { transient: t })} />}
        </div>
      </div>
    </section>
  );
}
