// The style library (Effects → Styles…): every style as a tile showing the
// design with the selected layer in that style, drawn by the real renderer.
// Picking one gives the picked layers its effects (one undo step), in place
// of their own or after them.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { loadUserStyles, removeUserStyle, useUserStyles } from '../state/styles';
import { mapLayer } from '../project/tree';
import { STYLE_GROUPS, STYLES, type EffectStyle } from '../project/styles';
import type { FrameProject, Layer } from '../project/types';
import { applyEffectsToSelected, useProject } from '../state/projectStore';
import { Toggle } from './controls';
import { Tile } from './Thumbnail';

/** A short fingerprint of a design, so tiles are drawn again when it changes. */
function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

export function StyleDialog({ layer, onClose }: { layer: Layer; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const project = useProject();
  const [add, setAdd] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const print = useMemo(() => fingerprint(JSON.stringify({ l: project.layers, s: project.stage, id: layer.id, add })), [project, layer.id, add]);
  const makers = useMemo(
    () =>
      new Map(
        STYLES.map((style) => [
          style.id,
          (): FrameProject => ({
            ...project,
            // A thick band, so the style shows in a small picture.
            stage: { ...project.stage, showArt: false, thickness: Math.max(project.stage.thickness, 0.3), outerSpacing: Math.min(project.stage.outerSpacing, 0.06) },
            layers: mapLayer(project.layers, layer.id, (l) => ({ ...l, effects: [...(add ? l.effects : []), ...style.effects()] }) as Layer),
          }),
        ]),
      ),
    [project, layer.id, add],
  );

  const pick = (style: Pick<EffectStyle, 'effects'>) => {
    applyEffectsToSelected(style.effects(), add ? 'add' : 'replace');
    onClose();
  };
  const own = useUserStyles();
  useEffect(() => {
    void loadUserStyles();
  }, []);
  const styled = (effects: () => Layer['effects']) => (): FrameProject => ({
    ...project,
    stage: { ...project.stage, showArt: false, thickness: Math.max(project.stage.thickness, 0.3), outerSpacing: Math.min(project.stage.outerSpacing, 0.06) },
    layers: mapLayer(project.layers, layer.id, (l) => ({ ...l, effects: [...(add ? l.effects : []), ...effects()] }) as Layer),
  });

  return (
    <dialog ref={ref} className="dialog templates" aria-label="Styles" onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>Styles</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">
        <p className="note">
          Each picture is your design with “{layer.name}” in that style. A style is a set of effects: after picking one, every effect can be changed, switched off
          or removed in Properties → Effects. Metal and stone styles work on any colour.
        </p>
        <Toggle
          label="Add to its effects instead of replacing them"
          hint="On: the style's effects go after the layer's own. Off: they take their place."
          checked={add}
          onChange={setAdd}
        />
        {own.length > 0 && (
          <section aria-label="Your styles">
            <h4>Your styles</h4>
            <div className="tiles">
              {own.map((st) => (
                <div className="own-style" key={st.id}>
                  <Tile id={`own-style:${st.id}|${print}`} name={st.name} description="One of your own styles." make={styled(() => structuredClone(st.effects))} onPick={() => pick({ effects: () => structuredClone(st.effects) })} />
                  <button type="button" className="icon-btn" aria-label={`Remove ${st.name}`} title="Remove this style from your library" onClick={() => void removeUserStyle(st.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {STYLE_GROUPS.map((group) => (
          <section key={group} aria-label={group}>
            <h4>{group}</h4>
            <div className="tiles">
              {STYLES.filter((s) => s.group === group).map((s) => (
                <Tile key={s.id} id={`style:${s.id}|${print}`} name={s.name} description={s.description} make={makers.get(s.id)!} onPick={() => pick(s)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </dialog>
  );
}
