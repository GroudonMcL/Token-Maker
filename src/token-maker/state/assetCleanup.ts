// Lets go of imported pictures nothing can bring back. A picture stays in
// memory (about 16 MB each: its pixels and its file) while the token, a
// picture of the batch, or any step of the undo history uses it, so Undo and
// Redo always find theirs. Once it is out of all of those (New, the undo
// history moved on, a picture taken out of the batch), it is dropped, along
// with its AI cut-out mask; what was worked out for it (image/processedArt.ts)
// goes with it. Before this, every picture imported in a visit stayed until
// the tab closed.

import { batchStore } from '../batch/batch';
import { releaseAiMasks } from '../image/aiRemoval';
import { assetStore, removeAssets } from './assets';
import { usedAssetIds } from './autosave';
import { docHistory } from './tokenStore';

/** Pictures seen in use at least once: one that was only just added, and isn't in the token yet, is never dropped. */
const seen = new Set<string>();

/** Drops the imported pictures no longer used anywhere. Returns how many. */
export function releaseUnusedPictures(): number {
  const h = docHistory.getState();
  const used = new Set(usedAssetIds(h.present, batchStore.getState().items));
  for (const doc of [...h.past, ...h.future, ...(h.pendingBase ? [h.pendingBase] : [])]) {
    for (const id of usedAssetIds(doc)) used.add(id);
  }
  for (const id of used) seen.add(id);
  const gone = [...assetStore.getState().assets.keys()].filter((id) => seen.has(id) && !used.has(id));
  if (!gone.length) return 0;
  removeAssets(gone);
  releaseAiMasks(gone);
  for (const id of gone) seen.delete(id);
  return gone.length;
}

/** Checks shortly after the token, its history or the batch changes. Returns a function that stops it. */
export function watchUnusedPictures(delayMs = 2000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(releaseUnusedPictures, delayMs);
  };
  releaseUnusedPictures();
  const stopDoc = docHistory.subscribe(later);
  const stopBatch = batchStore.subscribe(later);
  return () => {
    clearTimeout(timer);
    stopDoc();
    stopBatch();
  };
}
