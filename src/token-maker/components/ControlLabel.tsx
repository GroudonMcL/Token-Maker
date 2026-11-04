import type { ReactNode } from 'react';

/** The label row above a control: its name and an optional value on the right. */
export function ControlLabel({
  htmlFor,
  id,
  label,
  aside,
}: {
  htmlFor?: string;
  id?: string;
  label: string;
  aside?: ReactNode;
}) {
  return (
    <div className="control-label">
      {htmlFor ? (
        <label htmlFor={htmlFor} id={id}>
          {label}
        </label>
      ) : (
        <span id={id}>{label}</span>
      )}
      {aside !== undefined && <span className="control-label__aside">{aside}</span>}
    </div>
  );
}
