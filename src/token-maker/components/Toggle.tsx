import { useId } from 'react';

/** An on/off switch with its label. */
export function Toggle({
  label,
  checked,
  onChange,
  disabled,
  compact,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Hide the visible label (still read by screen readers). */
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className="toggle" data-control="toggle">
      {compact ? (
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
      ) : (
        <label htmlFor={id} className="toggle__label">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="toggle__switch"
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}
