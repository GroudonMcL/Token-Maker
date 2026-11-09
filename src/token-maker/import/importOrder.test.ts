import { createDocument } from '../document/defaults';
import { getDoc, resetDoc } from '../state/tokenStore';
import { holdImportsUntil, importTo } from './importImage';
import { importFromAddress } from './webImport';

/** A promise to settle by hand. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

// Decoding waits for the test when a file's name is in `slow` (or fails, when the test says so).
const slow = vi.hoisted(() => new Map<string, Promise<void>>());
vi.mock('./decode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./decode')>()),
  decodeImage: async (file: File) => {
    await slow.get(file.name);
    return { image: document.createElement('canvas'), width: 10, height: 10 };
  },
}));

const png = (name: string) => new File(['png'], name, { type: 'image/png' });
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  slow.clear();
  resetDoc();
  vi.unstubAllGlobals();
});

describe('imports finish in the order they were asked for', () => {
  it('a slow picture dropped first does not replace one dropped after it', async () => {
    const first = deferred();
    slow.set('first-goblin.png', first.promise);
    const a = importTo('art', png('first-goblin.png'));
    await importTo('art', png('second-orc.png'));
    expect(getDoc().name).toBe('Second Orc');
    first.resolve();
    await a;
    expect(getDoc().name).toBe('Second Orc');
  });

  it('when the newer picture fails, the older one still goes in', async () => {
    const first = deferred();
    const second = deferred();
    slow.set('first-goblin.png', first.promise);
    slow.set('broken.png', second.promise);
    const a = importTo('art', png('first-goblin.png'));
    const b = importTo('art', png('broken.png'));
    second.reject(new Error('Not an image'));
    await expect(b).rejects.toThrow();
    first.resolve();
    await a;
    expect(getDoc().name).toBe('First Goblin');
  });

  it('a picture dropped while the saved token is being restored goes in on top of it, not under it', async () => {
    const restoring = deferred();
    holdImportsUntil(restoring.promise);
    const dropped = importTo('art', png('image.png'));
    await tick();
    // The restore finishes after the drop was decoded…
    const saved = createDocument('Saved lich');
    saved.art.assetId = 'asset:saved-art';
    resetDoc(saved);
    restoring.resolve();
    await dropped;
    holdImportsUntil(Promise.resolve());
    // …and the dropped picture is the art of the restored token.
    expect(getDoc().name).toBe('Saved lich');
    expect(getDoc().art.assetId).not.toBe('asset:saved-art');
  });

  it('a slow web import does not land after a newer one, nor in the place the newer one chose', async () => {
    const slowPicture = deferred<Response>();
    vi.stubGlobal('fetch', async (input: string) => {
      const url = String(input);
      if (url.includes('first-dragon')) return slowPicture.promise;
      if (url.includes('second-wyvern')) return new Response(new Blob(['png'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png' } });
      throw new TypeError('Failed to fetch');
    });
    // Started for the background, then another address pasted for the art.
    importFromAddress('https://img.example/first-dragon.png', 'box', 'background');
    importFromAddress('https://img.example/second-wyvern.png', 'box', 'art');
    await vi.waitFor(() => expect(getDoc().name).toBe('Second Wyvern'));
    const art = getDoc().art.assetId;
    slowPicture.resolve(new Response(new Blob(['png'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png' } }));
    await tick();
    await tick();
    expect(getDoc().art.assetId).toBe(art);
    expect(getDoc().background.image).toBeNull();
  });
});
