import 'fake-indexeddb/auto';
import { createStore, set } from 'idb-keyval';
import { createDocument } from '../document/defaults';
import { addAsset } from '../state/assets';
import { aiStore, ensureAiMask } from './aiRemoval';

/** A token whose art is `id`, with AI removal on. */
function aiDoc(id: string) {
  const doc = createDocument('AI');
  doc.art.assetId = id;
  doc.art.removal = { ...doc.art.removal, enabled: true, method: 'ai' };
  return doc;
}

describe('AI cut-out masks', () => {
  it('a mask saved in this browser comes back without running the AI, however many calls arrive at once', async () => {
    const id = 'asset:saved-mask';
    addAsset({ id, blob: new Blob(['x']), image: document.createElement('canvas'), width: 4, height: 4 });
    await set(id, { data: new Uint8Array(16), width: 4, height: 4 }, createStore('token-maker-ai-masks', 'masks'));
    const started: string[] = [];
    const stop = aiStore.subscribe((s) => {
      const st = s.status.get(id);
      if (st?.state === 'working') started.push(st.stage);
    });
    // Restoring a token adds several pictures in a row: each change asks again.
    await Promise.all([ensureAiMask(aiDoc(id)), ensureAiMask(aiDoc(id)), ensureAiMask(aiDoc(id))]);
    stop();
    expect(aiStore.getState().masks.get(id)?.width).toBe(4);
    expect(started).toEqual([]);
  });
});
