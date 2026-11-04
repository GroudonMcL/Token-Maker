// Picking a starting point: a blank project, Token Maker's frames (by
// category), Token Maker frames converted into editable layers, or the Token
// Maker frames as their original code draws them (one composite layer each).
// The same dialog adds a Token Maker frame to the open project, as editable
// layers (a group) or as the original.

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { canConvert, differenceNote, editableGroup, editableProject } from '../project/convert';
import { createProject, legacyFrameLayer, projectFromFrame } from '../project/defaults';
import { builtInFramesByCategory } from '../project/builtInFrames';
import { categoryOf, categoryRank } from '../project/frameCategories';
import { addLayer, loadProject } from '../state/projectStore';
import { THUMB, Tile } from './Thumbnail';

/** Token Maker's frames, each filed under its own category. */
const byCategory = builtInFramesByCategory();

const frameMakers = new Map(FRAME_PRESETS.map((p) => [p.id, () => projectFromFrame(p.id)]));
const editableMakers = new Map(FRAME_PRESETS.filter((p) => canConvert(p.style)).map((p) => [p.id, () => editableProject(p.id)!]));

/** The categories the drawn frames fall into, in order. */
const presetCategories = [...new Set(FRAME_PRESETS.map((p) => categoryOf(p.id)))].sort((a, b) => categoryRank(a) - categoryRank(b));

const editableNote = (style: (typeof FRAME_PRESETS)[number]['style']) => `Editable layers drawn to look like the Token Maker frame. ${differenceNote(style)}`.trim();

export function TemplateDialog({ mode, onClose }: { mode: 'new' | 'addFrame'; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const pickFrame = (presetId: string) => {
    if (mode === 'new') loadProject(projectFromFrame(presetId));
    else addLayer(legacyFrameLayer(presetId));
    onClose();
  };
  const pickEditable = (presetId: string) => {
    if (mode === 'new') loadProject(editableProject(presetId)!);
    else addLayer(editableGroup(presetId)!);
    onClose();
  };

  return (
    <dialog ref={ref} className="dialog templates" aria-label={mode === 'new' ? 'New project' : 'Add a Token Maker frame'} onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>{mode === 'new' ? 'Start a new frame' : 'Add a Token Maker frame'}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">
        {mode === 'new' && (
          <>
            <div className="tiles">
              <button
                type="button"
                className="tile"
                onClick={() => {
                  loadProject(createProject());
                  onClose();
                }}
              >
                <span className="tile-placeholder blank" style={{ width: THUMB, height: THUMB }}>
                  Blank
                </span>
                <span>Blank project</span>
              </button>
            </div>
            <h3>Token Maker's frames</h3>
            <p className="note">Every frame Token Maker lists, by category. Open one to change it, save it, and open the file in Token Maker.</p>
            {byCategory.map(({ category, frames }) => (
              <section key={category} aria-label={`Token Maker's frames: ${category}`}>
                <h4>{category}</h4>
                <div className="tiles">
                  {frames.map((t) => (
                    <Tile
                      key={t.id}
                      id={`builtin:${t.id}`}
                      name={t.name}
                      description={t.description}
                      make={t.project}
                      onPick={() => {
                        loadProject(t.project());
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
        <section aria-label="Token Maker frames as editable layers">
          <h3>Token Maker frames, as editable layers</h3>
          <p className="note">
            These frames are rebuilt from layers you can change one by one, and they follow the light. They look like the originals; hover over a frame to see
            any small difference.{mode === 'addFrame' ? ' They are added as a group.' : ''}
          </p>
          <div className="tiles">
            {FRAME_PRESETS.filter((p) => canConvert(p.style)).map((p) => (
              <Tile key={p.id} id={`editable:${p.id}`} name={p.name} badge="Editable" description={editableNote(p.style)} make={editableMakers.get(p.id)!} onPick={() => pickEditable(p.id)} />
            ))}
          </div>
        </section>
        <h3>Token Maker frames, as the originals</h3>
        <p className="note">
          All {FRAME_PRESETS.length} frames, drawn by Token Maker's own code. Each is one layer: you can change its colour and add layers over or under it. Frames marked
          Editable above can also be turned into layers later, from their Properties.
        </p>
        {presetCategories.map((category) => (
          <section key={category} aria-label={category}>
            <h4>{category}</h4>
            <div className="tiles">
              {FRAME_PRESETS.filter((p) => categoryOf(p.id) === category).map((p) => (
                <Tile key={p.id} id={`frame:${p.id}`} name={p.name} make={frameMakers.get(p.id)!} onPick={() => pickFrame(p.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </dialog>
  );
}
