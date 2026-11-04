// The drag handles on the inner edges of the two side panels (as in Token
// Maker): drag one to widen or narrow its panel, use the arrow keys, or
// double-click it to go back to the normal width. Widths are remembered in
// this browser.

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { clampPanel, PANEL_MIN, panelMax, savePanelWidth, type PanelSide } from './panelWidth';

export function PanelResizer({
  side,
  width,
  onChange,
  panel,
}: {
  side: PanelSide;
  /** The chosen width, or null for the default. */
  width: number | null;
  onChange: (width: number | null) => void;
  /** The panel element, to read its current width when none is chosen yet. */
  panel: () => HTMLElement | null;
}) {
  const drag = useRef<{ startX: number; startW: number } | null>(null);
  const current = () => width ?? panel()?.getBoundingClientRect().width ?? 280;
  // The layers panel is on the left, so moving right widens it; the properties panel the other way.
  const dir = side === 'layers' ? 1 : -1;
  const set = (w: number | null) => {
    const v = w === null ? null : clampPanel(w);
    onChange(v);
    savePanelWidth(side, v);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startW: current() };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) set(d.startW + dir * (e.clientX - d.startX));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 80 : 20;
    if (e.key === 'ArrowRight') set(current() + dir * step);
    else if (e.key === 'ArrowLeft') set(current() - dir * step);
    else if (e.key === 'Home') set(PANEL_MIN);
    else if (e.key === 'End') set(panelMax());
    else if (e.key === 'Enter' || e.key === 'Escape') set(null);
    else return;
    e.preventDefault();
  };
  const name = side === 'layers' ? 'layers' : 'properties';
  return (
    <div
      className={`panel-resizer ${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize the ${name} panel`}
      aria-valuemin={PANEL_MIN}
      aria-valuemax={panelMax()}
      aria-valuenow={Math.round(current())}
      title="Drag to resize the panel (double-click to reset)"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => set(null)}
      onKeyDown={onKeyDown}
    />
  );
}
