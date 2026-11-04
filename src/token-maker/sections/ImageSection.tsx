import { Pipette, RotateCcw, X } from 'lucide-react';
import { useId } from 'react';
import { Advanced, ControlLabel, Slider, Toggle } from '../components';
import { DEFAULT_ADJUST } from '../document/defaults';
import type { ImageAdjustments } from '../document/types';
import { pickColourFor, setTool, useTool } from '../editor/tools';
import { hasRecolor } from '../image/adjust';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';
import { parseHex, toHex } from '../render/color';

type NumberKey = Exclude<keyof ImageAdjustments, 'invert' | 'recolorColor' | 'recolorShift' | 'recolorBreadth'>;

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
  const changed = JSON.stringify({ ...adjust, recolorBreadth: 0 }) !== JSON.stringify({ ...DEFAULT_ADJUST, recolorBreadth: 0 });
  return (
    <>
      {MAIN.map((def) => (
        <AdjustSlider key={def.key} def={def} value={adjust[def.key]} />
      ))}
      <Recolour adjust={adjust} />
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
      <button type="button" className="btn btn--ghost btn--small" disabled={!changed} onClick={() => setAdjust({ ...DEFAULT_ADJUST })}>
        <RotateCcw size={16} aria-hidden="true" />
        Reset adjustments
      </button>
    </>
  );
}

/** A colour turned `degrees` round the colour wheel (for the preview swatch). */
function turned(hex: string, degrees: number): string {
  const { r, g, b } = parseHex(hex);
  const max = Math.max(r, g, b);
  const c = max - Math.min(r, g, b);
  if (!c) return hex;
  let h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
  h = (((h * 60 + degrees) % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = max - c;
  const k = Math.floor(h / 60);
  const [rr, gg, bb] = k === 0 ? [c, x, 0] : k === 1 ? [x, c, 0] : k === 2 ? [0, c, x] : k === 3 ? [0, x, c] : k === 4 ? [x, 0, c] : [c, 0, x];
  return toHex({ r: rr + m, g: gg + m, b: bb + m });
}

/**
 * Recolour (owner request): choose a colour (with the picker, or from the
 * picture with the eyedropper), then turn it to another colour; Breadth
 * says how many colours around it change too.
 */
function Recolour({ adjust }: { adjust: ImageAdjustments }) {
  const pickerId = useId();
  const picking = useTool((s) => s.tool === 'eyedropper' && s.eyedropperFor === 'recolor');
  const from = adjust.recolorColor;
  const to = from ? turned(from, adjust.recolorShift) : null;
  return (
    <div className="control-group" data-control="recolour">
      <h4 className="control-group__title">Recolour</h4>
      <div className="control">
        <ControlLabel htmlFor={pickerId} label="Colour to change" />
        <div className="recolour__row">
          <label className="swatch swatch--input" style={{ background: from ?? undefined }} title="Choose the colour to change">
            <span className="visually-hidden">Colour to change</span>
            <input
              id={pickerId}
              type="color"
              value={from ?? '#b8322a'}
              onChange={(e) => setAdjust({ recolorColor: e.target.value }, true)}
              onBlur={commitDoc}
            />
            {!from && <span className="swatch__none" aria-hidden="true" />}
          </label>
          <button type="button" className="btn btn--small" aria-pressed={picking} onClick={() => (picking ? setTool('move') : pickColourFor('recolor'))}>
            <Pipette size={14} aria-hidden="true" />
            {picking ? 'Tap the picture…' : 'Pick from picture'}
          </button>
          {from && (
            <>
              <span className="recolour__arrow" aria-hidden="true">→</span>
              <span className="swatch swatch--static" style={{ background: to! }} title={`Becomes ${to}`} aria-label={`Becomes ${to}`} role="img" />
              <button type="button" className="icon-btn" aria-label="Stop recolouring" onClick={() => setAdjust({ recolorColor: null, recolorShift: 0 })}>
                <X size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
      {from && (
        <>
          <Slider
            label="New colour"
            unit="°"
            min={-180}
            max={180}
            value={adjust.recolorShift}
            defaultValue={0}
            onChange={(v) => setAdjust({ recolorShift: v }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Breadth"
            unit="%"
            min={0}
            max={100}
            value={adjust.recolorBreadth}
            defaultValue={DEFAULT_ADJUST.recolorBreadth}
            onChange={(v) => setAdjust({ recolorBreadth: v }, true)}
            onCommit={commitDoc}
          />
          {!hasRecolor(adjust) && <p className="control__hint">Drag New colour to change it.</p>}
        </>
      )}
    </div>
  );
}
