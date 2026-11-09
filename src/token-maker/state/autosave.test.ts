import 'fake-indexeddb/auto';
import { createStore, get, keys, set } from 'idb-keyval';
import { toastStore } from '../ui/toast';
import { createDocument } from '../document/defaults';
import { addAsset, clearAssets } from './assets';
import { clearAutosave, restore, SAVE_FAILED_MESSAGE, saveNow, startAutosave } from './autosave';

// Storing goes through the real idb-keyval, but a test can make it fail.
vi.mock('idb-keyval', async (importOriginal) => {
  const actual = await importOriginal<typeof import('idb-keyval')>();
  return { ...actual, set: vi.fn(actual.set) };
});
const settle = () => new Promise((r) => setTimeout(r, 30));
import { getDoc, resetDoc, updateDoc } from './tokenStore';
import { addBatchItem, batchStore, selectItem, setBatchMode } from '../batch/batch';

// Decoding needs a real browser; pretend every blob is a 10×10 image. The
// next `failures.decode` decodes fail instead (the art is always restored first).
const failures = vi.hoisted(() => ({ decode: 0 }));
vi.mock('../import/decode', () => ({
  decodeImage: async () => {
    if (failures.decode > 0) {
      failures.decode--;
      throw new Error('Not an image');
    }
    return { image: document.createElement('canvas'), width: 10, height: 10 };
  },
}));

// A token named "Unreadable" can't be migrated, like one saved by a version with a bug.
vi.mock('../document/migrate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../document/migrate')>();
  return {
    ...actual,
    migrateDocument: (raw: unknown) => {
      if ((raw as { name?: string })?.name === 'Unreadable') throw new Error('Unknown field');
      return actual.migrateDocument(raw);
    },
  };
});

const db = createStore('token-maker', 'autosave');
const savedKeys = async () => (await keys(db)).map(String).sort();
const picture = (id: string) =>
  addAsset({ id, blob: new Blob([id], { type: 'image/png' }), image: document.createElement('canvas'), width: 10, height: 10 });
const RESTORED = { status: 'restored', missingPictures: 0 };

beforeEach(async () => {
  await clearAutosave();
  clearAssets();
  resetDoc();
});

describe('autosave (DESIGN.md §4.4)', () => {
  it('restores the document and its image after a reload', async () => {
    const doc = createDocument('Lich');
    doc.art.assetId = 'asset:1';
    addAsset({ id: 'asset:1', blob: new Blob(['x'], { type: 'image/png' }), image: document.createElement('canvas'), width: 10, height: 10 });
    await saveNow(doc);
    clearAssets();
    resetDoc();
    expect(await restore()).toEqual(RESTORED);
    expect(getDoc().name).toBe('Lich');
    expect(getDoc().art.assetId).toBe('asset:1');
  });

  it('drops the image reference if the image is missing', async () => {
    const doc = createDocument('Ghost');
    doc.art.assetId = 'asset:gone';
    await saveNow(doc);
    expect(await restore()).toEqual(RESTORED);
    expect(getDoc().art.assetId).toBeNull();
  });

  it('restores a batch: every picture, the one on screen, and their own positions', async () => {
    const pic = (id: string) =>
      addAsset({ id, blob: new Blob([id], { type: 'image/png' }), image: document.createElement('canvas'), width: 10, height: 10 });
    pic('asset:a');
    pic('asset:b');
    setBatchMode(true);
    updateDoc((d) => ({ ...d, name: 'Goblin A', art: { ...d.art, assetId: 'asset:a' } }));
    addBatchItem({ assetId: 'asset:a', width: 10, height: 10, name: 'Goblin A' }, () => {});
    addBatchItem({ assetId: 'asset:b', width: 10, height: 10, name: 'Goblin B' }, () => {});
    updateDoc((d) => ({ ...d, art: { ...d.art, transform: { ...d.art.transform, offsetX: 0.3 } } }));
    await saveNow(getDoc());
    clearAssets();
    resetDoc();
    setBatchMode(false);
    expect(await restore()).toEqual(RESTORED);
    const b = batchStore.getState();
    expect(b.on).toBe(true);
    expect(b.items.map((it) => it.name)).toEqual(['Goblin A', 'Goblin B']);
    expect(getDoc().art.transform.offsetX).toBe(0.3);
    selectItem(b.items[1]!.id);
    expect(getDoc().art.assetId).toBe('asset:b');
    setBatchMode(false);
  });

  it('has nothing to restore after "New"', async () => {
    await saveNow(createDocument('Temp'));
    await clearAutosave();
    expect(await restore()).toEqual({ status: 'none' });
  });

  it("leaves out a picture that can't be reopened, and keeps it saved", async () => {
    picture('asset:ok');
    picture('asset:broken');
    const doc = createDocument('Ogre');
    doc.art.assetId = 'asset:broken';
    doc.background.image = { type: 'asset', assetId: 'asset:ok' };
    await saveNow(doc);
    clearAssets();
    resetDoc();

    failures.decode = 1;
    expect(await restore()).toEqual({ status: 'restored', missingPictures: 1 });
    expect(getDoc().name).toBe('Ogre');
    expect(getDoc().art.assetId).toBeNull();
    expect(getDoc().background.image).toEqual({ type: 'asset', assetId: 'asset:ok' });
    // Autosave goes on, but doesn't delete the picture it couldn't open.
    await saveNow(getDoc());
    expect(await savedKeys()).toContain('asset:broken');
  });

  it("keeps a token that can't be reopened, with its pictures, instead of overwriting it", async () => {
    picture('asset:old');
    const old = createDocument('Unreadable');
    old.art.assetId = 'asset:old';
    await saveNow(old);
    clearAssets();
    resetDoc();

    expect(await restore()).toEqual({ status: 'unreadable', kept: true });
    // The user carries on with a new token; autosave saves it without losing the old one.
    picture('asset:new');
    updateDoc((d) => ({ ...d, name: 'Fresh', art: { ...d.art, assetId: 'asset:new' } }));
    await saveNow(getDoc());
    const kept = await get<{ doc: { name: string; art: { assetId: string } } }>('unreadable-doc', db);
    expect(kept?.doc.name).toBe('Unreadable');
    expect(kept?.doc.art.assetId).toBe('asset:old');
    expect(await savedKeys()).toEqual(['asset:new', 'asset:old', 'batch', 'current-doc', 'unreadable-doc']);

    // Next visit: the new token comes back, and the old one's pictures are still kept.
    clearAssets();
    resetDoc();
    expect(await restore()).toEqual(RESTORED);
    expect(getDoc().name).toBe('Fresh');
    await saveNow(getDoc());
    expect(await savedKeys()).toContain('asset:old');

    // "New" clears everything, the kept token included.
    await clearAutosave();
    expect(await savedKeys()).toEqual([]);
  });

  it('saves at once when the page is closed, without waiting', async () => {
    const stop = startAutosave(60_000);
    updateDoc((d) => ({ ...d, name: 'Closing time' }));
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    stop();
    expect((await get<{ name: string }>('current-doc', db))?.name).toBe('Closing time');
  });

  it("says once, not on every change, when the browser won't store the token", async () => {
    const actualSet = (await vi.importActual<typeof import('idb-keyval')>('idb-keyval')).set;
    vi.mocked(set).mockImplementation(() => Promise.reject(new Error('QuotaExceededError')));
    toastStore.setState({ toasts: [] });
    const stop = startAutosave(60_000);
    for (const name of ['One', 'Two', 'Three']) {
      updateDoc((d) => ({ ...d, name }));
      window.dispatchEvent(new Event('pagehide'));
      await settle();
    }
    stop();
    vi.mocked(set).mockImplementation(actualSet);
    expect(toastStore.getState().toasts.map((t) => t.text)).toEqual([SAVE_FAILED_MESSAGE]);
  });
});
