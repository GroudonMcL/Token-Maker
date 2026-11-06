import { useId } from 'react';
import { ControlLabel } from '../components';
import type { ClipTarget } from '../document/types';
import { CLIP_OPTIONS, clipHint, toggleClip } from './clipOptions';

/**
 * Keep inside (v14): a row of buttons that can each be on or off, plus
 * Nothing, which turns them all off so it can reach anywhere.
 */
export function KeepInside({ value, onChange }: { value: readonly ClipTarget[]; onChange: (clip: ClipTarget[]) => void }) {
  const labelId = useId();
  return (
    <>
      <div className="segmented" data-control="keep-inside">
        <ControlLabel id={labelId} label="Keep inside" />
        <div className="segmented__row keep-inside__row" role="group" aria-labelledby={labelId}>
          <button type="button" className="segmented__btn" aria-pressed={value.length === 0} onClick={() => onChange([])}>
            <span>Nothing</span>
          </button>
          {CLIP_OPTIONS.map((o) => (
            <button key={o.value} type="button" className="segmented__btn" aria-pressed={value.includes(o.value)} onClick={() => onChange(toggleClip(value, o.value))}>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="control__hint">{clipHint(value)}</p>
    </>
  );
}
