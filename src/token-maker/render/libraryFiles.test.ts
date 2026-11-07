import { BACKGROUND_LIBRARY, libraryImageUrl, libraryThumbUrl } from './backgroundLibrary';
import { DECORATION_PICTURES, EFFECT_PICTURES, pictureThumbUrl, pictureUrl } from './pictureLibrary';

const files = import.meta.glob(['../../../public/backgrounds/*', '../../../public/pictures/*', '../../../public/pictures/thumbs/*'], { eager: true, query: '?url', import: 'default' });
const have = new Set(Object.keys(files).map((f) => f.replace('../../../public', '')));

describe('built-in pictures', () => {
  it('every background has its picture and thumbnail', () => {
    for (const b of BACKGROUND_LIBRARY) {
      expect(have.has(libraryImageUrl(b.id)), b.id).toBe(true);
      expect(have.has(libraryThumbUrl(b.id)), b.id).toBe(true);
    }
  });

  it('every background is an open-licence picture that says where it came from', () => {
    for (const b of BACKGROUND_LIBRARY) expect(b.credit.source, b.id).toMatch(/^https:\/\//);
  });

  it('ids and names are unique', () => {
    expect(new Set(BACKGROUND_LIBRARY.map((b) => b.id)).size).toBe(BACKGROUND_LIBRARY.length);
    expect(new Set(BACKGROUND_LIBRARY.map((b) => b.name)).size).toBe(BACKGROUND_LIBRARY.length);
    const pics = [...DECORATION_PICTURES, ...EFFECT_PICTURES];
    expect(new Set(pics.map((p) => p.id)).size).toBe(pics.length);
  });

  it('every effect and decoration picture has its file', () => {
    for (const p of [...DECORATION_PICTURES, ...EFFECT_PICTURES]) {
      expect(have.has(pictureUrl(p.id)), p.id).toBe(true);
      expect(have.has(pictureThumbUrl(p.id)), `${p.id} thumbnail (npm run tm:picture-thumbs)`).toBe(true);
    }
  });

  it('ornaments keep their own colours only when they have some', () => {
    const ornaments = DECORATION_PICTURES.filter((p) => p.group === 'Ornaments');
    // Decoration review: 24 to begin with plus 20 new ones; 16 are retired from the picker but kept so saved tokens still draw.
    expect(ornaments.length).toBe(44);
    expect(ornaments.filter((p) => !p.retired).length).toBe(28);
    expect(ornaments.find((p) => p.id === 'deco-orn-royal-crown')?.tint).toBe(false);
    expect(ornaments.find((p) => p.id === 'deco-orn-heraldic-dragon')?.tint).toBe(true);
  });
});
