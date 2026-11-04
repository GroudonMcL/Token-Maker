import { X } from 'lucide-react';
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { Gradient, GradientStop } from '../document/types';
import { mix, rgba } from '../render/color';
import { ColorSwatches } from './ColorSwatches';
import { SegmentedButtons } from './SegmentedButtons';
import { Slider } from './Slider';

const SWATCHES = ['#000000', '#ffffff', '#1b2233', '#3d5a80', '#7fb2d8', '#2f8f83', '#2f5a24', '#9bc53d', '#ffd9a0', '#f2c14e', '#ff7a12', '#b8322a', '#d4508a', '#5b2d7a'];
const MAX_STOPS = 16;
/** A press that moves less than this many pixels is a click, not a drag. */
const DRAG_START = 3;

const byOffset = (stops: GradientStop[]) => [...stops].sort((a, b) => a.offset - b.offset);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

/** The gradient's colour and opacity at `offset` (stops in order). */
function stopAt(stops: GradientStop[], offset: number): GradientStop {
  const after = stops.findIndex((s) => s.offset >= offset);
  if (after <= 0) {
    const s = stops[after === 0 ? 0 : stops.length - 1]!;
    return { offset, color: s.color, opacity: s.opacity };
  }
  const a = stops[after - 1]!;
  const b = stops[after]!;
  const t = b.offset > a.offset ? (offset - a.offset) / (b.offset - a.offset) : 0;
  return { offset, color: mix(a.color, b.color, t), opacity: a.opacity + (b.opacity - a.opacity) * t };
}

/**
 * A gradient editor (DESIGN.md §6.3): a bar showing the gradient with a
 * marker under it for each colour. Drag a marker to move its colour along
 * the bar, click it to choose its colour and opacity, click the bar to add
 * a colour there. Linear gradients also have an angle.
 *
 * `onChange(g, true)` is a live change while dragging; `onCommit` ends it.
 */
export function GradientEditor({
  value: g,
  onChange,
  onCommit,
}: {
  value: Gradient;
  onChange: (g: Gradient, transient?: boolean) => void;
  onCommit: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const drag = useRef<{ index: number; x: number; moved: boolean } | null>(null);
  const sorted = byOffset(g.stops);
  const current = selected !== null ? g.stops[selected] : undefined;

  const offsetAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    return round(clamp01((clientX - r.left) / Math.max(1, r.width)));
  };
  const setStop = (i: number, patch: Partial<GradientStop>, transient = false) =>
    onChange({ ...g, stops: g.stops.map((s, k) => (k === i ? { ...s, ...patch } : s)) }, transient);
  /** Puts the stops back in order, keeping the same one selected. */
  const settle = (stops: GradientStop[], keep: GradientStop | undefined) => {
    const next = byOffset(stops);
    onChange({ ...g, stops: next }, true);
    onCommit();
    if (keep) setSelected(next.indexOf(keep));
  };
  const remove = (i: number) => {
    if (g.stops.length <= 2) return;
    onChange({ ...g, stops: g.stops.filter((_, k) => k !== i) });
    setSelected(null);
  };

  const addAt = (clientX: number) => {
    if (g.stops.length >= MAX_STOPS) return;
    const stop = stopAt(sorted, offsetAt(clientX));
    const stops = byOffset([...g.stops, stop]);
    onChange({ ...g, stops });
    setSelected(stops.indexOf(stop));
  };

  const onMarkerDown = (i: number, e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    drag.current = { index: i, x: e.clientX, moved: false };
  };
  const onMarkerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x) < DRAG_START) return;
    d.moved = true;
    setStop(d.index, { offset: offsetAt(e.clientX) }, true);
  };
  const onMarkerUp = (i: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) settle(g.stops, g.stops[i]);
    else setSelected(selected === i ? null : i);
  };
  const onMarkerKey = (i: number, e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const s = g.stops[i]!;
      const moved = { ...s, offset: round(clamp01(s.offset + (e.key === 'ArrowLeft' ? -step : step))) };
      settle(g.stops.map((x, k) => (k === i ? moved : x)), moved);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(i);
    }
  };

  return (
    <div className="gradient-editor">
      <SegmentedButtons
        label="Gradient type"
        value={g.type}
        onChange={(type) => onChange({ ...g, type })}
        options={[
          { value: 'linear', label: 'Linear' },
          { value: 'radial', label: 'Radial' },
        ]}
      />
      {g.type === 'linear' && (
        <Slider
          label="Angle"
          unit="°"
          min={0}
          max={359}
          value={Math.round(((g.angle % 360) + 360) % 360)}
          defaultValue={90}
          onChange={(angle) => onChange({ ...g, angle }, true)}
          onCommit={onCommit}
        />
      )}
      <div className="gradient-bar" data-control="gradient-bar" role="group" aria-label="Gradient colours">
        <div
          ref={barRef}
          className="gradient-bar__track"
          data-testid="gradient-bar"
          title={g.stops.length < MAX_STOPS ? 'Click to add a colour here' : undefined}
          onClick={(e) => addAt(e.clientX)}
        >
          <span className="gradient-bar__fill" style={{ background: `linear-gradient(to right, ${sorted.map((s) => `${rgba(s.color, s.opacity)} ${s.offset * 100}%`).join(', ')})` }} />
        </div>
        <div className="gradient-bar__markers">
          {g.stops.map((s, i) => (
            <button
              key={i}
              type="button"
              className="gradient-bar__marker"
              data-testid={`gradient-marker-${i}`}
              aria-label={`Colour ${sorted.indexOf(s) + 1} at ${Math.round(s.offset * 100)}%`}
              aria-pressed={selected === i}
              style={{ left: `${s.offset * 100}%`, '--stop': rgba(s.color, s.opacity) } as CSSProperties}
              onPointerDown={(e) => onMarkerDown(i, e)}
              onPointerMove={onMarkerMove}
              onPointerUp={() => onMarkerUp(i)}
              onPointerCancel={() => onMarkerUp(i)}
              onClick={(e) => e.detail === 0 && setSelected(selected === i ? null : i)}
              onKeyDown={(e) => onMarkerKey(i, e)}
            />
          ))}
        </div>
        <p className="control__hint">Click the bar to add a colour. Drag a marker to move it, or click it to change it.</p>
      </div>
      {current && selected !== null && (
        <div className="gradient-stop" data-testid="gradient-stop-editor">
          <ColorSwatches
            label={`Colour ${sorted.indexOf(current) + 1}`}
            value={current.color}
            swatches={SWATCHES}
            onChange={(color) => setStop(selected, { color }, true)}
            onCommit={onCommit}
          />
          <Slider
            label="Opacity"
            unit="%"
            min={0}
            max={100}
            value={Math.round(current.opacity * 100)}
            defaultValue={100}
            onChange={(v) => setStop(selected, { opacity: v / 100 }, true)}
            onCommit={onCommit}
          />
          <div className="button-row">
            <button type="button" className="btn btn--ghost btn--small" disabled={g.stops.length <= 2} onClick={() => remove(selected)}>
              <X size={14} aria-hidden="true" />
              Remove this colour
            </button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setSelected(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
