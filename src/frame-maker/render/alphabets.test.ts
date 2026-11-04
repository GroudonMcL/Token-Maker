// The fictional-alphabet fonts and text that fits round the band (version 11).
import { createCanvas } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerShippedFonts } from '../../../scripts/frame-maker/nodeFonts';
import { createProject, textLayer } from '../project/defaults';
import { inscriptionText } from '../project/houseStyle';
import { parseProject } from '../project/migrate';
import { TEXT_FONTS, type TextLayer } from '../project/types';
import { bandGeometry } from './band';
import { setCanvasFactory } from './canvas';
import { FONT_FAMILIES, fontsIn, textGlyphs, unicodeRunesOf } from './text';

beforeAll(() => {
  setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
  registerShippedFonts();
});

const geometry = () => bandGeometry(createProject().stage, 512);
const layer = (patch: Partial<TextLayer>): TextLayer => ({ ...textLayer(), text: inscriptionText(0, 3), size: 0.4, ...patch }) as TextLayer;

describe('fictional alphabets', () => {
  it('ships a file for every font that is not drawn from strokes or @fontsource', () => {
    for (const f of TEXT_FONTS) if (!['runes', 'grenze', 'atkinson'].includes(f)) expect(FONT_FAMILIES[f as keyof typeof FONT_FAMILIES].file, f).toBeTruthy();
  });

  it('writes BabelStone Runic in Unicode Elder Futhark, with th, ng and word dots', () => {
    expect(unicodeRunesOf('Thing frog').join('')).toBe('ᚦᛁᛜ᛫ᚠᚱᛟᚷ');
    expect(unicodeRunesOf('a · b').join('')).toBe('ᚨ᛫᛬᛫ᛒ');
  });

  it('keeps a text layer in any of the fonts when a file is read back', () => {
    for (const font of TEXT_FONTS) {
      const p = createProject([{ ...textLayer(), font }]);
      const read = parseProject(JSON.parse(JSON.stringify(p)));
      expect(read.ok && (read.project.layers[0] as TextLayer).font).toBe(font);
    }
  });

  it('finds the fonts a design uses, inside groups too', () => {
    const p = createProject([{ ...textLayer(), font: 'sith' }]);
    expect([...fontsIn({ layers: [{ type: 'group', children: p.layers }] })]).toEqual(['sith']);
  });
});

describe('text that fits round the band', () => {
  it('ends at a whole word and spreads out to go all the way round', () => {
    for (const font of ['grenze', 'sith', 'runes'] as const) {
      const { glyphs } = textGlyphs(layer({ font, fit: true }), geometry());
      const cut = textGlyphs(layer({ font, fit: false }), geometry()).glyphs;
      // Fitted text never runs past its start, and leaves no big gap at the join.
      const first = glyphs[0].p;
      const last = glyphs[glyphs.length - 1].p;
      const join = Math.hypot(first.x - last.x, first.y - last.y);
      const step = Math.hypot(glyphs[1].p.x - first.x, glyphs[1].p.y - first.y);
      expect(join, font).toBeLessThan(step * 6);
      expect(glyphs.length, font).toBeLessThanOrEqual(cut.length + 1);
    }
  });

  it('is off in older files, so they draw as they did', () => {
    const p = createProject([{ ...textLayer() }]);
    const raw = JSON.parse(JSON.stringify(p));
    delete raw.layers[0].fit;
    const read = parseProject(raw);
    expect(read.ok && (read.project.layers[0] as TextLayer).fit).toBe(false);
  });
});
