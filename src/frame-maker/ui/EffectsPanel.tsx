// The Effects section of Properties (DESIGN.md §6.4): a layer's stack of
// effects, applied first to last. Styles… applies a ready-made stack; each
// effect can then be switched off, moved, removed or changed. The settings
// most people need come first; the rest are in Advanced.

import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, BookmarkPlus, ClipboardCopy, ClipboardPaste, Dices, Palette, Plus, Shuffle, Trash2 } from 'lucide-react';
import { DEFAULT_RANDOMISE, randomiseEffects } from '../project/variation';
import { saveUserStyle } from '../state/styles';
import { showMessage } from '../state/messages';
import { EFFECT_NAMES, NEW_EFFECT } from '../project/defaults';
import { MATERIALS } from '../project/styles';
import { BEVEL_PROFILES, BLUR_MODES, EFFECT_KINDS, SURFACES, type BevelProfile, type BlurMode, type Effect, type EffectKind, type Layer, type Surface } from '../project/types';
import { commit, copyEffects, pasteEffects, setEffects, useUi } from '../state/projectStore';
import { ColorField, Field, Select, Slider, Toggle } from './controls';
import { helpFor, hintId } from './help';
import { StyleDialog } from './StyleDialog';

const PROFILE_NAMES: Record<BevelProfile, string> = {
  rounded: 'Rounded',
  chisel: 'Chiselled (flat slope)',
  cove: 'Cove (curving in)',
  ridge: 'Rim round the edge',
  stepped: 'Steps',
};

const SURFACE_NAMES: Record<Surface, string> = {
  smooth: 'Smooth',
  hammered: 'Hammered',
  grain: 'Rough grain',
  brushed: 'Brushed (round the token)',
  cracked: 'Cracked plates',
  scales: 'Scales or studs',
};

const pct = { scale: 100, unit: '%', step: 0.005 };

export function EffectsSection({ layer }: { layer: Layer }) {
  const advanced = useUi((s) => s.mode === 'advanced');
  const copied = useUi((s) => s.copiedEffects);
  const picked = useUi((s) => s.selectedIds.length);
  const [styles, setStyles] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const nameId = useId();
  const disabled = layer.locked;
  const effects = layer.effects;
  const set = (next: Effect[], transient?: boolean) => setEffects(layer.id, next, { transient });

  return (
    <section className="effects" aria-label="Effects">
      <h3 className="section-title">Effects</h3>
      <p className="note">
        {effects.length === 0
          ? 'Make it metal, stone, crystal or magic: pick a style, or add effects one by one. They follow the light dial.'
          : `Applied from the first to the last${picked > 1 ? '. Styles and pasted effects go on every picked layer' : ''}.`}
      </p>
      <div className="row wrap">
        <button type="button" className="btn small primary" disabled={disabled} onClick={() => setStyles(true)}>
          <Palette size={16} /> Styles…
        </button>
        <button type="button" className="btn small" disabled={effects.length === 0} onClick={copyEffects} title="Keep these effects to paste onto other layers">
          <ClipboardCopy size={16} /> Copy effects
        </button>
        <button type="button" className="btn small" disabled={disabled || !copied} onClick={pasteEffects} title="Give the picked layers the copied effects, in place of their own">
          <ClipboardPaste size={16} /> Paste effects
        </button>
        <button type="button" className="btn small" disabled={disabled || effects.length === 0} onClick={() => set(randomiseEffects(effects, DEFAULT_RANDOMISE, Math.floor(Math.random() * 1e6)))} title="Try a variation of these effects: new patterns, colours and sizes (undo to go back)">
          <Dices size={16} /> Vary the style
        </button>
        <button type="button" className="btn small" disabled={effects.length === 0} onClick={() => setNaming(naming === null ? layer.name : null)} title="Keep these effects as a style of your own, in the style library and library files">
          <BookmarkPlus size={16} /> Save as a style
        </button>
      </div>
      {naming !== null && (
        <form
          className="row"
          onSubmit={(ev) => {
            ev.preventDefault();
            void saveUserStyle(naming, effects).then((st) => showMessage(`Saved the style "${st.name}". Find it in Styles… under Your styles.`));
            setNaming(null);
          }}
        >
          <Field label="Style name" htmlFor={nameId} hint="What your style is called in the style library.">
            <input id={nameId} className="wide-text" autoFocus value={naming} maxLength={60} aria-describedby={hintId(nameId)} onChange={(ev) => setNaming(ev.target.value)} />
          </Field>
          <button type="submit" className="btn small primary">
            Save the style
          </button>
        </form>
      )}
      <EffectStack effects={effects} disabled={disabled} advanced={advanced} onChange={set} />
      {styles && <StyleDialog layer={layer} onClose={() => setStyles(false)} />}
    </section>
  );
}

/** A stack of effects, first first: add, switch off, reorder, remove and change each one. */
export function EffectStack({ effects, disabled, advanced, onChange, label = '' }: { effects: Effect[]; disabled: boolean; advanced: boolean; onChange: (next: Effect[], transient?: boolean) => void; label?: string }) {
  const patch = (i: number) => (p: Partial<Effect>, transient?: boolean) => onChange(effects.map((e, k) => (k === i ? ({ ...e, ...p } as Effect) : e)), transient);
  const move = (i: number, by: number) => {
    const next = [...effects];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const of = label ? ` ${label}` : '';
  return (
    <>
      <AddEffect disabled={disabled} label={label ? `Add an effect to the${of}` : 'Add an effect'} onAdd={(kind) => onChange([...effects, NEW_EFFECT[kind]()])} />
      {effects.map((e, i) => (
        <div className={`effect${e.on ? '' : ' off'}`} key={i}>
          <div className="effect-head">
            <Toggle label={`${EFFECT_NAMES[e.kind]}${label ? ` (${label})` : ''}`} hint={EFFECT_HINTS[e.kind]} checked={e.on} disabled={disabled} onChange={(on) => patch(i)({ on })} />
            <span className="effect-buttons">
              <button type="button" className="icon-btn" aria-label={`Move ${EFFECT_NAMES[e.kind].toLowerCase()}${of} earlier`} title="Apply it earlier" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={16} />
              </button>
              <button type="button" className="icon-btn" aria-label={`Move ${EFFECT_NAMES[e.kind].toLowerCase()}${of} later`} title="Apply it later" disabled={disabled || i === effects.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={16} />
              </button>
              <button type="button" className="icon-btn danger" aria-label={`Remove ${EFFECT_NAMES[e.kind].toLowerCase()}${of}`} title="Remove this effect" disabled={disabled} onClick={() => onChange(effects.filter((_x, k) => k !== i))}>
                <Trash2 size={16} />
              </button>
            </span>
          </div>
          {e.on && <EffectControls effect={e} disabled={disabled} advanced={advanced} onChange={patch(i)} />}
        </div>
      ))}
    </>
  );
}

const BLUR_NAMES: Record<BlurMode, string> = {
  soft: 'Soft (all round)',
  spin: 'Spin (round the token)',
  zoom: 'Zoom (in and out)',
};

const EFFECT_HINTS: Record<EffectKind, string> = {
  bevel: 'Gives it depth: raised or sunk in, with a surface like hammered metal or cracked stone, lit by the light dial.',
  shadow: 'A soft shadow cast away from the light, behind it or inside its edge.',
  glow: 'A soft glow of colour round its edge, outside or inside.',
  recolour: 'Recolours it from dark to light, so its shading becomes gold, bronze, bone or any colours you choose.',
  adjust: 'Changes its hue, how vivid it is, its brightness and its contrast.',
  wear: 'Makes it look old: chipped edges, edges rubbed bright, scratches and patches of grime.',
  distort: 'Warps it with smooth wobbles: uneven edges, irregular stone, a subtle shimmer.',
  extrude: 'Gives it sides: pushed back away from the light, as if it were a thick raised plate.',
  offset: 'Makes its shape fatter or thinner all round.',
  blur: 'Softens it: all round, whirled round the token, or streaked in and out from its middle.',
};

function AddEffect({ disabled, onAdd, label }: { disabled: boolean; onAdd: (k: EffectKind) => void; label: string }) {
  const id = useId();
  const tip = 'Adds one effect after the others, set up to look good straight away.';
  return (
    <Field label={label} htmlFor={id} hint={tip}>
      <select
        id={id}
        value=""
        disabled={disabled}
        aria-describedby={hintId(id)}
        onChange={(ev) => {
          if (ev.target.value) onAdd(ev.target.value as EffectKind);
        }}
      >
        <option value="">Choose…</option>
        {EFFECT_KINDS.map((k) => (
          <option key={k} value={k}>
            {EFFECT_NAMES[k]}
          </option>
        ))}
      </select>
    </Field>
  );
}

type OnChange = (p: Partial<Effect>, transient?: boolean) => void;

function EffectControls({ effect: e, disabled, advanced, onChange }: { effect: Effect; disabled: boolean; advanced: boolean; onChange: OnChange }) {
  // What a new effect of this kind starts with: where the reset buttons put things back to.
  const start = NEW_EFFECT[e.kind]() as unknown as Record<string, unknown>;
  const startColor = (key: string) => (typeof start[key] === 'string' ? (start[key] as string) : undefined);
  const slider = (key: string, label: string, min: number, max: number, hint: string, extra: Partial<Parameters<typeof Slider>[0]> = pct) => (
    <Slider
      key={key}
      label={label}
      hint={hint}
      value={(e as unknown as Record<string, number>)[key]}
      min={min}
      max={max}
      disabled={disabled}
      defaultValue={typeof start[key] === 'number' ? (start[key] as number) : undefined}
      onChange={(v, t) => onChange({ [key]: v } as Partial<Effect>, t)}
      onCommit={commit}
      {...extra}
    />
  );
  const shuffle = (
    <div className="row">
      {slider('seed', 'Variation', 0, 99999, helpFor('Variation')!, { step: 1 })}
      <button type="button" className="icon-btn" aria-label="Shuffle" title="Try another variation" disabled={disabled} onClick={() => onChange({ seed: Math.floor(Math.random() * 99999) } as Partial<Effect>)}>
        <Shuffle size={16} />
      </button>
    </div>
  );
  switch (e.kind) {
    case 'bevel':
      return (
        <div className="effect-body">
          <Select
            label="Raised or sunk in"
            hint="Raised stands up out of the band; sunk in is cut into it, like engraving."
            value={e.direction}
            disabled={disabled}
            options={[
              { value: 'raised', label: 'Raised' },
              { value: 'sunken', label: 'Sunk in' },
            ]}
            onChange={(direction) => onChange({ direction })}
          />
          <Select label="Edge shape" hint="The shape of the slope up from the edge." value={e.profile} disabled={disabled} options={BEVEL_PROFILES.map((p) => ({ value: p, label: PROFILE_NAMES[p] }))} onChange={(profile) => onChange({ profile })} />
          {slider('size', 'Bevel width', 0.01, 1, 'How far in from the edge the slope reaches, as a share of the band width.')}
          {slider('depth', 'Depth', 0, 4, 'How steep and deep it looks.', { step: 0.05, scale: 100, unit: '%' })}
          {slider('gloss', 'Shine', 0, 1, 'Matt at 0%; polished, with bright glints, at 100%.')}
          <Select label="Surface" hint="A texture across the whole surface, lit by the light like the edges." value={e.surface} disabled={disabled} options={SURFACES.map((s) => ({ value: s, label: SURFACE_NAMES[s] }))} onChange={(surface) => onChange({ surface })} />
          {e.surface !== 'smooth' && (
            <>
              {slider('surfaceDepth', 'Surface depth', 0, 2, 'How deep the surface texture is.', { step: 0.05, scale: 100, unit: '%' })}
              {slider('surfaceScale', 'Surface size', 0.03, 1.5, 'How big its marks are, as a share of the band width.')}
              {shuffle}
            </>
          )}
          {advanced && (
            <>
              {slider('soften', 'Soften', 0, 0.3, 'Smooths the slopes and the surface.')}
              {slider('lightHeight', 'Light height', 10, 90, 'How high the light is above the token: low gives long, strong shading; 90° is straight above.', { step: 1, unit: '°' })}
              <ColorField label="Lit side colour" hint="The colour of the side facing the light and of the shine." value={e.highlight} disabled={disabled} defaultValue={startColor('highlight')} onChange={(highlight, t) => onChange({ highlight }, t)} />
              {slider('highlightOpacity', 'Lit side strength', 0, 1, 'How strongly the side facing the light shows.')}
              <ColorField label="Shaded side colour" hint="The colour of the side away from the light." value={e.shadow} disabled={disabled} defaultValue={startColor('shadow')} onChange={(shadow, t) => onChange({ shadow }, t)} />
              {slider('shadowOpacity', 'Shaded side strength', 0, 1, 'How strongly the side away from the light shows.')}
            </>
          )}
        </div>
      );
    case 'shadow':
      return (
        <div className="effect-body">
          <InsideOutside value={e.inner} disabled={disabled} onChange={(inner) => onChange({ inner })} what="shadow" />
          <ColorField label="Shadow colour" hint="The colour of the shadow." value={e.color} disabled={disabled} defaultValue={startColor('color')} onChange={(color, t) => onChange({ color }, t)} />
          {slider('opacity', 'Strength', 0, 1, 'How dark the shadow is.')}
          {slider('distance', 'Distance', 0, 0.6, 'How far the shadow falls from the light, as a share of the band width.')}
          {slider('blur', 'Softness', 0, 0.6, 'How soft its edge is.')}
        </div>
      );
    case 'glow':
      return (
        <div className="effect-body">
          <InsideOutside value={e.inner} disabled={disabled} onChange={(inner) => onChange({ inner })} what="glow" />
          <ColorField label="Glow colour" hint="The colour of the glow." value={e.color} disabled={disabled} defaultValue={startColor('color')} onChange={(color, t) => onChange({ color }, t)} />
          {slider('opacity', 'Strength', 0, 1, 'How bright the glow is.')}
          {slider('size', 'Glow size', 0.01, 1.5, 'How far the glow spreads, as a share of the band width.')}
        </div>
      );
    case 'recolour':
      return (
        <div className="effect-body">
          <Select
            label="Material"
            hint="Ready-made colours from dark to light. Put it after a bevel to turn the shading into that material."
            value={MATERIALS.find((m) => JSON.stringify(m.stops) === JSON.stringify(e.stops))?.id ?? 'custom'}
            disabled={disabled}
            options={[...MATERIALS.map((m) => ({ value: m.id, label: m.name })), { value: 'custom', label: 'Your own colours' }]}
            onChange={(id) => {
              const m = MATERIALS.find((x) => x.id === id);
              if (m) onChange({ stops: m.stops.map((s) => ({ ...s })) });
            }}
          />
          {slider('amount', 'Amount', 0, 1, 'How much of the new colours: 100% replaces the old ones.')}
          <div className="stops" role="group" aria-label="Material colours">
            <div className="ramp-preview" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${e.stops.map((s) => `${s.color} ${s.at * 100}%`).join(', ')})` }} />
            {e.stops.map((s, k) => (
              <div className="stop" key={k}>
                <ColorField
                  label={`Colour ${k + 1}`}
                  hint={k === 0 ? 'The colour the darkest parts become.' : k === e.stops.length - 1 ? 'The colour the lightest parts become.' : 'A colour between dark and light.'}
                  value={s.color}
                  disabled={disabled}
                  onChange={(color, t) => onChange({ stops: e.stops.map((x, j) => (j === k ? { ...x, color } : x)) }, t)}
                />
                {advanced && (
                  <Slider
                    label={`Colour ${k + 1} position`}
                    hint="How light a part must be to take this colour: 0% the darkest, 100% the lightest."
                    value={s.at}
                    min={0}
                    max={1}
                    disabled={disabled}
                    {...pct}
                    onChange={(at, t) => onChange({ stops: e.stops.map((x, j) => (j === k ? { ...x, at } : x)).sort((a, b) => a.at - b.at) }, t)}
                    onCommit={commit}
                  />
                )}
                {e.stops.length > 2 && (
                  <button type="button" className="icon-btn" aria-label={`Remove colour ${k + 1}`} disabled={disabled} onClick={() => onChange({ stops: e.stops.filter((_x, j) => j !== k) })}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {e.stops.length < 8 && (
              <button
                type="button"
                className="btn small"
                disabled={disabled}
                onClick={() => {
                  const last = e.stops[e.stops.length - 1];
                  onChange({ stops: [...e.stops.map((s, k) => ({ ...s, at: k / e.stops.length })), { ...last, at: 1 }] });
                }}
              >
                <Plus size={16} /> Add a colour
              </button>
            )}
          </div>
        </div>
      );
    case 'adjust':
      return (
        <div className="effect-body">
          {slider('hue', 'Hue', -180, 180, 'Turns every colour round the colour wheel.', { step: 1, unit: '°' })}
          {slider('saturation', 'Vividness', -1, 1, 'Less colour (grey at −100%) or more.')}
          {slider('brightness', 'Brightness', -1, 1, 'Darker or lighter.')}
          {slider('contrast', 'Contrast', -1, 1, 'Flatter or punchier.')}
        </div>
      );
    case 'distort':
      return (
        <div className="effect-body">
          {slider('amount', 'Amount', 0, 0.3, 'How far it is pushed about, as a share of the band width.')}
          {slider('scale', 'Wobble size', 0.03, 2, 'How big the wobbles are, as a share of the band width.')}
          {shuffle}
        </div>
      );
    case 'extrude':
      return (
        <div className="effect-body">
          {slider('depth', 'Side depth', 0, 0.4, 'How deep the sides are, as a share of the band width.')}
          {slider('shade', 'Side shading', 0, 1, 'How dark the sides are.')}
        </div>
      );
    case 'blur':
      return (
        <div className="effect-body">
          <Select
            label="Blur kind"
            hint="Soft blurs it evenly; Spin smears it round the token, like something whirling; Zoom streaks it in and out from the middle."
            value={e.mode}
            disabled={disabled}
            options={BLUR_MODES.map((m) => ({ value: m, label: BLUR_NAMES[m] }))}
            onChange={(mode) => onChange({ mode })}
          />
          {slider('amount', 'Blur amount', 0, 1.5, 'How far it is smeared, as a share of the band width.')}
          <Toggle label="Keep its shape" hint="Only the inside goes soft; the edges stay where they were." checked={e.keepShape} disabled={disabled} onChange={(keepShape) => onChange({ keepShape })} />
        </div>
      );
    case 'offset':
      return (
        <div className="effect-body">
          {slider('amount', 'Grow by', -0.3, 0.3, 'How much bigger (or, below 0%, smaller) the shape gets, as a share of the band width.')}
        </div>
      );
    case 'wear':
      return (
        <div className="effect-body">
          {slider('chips', 'Chipped edges', 0, 1, 'How much of the edge is chipped away.')}
          {slider('polish', 'Rubbed edges', 0, 1, 'How bright the edges are rubbed, as on old metal.')}
          {slider('grime', 'Grime', 0, 1, 'How much dirt and tarnish gathers in patches.')}
          <ColorField label="Grime colour" hint="The colour of the grime: brown dirt, green verdigris, black soot…" value={e.grimeColor} disabled={disabled} defaultValue={startColor('grimeColor')} onChange={(grimeColor, t) => onChange({ grimeColor }, t)} />
          {slider('scratches', 'Scratches', 0, 1, 'Fine scratches across it, bright with a dark edge.')}
          {slider('scale', 'Wear size', 0.03, 1.5, 'How big the chips and patches are, as a share of the band width.')}
          {shuffle}
        </div>
      );
  }
}

function InsideOutside({ value, disabled, onChange, what }: { value: boolean; disabled: boolean; onChange: (inner: boolean) => void; what: string }) {
  return (
    <Select
      label="Where"
      hint={`Behind it, spreading outside its edge, or inside its edge only.`}
      value={value ? 'inner' : 'outer'}
      disabled={disabled}
      options={[
        { value: 'outer', label: `Outside (a ${what} behind it)` },
        { value: 'inner', label: 'Inside its edge' },
      ]}
      onChange={(v) => onChange(v === 'inner')}
    />
  );
}
