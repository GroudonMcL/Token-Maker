// The lighting card above the layers (owner's request): the main light's
// direction dial, drawn round a small bevelled ring and gem lit the way the
// design is lit, so turning the light, adding coloured lights, an ambient
// colour or bloom (Lighting…) shows at a glance.
//
// The dial: drag the sun round, or use the arrow keys; Shift snaps to 15°.
// Stored as stage.light: the direction the light comes from, in degrees
// (0 right, 90 below, 225 top left).

import { useId, useRef, useState } from 'react';
import { RotateCcw, Sun } from 'lucide-react';
import { DEFAULT_LIGHT, type StageSettings } from '../project/types';
import { commit, updateStage } from '../state/projectStore';
import { HelpTip } from './controls';
import { helpFor, hintId } from './help';
import { LightingDialog } from './WorkflowDialogs';

const NAMES = ['right', 'bottom right', 'bottom', 'bottom left', 'left', 'top left', 'top', 'top right'];

/** "top left" etc. for a light direction. */
const lightName = (deg: number) => NAMES[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const norm = (d: number) => Math.round((((d % 360) + 360) % 360) * 10) / 10;

/** Mixes two #rrggbb colours: t = 0 gives a, 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) || 0;
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Gradient ends across the box, from the side facing a light at `deg` to the far side. */
const across = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x1: 0.5 + 0.5 * Math.cos(a), y1: 0.5 + 0.5 * Math.sin(a), x2: 0.5 - 0.5 * Math.cos(a), y2: 0.5 - 0.5 * Math.sin(a) };
};

const LIT = '#fff4dc';
const MID = '#9c917e';
const DARK = '#221e19';

/** The little lit ring and gem, with the sun on its orbit. */
function LightPreview({ stage }: { stage: StageSettings }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const a = (stage.light * Math.PI) / 180;
  const shade = mix(DARK, /^#[0-9a-f]{6}$/i.test(stage.ambient) ? stage.ambient : DARK, Math.min(1, stage.ambientStrength) * 0.75);
  const g = across(stage.light);
  const ORBIT = 38;
  return (
    <svg viewBox="-44 -44 88 88" width="88" height="88" aria-hidden="true" className="light-preview">
      <defs>
        <linearGradient id={`${id}band`} gradientUnits="objectBoundingBox" {...g}>
          <stop offset="0" stopColor={LIT} />
          <stop offset="0.45" stopColor={MID} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <linearGradient id={`${id}inner`} gradientUnits="objectBoundingBox" {...g}>
          <stop offset="0" stopColor={shade} />
          <stop offset="1" stopColor={LIT} />
        </linearGradient>
        <radialGradient id={`${id}gem`} cx="0.5" cy="0.5" r="0.55" fx={0.5 + 0.3 * Math.cos(a)} fy={0.5 + 0.3 * Math.sin(a)}>
          <stop offset="0" stopColor={LIT} />
          <stop offset="0.4" stopColor={MID} />
          <stop offset="1" stopColor={shade} />
        </radialGradient>
        <linearGradient id={`${id}bloom`} gradientUnits="objectBoundingBox" {...g}>
          <stop offset="0" stopColor={LIT} />
          <stop offset="0.35" stopColor={LIT} stopOpacity="0" />
        </linearGradient>
        {stage.lights.map((l, i) => (
          <linearGradient key={i} id={`${id}l${i}`} gradientUnits="objectBoundingBox" {...across(l.angle)}>
            <stop offset="0" stopColor={l.color} stopOpacity={Math.min(0.95, l.strength * 0.6)} />
            {/* A high light spreads across the ring; a low one only catches the edge facing it. */}
            <stop offset={0.2 + (0.5 * (Math.min(90, Math.max(10, l.height)) - 10)) / 80} stopColor={l.color} stopOpacity="0" />
          </linearGradient>
        ))}
        <filter id={`${id}blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <circle r={ORBIT} className="dial-ring" />
      {/* The ring: a raised band with its two bevelled edges, and a gem in the middle. */}
      <circle r="24" fill="none" stroke={`url(#${id}band)`} strokeWidth="10" />
      <circle r="28.6" fill="none" stroke={`url(#${id}band)`} strokeWidth="1.6" />
      <circle r="19.4" fill="none" stroke={`url(#${id}inner)`} strokeWidth="2" />
      <circle r="11" fill={`url(#${id}gem)`} />
      {stage.lights.map((_l, i) => (
        <g key={i} style={{ mixBlendMode: 'screen' }}>
          <circle r="24" fill="none" stroke={`url(#${id}l${i})`} strokeWidth="11" />
          <circle r="11" fill={`url(#${id}l${i})`} />
        </g>
      ))}
      {stage.bloom > 0 && (
        <g filter={`url(#${id}blur)`} opacity={Math.min(1, stage.bloom * 1.2)} style={{ mixBlendMode: 'screen' }}>
          <circle r="24" fill="none" stroke={`url(#${id}bloom)`} strokeWidth="12" />
        </g>
      )}
      {stage.lights.map((l, i) => {
        const b = (l.angle * Math.PI) / 180;
        return <circle key={i} cx={Math.cos(b) * ORBIT} cy={Math.sin(b) * ORBIT} r="3" fill={l.color} className="dial-extra" />;
      })}
      <line x1={Math.cos(a) * 30.5} y1={Math.sin(a) * 30.5} x2={Math.cos(a) * 33} y2={Math.sin(a) * 33} className="dial-ray" />
      <circle cx={Math.cos(a) * ORBIT} cy={Math.sin(a) * ORBIT} r="5" className="dial-sun" />
    </svg>
  );
}

/** What the lighting rig adds to the main light, in a few words. */
function rigSummary(stage: StageSettings): string {
  const parts: string[] = [];
  if (stage.lights.length) parts.push(`${stage.lights.length} more light${stage.lights.length === 1 ? '' : 's'}`);
  if (stage.ambientStrength > 0) parts.push(`ambient ${Math.round(stage.ambientStrength * 100)}%`);
  if (stage.bloom > 0) parts.push(`bloom ${Math.round(stage.bloom * 100)}%`);
  if (stage.bleed > 0) parts.push(`bleeding ${Math.round(stage.bleed * 100)}%`);
  return parts.length ? parts.join(' · ') : 'One white light';
}

export function LightingPanel({ stage }: { stage: StageSettings }) {
  const value = stage.light;
  const dial = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [rig, setRig] = useState(false);
  const help = hintId(useId());
  const fromPointer = (e: React.PointerEvent) => {
    const r = dial.current!.getBoundingClientRect();
    const deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    return norm(e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg));
  };
  return (
    <section className="lighting-panel" aria-label="Lighting">
      <div className="panel-head">
        <h2 className="panel-title">
          Lighting
          <HelpTip id={help} text={helpFor('Light direction')!} />
        </h2>
        <button type="button" className="btn small" onClick={() => setRig(true)} title="More coloured lights, an ambient colour, bloom and light bleeding">
          <Sun size={16} aria-hidden="true" /> Lighting…
        </button>
      </div>
      <div className="lighting-body">
        <div
          ref={dial}
          className="light-dial"
          role="slider"
          tabIndex={0}
          aria-label="Light direction"
          aria-describedby={help}
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(value)}
          aria-valuetext={`${Math.round(value)}°, from the ${lightName(value)}`}
          title="Where the light comes from. Drag the sun round; Shift snaps to 15°."
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateStage({ light: fromPointer(e) }, { transient: true });
          }}
          onPointerMove={(e) => dragging.current && updateStage({ light: fromPointer(e) }, { transient: true })}
          onPointerUp={() => {
            dragging.current = false;
            commit();
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 15 : 5;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') updateStage({ light: norm(value + step) });
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') updateStage({ light: norm(value - step) });
            else return;
            e.preventDefault();
          }}
        >
          <LightPreview stage={stage} />
        </div>
        <div className="lighting-info">
          <span className="light-value">From the {lightName(value)}</span>
          <span className="lighting-summary">{rigSummary(stage)}</span>
          {value !== DEFAULT_LIGHT && (
            <button type="button" className="icon-btn" aria-label="Light from the top left again" title="Back to the top left (Token Maker's light)" onClick={() => updateStage({ light: DEFAULT_LIGHT })}>
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
      {rig && <LightingDialog onClose={() => setRig(false)} />}
    </section>
  );
}
