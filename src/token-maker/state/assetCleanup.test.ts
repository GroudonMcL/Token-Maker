import 'fake-indexeddb/auto';
import { createStore, get, keys, set } from 'idb-keyval';
import { addBatchItem, batchStore, removeItem, setBatchMode } from '../batch/batch';
import { aiStore, tidySavedAiMasks } from '../image/aiRemoval';
import { releaseUnusedPictures } from './assetCleanup';
import { addAsset, clearAssets, getAssets } from './assets';
import { docHistory, resetDoc, undo, updateDoc } from './tokenStore';

// Imported pictures are let go once the token, the batch and the undo
// history no longer use them, and their AI masks with them.

const picture = (id: string) => addAsset({ id, blob: new Blob([id]), image: document.createElement('canvas'), width: 10, height: 10 });
const show = (id: string) => updateDoc((d) => ({ ...d, art: { ...d.art, assetId: id } }));
const held = () => [...getAssets().keys()].sort();

beforeEach(() => {
  setBatchMode(false);
  clearAssets();
  resetDoc();
  releaseUnusedPictures();
  aiStore.setState({ masks: new Map(), status: new Map() });
});

describe('releasing imported pictures', () => {
  it('keeps a replaced picture while Undo can bring it back, and drops it once it cannot', () => {
    picture('asset:a');
    show('asset:a');
    picture('asset:b');
    show('asset:b');
    expect(releaseUnusedPictures()).toBe(0);
    expect(held()).toEqual(['asset:a', 'asset:b']);
    undo();
    expect(releaseUnusedPictures()).toBe(0); // Redo still needs b
    // A new change ends Redo: nothing can show b again.
    updateDoc((d) => ({ ...d, name: 'Goblin' }));
    expect(releaseUnusedPictures()).toBe(1);
    expect(held()).toEqual(['asset:a']);
  });

  it('drops every picture of a token that was started again, but not one only just added', () => {
    picture('asset:a');
    show('asset:a');
    releaseUnusedPictures();
    resetDoc();
    // Imported but not in the token yet (it goes in a moment later).
    picture('asset:new');
    expect(releaseUnusedPictures()).toBe(1);
    expect(held()).toEqual(['asset:new']);
  });

  it('keeps the pictures of a batch, and drops one taken out of it', () => {
    setBatchMode(true);
    for (const id of ['asset:a', 'asset:b']) {
      picture(id);
      addBatchItem({ assetId: id, width: 10, height: 10, name: id }, () => show(id));
    }
    expect(releaseUnusedPictures()).toBe(0);
    removeItem(batchStore.getState().items[1]!.id);
    expect(releaseUnusedPictures()).toBe(1);
    expect(held()).toEqual(['asset:a']);
  });

  it("leaves other kinds of pictures alone (frames, effects), and drops a picture's AI mask with it", () => {
    picture('frame:upload:x');
    picture('asset:a');
    show('asset:a');
    aiStore.setState({ masks: new Map([['asset:a', { id: 1, data: new Uint8Array(4), width: 2, height: 2 }]]) });
    releaseUnusedPictures();
    docHistory.getState().reset(docHistory.getState().past[0]!);
    expect(releaseUnusedPictures()).toBe(1);
    expect(held()).toEqual(['frame:upload:x']);
    expect(aiStore.getState().masks.size).toBe(0);
  });
});

describe('saved AI masks', () => {
  const db = createStore('token-maker-ai-masks', 'masks');
  const mask = { data: new Uint8Array([255, 0, 0, 255]), width: 2, height: 2 };

  it('are deleted with their pictures, kept for pictures that are kept, and saved again for a picture back in use', async () => {
    await set('asset:used', mask, db);
    await set('asset:gone', mask, db);
    await set('asset:kept', mask, db);
    aiStore.setState({ masks: new Map([['asset:back', { ...mask, id: 7 }]]) });
    await tidySavedAiMasks(['asset:used', 'asset:back'], new Set(['asset:kept']));
    expect((await keys(db)).sort()).toEqual(['asset:back', 'asset:kept', 'asset:used']);
    const back = await get<typeof mask>('asset:back', db);
    expect([back?.width, back?.height, Array.from(back?.data ?? [])]).toEqual([2, 2, [255, 0, 0, 255]]);
  });
});
