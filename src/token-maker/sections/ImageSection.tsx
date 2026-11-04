import { RotateCcw } from 'lucide-react';
import { Advanced, Slider, Toggle } from '../components';
import { DEFAULT_ADJUST } from '../document/defaults';
import type { ImageAdjustments } from '../document/types';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';

type NumberKey = Exclude<keyof ImageAdjustments, 'invert'>;

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
      <button type="button" className="btn btn--ghost btn--small" disabled={!changed} onClick={() => setAdjust({ ...DEFAULT_ADJUST })}>
        <RotateCcw size={16} aria-hidden="true" />
        Reset adjustments
      </button>
    </>
  );
}
