import { Circle, FolderOpen, Hexagon, RotateCcw, Square, SquareRoundCorner, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ColorSwatches, SegmentedButtons, Slider, TileGrid } from '../components';
import { updateFrameAndArt } from '../editor/artActions';
import { nudgeHole, pickImageFrame, uploadFrame } from '../editor/frameActions';
import { applyBuiltInDesign, applyDesignFrame, openDesignFile } from '../editor/designActions';
import type { DesignFrame, FrameSettings, ImageFrame } from '../document/types';
import { refreshDesigns, removeDesign, useDesignLibrary } from '../state/designLibrary';
import { builtInDesignById, builtInDesignFrame, isBuiltInDesign } from '../render/builtInDesigns';
import { refreshUploadedFrames, removeUploadedFrame, useUploadedFrames } from '../state/frameLibrary';
import { framePresetById, SHAPES, type ShapeId } from '../render/catalog';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';
import { designThumbnail } from './frameThumbs';
import { loadFramePictures, thumbOf, TILES } from './frameTiles';
import { createDocument } from '../document/defaults';
import { FramePicker } from './FramePicker';
import { frameAccent } from '../render/frames';

const DEFAULTS = createDocument().frame;

const FRAME_SWATCHES = ['#d7671f', '#d4a64a', '#c9d2de', '#7a7f8a', '#8a5a32', '#6aa83a', '#3f6fd8', '#5b2d7a', '#b8322a', '#1c1c1c'];
const HIGHLIGHT_SWATCHES = ['#3d8c6a', '#c7e04a', '#f3d27a', '#d9ad4a', '#ffffff', '#3b6fd8', '#b8322a', '#9b59d0', '#1c1c1c'];
const BACKING_SWATCHES = ['#1d1f27', '#000000', '#ffffff', '#2b2118', '#1e2b22', '#2a1f33'];

const FlatHexIcon = () => <Hexagon size={16} style={{ transform: 'rotate(90deg)' }} />;
const SHAPE_ICONS: Record<ShapeId, ReactNode> = {
  circle: <Circle size={16} />,
  rounded: <SquareRoundCorner size={16} />,
  square: <Square size={16} />,
  hexagon: <Hexagon size={16} />,
  flatHex: <FlatHexIcon />,
};

/** Per-square values are shown as a percentage of one grid square (1 unit = half a square). */
const toPct = (v: number) => Math.round(v * 50 * 10) / 10;
const fromPct = (p: number) => p / 50;

/**
 * Frame & shape section (DESIGN.md §6.9, §6.12): shape, the frames drawn by
 * code (colour, thickness, spacing) and the built-in Frame Maker designs
 * listed with them, a picture frame of your own (with its hole) or a Frame
 * Maker design you opened (on the same band as a drawn frame), and the
 * backing.
 */
export function FrameSection() {
  const frame = useDoc((d) => d.frame);
  const uploads = useUploadedFrames();
  // "Picture" can be chosen before any frame is uploaded, so remember the choice here too.
  const [pictureChosen, setPictureChosen] = useState(false);
  const builtIn = frame.kind === 'design' && isBuiltInDesign(frame.design?.id);
  const kind = frame.kind === 'image' && frame.image ? 'image' : frame.kind === 'design' && !builtIn ? 'design' : pictureChosen ? 'image' : 'code';
  return (
    <>
      <SegmentedButtons
        label="Frame type"
        value={kind}
        onChange={(k) => {
          setPictureChosen(k === 'image');
          if (k === 'code') updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, kind: 'code' } }));
          // A built-in design belongs with the drawn frames: Frame Maker starts with no design picked.
          else if (k === 'design') updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, kind: 'design', design: isBuiltInDesign(d.frame.design?.id) ? null : d.frame.design } }));
          else if (frame.image) updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, kind: 'image' } }));
          else {
            const first = uploads.frames[0];
            if (first) void pickImageFrame({ type: 'upload', id: first.id }, first.name);
          }
        }}
        options={[
          { value: 'code', label: 'Drawn' },
          { value: 'image', label: 'Picture' },
          { value: 'design', label: 'Frame Maker' },
        ]}
      />
      {kind === 'image' ? <PictureFrame image={frame.kind === 'image' ? frame.image : null} /> : kind === 'design' ? <DesignFramePanel design={frame.design} /> : <DrawnFrame />}
      <ColorSwatches
        label="Backing colour"
        value={frame.backingColor}
        swatches={BACKING_SWATCHES}
        onChange={(c) => updateDoc((d) => ({ ...d, frame: { ...d.frame, backingColor: c } }), { transient: true })}
        onCommit={commitDoc}
      />
      <Slider
        label="Backing opacity"
        unit="%"
        defaultValue={100}
        min={0}
        max={100}
        value={Math.round(frame.backingOpacity * 100)}
        onChange={(v) => updateDoc((d) => ({ ...d, frame: { ...d.frame, backingOpacity: v / 100 } }), { transient: true })}
        onCommit={commitDoc}
      />
    </>
  );
}

/** A picture frame of your own: the uploaded pictures, and the hole's nudge. */
function PictureFrame({ image }: { image: ImageFrame | null }) {
  const { frames: uploads, loaded } = useUploadedFrames();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!loaded) void refreshUploadedFrames();
  }, [loaded]);
  const n = image?.nudge ?? { x: 0, y: 0, scale: 1 };
  const nudged = n.x !== 0 || n.y !== 0 || n.scale !== 1;
  return (
    <>
      {uploads.length > 0 ? (
        <TileGrid
          label="Picture frame"
          value={image?.source.id ?? ''}
          onChange={(id) => void pickImageFrame({ type: 'upload', id }, uploads.find((f) => f.id === id)?.name ?? 'My frame')}
          tiles={uploads.map((f) => ({ id: f.id, label: f.name, preview: <img src={f.url} alt="" width={44} height={44} /> }))}
        />
      ) : (
        <p className="control__hint">No picture frames yet. Upload a PNG ring with a see-through middle.</p>
      )}
      <div className="control control--row" data-control="frame-upload">
        <button type="button" className="btn btn--small" onClick={() => input.current?.click()}>
          <Upload size={14} aria-hidden="true" />
          Upload a frame
        </button>
        {image && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              void removeUploadedFrame(image.source.id).then(() =>
                updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, kind: 'code', image: null } })),
              );
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove this frame
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/webp,image/gif,image/avif,image/svg+xml,.png,.webp,.gif,.avif,.svg"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="frame-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void uploadFrame(file);
          }}
        />
      </div>
      <p className="control__hint">Use a PNG with a see-through middle; the art shows through the hole. Picture frames grow with the token.</p>
      {image && (
        <>
          <Slider
            label="Hole size"
            unit="%"
            defaultValue={100}
            min={50}
            max={150}
            value={Math.round(n.scale * 100)}
            onChange={(v) => nudgeHole({ scale: v / 100 }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Move hole sideways"
            unit="%"
            defaultValue={0}
            min={-25}
            max={25}
            step={0.5}
            value={Math.round(n.x * 500) / 10}
            onChange={(v) => nudgeHole({ x: v / 50 }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Move hole up or down"
            unit="%"
            defaultValue={0}
            min={-25}
            max={25}
            step={0.5}
            value={Math.round(n.y * 500) / 10}
            onChange={(v) => nudgeHole({ y: v / 50 }, true)}
            onCommit={commitDoc}
          />
          <div className="control" data-control="frame-hole-reset">
            <button type="button" className="btn btn--ghost btn--small" disabled={!nudged} onClick={() => nudgeHole({ x: 0, y: 0, scale: 1 })}>
              <RotateCcw size={14} aria-hidden="true" />
              Reset the hole
            </button>
          </div>
        </>
      )}
    </>
  );
}

/**
 * A Frame Maker design: the designs opened in this browser, opening another
 * .framemaker.json file, and the band it sits on (shape, thickness and
 * spacing, as for a drawn frame).
 */
function DesignFramePanel({ design }: { design: DesignFrame | null }) {
  const shape = useDoc((d) => d.shape);
  const { designs, loaded } = useDesignLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!loaded) void refreshDesigns();
  }, [loaded]);
  useEffect(() => {
    // Drawn after the panel appears, so opening it stays snappy.
    const id = requestAnimationFrame(() => {
      const next = new Map<string, string>();
      for (const d of designs) {
        const url = designThumbnail(d.id, d.project, shape) ?? d.preview;
        if (url) next.set(d.id, url);
      }
      setThumbs(next);
    });
    return () => cancelAnimationFrame(id);
  }, [designs, shape]);
  // The design the token uses, even if it was removed from (or never saved in) this browser's library.
  const tiles = designs.some((d) => d.id === design?.id) || !design ? designs : [{ id: design.id, name: design.name, project: design.project, preview: null, added: 0 }, ...designs];
  return (
    <>
      <ShapeControl />
      {tiles.length > 0 ? (
        <TileGrid
          label="Frame Maker design"
          value={design?.id ?? ''}
          onChange={(id) => {
            const d = tiles.find((t) => t.id === id);
            if (d) applyDesignFrame(d.id, d.name, d.project);
          }}
          tiles={tiles.map((d) => ({
            id: d.id,
            label: d.name,
            preview: thumbs.get(d.id) ? <img src={thumbs.get(d.id)} alt="" width={44} height={44} /> : <span className="tile__blank" />,
          }))}
        />
      ) : (
        <p className="control__hint">No designs yet. Make one in Frame Maker, save it, and open the .framemaker.json file here.</p>
      )}
      <div className="control control--row" data-control="frame-design-open">
        <button type="button" className="btn btn--small" onClick={() => input.current?.click()}>
          <FolderOpen size={14} aria-hidden="true" />
          Open a Frame Maker design
        </button>
        {design && designs.some((d) => d.id === design.id) && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => void removeDesign(design.id)}>
            <Trash2 size={14} aria-hidden="true" />
            Remove from this browser
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept=".framemaker.json,.json,application/json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="design-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void openDesignFile(file);
          }}
        />
      </div>
      <p className="control__hint">The design follows the token's shape, thickness and spacing, and is lit from the direction it was made with.</p>
      <BandSliders />
    </>
  );
}

/** The token's shape. */
function ShapeControl() {
  const shape = useDoc((d) => d.shape);
  return (
    <SegmentedButtons
      label="Shape"
      value={shape}
      onChange={(s) => updateFrameAndArt((d) => ({ ...d, shape: s }))}
      options={SHAPES.map((s) => ({ value: s.id, label: s.name, icon: SHAPE_ICONS[s.id], iconOnly: true }))}
    />
  );
}

/** Thickness and spacing of the frame band (drawn frames and Frame Maker designs). */
function BandSliders() {
  const frame = useDoc((d) => d.frame);
  const setFrame = (patch: Partial<FrameSettings>, transient = false) =>
    updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, ...patch } }), { transient });
  return (
    <>
      <Slider
        label="Thickness"
        unit="% of a square"
        defaultValue={toPct(DEFAULTS.thickness)}
        min={0}
        max={20}
        step={0.5}
        value={toPct(frame.thickness)}
        disabled={frame.kind !== 'design' && frame.style === 'none'}
        onChange={(v) => setFrame({ thickness: fromPct(v) }, true)}
        onCommit={commitDoc}
      />
      <Slider
        label="Outer spacing"
        unit="% of a square"
        defaultValue={toPct(DEFAULTS.outerSpacing)}
        min={0}
        max={15}
        step={0.5}
        value={toPct(frame.outerSpacing)}
        onChange={(v) => setFrame({ outerSpacing: fromPct(v) }, true)}
        onCommit={commitDoc}
      />
      <Slider
        label="Inner spacing"
        unit="% of a square"
        defaultValue={toPct(DEFAULTS.innerSpacing)}
        min={0}
        max={15}
        step={0.5}
        value={toPct(frame.innerSpacing)}
        onChange={(v) => setFrame({ innerSpacing: fromPct(v) }, true)}
        onCommit={commitDoc}
      />
    </>
  );
}

/** A colour picker for each of a built-in design's colour slots (its band, its highlights…). */
function BuiltInColours({ id }: { id: string }) {
  const chosen = useDoc((d) => d.frame.design?.colours);
  const slots = builtInDesignById(id)?.colours ?? [];
  if (!slots.length) return <p className="control__hint">A Frame Maker design with its own colours. Open it in Frame Maker (New → Token Maker's frames) to change them.</p>;
  const setColour = (slotId: string, colour: string) =>
    updateDoc((d) => {
      const design = builtInDesignFrame(id, { ...d.frame.design?.colours, [slotId]: colour });
      return design ? { ...d, frame: { ...d.frame, design } } : d;
    }, { transient: true });
  return (
    <>
      {slots.map((slot) => (
        <ColorSwatches
          key={slot.id}
          label={slot.name}
          value={chosen?.[slot.id] ?? slot.default}
          swatches={[slot.default, ...FRAME_SWATCHES.filter((c) => c !== slot.default)]}
          onChange={(c) => setColour(slot.id, c)}
          onCommit={commitDoc}
        />
      ))}
    </>
  );
}

/** Each thumbnail takes a few ms; the gallery draws them in slices this long, so the page never freezes. */
const SLICE_MS = 12;

/**
 * Thumbnails for the frame picker. Opening the tab used to draw every frame
 * and built-in design at once (well over a hundred renders, then all again
 * once the photo textures arrived), which froze the page for a moment.
 * Now the panel draws only the frame it shows; the rest are drawn a slice at
 * a time once the gallery is first opened, the open group first.
 */
function useFrameThumbs(shape: ShapeId, value: string) {
  const [state, setState] = useState<{ key: string; map: Map<string, string> }>({ key: '', map: new Map() });
  const [gallery, setGallery] = useState(false);
  // Bumped when photo textures arrive, so the designs using them are drawn again.
  const [epoch, setEpoch] = useState(0);
  const key = `${shape}|${epoch}`;
  const map = state.key === key ? state.map : new Map<string, string>();
  const add = (entries: [string, string][]) =>
    setState((s) => {
      const next = new Map(s.key === key ? s.map : []);
      for (const [id, url] of entries) next.set(id, url);
      return { key, map: next };
    });

  // Photo textures for the designs that are about to be drawn.
  useEffect(() => {
    let live = true;
    void loadFramePictures(gallery ? TILES.map((t) => t.id) : [value]).then((redraw) => {
      if (live && redraw) setEpoch((e) => e + 1);
    });
    return () => {
      live = false;
    };
  }, [gallery, value]);

  // The frame the panel shows, on the next frame so the tab opens at once.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const url = thumbOf(value, shape);
      if (url) add([[value, url]]);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, key]);

  // Every tile, a slice at a time, once the gallery has been opened.
  useEffect(() => {
    if (!gallery) return;
    const group = TILES.find((t) => t.id === value)?.group;
    const ids = [...TILES.filter((t) => t.group === group), ...TILES.filter((t) => t.group !== group)].map((t) => t.id);
    let i = 0;
    let timer = 0;
    const step = () => {
      const start = performance.now();
      const done: [string, string][] = [];
      while (i < ids.length && performance.now() - start < SLICE_MS) {
        const id = ids[i++]!;
        const url = thumbOf(id, shape);
        if (url) done.push([id, url]);
      }
      if (done.length) add(done);
      if (i < ids.length) timer = window.setTimeout(step, 0);
    };
    timer = window.setTimeout(step, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery, key]);

  return { map, fillGallery: () => setGallery(true) };
}

/**
 * The drawn frames: shape, the frames drawn by code (colour, thickness and
 * spacing) and, in their Crafted group, the built-in Frame Maker designs.
 */
function DrawnFrame() {
  const shape = useDoc((d) => d.shape);
  const frame = useDoc((d) => d.frame);
  const builtIn = frame.kind === 'design' && isBuiltInDesign(frame.design?.id) ? frame.design!.id : null;
  const accent = builtIn ? null : frameAccent(frame.style);
  const value = builtIn ?? frame.presetId;
  const thumbs = useFrameThumbs(shape, value);

  const setFrame = (patch: Partial<FrameSettings>, transient = false) =>
    updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, ...patch } }), { transient });

  return (
    <>
      <ShapeControl />
      <FramePicker
        tiles={TILES}
        thumbs={thumbs.map}
        value={value}
        onOpen={thumbs.fillGallery}
        onChange={(id) => {
          const p = framePresetById(id);
          if (p) setFrame({ kind: 'code', presetId: p.id, style: p.style, color: p.color, highlightColor: null });
          else if (isBuiltInDesign(id)) applyBuiltInDesign(id);
        }}
      />
      {builtIn ? (
        <BuiltInColours id={builtIn} />
      ) : (
        <ColorSwatches
          label="Frame colour"
          value={frame.color}
          swatches={FRAME_SWATCHES}
          onChange={(c) => updateDoc((d) => ({ ...d, frame: { ...d.frame, color: c } }), { transient: true })}
          onCommit={commitDoc}
        />
      )}
      {accent && (
        <ColorSwatches
          label="Frame highlights colour"
          value={frame.highlightColor ?? accent}
          swatches={[accent, ...HIGHLIGHT_SWATCHES.filter((c) => c !== accent)]}
          onChange={(c) => setFrame({ highlightColor: c }, true)}
          onCommit={commitDoc}
        />
      )}
      <BandSliders />
    </>
  );
}
