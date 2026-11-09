import { createDocument } from '../document/defaults';
import { missingPartsMessage, prepareForExport, type MissingParts } from './exportToken';

// The full-size art comes from a Web Worker in the browser; not needed here.
vi.mock('../image/artWorker', () => ({ prepareArt: async () => {} }));

describe('export with parts that could not be loaded', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('goes ahead without them, and lists what is missing', async () => {
    vi.stubGlobal('fetch', async () => new Response('gone', { status: 404 }));
    const doc = createDocument('Goblin');
    doc.frame = {
      ...doc.frame,
      kind: 'image',
      image: { source: { type: 'library', id: 'no-such-frame' }, name: 'Lost', hole: [], outer: 1, nudge: { x: 0, y: 0, scale: 1 } },
    };
    doc.background = { ...doc.background, image: { type: 'library', id: 'no-such-background' } } as typeof doc.background;
    const missing: MissingParts = new Set();
    await expect(prepareForExport(doc, new Map(), missing)).resolves.toBeInstanceOf(Map);
    expect([...missing].sort()).toEqual(['the background picture', 'the frame picture']);
  });

  it('says what the file was made without, in one sentence', () => {
    expect(missingPartsMessage(new Set())).toBeNull();
    expect(missingPartsMessage(new Set(['the frame picture']))).toBe("Made without the frame picture: it couldn't be loaded. Check your connection and export again.");
    expect(missingPartsMessage(new Set(['the frame picture', 'the background picture', "the label's font"]))).toMatch(
      /^Made without the frame picture, the background picture and the label's font: they couldn't be loaded\./,
    );
  });
});
