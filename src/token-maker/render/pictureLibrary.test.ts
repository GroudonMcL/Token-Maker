import { newPictureEffect } from '../document/defaults';
import { DECORATION_PICTURES, decorationLook, EFFECT_PICTURES, effectPicture, offeredAsDecoration, offeredAsEffect } from './pictureLibrary';

describe('decorationLook', () => {
  it('gives decoration pictures their own look', () => {
    const p = DECORATION_PICTURES[0]!;
    expect(decorationLook(p.id)).toMatchObject({ name: p.name, color: p.color, tint: p.tint });
  });

  it('lets every effect picture be a decoration, tinted with its starting colour', () => {
    for (const fx of EFFECT_PICTURES) {
      expect(decorationLook(fx.id)).toEqual({ name: fx.name, color: fx.defaults.color, swatches: fx.swatches, tint: true });
    }
  });

  it('knows nothing of other pictures', () => {
    expect(decorationLook('nope')).toBeUndefined();
  });
});

describe('effect pictures review: starting settings the owner asked for', () => {
  const start = (id: string) => newPictureEffect({ type: 'library', id });

  it('fire and frost start outside the token and on the frame; lightning stays inside the token', () => {
    expect(start('fx-fire-sparks').clip).toEqual(['outside', 'frame']);
    expect(start('fx-frost-edge').clip).toEqual(['outside', 'frame']);
    expect(start('fx-frost-thicket').clip).toEqual(['outside', 'frame']);
    expect(start('fx-lightning').clip).toEqual(['token']);
    expect(start('fx-lightning-glow').clip).toEqual(['token']);
  });

  it('snowflakes start smaller, and each effect gets its own copy of the Keep inside list', () => {
    expect(start('fx-snowflakes').size).toBe(0.1);
    expect(start('fx-snowflakes-fern').size).toBe(0.1);
    const a = start('fx-fire-sparks');
    a.clip.push('art');
    expect(start('fx-fire-sparks').clip).toEqual(['outside', 'frame']);
  });

  it('Radiant is a ring of beams round the frame; the old Radiant pictures are decorations only', () => {
    const ring = effectPicture('fx-light-ring')!;
    expect([ring.name, ring.orient, ring.defaults.placement, offeredAsEffect(ring)]).toEqual(['Radiant', 'outward', 'border', true]);
    for (const id of ['fx-light-rays', 'fx-light-corona', 'fx-light-sun-wheel', 'fx-light-burst', 'fx-light-from-above']) {
      expect(offeredAsEffect(effectPicture(id)!), id).toBe(false);
      expect(offeredAsDecoration(effectPicture(id)!), id).toBe(true);
    }
  });
});
