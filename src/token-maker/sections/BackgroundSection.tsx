import { Move, RotateCcw, Upload } from 'lucide-react';
import { useState } from 'react';
import { ColorSwatches, GradientEditor, SegmentedButtons, Slider, TileGrid } from '../components';
import { DEFAULT_BACKGROUND } from '../document/defaults';
import type { BackgroundAdjustments, BackgroundKind, BackgroundLayer } from '../document/types';
import { setTool, useTool } from '../editor/tools';
import { UploadButton } from '../editor/UploadButton';
import { BACKGROUND_LIBRARY, libraryBackground, libraryThumbUrl } from '../render/backgroundLibrary';
import { loadLibraryImage } from '../state/libraryAssets';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';
import { toast } from '../ui/toast';
import { WebAddress } from './ImportSection';

const COLOR_SWATCHES = ['#1d1f27', '#3a4a5c', '#2b3a22', '#4a2f22', '#5b2d7a', '#7a2e2e', '#c9b48a', '#e8e0d0', '#ffffff', '#000000'];

type Source = 'library' | 'asset' | 'art';

/** The picture's colour sliders (v11). */
const COLOUR_SLIDERS: { key: keyof BackgroundAdjustments; label: string; min: number; max: number; unit?: string }[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'hue', label: 'Hue', min: -180, max: 180, unit: '°' },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
];

const setBackground = (patch: Partial<BackgroundLayer>, transient = false) =>
  updateDoc((d) => ({ ...d, background: { ...d.background, ...patch } }), { transient });

const setAdjust = (patch: Partial<BackgroundAdjustments>, transient = false) =>
  updateDoc((d) => ({ ...d, background: { ...d.background, adjust: { ...d.background.adjust, ...patch } } }), { transient });

/** Background section (DESIGN.md §6.3): a colour, gradient or picture behind the art inside the frame. Removing the art's own background is in Cut-out. */
export function BackgroundSection() {
  const bg = useDoc((d) => d.background);
  const hasArt = useDoc((d) => d.art.assetId !== null);
  const tool = useTool((s) => s.tool);
  // "Your own" can be chosen before there is a picture, so remember the choice here too.
  const [chosen, setChosen] = useState<Source | null>(null);
  const source: Source = bg.image?.type ?? chosen ?? 'library';

  const pickLibrary = (id: string) => {
    setBackground({ kind: 'image', image: { type: 'library', id }, zoom: 1, offsetX: 0, offsetY: 0 });
    loadLibraryImage(id).catch(() => toast("That background couldn't be loaded. Check your connection and try again.", 'error'));
  };

  return (
    <>
      <SegmentedButtons
        label="Background"
        value={bg.kind}
        onChange={(kind: BackgroundKind) => setBackground({ kind })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'color', label: 'Colour' },
          { value: 'gradient', label: 'Gradient' },
          { value: 'image', label: 'Picture' },
        ]}
      />

      {bg.kind === 'none' && <p className="control__hint">The backing colour (in Frame & shape) shows behind the art.</p>}

      {bg.kind === 'color' && (
        <ColorSwatches
          label="Colour"
          value={bg.color}
          swatches={COLOR_SWATCHES}
          onChange={(color) => setBackground({ color }, true)}
          onCommit={commitDoc}
        />
      )}

      {bg.kind === 'gradient' && (
        <GradientEditor
          value={bg.gradient}
          onChange={(gradient, transient) => setBackground({ gradient }, transient)}
          onCommit={commitDoc}
        />
      )}

      {bg.kind === 'image' && (
        <>
          <SegmentedButtons
            label="Picture from"
            value={source}
            onChange={(s: Source) => {
              setChosen(s);
              if (s === 'library') pickLibrary(bg.image?.type === 'library' ? bg.image.id : BACKGROUND_LIBRARY[0]!.id);
              else if (s === 'art') setBackground({ image: { type: 'art' }, zoom: 1.3, offsetX: 0, offsetY: 0, blur: Math.max(bg.blur, 40) });
              else setBackground({ image: bg.image?.type === 'asset' ? bg.image : null });
            }}
            options={[
              { value: 'library', label: 'Built-in' },
              { value: 'asset', label: 'Your own' },
              { value: 'art', label: "Token's art" },
            ]}
          />
          {source === 'library' && (
            <TileGrid
              label="Built-in pictures"
              value={bg.image?.type === 'library' ? bg.image.id : ''}
              onChange={pickLibrary}
              tiles={BACKGROUND_LIBRARY.map((b) => ({
                id: b.id,
                label: b.name,
                group: b.group,
                preview: <img src={libraryThumbUrl(b.id)} alt="" width={44} height={44} loading="lazy" />,
              }))}
            />
          )}
          {source === 'library' && <LibraryCredit id={bg.image?.type === 'library' ? bg.image.id : null} />}
          {source === 'asset' && (
            <>
              <div className="control" data-control="background-upload">
                <UploadButton className="btn btn--wide" target="background">
                  <Upload size={18} aria-hidden="true" />
                  Upload a background
                </UploadButton>
              </div>
              <WebAddress target="background" hint="Or paste a link to a picture or a page with one." />
            </>
          )}
          {source === 'art' && !hasArt && <p className="control__hint">Add an image first: its enlarged, blurred copy fills the background.</p>}
          <Slider
            label="Blur"
            min={0}
            max={100}
            value={bg.blur}
            defaultValue={DEFAULT_BACKGROUND.blur}
            onChange={(blur) => setBackground({ blur }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Zoom"
            unit="%"
            min={50}
            max={400}
            step={5}
            value={Math.round(bg.zoom * 100)}
            defaultValue={100}
            onChange={(v) => setBackground({ zoom: v / 100 }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Move left or right"
            unit="%"
            min={-100}
            max={100}
            value={Math.round(bg.offsetX * 100)}
            defaultValue={0}
            onChange={(v) => setBackground({ offsetX: v / 100 }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Move up or down"
            unit="%"
            min={-100}
            max={100}
            value={Math.round(bg.offsetY * 100)}
            defaultValue={0}
            onChange={(v) => setBackground({ offsetY: v / 100 }, true)}
            onCommit={commitDoc}
          />
          <div className="control control--row" data-control="background-move">
            <button
              type="button"
              className="btn btn--small"
              aria-pressed={tool === 'background'}
              disabled={!hasArt}
              onClick={() => setTool(tool === 'background' ? 'move' : 'background')}
            >
              <Move size={14} aria-hidden="true" />
              Move on the canvas
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={bg.offsetX === 0 && bg.offsetY === 0 && bg.zoom === 1}
              onClick={() => setBackground({ zoom: 1, offsetX: 0, offsetY: 0 })}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset position
            </button>
          </div>
          <div className="control-group">
            <h4 className="control-group__title">Colour</h4>
            {COLOUR_SLIDERS.map((def) => (
              <Slider
                key={def.key}
                label={def.label}
                unit={def.unit}
                min={def.min}
                max={def.max}
                value={bg.adjust[def.key]}
                defaultValue={DEFAULT_BACKGROUND.adjust[def.key]}
                onChange={(v) => setAdjust({ [def.key]: v }, true)}
                onCommit={commitDoc}
              />
            ))}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={COLOUR_SLIDERS.every((def) => bg.adjust[def.key] === 0)}
              onClick={() => setAdjust({ ...DEFAULT_BACKGROUND.adjust })}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset colours
            </button>
          </div>
        </>
      )}

      {bg.kind !== 'none' && (
        <Slider
          label="Opacity"
          unit="%"
          min={0}
          max={100}
          value={Math.round(bg.opacity * 100)}
          defaultValue={100}
          onChange={(v) => setBackground({ opacity: v / 100 }, true)}
          onCommit={commitDoc}
        />
      )}
    </>
  );
}

/** Where the chosen open-licence picture came from. */
function LibraryCredit({ id }: { id: string | null }) {
  const credit = id ? libraryBackground(id)?.credit : undefined;
  if (!credit) return null;
  return (
    <p className="control__hint" data-testid="background-credit">
      <i>{credit.title}</i>, {credit.by}.{' '}
      <a href={credit.source} target="_blank" rel="noopener noreferrer">
        Source
      </a>
    </p>
  );
}
