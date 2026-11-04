import { Flame, FlameKindling, Moon, Sparkles, Sun, Zap } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { ColorSwatches, ControlLabel, DirectionDial, Slider, Toggle } from '../components';
import { DEFAULT_LIGHTING, LIGHT_PRESETS } from '../document/defaults';
import type { LightingSettings, LightPresetId } from '../document/types';
import { commitDoc, updateDoc, useDoc } from '../state/tokenStore';

const SWATCHES = ['#ffe2b0', '#ffa04a', '#ff6a22', '#fff1b8', '#9db8ff', '#76ff4a', '#8b5cd6', '#ff4a6a', '#ffffff'];
const PRESET_ICONS: Record<LightPresetId, ReactNode> = {
  torchlight: <FlameKindling size={16} />,
  moonlight: <Moon size={16} />,
  holy: <Sun size={16} />,
  fel: <Zap size={16} />,
  firelight: <Flame size={16} />,
  underdark: <Sparkles size={16} />,
};

/** A change made by hand: the preset no longer describes the light. */
const setLight = (patch: Partial<LightingSettings>, transient = false) =>
  updateDoc((d) => ({ ...d, lighting: { ...d.lighting, ...patch, preset: null } }), { transient });

/**
 * Lighting section (DESIGN.md §6.5). The direction is always shown,
 * because shadows (the Shadows section) fall away from it even with the light off.
 */
export function LightingSection() {
  const l = useDoc((d) => d.lighting);
  const whatId = useId();
  const applyPreset = (id: LightPresetId) => {
    // Clicking the preset in use turns it off again: back to a new token's light (none).
    if (l.enabled && l.preset === id) {
      updateDoc((d) => ({ ...d, lighting: { ...DEFAULT_LIGHTING, rim: { ...DEFAULT_LIGHTING.rim } } }));
      return;
    }
    const p = LIGHT_PRESETS.find((x) => x.id === id)!;
    updateDoc((d) => ({ ...d, lighting: { ...d.lighting, ...p.settings, rim: { ...p.settings.rim }, enabled: true, background: true, preset: id } }));
  };
  const lit = l.enabled || l.frame || l.background;
  return (
    <>
      <div className="control" data-control="light-presets">
        <ControlLabel label="Presets" />
        <div className="preset-grid" role="group" aria-label="Lighting presets">
          {LIGHT_PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn btn--small preset-btn" aria-pressed={l.enabled && l.preset === p.id} onClick={() => applyPreset(p.id)}>
              <span className="preset-btn__swatch" style={{ background: p.settings.color }} aria-hidden="true" />
              {PRESET_ICONS[p.id]}
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="control" data-control="light-what" role="group" aria-labelledby={whatId}>
        <ControlLabel id={whatId} label="Light the…" />
        <div className="toggle-row">
          <Toggle label="Art" checked={l.enabled} onChange={(enabled) => updateDoc((d) => ({ ...d, lighting: { ...d.lighting, enabled } }))} />
          <Toggle label="Frame" checked={l.frame} onChange={(frame) => updateDoc((d) => ({ ...d, lighting: { ...d.lighting, frame } }))} />
          <Toggle label="Background" checked={l.background} onChange={(background) => updateDoc((d) => ({ ...d, lighting: { ...d.lighting, background } }))} />
        </div>
      </div>
      <DirectionDial
        label="Light comes from"
        value={l.direction}
        onChange={(direction) => setLight({ direction }, true)}
        onCommit={commitDoc}
      />
      {lit && (
        <>
          <ColorSwatches label="Light colour" value={l.color} swatches={SWATCHES} onChange={(color) => setLight({ color }, true)} onCommit={commitDoc} />
          <Slider
            label="Strength"
            unit="%"
            min={0}
            max={100}
            value={l.strength}
            defaultValue={DEFAULT_LIGHTING.strength}
            onChange={(strength) => setLight({ strength }, true)}
            onCommit={commitDoc}
          />
          <Slider
            label="Darkness away from the light"
            unit="%"
            min={0}
            max={100}
            value={l.falloff}
            defaultValue={DEFAULT_LIGHTING.falloff}
            onChange={(falloff) => setLight({ falloff }, true)}
            onCommit={commitDoc}
          />
        </>
      )}
      {l.enabled && (
        <>
          <Toggle label="Rim light" checked={l.rim.enabled} onChange={(enabled) => setLight({ rim: { ...l.rim, enabled } })} />
          {l.rim.enabled && (
            <>
              <Slider
                label="Rim strength"
                unit="%"
                min={0}
                max={100}
                value={l.rim.strength}
                defaultValue={DEFAULT_LIGHTING.rim.strength}
                onChange={(strength) => setLight({ rim: { ...l.rim, strength } }, true)}
                onCommit={commitDoc}
              />
              <Slider
                label="Rim width"
                unit="%"
                min={0}
                max={100}
                value={l.rim.width}
                defaultValue={DEFAULT_LIGHTING.rim.width}
                onChange={(width) => setLight({ rim: { ...l.rim, width } }, true)}
                onCommit={commitDoc}
              />
              <Slider
                label="Rim softness"
                unit="%"
                min={0}
                max={100}
                value={l.rim.softness}
                defaultValue={DEFAULT_LIGHTING.rim.softness}
                onChange={(softness) => setLight({ rim: { ...l.rim, softness } }, true)}
                onCommit={commitDoc}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
