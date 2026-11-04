// The texture library (Add layer → Texture…): every texture as a tile drawn
// by the real renderer, on a band of a colour that suits it. Picking one adds
// it as a layer, with that band under it if asked.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createProject, photoBand, textureBand, textureFromPreset, TEXTURES, type TexturePreset } from '../project/defaults';
import { PICTURES, type PictureId } from '../project/pictures';
import type { FrameProject } from '../project/types';
import { addLayers, useProject } from '../state/projectStore';
import { Toggle } from './controls';
import { Tile } from './Thumbnail';

const makers = new Map(
  TEXTURES.map((t) => [
    t.id,
    (): FrameProject => {
      const p = createProject([textureBand(t), textureFromPreset(t)], t.name);
      // A thick band, so the texture shows in a small picture.
      p.stage = { ...p.stage, showArt: false, thickness: 0.34, outerSpacing: 0.04 };
      return p;
    },
  ]),
);

const photo = (id: PictureId) => (): FrameProject => {
  const p = createProject([photoBand(id)], id);
  p.stage = { ...p.stage, showArt: false, thickness: 0.34, outerSpacing: 0.04 };
  return p;
};
const photoMakers = new Map(PICTURES.map((p) => [p.id, photo(p.id)]));

export function TextureDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const empty = useProject().layers.length === 0;
  const [withBand, setWithBand] = useState(empty);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const pick = (preset: TexturePreset) => {
    addLayers(withBand ? [textureBand(preset), textureFromPreset(preset)] : [textureFromPreset(preset)]);
    onClose();
  };

  return (
    <dialog ref={ref} className="dialog templates" aria-label="Add a texture" onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>Add a texture</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">
        <p className="note">
          The surfaces Token Maker's frames are made of. A texture is drawn over the layers below it, so put it above a band fill. Every one can be changed
          afterwards: its colour, how many marks, their size and strength, and which side of the light they keep to.
        </p>
        <Toggle label="Also add a matching band colour under it" checked={withBand} onChange={setWithBand} />
        <section aria-label="Drawn textures">
          <div className="tiles">
            {TEXTURES.map((t) => (
              <Tile key={t.id} id={`texture:${t.id}`} name={t.name} description={t.description} make={makers.get(t.id)!} onPick={() => pick(t)} />
            ))}
          </div>
        </section>
        <section aria-label="Photo textures">
          <h3>Photo textures</h3>
          <p className="note">
            Seamless photographs from Poly Haven and ambientCG (free to use), added as a band fill that bends round the band. Pick another photo, tint it,
            turn it or change its size in the band fill's settings; any shape or ornament can be filled with one too.
          </p>
          <div className="tiles">
            {PICTURES.map((p) => (
              <Tile
                key={p.id}
                id={`photo:${p.id}`}
                name={p.name}
                description={`A photo texture from ${p.site}`}
                make={photoMakers.get(p.id)!}
                onPick={() => {
                  addLayers([photoBand(p.id)]);
                  onClose();
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </dialog>
  );
}
