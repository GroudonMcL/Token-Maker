// @vitest-environment node
// Phase 10: variations (randomising within limits, with locks), theme
// colours, the lighting rig (extra lights, ambient, bloom, bleed), your own
// styles in library files, and the zip a token pack is written as.
import { createCanvas } from '@napi-rs/canvas';
import { registerShippedFonts } from '../../../scripts/frame-maker/nodeFonts';
import { crc32, unzip, zip } from '../io/zip';
import { setCanvasFactory, type Ctx } from '../render/canvas';
import { renderProject } from '../render/renderProject';
import { convertPreset } from './convert';
import { bandFillLayer, createProject, legacyFrameLayer, lineLayer, NEW_EFFECT, repeatLayer } from './defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { parseProject, serializeProject } from './migrate';
import { styleEffects } from './styles';
import { parseLibrary, serializeLibrary } from './transfer';
import { flatten } from './tree';
import type { Effect, FrameProject, Layer } from './types';
import { coloursIn, hexToHsl, hslToHex, randomise, randomiseEffects, recolour, type RandomiseOptions } from './variation';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();

const template = (id: string) => {
  const t = LAYERED_TEMPLATES.find((x) => x.id === id)!;
  return createProject(t.make(), t.name);
};
const ALL: RandomiseOptions = { patterns: true, colours: true, sizes: true, strength: 0.6 };
function draw(p: FrameProject, size = 160): Uint8ClampedArray {
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, { ...p, stage: { ...p.stage, showArt: false } }, size, { cache: false });
  return c.getContext('2d').getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
const hueGap = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

describe('colours', () => {
  it('hex and hue, saturation, lightness turn into each other', () => {
    for (const c of ['#c9a24a', '#3a7bd5', '#000000', '#ffffff', '#808080', '#ff0000']) expect(hslToHex(hexToHsl(c))).toBe(c);
  });

  it('finds every colour in a layer but never in names, ids or text', () => {
    const l = { ...repeatLayer(), name: '#abcdef', altColors: ['#112233'], effects: [NEW_EFFECT.glow()] };
    const found = coloursIn(l);
    expect(found).toContain('#112233');
    expect(found).toContain(l.fill);
    expect(found).not.toContain('#abcdef');
  });
});

describe('variations', () => {
  it('are the same for the same seed and different for another, keeping ids, names, order and the stage', () => {
    const p = template('dwarven-bronze');
    const a = randomise(p, ALL, 1);
    expect(randomise(p, ALL, 1)).toEqual(a);
    expect(randomise(p, ALL, 2)).not.toEqual(a);
    expect(flatten(a.layers).map((l) => [l.id, l.name, l.type])).toEqual(flatten(p.layers).map((l) => [l.id, l.name, l.type]));
    expect(a.stage).toEqual(p.stage);
    expect(same(draw(a), draw(p))).toBe(false);
  });

  it('with nothing to vary, nothing changes', () => {
    const p = template('battle-steel');
    expect(randomise(p, { patterns: false, colours: false, sizes: false, strength: 1 }, 5)).toEqual(parseProject(serializeProject(p)).ok ? (parseProject(serializeProject(p)) as { project: FrameProject }).project : p);
  });

  it('only what is asked for changes: patterns change seeds, colours change colours, sizes change sizes', () => {
    const p = template('battle-steel');
    const patterns = randomise(p, { ...ALL, colours: false, sizes: false }, 3);
    expect(coloursIn(patterns.layers)).toEqual(coloursIn(p.layers));
    const colours = randomise(p, { ...ALL, patterns: false, sizes: false }, 3);
    expect(coloursIn(colours.layers)).not.toEqual(coloursIn(p.layers));
    const tex = (q: FrameProject) => q.layers.filter((l) => l.type === 'texture').map((l) => (l.type === 'texture' ? [l.seed, l.amount] : []));
    expect(tex(colours)).toEqual(tex(p));
    const sizes = randomise(p, { ...ALL, patterns: false, colours: false }, 3);
    expect(tex(sizes).map((t) => t[0])).toEqual(tex(p).map((t) => t[0]));
    expect(tex(sizes).map((t) => t[1])).not.toEqual(tex(p).map((t) => t[1]));
  });

  it('colours are turned round the wheel together, within the strength', () => {
    const p = createProject([{ ...bandFillLayer(), paint: { kind: 'solid', color: '#c9a24a' } }, { ...lineLayer(), paint: { kind: 'solid', color: '#4a7ac9' } }]);
    const v = randomise(p, { patterns: false, colours: true, sizes: false, strength: 0.5 }, 11);
    const before = coloursIn(p.layers).map(hexToHsl);
    const after = coloursIn(v.layers).map(hexToHsl);
    for (let i = 0; i < before.length; i++) expect(hueGap(after[i].h, before[i].h)).toBeLessThanOrEqual(0.5 * 70 + 0.5 * 8 + 1);
  });

  it('locked layers, and everything in a locked group, stay exactly as they are', () => {
    const p = template('jewelled');
    p.layers = p.layers.map((l, i) => (i === 0 || l.type === 'group' ? { ...l, locked: true } : l));
    const v = randomise(p, { ...ALL, strength: 1 }, 9);
    expect(v.layers[0]).toEqual(p.layers[0]);
    expect(v.layers.find((l) => l.type === 'group')).toEqual(p.layers.find((l) => l.type === 'group'));
    expect(v.layers).not.toEqual(p.layers);
  });

  it('a style can be varied on its own', () => {
    const fx = styleEffects('hammered-bronze');
    const v = randomiseEffects(fx, ALL, 4);
    expect(v.map((e) => e.kind)).toEqual(fx.map((e) => e.kind));
    expect(v).not.toEqual(fx);
  });
});

describe('theme colours', () => {
  const meanHue = (cs: string[]) => {
    let x = 0;
    let y = 0;
    for (const c of cs.map(hexToHsl)) {
      const w = c.s * (1 - Math.abs(2 * c.l - 1));
      x += Math.cos((c.h * Math.PI) / 180) * w;
      y += Math.sin((c.h * Math.PI) / 180) * w;
    }
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  it('turns the design’s colours to the theme colour’s hue, keeping each one’s lightness and leaving greys', () => {
    const p = template('brass-beads');
    const blue = '#2a6ad0';
    const r = recolour(p, blue);
    expect(hueGap(meanHue(coloursIn(r.layers)), hexToHsl(blue).h)).toBeLessThan(6);
    const before = coloursIn(p.layers).map(hexToHsl);
    const after = coloursIn(r.layers).map(hexToHsl);
    after.forEach((c, i) => expect(Math.abs(c.l - before[i].l)).toBeLessThan(0.03));
    before.forEach((c, i) => c.s < 0.06 && expect(after[i]).toEqual(c));
  });

  it('recolours Token Maker frames and converted frames too', () => {
    const p = createProject([legacyFrameLayer('paladin'), ...convertPreset('minimal')!]);
    const r = recolour(p, '#c03030');
    expect(r.layers[0].type === 'legacyFrame' && r.layers[0].color).not.toBe(p.layers[0].type === 'legacyFrame' && p.layers[0].color);
    expect(same(draw(r), draw(p))).toBe(false);
  });

  it('with a second colour, the accents follow it', () => {
    const p = createProject([
      { ...bandFillLayer(), paint: { kind: 'solid', color: '#b08030' } },
      { ...lineLayer(), paint: { kind: 'solid', color: '#a07020' } },
      { ...repeatLayer(), fill: '#2050c0' },
    ]);
    const r = recolour(p, '#30a050', '#c02040');
    const [band, line, beads] = r.layers;
    const hue = (l: Layer) => hexToHsl(l.type === 'repeat' ? l.fill : (l as Extract<Layer, { type: 'bandFill' }>).paint.kind === 'solid' ? ((l as Extract<Layer, { type: 'bandFill' }>).paint as { color: string }).color : '#000000').h;
    expect(hueGap(hue(band), hexToHsl('#30a050').h)).toBeLessThan(15);
    expect(hueGap(hue(line), hexToHsl('#30a050').h)).toBeLessThan(15);
    expect(hueGap(hue(beads), hexToHsl('#c02040').h)).toBeLessThan(15);
  });

  it('leaves locked layers alone', () => {
    const p = template('night-sky');
    p.layers[0] = { ...p.layers[0], locked: true };
    expect(recolour(p, '#d04020').layers[0]).toEqual(p.layers[0]);
  });
});

describe('the lighting rig', () => {
  const bevelled = (): FrameProject => {
    const p = createProject([{ ...bandFillLayer(), paint: { kind: 'solid', color: '#c05a28' }, effects: [NEW_EFFECT.bevel() as Effect] }]);
    p.stage = { ...p.stage, thickness: 0.3 };
    return p;
  };

  it('is off by default, and an extra light, the ambient colour, bloom and bleed each change the picture', () => {
    const p = bevelled();
    const plain = draw(p);
    const changes = [
      { lights: [{ angle: 45, color: '#4080ff', strength: 1, height: 20 }] },
      { ambient: '#2040a0', ambientStrength: 1 },
      { bloom: 1 },
      { bleed: 1 },
    ];
    for (const stage of changes) expect(same(draw({ ...p, stage: { ...p.stage, ...stage } }), plain), JSON.stringify(stage)).toBe(false);
  });

  it('an extra light lights the edges facing it in its colour', () => {
    const p = bevelled();
    const size = 160;
    const lit = draw({ ...p, stage: { ...p.stage, lights: [{ angle: 0, color: '#0000ff', strength: 1.5, height: 15 }] } }, size);
    const plain = draw(p, size);
    // The outer edge on the right faces a light from the right: bluer than without it.
    const g = 1 - p.stage.outerSpacing;
    const x = Math.round(size / 2 + (size / 2) * (g - 0.01) - 1);
    const i = (Math.round(size / 2) * size + x) * 4;
    expect(lit[i + 2] - lit[i]).toBeGreaterThan(plain[i + 2] - plain[i]);
  });

  it('survives a round trip through a file', () => {
    const p = bevelled();
    p.stage = { ...p.stage, lights: [{ angle: 30, color: '#ff8800', strength: 0.7, height: 40 }], ambient: '#102030', ambientStrength: 0.4, bloom: 0.5, bleed: 0.25 };
    const r = parseProject(serializeProject(p));
    expect(r.ok && r.project.stage).toEqual(p.stage);
  });
});

describe('your own styles in library files', () => {
  it('are written to a library file and read back, and a file of styles alone can be read', () => {
    const styles = [{ name: 'My bronze', effects: styleEffects('hammered-bronze') }];
    const r = parseLibrary(serializeLibrary([], styles));
    if (!r.ok) throw new Error(r.error);
    expect(r.styles).toEqual(styles);
    expect(r.sets).toEqual([]);
  });

  it('leave out effects that can’t be read', () => {
    const r = parseLibrary(JSON.stringify({ format: 'frame-studio-library', schemaVersion: 9, items: [], styles: [{ name: 'Odd', effects: [{ kind: 'sparkle' }, NEW_EFFECT.glow()] }, { name: 'Empty', effects: [] }] }));
    if (!r.ok) throw new Error(r.error);
    expect(r.styles).toHaveLength(1);
    expect(r.styles[0].effects.map((e) => e.kind)).toEqual(['glow']);
  });
});

describe('the zip of a token pack', () => {
  it('has the standard checksum', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('holds its files, names and contents intact', () => {
    const files = [
      { name: 'Pack/circle-256.png', data: new Uint8Array([1, 2, 3]) },
      { name: 'Pack/Design.framemaker.json', data: new TextEncoder().encode('{"a":1}') },
    ];
    const bytes = zip(files);
    expect(new DataView(bytes.buffer).getUint32(0, true)).toBe(0x04034b50);
    expect(unzip(bytes).map((f) => [f.name, Array.from(f.data)])).toEqual(files.map((f) => [f.name, Array.from(f.data)]));
  });
});
