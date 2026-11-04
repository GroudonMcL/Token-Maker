import { describe, expect, it } from 'vitest';
import { BUILT_IN_FRAMES } from './builtInFrames';
import { cleanChoices, recolourProject, shiftColour } from './colourSlots';
import { parseProject } from './migrate';

describe('colour slots', () => {
  it('leaves a colour as it is when the slot keeps its own colour', () => {
    expect(shiftColour('#5a8cff', '#5a8cff', '#5a8cff')).toBe('#5a8cff');
    expect(shiftColour('#0a1440', '#5a8cff', '#5a8cff')).toBe('#0a1440');
  });

  it('moves the slot colour onto the new one and keeps black and white', () => {
    expect(shiftColour('#ff525a', '#ff525a', '#3f6fd8')).toBe('#3f6fd8');
    expect(shiftColour('#000000', '#ff525a', '#3f6fd8')).toBe('#000000');
    expect(shiftColour('#ffffff', '#ff525a', '#3f6fd8')).toBe('#ffffff');
  });

  it('recolours only the layers a slot owns, and never shadows', () => {
    const simple = BUILT_IN_FRAMES.find((f) => f.id === 'simple')!;
    const before = simple.project();
    const after = recolourProject(before, simple.colours, { band: '#3f6fd8' });
    const json = (name: string, p = after) => JSON.stringify(p.layers.find((l) => l.name === name));
    expect(json('Band')).not.toBe(json('Band', before));
    expect(json('Band')).toContain('"color":"#000000"'); // its drop shadow
    expect(json('Crease')).toBe(json('Crease', before));
  });

  it('turns photo textures with their slot', () => {
    const lava = BUILT_IN_FRAMES.find((f) => f.id === 'glowing-lava')!;
    const p = recolourProject(lava.project(), lava.colours, { glow: '#3a8aff' });
    const photo = p.layers.find((l) => l.name === 'Band copy')!;
    expect(photo.effects[0]).toMatchObject({ kind: 'adjust' });
  });

  it('keeps only choices for slots the design has', () => {
    const slots = BUILT_IN_FRAMES.find((f) => f.id === 'wizard-starweave')!.colours;
    expect(cleanChoices({ band: '#ABCDEF', sigils: 'red', other: '#000000' }, slots)).toEqual({ band: '#abcdef' });
  });

  it('gives designs every built-in frame can be read back', () => {
    for (const f of BUILT_IN_FRAMES) {
      const choices = Object.fromEntries(f.colours.map((s) => [s.id, '#40a060']));
      expect(parseProject(JSON.parse(JSON.stringify(recolourProject(f.project(), f.colours, choices)))).ok, f.id).toBe(true);
    }
  });
});
