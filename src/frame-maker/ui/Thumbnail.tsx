// A tile with a picture of a project drawn by the real renderer (template
// and texture libraries). Pictures are made one at a time, only for tiles
// that have scrolled into view, with the page free to respond between them,
// and kept for the session.

import { useEffect, useRef, useState } from 'react';
import type { FrameProject } from '../project/types';
import { loadPictures } from '../render/pictures';
import { renderProject } from '../render/renderProject';
import { history } from '../state/projectStore';
import { stageArt } from './stageArt';

export const THUMB = 112;
const thumbs = new Map<string, string>();

/** Pictures waiting to be drawn, first come first served. */
const queue: { key: string; run: () => void; cancelled: boolean }[] = [];
let busy = false;

function pump(): void {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  // One picture per task, so clicks and keys are handled between them.
  setTimeout(() => {
    if (!job.cancelled) job.run();
    busy = false;
    pump();
  }, 0);
}

/** A picture of a project, drawn by the real renderer once its tile is in view, cached by key. */
function useThumbnail(key: string, make: () => FrameProject, visible: boolean): string | null {
  const [url, setUrl] = useState(() => thumbs.get(key) ?? null);
  useEffect(() => {
    if (url || !visible) return;
    const job = {
      key,
      cancelled: false,
      run: () => {
        const cached = thumbs.get(key);
        if (cached) return setUrl(cached);
        const project = make();
        project.stage.shape = history.getState().present.stage.shape;
        const draw = () => {
          const c = document.createElement('canvas');
          c.width = c.height = THUMB * 2;
          const ctx = c.getContext('2d');
          if (!ctx || job.cancelled) return;
          renderProject(ctx, project, THUMB * 2, { art: project.stage.showArt ? stageArt() : null });
          const data = c.toDataURL('image/png');
          thumbs.set(key, data);
          setUrl(data);
        };
        // Its photo textures first, so the picture isn't drawn with their stand-in colours.
        void loadPictures(project).then(draw);
      },
    };
    queue.push(job);
    pump();
    return () => {
      job.cancelled = true;
    };
  }, [key, make, url, visible]);
  return url;
}

/** Whether an element has come into view (once true, stays true); true at once where that can't be told. */
function useSeen(): [React.RefObject<HTMLButtonElement | null>, boolean] {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

export function Tile({ id, name, description, badge, make, onPick }: { id: string; name: string; description?: string; badge?: string; make: () => FrameProject; onPick: () => void }) {
  const [ref, seen] = useSeen();
  const url = useThumbnail(`${id}|${history.getState().present.stage.shape}`, make, seen);
  return (
    <button ref={ref} type="button" className="tile" onClick={onPick} title={description}>
      {url ? <img src={url} alt="" width={THUMB} height={THUMB} /> : <span className="tile-placeholder" style={{ width: THUMB, height: THUMB }} />}
      <span>{name}</span>
      {/* Named "Paladin Editable": the visible words, in reading order. */}
      {badge && ' '}
      {badge && <span className="tile-badge">{badge}</span>}
    </button>
  );
}

