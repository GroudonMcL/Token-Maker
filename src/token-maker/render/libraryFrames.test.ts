import { TILES } from '../sections/frameTiles';
import { ESSENTIALS_DATA } from '../frameMaker/project/essentialsData';
import { onSheet } from '../sections/frameThumbSheet';
import { LIBRARY_FRAMES, libraryFrameThumbUrl, libraryFrameUrl } from './libraryFrames';

const files = import.meta.glob(['../../../public/frames/**/*', '../../../public/frame-thumbs/*'], { eager: true, query: '?url', import: 'default' });
const have = new Set(Object.keys(files).map((f) => f.replace('../../../public', '')));

describe('built-in picture frames (the Essentials as pictures)', () => {
  // The owner's Essentials designs, wherever they are filed in the frame picker (some moved to other categories).
  it('every Essentials design has a picture and a thumbnail', () => {
    const essentials = ESSENTIALS_DATA.map((d) => `builtin:${d.id}`);
    expect(LIBRARY_FRAMES.map((f) => f.from).sort()).toEqual(essentials.sort());
    for (const f of LIBRARY_FRAMES) {
      expect(have.has(libraryFrameUrl(f.id)), f.id).toBe(true);
      expect(have.has(libraryFrameThumbUrl(f.id)), f.id).toBe(true);
    }
  });
});

describe('the frame picker’s ready-made thumbnails', () => {
  it('has a sheet for every shape and every frame on it (run npm run tm:frame-thumbs after adding frames)', () => {
    for (const shape of ['circle', 'rounded', 'square', 'hexagon', 'flatHex']) expect(have.has(`/frame-thumbs/${shape}.webp`), shape).toBe(true);
    expect(TILES.filter((t) => !onSheet(t.id)).map((t) => t.id)).toEqual([]);
  });
});
