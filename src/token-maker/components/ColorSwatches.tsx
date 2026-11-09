import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ControlLabel } from './ControlLabel';
import { useRovingRadio } from './useRovingRadio';

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Colours added after a control's own swatches, so every row offers a wide
 * choice: hues round the wheel, light and dark, mixed so that however many
 * fit, the row is still varied.
 */
const VARIED_SWATCHES = [
  '#000000', '#ffffff', '#b8322a', '#2f6fd8', '#f2c14e', '#2f8f4e', '#7a3fb0', '#ff7a12',
  '#1fa3a3', '#d4508a', '#6b4423', '#8a8f99', '#ffd9a0', '#14213d', '#9bc53d', '#e8574e',
  '#7fb2d8', '#4a1f2e', '#c9a24a', '#1e3d2b', '#f0a6c8', '#3a4a5c', '#ffef9a', '#5b2d7a',
] as const;

/** The control's own swatches first, then the varied ones, without repeats. */
function withVaried(own: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...own, ...VARIED_SWATCHES]) {
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

/**
 * Ready-made colour swatches plus a picker and hex box for any colour. The
 * swatches always fit on one line: as many as there is room for are shown,
 * more on a wide panel and fewer on a narrow one.
 */
export function ColorSwatches({
  label,
  value,
  swatches,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  swatches: readonly string[];
  onChange: (hex: string) => void;
  onCommit?: (hex: string) => void;
}) {
  const labelId = useId();
  const pickerId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const all = withVaried(swatches);
  // The picker's colour is shown live (React's onChange fires as it moves) and
  // recorded as one undo step when it is chosen: the native change event, which
  // fires when the picker closes. Waiting for blur instead could wait for ever
  // on a phone, and the next change would join the same undo step.
  const commitRef = useRef(onCommit);
  useLayoutEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    const chosen = () => commitRef.current?.(picker.value);
    picker.addEventListener('change', chosen);
    return () => picker.removeEventListener('change', chosen);
  }, []);
  // Until the row has been measured (and where nothing can be measured), the control's own swatches.
  const [fit, setFit] = useState<number | null>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const css = getComputedStyle(list);
      const width = list.clientWidth - (parseFloat(css.paddingLeft) || 0) - (parseFloat(css.paddingRight) || 0);
      const first = list.firstElementChild as HTMLElement | null;
      const size = first?.offsetWidth ?? 0;
      if (width <= 0 || !size) return;
      const gap = parseFloat(css.columnGap) || 0;
      setFit(Math.max(1, Math.floor((width + gap) / (size + gap))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);
  const shown = all.slice(0, fit ?? swatches.length);
  const lower = value.toLowerCase();
  const pick = (hex: string) => {
    onChange(hex);
    onCommit?.(hex);
  };
  const { onKeyDown, itemProps } = useRovingRadio(
    shown.map((s) => s.toLowerCase()),
    shown.some((s) => s.toLowerCase() === lower) ? lower : undefined,
    pick,
  );

  const commitDraft = () => {
    if (draft === null) return;
    const hex = draft.startsWith('#') ? draft : `#${draft}`;
    setDraft(null);
    if (HEX.test(hex)) pick(hex.toLowerCase());
  };

  return (
    <div className="swatches" data-control="swatches">
      <ControlLabel id={labelId} label={label} />
      <div className="swatches__row">
        <div ref={listRef} className="swatches__list" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
          {shown.map((s, i) => (
            <button
              key={s}
              type="button"
              className="swatch"
              style={{ background: s }}
              aria-label={s}
              title={s}
              {...itemProps(s.toLowerCase(), i)}
            />
          ))}
        </div>
        <label className="swatch swatch--picker" htmlFor={pickerId} title="Choose any colour">
          <span className="visually-hidden">Custom colour</span>
          <input
            ref={pickerRef}
            id={pickerId}
            type="color"
            value={HEX.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onCommit?.(e.target.value)}
          />
        </label>
        <input
          className="swatches__hex"
          type="text"
          aria-label={`${label} hex code`}
          spellCheck={false}
          maxLength={7}
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
        />
      </div>
    </div>
  );
}
