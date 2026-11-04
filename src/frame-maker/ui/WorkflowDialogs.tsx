// Workflow dialogs (DESIGN.md §6.8): variations of the design (Vary…), a
// theme colour for the whole design (Theme…) and the lighting rig
// (Lighting…). Each previews with the real renderer and applies as one undo
// step.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dices, Plus, Trash2, X } from 'lucide-react';
import { newLight } from '../project/defaults';
import { DEFAULT_RANDOMISE, randomise, recolour, type RandomiseOptions } from '../project/variation';
import type { FrameProject } from '../project/types';
import { commit, replaceLayers, updateStage, useProject } from '../state/projectStore';
import { ColorField, OptionalColor, Slider, Toggle } from './controls';
import { Tile } from './Thumbnail';

function Dialog({ label, onClose, children, wide = true }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);
  return (
    <dialog ref={ref} className={`dialog${wide ? ' templates' : ' small-dialog'}`} aria-label={label} onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>{label}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}

/** Pictures of a project, drawn on a thicker band so small tiles show the detail. */
const shown = (p: FrameProject): FrameProject => ({ ...p, stage: { ...p.stage, showArt: false, thickness: Math.max(p.stage.thickness, 0.22) } });

/** Six variations of the design; picking one puts it in place of the design (one undo step). */
export function RandomiseDialog({ onClose }: { onClose: () => void }) {
  const project = useProject();
  const [opts, setOpts] = useState<RandomiseOptions>(DEFAULT_RANDOMISE);
  const [batch, setBatch] = useState(() => Math.floor(Math.random() * 100000));
  const variations = useMemo(() => Array.from({ length: 6 }, (_v, i) => randomise(project, opts, batch * 6 + i)), [project, opts, batch]);
  const locked = project.layers.some((l) => l.locked);
  return (
    <Dialog label="Variations" onClose={onClose}>
      <p className="note">
        New versions of your design within limits: other patterns, colours turned round the colour wheel, sizes nudged. Pick one to use it (undo brings yours back).{' '}
        {locked ? 'Locked layers stay as they are.' : 'Lock a layer (the padlock in the list) to keep it as it is.'}
      </p>
      <div className="row wrap">
        <Toggle label="Vary the patterns" hint="New arrangements: textures, generators, wear, random variation." checked={opts.patterns} onChange={(patterns) => setOpts({ ...opts, patterns })} />
        <Toggle label="Vary the colours" hint="Turns the colours round the colour wheel together, so they stay in harmony." checked={opts.colours} onChange={(colours) => setOpts({ ...opts, colours })} />
        <Toggle label="Vary the sizes" hint="Makes sizes, widths and numbers a little bigger or smaller." checked={opts.sizes} onChange={(sizes) => setOpts({ ...opts, sizes })} />
      </div>
      <Slider label="How different" hint="A little different, or a lot." value={opts.strength} min={0.05} max={1} step={0.05} scale={100} unit="%" onChange={(strength) => setOpts({ ...opts, strength })} onCommit={() => {}} />
      <button type="button" className="btn small" onClick={() => setBatch((b) => b + 1)}>
        <Dices size={16} /> More variations
      </button>
      <div className="tiles">
        {variations.map((v, i) => (
          <Tile
            key={`${batch}-${i}`}
            id={`variation:${batch}:${i}:${JSON.stringify(opts)}:${project.layers.length}`}
            name={`Variation ${i + 1}`}
            description="Click to use this variation."
            make={() => shown(v)}
            onPick={() => {
              replaceLayers(v.layers);
              onClose();
            }}
          />
        ))}
      </div>
    </Dialog>
  );
}

/** Recolours the whole design from one or two colours. */
export function ThemeDialog({ onClose }: { onClose: () => void }) {
  const project = useProject();
  const [main, setMain] = useState('#3a7bd5');
  const [second, setSecond] = useState<string | null>(null);
  const result = useMemo(() => recolour(project, main, second), [project, main, second]);
  return (
    <Dialog label="Theme colour" onClose={onClose}>
      <p className="note">Recolours the whole design (Token Maker frames and converted frames too) from a theme colour, keeping how light or dark each part is, so metal stays metal. With a second colour, the accents follow it. Locked layers stay as they are.</p>
      <ColorField label="Theme colour" hint="The colour the design's main colours turn into." value={main} onChange={(v) => setMain(v)} />
      <OptionalColor label="Accent colour" hint="A second colour for the design's accents (the colours furthest from its main ones)." value={second} fallback="#d4a838" onChange={(v) => setSecond(v)} />
      <div className="tiles">
        <Tile id={`theme-before:${project.layers.length}:${JSON.stringify(project.layers).length}`} name="Now" description="The design as it is." make={() => shown(project)} onPick={onClose} />
        <Tile
          id={`theme:${main}:${second}:${JSON.stringify(project.layers).length}`}
          name="Recoloured"
          description="Click to use these colours."
          make={() => shown(result)}
          onPick={() => {
            replaceLayers(result.layers);
            onClose();
          }}
        />
      </div>
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          replaceLayers(result.layers);
          onClose();
        }}
      >
        Recolour the design
      </button>
    </Dialog>
  );
}

/** The lighting rig: more coloured lights, an ambient colour, bloom and light bleeding. Changes show straight away. */
export function LightingDialog({ onClose }: { onClose: () => void }) {
  const { stage } = useProject();
  const setLight = (i: number, patch: Partial<FrameProject['stage']['lights'][number]>, transient?: boolean) =>
    updateStage({ lights: stage.lights.map((l, k) => (k === i ? { ...l, ...patch } : l)) }, { transient });
  return (
    <Dialog label="Lighting" onClose={onClose} wide={false}>
      <p className="note">
        The light dial is the main light. Add more coloured lights (a cold rim light, a warm fill): they light every bevel's edges that face them. Give shaded sides an ambient colour, and make the brightest parts bloom or their colours spill onto their neighbours.
      </p>
      {stage.lights.map((l, i) => (
        <fieldset className="light-row" key={i}>
          <legend>Light {i + 2}</legend>
          <Slider label={`Light ${i + 2} direction`} hint="Where this light comes from: 0° right, 90° below, 180° left, 270° above." value={l.angle} min={0} max={359} step={1} unit="°" onChange={(angle, t) => setLight(i, { angle }, t)} onCommit={commit} />
          <ColorField label={`Light ${i + 2} colour`} hint="The colour of this light." value={l.color} onChange={(color, t) => setLight(i, { color }, t)} />
          <Slider label={`Light ${i + 2} strength`} hint="How strongly it lights." value={l.strength} min={0} max={2} step={0.05} scale={100} unit="%" onChange={(strength, t) => setLight(i, { strength }, t)} onCommit={commit} />
          <Slider label={`Light ${i + 2} height`} hint="How high it is: low lights only the edges facing it, like a rim light." value={l.height} min={10} max={90} step={1} unit="°" onChange={(height, t) => setLight(i, { height }, t)} onCommit={commit} />
          <button type="button" className="btn small" onClick={() => updateStage({ lights: stage.lights.filter((_x, k) => k !== i) })}>
            <Trash2 size={16} /> Remove light {i + 2}
          </button>
        </fieldset>
      ))}
      {stage.lights.length < 3 && (
        <button type="button" className="btn small" onClick={() => updateStage({ lights: [...stage.lights, newLight(stage.light)] })}>
          <Plus size={16} /> Add a light
        </button>
      )}
      <ColorField label="Ambient colour" hint="The colour shaded sides take on." value={stage.ambient} onChange={(ambient, t) => updateStage({ ambient }, { transient: t })} />
      <Slider label="Ambient strength" hint="How much of the ambient colour shaded sides take on." value={stage.ambientStrength} min={0} max={1} step={0.05} scale={100} unit="%" onChange={(ambientStrength, t) => updateStage({ ambientStrength }, { transient: t })} onCommit={commit} />
      <Slider label="Bloom" hint="A soft glow round the brightest parts of the design." value={stage.bloom} min={0} max={1} step={0.05} scale={100} unit="%" onChange={(bloom, t) => updateStage({ bloom }, { transient: t })} onCommit={commit} />
      <Slider label="Light bleeding" hint="Bright, vivid colours spill onto the parts next to them, like glowing gems lighting the metal round them." value={stage.bleed} min={0} max={1} step={0.05} scale={100} unit="%" onChange={(bleed, t) => updateStage({ bleed }, { transient: t })} onCommit={commit} />
    </Dialog>
  );
}
