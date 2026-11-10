// @vitest-environment node
// The starting frame comes with the first page as its own small file
// (config/defaultDesign.json); the catalogue it was taken from loads later.
// This fails when the two differ: run `npm run tm:default-design`.
import defaultDesign from '../config/defaultDesign.json';
import { builtInBand, builtInDesignById, builtInDesignFrame } from './builtInDesigns';
import { DEFAULT_DESIGN, DEFAULT_DESIGN_ID, defaultDesignFrame, newTokenDocument } from './defaultDesign';

describe('the starting frame', () => {
  it("is the catalogue's Simple design", () => {
    expect(DEFAULT_DESIGN).toEqual(JSON.parse(JSON.stringify(builtInDesignById(DEFAULT_DESIGN_ID))));
    expect(defaultDesign.band).toEqual(builtInBand(DEFAULT_DESIGN_ID));
    expect(defaultDesignFrame()).toEqual(JSON.parse(JSON.stringify(builtInDesignFrame(DEFAULT_DESIGN_ID))));
  });

  it('takes colours the way the catalogue does', () => {
    const colours = { band: '#3F6FD8', other: '#000000' };
    expect(defaultDesignFrame(colours)).toEqual(JSON.parse(JSON.stringify(builtInDesignFrame(DEFAULT_DESIGN_ID, colours))));
    expect(defaultDesignFrame(colours).colours).toEqual({ band: '#3f6fd8' });
  });

  it('is the frame of a new token, each with its own copy', () => {
    const a = newTokenDocument();
    const b = newTokenDocument();
    expect(a.frame.kind).toBe('design');
    expect(a.frame.design?.id).toBe(DEFAULT_DESIGN_ID);
    expect(a.frame.thickness).toBe(defaultDesign.band.thickness);
    expect(a.frame.design?.project).not.toBe(b.frame.design?.project);
  });
});
