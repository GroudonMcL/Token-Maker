import { useState } from 'react';
import { ColorSwatches, ControlLabel, DirectionDial, SegmentedButtons, Slider, Toggle } from '../components';
import { createDocument, DROP_SHADOW_STYLES } from '../document/defaults';
import type { InnerShadow, OuterShadow, ShadowSettings } from '../document/types';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';

const SHADOW_DEFAULTS = createDocument().shadows;
const SHADOW_SWATCHES = ['#000000', '#1b1020', '#14213d', '#2b1a0e', '#3a0d0d', '#ffd27a', '#7ad0ff', '#ffffff'];

/** Per-square values are shown as a percentage of one grid square (1 unit = half a square). */
const toPct = (v: number) => Math.round(v * 50 * 10) / 10;
const fromPct = (p: number) => p / 50;

const FALLS: Record<string, string> = {
  right: 'to the right',
  'bottom right': 'down and right',
  below: 'down',
  'bottom left': 'down and left',
  left: 'to the left',
  'top left': 'up and left',
  above: 'up',
  'top right': 'up and right',
};
const SIDES = ['right', 'bottom right', 'below', 'bottom left', 'left', 'top left', 'above', 'top right'];
const falls = (deg: number) => `falls ${FALLS[SIDES[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!]}`;

const setShadow = <K extends keyof ShadowSettings>(key: K, patch: Partial<ShadowSettings[K]>, transient = false) =>
  updateDoc((d) => ({ ...d, shadows: { ...d.shadows, [key]: { ...d.shadows[key], ...patch } } }), { transient });

type Which = 'outer' | 'popOut' | 'inner';

/**
 * Shadows section (DESIGN.md §6.7; its own section since the tool rail):
 * the drop shadow, the pop-out shadow and the frame's shadow onto the art,
 * one at a time.
 */
export function ShadowsSection() {
  const shadows = useDoc((d) => d.shadows);
  const lightFrom = useDoc((d) => d.lighting.direction);
  const hasPopOut = useDoc((d) => d.art.popOut.enabled && d.art.popOut.strokes.length > 0);
  const [which, setWhich] = useState<Which>('outer');
  // A filled dot marks each shadow that's on.
  const dot = (w: Which) => <span className="shadow-dot" data-on={shadows[w].enabled} aria-hidden="true" />;
  return (
    <>
      <SegmentedButtons
        label="Shadow"
        value={which}
        onChange={setWhich}
        options={[
          { value: 'outer', label: 'Drop', icon: dot('outer') },
          { value: 'popOut', label: 'Pop-out', icon: dot('popOut') },
          { value: 'inner', label: 'Inner', icon: dot('inner') },
        ]}
      />
      {which === 'outer' && <CastShadow which="outer" title="Drop shadow" toggleLabel="Drop shadow" shadow={shadows.outer} lightFrom={lightFrom} />}
      {which === 'popOut' && (
        <CastShadow
          which="popOut"
          title="Pop-out shadow"
          toggleLabel="Pop-out shadow"
          shadow={shadows.popOut}
          lightFrom={lightFrom}
          hint={hasPopOut ? undefined : 'Shows once you paint a pop-out (in the Pop-out tab).'}
        />
      )}
      {which === 'inner' && <InnerShadowControls shadow={shadows.inner} />}
    </>
  );
}

function CastShadow({
  which,
  title,
  toggleLabel,
  shadow,
  lightFrom,
  hint,
}: {
  which: 'outer' | 'popOut';
  title: string;
  toggleLabel: string;
  shadow: OuterShadow;
  lightFrom: number;
  hint?: string;
}) {
  const base = SHADOW_DEFAULTS[which];
  const set = (patch: Partial<OuterShadow>, transient = false) => setShadow(which, patch, transient);
  // Unlinking starts from the angle the shadow had, so it doesn't jump.
  const unlink = (follow: boolean) => set(follow ? { followLight: true } : { followLight: false, angle: (((lightFrom - 180) % 360) + 360) % 360 });
  const matches = (st: (typeof DROP_SHADOW_STYLES)[number]['settings']) =>
    (Object.keys(st) as (keyof typeof st)[]).every((k) => shadow[k] === st[k]);
  return (
    <div className="control-group" data-shadow={which}>
      <h4 className="control-group__title">{title}</h4>
      <Toggle label={toggleLabel} checked={shadow.enabled} onChange={(enabled) => set({ enabled })} />
      {shadow.enabled && (
        <>
          {hint && <p className="control__hint">{hint}</p>}
          {which === 'outer' && (
            <div className="control" data-control="shadow-styles">
              <ControlLabel label="Quick styles" />
              <div className="preset-grid" role="group" aria-label="Drop shadow styles">
                {DROP_SHADOW_STYLES.map((st) => (
                  <button key={st.id} type="button" className="btn btn--small preset-btn" aria-pressed={matches(st.settings)} onClick={() => set({ ...st.settings })}>
                    <span className="preset-btn__swatch" style={{ background: st.settings.color }} aria-hidden="true" />
                    {st.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Following the light only sets the direction: everything else can always be changed. */}
          <Toggle label={`${title}: follow the light`} checked={shadow.followLight} onChange={unlink} />
          {!shadow.followLight && (
            <DirectionDial
              label={`${title} direction`}
              value={shadow.angle}
              describe={falls}
              onChange={(angle) => set({ angle }, true)}
              onCommit={commitDoc}
            />
          )}
          <Slider
            label={`${title} distance`}
            unit="% of a square"
            min={0}
            max={50}
            step={0.1}
            value={toPct(shadow.distance)}
            defaultValue={toPct(base.distance)}
            onChange={(v) => set({ distance: fromPct(v) }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label={`${title} blur`}
            unit="% of a square"
            min={0}
            max={50}
            step={0.1}
            value={toPct(shadow.blur)}
            defaultValue={toPct(base.blur)}
            onChange={(v) => set({ blur: fromPct(v) }, true)}
            onCommit={commitDoc}
          />
          {which === 'outer' && (
            <Slider
              label={`${title} size`}
              unit="%"
              min={100}
              max={150}
              value={Math.round((1 + shadow.spread) * 100)}
              defaultValue={Math.round((1 + base.spread) * 100)}
              onChange={(v) => set({ spread: v / 100 - 1 }, true)}
              onCommit={commitDoc}
            />
          )}
          <ColorSwatches
            label={`${title} colour`}
            value={shadow.color}
            swatches={SHADOW_SWATCHES}
            onChange={(color) => set({ color }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label={`${title} opacity`}
            unit="%"
            min={0}
            max={100}
            value={Math.round(shadow.opacity * 100)}
            defaultValue={Math.round(base.opacity * 100)}
            onChange={(v) => set({ opacity: v / 100 }, true)}
            onCommit={commitDoc}
          />
        </>
      )}
    </div>
  );
}

function InnerShadowControls({ shadow }: { shadow: InnerShadow }) {
  const base = SHADOW_DEFAULTS.inner;
  const set = (patch: Partial<InnerShadow>, transient = false) => setShadow('inner', patch, transient);
  return (
    <div className="control-group" data-shadow="inner">
      <h4 className="control-group__title">Inner shadow</h4>
      <Toggle label="Inner shadow" checked={shadow.enabled} onChange={(enabled) => set({ enabled })} />
      {shadow.enabled && (
        <>
          <Slider
            label="Inner shadow strength"
            unit="%"
            min={0}
            max={100}
            value={Math.round(shadow.strength * 100)}
            defaultValue={Math.round(base.strength * 100)}
            onChange={(v) => set({ strength: v / 100 }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Inner shadow softness"
            unit="% of a square"
            min={0}
            max={25}
            step={0.1}
            value={toPct(shadow.softness)}
            defaultValue={toPct(base.softness)}
            onChange={(v) => set({ softness: fromPct(v) }, true)}
            onCommit={commitDoc}
          />
        </>
      )}
    </div>
  );
}
