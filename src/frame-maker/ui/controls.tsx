// Small form controls used by every panel. A slider drag is shown live and
// becomes one undo step when it ends (onChange(v, true) while dragging, then
// onCommit), as in token-maker. Every control has a help tip: one plain
// sentence, given as `hint` or looked up by its label in help.ts.

import { useId, useState, type ReactNode } from 'react';
import { ChevronRight, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { isValidHex } from '../engine/legacy/color';
import { commit } from '../state/projectStore';
import { helpFor, hintId } from './help';

/**
 * A small "?" beside a control's label that shows its help tip when pointed
 * at, tapped or focused. Screen readers hear the tip as the control's
 * description instead (`describedBy` on the control), so the "?" itself is
 * left out of the tab order.
 */
export function HelpTip({ id, text }: { id: string; text: string }) {
  return (
    <span className="help">
      <button type="button" className="help-tip" tabIndex={-1} aria-hidden="true" onClick={(e) => e.currentTarget.focus()}>
        ?
      </button>
      <span className="help-text" id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  const own = useId();
  const tip = hint ?? helpFor(label);
  return (
    <div className="field">
      <span className="field-label">
        <label htmlFor={htmlFor}>{label}</label>
        {tip && <HelpTip id={hintId(htmlFor ?? own)} text={tip} />}
      </span>
      <div className="field-control">{children}</div>
    </div>
  );
}

/** aria-describedby for a control whose Field shows a help tip. */
const described = (id: string, label: string, hint?: string) => (hint ?? helpFor(label) ? hintId(id) : undefined);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** How the value is shown and typed: e.g. percent shows 0.25 as 25. */
  scale?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  /** Where the reset button puts it back to; no button without one. */
  defaultValue?: number;
  onChange: (value: number, transient: boolean) => void;
  onCommit: () => void;
}

/**
 * Puts a setting back to where it started. It keeps its place when there
 * is nothing to reset (disabled), so the controls don't jump about.
 */
export function ResetButton({ label, atDefault, disabled, onReset }: { label: string; atDefault: boolean; disabled?: boolean; onReset: () => void }) {
  return (
    <button type="button" className="icon-btn reset-btn" aria-label={`Reset ${label}`} title={atDefault ? `${label}: as it started` : `Put ${label.toLowerCase()} back as it started`} disabled={disabled || atDefault} onClick={onReset}>
      <RotateCcw size={14} aria-hidden="true" />
    </button>
  );
}

export function Slider({ label, value, min, max, step = 0.01, scale = 1, unit = '', hint, disabled, defaultValue, onChange, onCommit }: SliderProps) {
  const id = useId();
  const shown = Math.round(value * scale * 100) / 100;
  const [typed, setTyped] = useState<string | null>(null);
  const applyTyped = () => {
    if (typed === null) return;
    const v = Number(typed);
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v / scale)), false);
    setTyped(null);
  };
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={described(id, label, hint)}
        onChange={(e) => onChange(Number(e.target.value), true)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
      <span className="number">
        <input
          aria-label={`${label} value`}
          inputMode="decimal"
          disabled={disabled}
          value={typed ?? String(shown)}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={applyTyped}
          onKeyDown={(e) => e.key === 'Enter' && applyTyped()}
        />
        {unit}
      </span>
      {defaultValue !== undefined && (
        <ResetButton label={label} atDefault={Math.abs(value - defaultValue) < 1e-9} disabled={disabled} onReset={() => onChange(defaultValue, false)} />
      )}
    </Field>
  );
}

/** Dragging in the browser's colour picker is shown live and becomes one undo step when the picker closes. */
export function ColorField({
  label,
  value,
  onChange,
  disabled,
  hint,
  defaultValue,
}: {
  label: string;
  value: string;
  onChange: (v: string, transient?: boolean) => void;
  disabled?: boolean;
  hint?: string;
  /** Where the reset button puts it back to; no button without one. */
  defaultValue?: string;
}) {
  const id = useId();
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input id={id} type="color" value={value} disabled={disabled} aria-describedby={described(id, label, hint)} onChange={(e) => onChange(e.target.value, true)} onBlur={commit} />
      <input
        className="hex"
        aria-label={`${label} hex code`}
        disabled={disabled}
        value={typed ?? value}
        onChange={(e) => {
          setTyped(e.target.value);
          const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
          if (isValidHex(v)) onChange(v.toLowerCase());
        }}
        onBlur={() => setTyped(null)}
      />
      {defaultValue !== undefined && (
        <ResetButton
          label={label}
          atDefault={value.toLowerCase() === defaultValue.toLowerCase()}
          disabled={disabled}
          onReset={() => {
            setTyped(null);
            onChange(defaultValue);
          }}
        />
      )}
    </Field>
  );
}

/** A colour that can be switched off (null). */
export function OptionalColor({ label, value, fallback, onChange, disabled, hint }: { label: string; value: string | null; fallback: string; onChange: (v: string | null, transient?: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <>
      <Toggle label={label} checked={value !== null} disabled={disabled} hint={hint} onChange={(on) => onChange(on ? fallback : null)} />
      {value !== null && (
        <ColorField
          label={`${label} colour`}
          hint={/colour/i.test(label) ? 'Pick the colour.' : `The colour of the ${label.toLowerCase()}.`}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      )}
    </>
  );
}

export function Select<T extends string>({ label, value, options, onChange, disabled, hint }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <select id={id} value={value} disabled={disabled} aria-describedby={described(id, label, hint)} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  const tip = hint ?? helpFor(label);
  return (
    <div className="toggle-field">
      <label className="toggle">
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} aria-describedby={tip ? hintId(id) : undefined} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-track" aria-hidden="true" />
        <span>{label}</span>
      </label>
      {tip && <HelpTip id={hintId(id)} text={tip} />}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hint?: string }) {
  const id = useId();
  const tip = hint ?? helpFor(label);
  return (
    <div className="segmented-field">
      <SegmentedButtons label={label} value={value} options={options} onChange={onChange} describedBy={tip ? hintId(id) : undefined} />
      {tip && <HelpTip id={hintId(id)} text={tip} />}
    </div>
  );
}

/**
 * The buttons of a Segmented control: a radio group, so the arrow keys move
 * the choice (and focus) along, as in any radio group.
 */
function SegmentedButtons<T extends string>({ label, value, options, onChange, describedBy }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; describedBy?: string }) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = (options.findIndex((o) => o.value === value) + step + options.length) % options.length;
    onChange(options[i].value);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('button');
    buttons[i]?.focus();
  };
  return (
    <div className="segmented" role="radiogroup" aria-label={label} aria-describedby={describedBy} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A folding group of settings; "Advanced" ones only show in Advanced mode. */
export function Fold({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="fold" open={defaultOpen}>
      <summary>
        <ChevronRight size={16} aria-hidden="true" className="fold-chevron" />
        {title}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

/** A short list of colours that can grow and shrink (alternating colours). */
export function ColorList({ label, values, onChange, disabled, hint, max = 8, fallback = '#3a7bd5' }: { label: string; values: string[]; onChange: (v: string[], transient?: boolean) => void; disabled?: boolean; hint?: string; max?: number; fallback?: string }) {
  return (
    <ListField label={label} hint={hint}>
      {values.map((c, i) => (
        <div className="stop" key={i}>
          <ColorField label={`${label} ${i + 1}`} value={c} disabled={disabled} onChange={(v, t) => onChange(values.map((x, k) => (k === i ? v : x)), t)} />
          <button type="button" className="icon-btn" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} disabled={disabled} onClick={() => onChange(values.filter((_x, k) => k !== i))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {values.length < max && (
        <button type="button" className="btn small" disabled={disabled} onClick={() => onChange([...values, fallback])}>
          <Plus size={16} /> Add
        </button>
      )}
    </ListField>
  );
}

/** A labelled group of controls (lists of colours, on/off patterns), with its help tip. */
function ListField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  const tip = hint ?? helpFor(label);
  return (
    <div className="list-field" role="group" aria-label={label} aria-describedby={tip ? hintId(id) : undefined}>
      <p className="field-label">
        <span>{label}</span>
        {tip && <HelpTip id={hintId(id)} text={tip} />}
      </p>
      {children}
    </div>
  );
}

/** A list of numbers typed as "100, 60" (shown and typed as percentages). */
export function PercentList({ label, values, onChange, disabled, hint }: { label: string; values: number[]; onChange: (v: number[]) => void; disabled?: boolean; hint?: string }) {
  const id = useId();
  const shown = values.map((v) => Math.round(v * 100)).join(', ');
  const [typed, setTyped] = useState<string | null>(null);
  const apply = () => {
    if (typed === null) return;
    const list = typed
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((v) => Number.isFinite(v) && v > 0)
      .slice(0, 8)
      .map((v) => Math.min(500, Math.max(5, v)) / 100);
    setTyped(null);
    onChange(list.length > 1 ? list : []);
  };
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        className="wide-text"
        placeholder="e.g. 100, 60"
        disabled={disabled}
        aria-describedby={described(id, label, hint)}
        value={typed ?? shown}
        onChange={(e) => setTyped(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
      />
      <span className="number">%</span>
    </Field>
  );
}

/**
 * A repeating on/off pattern (which of a repeat's elements are drawn): a row
 * of switches, one per step, that can grow to 8 and shrink back to "all".
 */
export function PatternField({ label, values, onChange, disabled, hint }: { label: string; values: boolean[]; onChange: (v: boolean[]) => void; disabled?: boolean; hint?: string }) {
  const steps = values.length ? values : [true];
  return (
    <ListField label={label} hint={hint}>
      <div className="pattern">
        {steps.map((on, i) => (
          <button
            key={i}
            type="button"
            className={`pattern-step${on ? ' on' : ''}`}
            role="switch"
            aria-checked={on}
            aria-label={`${label}: step ${i + 1}`}
            disabled={disabled}
            onClick={() => {
              const next = steps.map((v, k) => (k === i ? !v : v));
              onChange(next.some((v) => v) && next.some((v) => !v) ? next : []);
            }}
          />
        ))}
        {steps.length < 8 && (
          <button type="button" className="icon-btn" aria-label={`${label}: add a step`} disabled={disabled} onClick={() => onChange([...steps, false])}>
            <Plus size={16} />
          </button>
        )}
        {values.length > 0 && (
          <button type="button" className="btn small" disabled={disabled} onClick={() => onChange([])}>
            All
          </button>
        )}
      </div>
    </ListField>
  );
}

/** A line of text, applied as you type (each change one undo step, merged while typing). */
export function TextField({ label, value, onChange, disabled, hint, maxLength = 200 }: { label: string; value: string; onChange: (v: string, transient?: boolean) => void; disabled?: boolean; hint?: string; maxLength?: number }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input id={id} className="wide-text" value={value} maxLength={maxLength} disabled={disabled} aria-describedby={described(id, label, hint)} onChange={(e) => onChange(e.target.value, true)} onBlur={commit} />
    </Field>
  );
}
