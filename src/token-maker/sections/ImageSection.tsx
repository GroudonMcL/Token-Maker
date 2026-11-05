import { Pipette, Plus, RotateCcw, X } from 'lucide-react';
import { Advanced, ColorSwatches, Slider, Toggle } from '../components';
import { DEFAULT_ADJUST, MAX_RECOLORS, newRecolor } from '../document/defaults';
import type { ImageAdjustments, Recolor } from '../document/types';
import { pickColourFor, setTool, useTool } from '../editor/tools';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';

type NumberKey = Exclude<keyof ImageAdjustments, 'invert' | 'recolors'>;

interface AdjustDef {
  key: NumberKey;
  label: string;
  min: number;
  max: number;
  unit?: string;
}

const MAIN: AdjustDef[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
];

const GROUPS: { title: string; items: AdjustDef[] }[] = [
  {
    title: 'Colour',
    items: [
      { key: 'hue', label: 'Hue', min: -180, max: 180, unit: '°' },
      { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
      { key: 'tint', label: 'Tint', min: -100, max: 100 },
    ],
  },
  {
    title: 'Light',
    items: [
      { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
      { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
      { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
    ],
  },
  {
    title: 'Detail',
    items: [
      { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
      { key: 'blur', label: 'Blur', min: 0, max: 100 },
    ],
  },
  {
    title: 'Style',
    items: [
      { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
      { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
      { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
    ],
  },
];

const setAdjust = (patch: Partial<ImageAdjustments>, transient = false) =>
  updateDoc((d) => ({ ...d, art: { ...d.art, adjust: { ...d.art.adjust, ...patch } } }), { transient });

function AdjustSlider({ def, value }: { def: AdjustDef; value: number }) {
  return (
    <Slider
      label={def.label}
      min={def.min}
      max={def.max}
      unit={def.unit}
      value={value}
      defaultValue={DEFAULT_ADJUST[def.key]}
      onChange={(v) => setAdjust({ [def.key]: v }, true)}
      onCommit={commitDoc}
    />
  );
}

/** Image section (DESIGN.md §6.2): adjustments. Background removal and its erase/restore brush are in the Background section. */
export function ImageSection() {
  const hasArt = useDoc((d) => d.art.assetId !== null);
  if (!hasArt) return <p className="control__hint">Add an image first, then adjust it here.</p>;
  return <Adjustments />;
}

function Adjustments() {
  const adjust = useDoc((d) => d.art.adjust);
  const changed = JSON.stringify(adjust) !== JSON.stringify(DEFAULT_ADJUST);
  return (
    <>
      {MAIN.map((def) => (
        <AdjustSlider key={def.key} def={def} value={adjust[def.key]} />
      ))}
      <Advanced>
        {GROUPS.map((g) => (
          <div key={g.title} className="control-group">
            <h4 className="control-group__title">{g.title}</h4>
            {g.items.map((def) => (
              <AdjustSlider key={def.key} def={def} value={adjust[def.key]} />
            ))}
            {g.title === 'Style' && <Toggle label="Invert" checked={adjust.invert} onChange={(v) => setAdjust({ invert: v })} />}
          </div>
        ))}
      </Advanced>
      <Recolours recolors={adjust.recolors} />
      <button type="button" className="btn btn--ghost btn--small" disabled={!changed} onClick={() => setAdjust({ ...DEFAULT_ADJUST, recolors: [] })}>
        <RotateCcw size={16} aria-hidden="true" />
        Reset adjustments
      </button>
    </>
  );
}

const FROM_SWATCHES = ['#ffffff', '#000000', '#b8322a', '#2f6fd8', '#2f8f4e', '#f2c14e'];
const TO_SWATCHES = ['#b8322a', '#2f6fd8', '#2f8f4e', '#f2c14e', '#7a3fb0', '#ffffff', '#000000'];

const setRecolors = (change: (list: Recolor[]) => Recolor[], transient = false) =>
  updateDoc((d) => ({ ...d, art: { ...d.art, adjust: { ...d.art.adjust, recolors: change(d.art.adjust.recolors) } } }), { transient });

/**
 * Recolour (owner request): any number of colour changes, each turning one
 * colour of the picture (chosen with the picker or the eyedropper) into
 * another, light and dark colours included. Breadth says how many colours
 * around it change too.
 */
function Recolours({ recolors }: { recolors: Recolor[] }) {
  return (
    <div className="control-group" data-control="recolour">
      <h4 className="control-group__title">Recolour</h4>
      {recolors.length === 0 && <p className="control__hint">Change one colour of the picture into another: white to red, say.</p>}
      {recolors.map((r, i) => (
        <RecolourCard key={i} r={r} index={i} count={recolors.length} />
      ))}
      <button
        type="button"
        className="btn btn--small"
        disabled={recolors.length >= MAX_RECOLORS}
        onClick={() => setRecolors((list) => [...list, newRecolor()])}
      >
        <Plus size={14} aria-hidden="true" />
        {recolors.length ? 'Add another recolour' : 'Add a recolour'}
      </button>
    </div>
  );
}

function RecolourCard({ r, index, count }: { r: Recolor; index: number; count: number }) {
  const picking = useTool((s) => (s.tool === 'eyedropper' && s.eyedropperFor === 'recolor' ? s.recolorTarget : null));
  const set = (patch: Partial<Recolor>, transient = false) => setRecolors((list) => list.map((x, i) => (i === index ? { ...x, ...patch } : x)), transient);
  const name = count > 1 ? `Recolour ${index + 1}` : 'Recolour';
  const pickButton = (end: 'from' | 'to') => {
    const on = picking?.index === index && picking.end === end;
    return (
      <button type="button" className="btn btn--small" aria-pressed={on} onClick={() => (on ? setTool('move') : pickColourFor('recolor', { index, end }))}>
        <Pipette size={14} aria-hidden="true" />
        {on ? 'Tap the picture…' : 'Pick from picture'}
      </button>
    );
  };
  return (
    <div className="recolour" data-recolour={index}>
      <div className="recolour__head">
        <span className="recolour__swatches" aria-hidden="true">
          <span className="swatch swatch--static" style={{ background: r.from }} />
          <span className="recolour__arrow">→</span>
          <span className="swatch swatch--static" style={{ background: r.to }} />
        </span>
        <span className="recolour__name">{name}</span>
        <button type="button" className="icon-btn" aria-label={`Remove ${name.toLowerCase()}`} onClick={() => setRecolors((list) => list.filter((_, i) => i !== index))}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <ColorSwatches label="Colour to change" value={r.from} swatches={FROM_SWATCHES} onChange={(from) => set({ from }, true)} onCommit={commitDoc} />
      <div className="control control--row">{pickButton('from')}</div>
      <ColorSwatches label="Change it to" value={r.to} swatches={TO_SWATCHES} onChange={(to) => set({ to }, true)} onCommit={commitDoc} />
      <div className="control control--row">{pickButton('to')}</div>
      <Slider
        label="Breadth"
        unit="%"
        min={0}
        max={100}
        value={r.breadth}
        defaultValue={newRecolor().breadth}
        onChange={(breadth) => set({ breadth }, true)}
        onCommit={commitDoc}
      />
    </div>
  );
}
