import { FlipHorizontal2, FlipVertical2, Maximize, Minimize, RotateCcw, RotateCw, ZoomIn } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { artActions } from '../editor/artActions';
import { ZOOM_MAX } from '../render/geometry';
import { commitDoc, useDoc } from '../state/tokenStore';

const ZOOM_MIN_SLIDER = 0.1;
// The slider works on a log scale so small zooms are as easy to dial as large ones.
const toSlider = (z: number) => Math.log(z);
const fromSlider = (v: number) => Math.exp(v);

/**
 * The floating toolbar over the canvas: zoom, rotate, flip, fit, fill, reset.
 * (Lucide's icon names read the other way round from ours: its "flip
 * vertical" icon shows a left/right mirror, so it is our horizontal flip.)
 */
export function FloatingToolbar({ disabled }: { disabled: boolean }) {
  const t = useDoc((d) => d.art.transform);
  const lo = toSlider(ZOOM_MIN_SLIDER);
  const hi = toSlider(ZOOM_MAX);
  const value = Math.min(hi, Math.max(lo, toSlider(t.zoom)));
  return (
    <div className="float-toolbar" role="toolbar" aria-label="Image tools">
      <div className="float-toolbar__zoom" data-control="zoom">
        <ZoomIn size={16} aria-hidden="true" />
        <span className="slider__track">
          <input
            type="range"
            min={lo}
            max={hi}
            step={0.01}
            value={value}
            aria-label="Zoom"
            aria-valuetext={`${Math.round(t.zoom * 100)}%`}
            disabled={disabled}
            onChange={(e) => artActions.zoomTo(fromSlider(Number(e.target.value)), true)}
            onPointerUp={commitDoc}
            onKeyUp={commitDoc}
            onBlur={commitDoc}
            style={{ '--fill': `${((value - lo) / (hi - lo)) * 100}%` } as CSSProperties}
          />
          <span
            className="slider__notch"
            aria-hidden="true"
            style={{ left: `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${(toSlider(1) - lo) / (hi - lo)})` }}
          />
        </span>
        <span className="float-toolbar__readout num" aria-hidden="true">
          {Math.round(t.zoom * 100)}%
        </span>
      </div>
      <span className="float-toolbar__sep" aria-hidden="true" />
      <ToolButton label="Rotate" disabled={disabled} icon={<RotateCw size={18} />} onClick={artActions.rotate90} />
      <ToolButton label="Flip sideways" disabled={disabled} icon={<FlipVertical2 size={18} />} pressed={t.flipX} onClick={artActions.flipX} />
      <ToolButton label="Flip upside down" disabled={disabled} icon={<FlipHorizontal2 size={18} />} pressed={t.flipY} onClick={artActions.flipY} />
      <span className="float-toolbar__sep" aria-hidden="true" />
      <ToolButton label="Fit" disabled={disabled} icon={<Minimize size={18} />} onClick={artActions.fit} />
      <ToolButton label="Fill" disabled={disabled} icon={<Maximize size={18} />} onClick={artActions.fill} />
      <ToolButton label="Reset" disabled={disabled} icon={<RotateCcw size={18} />} onClick={artActions.reset} />
    </div>
  );
}

function ToolButton({
  label,
  icon,
  disabled,
  pressed,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      data-control="tool"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
