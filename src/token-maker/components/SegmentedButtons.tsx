import { useId, type ReactNode } from 'react';
import { ControlLabel } from './ControlLabel';
import { useRovingRadio } from './useRovingRadio';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
  /** Show only the icon (label is still read by screen readers). */
  iconOnly?: boolean;
}

/** A row of joined buttons where exactly one is chosen. */
export function SegmentedButtons<V extends string>({
  label,
  options,
  value,
  onChange,
  equal = false,
}: {
  label: string;
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Every button the same width. */
  equal?: boolean;
}) {
  const labelId = useId();
  const { onKeyDown, itemProps } = useRovingRadio(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div className="segmented" data-control="segmented">
      <ControlLabel id={labelId} label={label} />
      <div className={equal ? 'segmented__row segmented__row--equal' : 'segmented__row'} role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            className="segmented__btn"
            aria-label={o.iconOnly ? o.label : undefined}
            title={o.iconOnly ? o.label : undefined}
            {...itemProps(o.value, i)}
          >
            {o.icon}
            {!o.iconOnly && <span>{o.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
