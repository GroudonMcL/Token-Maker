// @vitest-environment node
// Phase 4's additions to the format, as drawn: a lit paint's own highlight
// colour, see-through gradient colours, gradients that turn with the light,
// and repeats drawn flat or only some of them. Each is off by default, so
// earlier designs draw as before (fixtures.test.ts).
import { createCanvas } from '@napi-rs/canvas';
import { litTables } from '../engine/legacy/frameKit';
import { bandFillLayer, createProject, lineLayer, repeatLayer } from '../project/defaults';
import type { FrameProject, Layer, Paint, RepeatLayer } from '../project/types';
import { setCanvasFactory, type Ctx } from './canvas';
import { repeatPlacements } from './layers';
import { bandGeometry } from './band';
import { litFor } from './paint';
import { renderProject } from './renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = 160;
function draw(layers: Layer[], stage: Partial<FrameProject['stage']> = {}): Uint8ClampedArray {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.25, ...stage };
  const c = createCanvas(SIZE, SIZE);
  renderProject(c.getContext('2d') as unknown as Ctx, p, SIZE, { cache: false });
  return c.getContext('2d').getImageData(0, 0, SIZE, SIZE).data as unknown as Uint8ClampedArray;
}
const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
const ink = (d: Uint8ClampedArray) => d.reduce((n, v, i) => (i % 4 === 3 ? n + v : n), 0) / 255;
const at = (d: Uint8ClampedArray, x: number, y: number) => Array.from(d.slice((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4));

describe('the lit paint’s highlight colour', () => {
  const lit = (highlight: string | null): Paint => ({ kind: 'lit', color: '#557799', light: 0.9, dark: 0.8, pressed: false, highlight });

  it('is the engine’s own table with that highlight; null is the engine’s default', () => {
    expect(litFor('#557799', 0.9, 0.8, '#ffffff')).toEqual(litTables('#557799', { light: 0.9, dark: 0.8, highlight: '#ffffff' }));
    expect(litFor('#557799', 0.9, 0.8, null)).toEqual(litTables('#557799', { light: 0.9, dark: 0.8 }));
  });

  it('changes the lit side only', () => {
    const a = draw([{ ...bandFillLayer(), paint: lit(null) }]);
    const b = draw([{ ...bandFillLayer(), paint: lit('#ff0000') }]);
    expect(same(a, b)).toBe(false);
    // Top left of the band (lit) differs; bottom right (shaded) doesn't.
    const lit45 = Math.round(SIZE / 2 - SIZE * 0.29);
    const dark45 = Math.round(SIZE / 2 + SIZE * 0.29);
    expect(at(a, lit45, lit45)).not.toEqual(at(b, lit45, lit45));
    expect(at(a, dark45, dark45)).toEqual(at(b, dark45, dark45));
  });
});

describe('gradients', () => {
  const rim = (followLight: boolean, opacity = 1): Layer => ({
    ...lineLayer(),
    at: 0.3,
    width: 0.4,
    paint: { kind: 'linear', angle: 45, followLight, stops: [{ at: 0, color: '#ffffff', opacity }, { at: 1, color: '#000000', opacity }] },
  });

  it('turning with the light changes nothing while the light is at the top left', () => {
    expect(same(draw([rim(true)]), draw([rim(false)]))).toBe(true);
  });

  it('turn with the light when asked, and stay put when not', () => {
    expect(same(draw([rim(false)], { light: 45 }), draw([rim(false)]))).toBe(true);
    const turned = draw([rim(true)], { light: 45 });
    // Light from the bottom right: the bright end is now there.
    const tl = Math.round(SIZE * 0.2);
    const br = SIZE - 1 - tl;
    expect(at(turned, br, br)[0]).toBeGreaterThan(at(turned, tl, tl)[0]);
  });

  it('colours can be see-through', () => {
    const solid = draw([rim(false)]);
    const half = draw([rim(false, 0.5)]);
    const none = draw([rim(false, 0)]);
    expect(ink(none)).toBe(0);
    expect(ink(half)).toBeGreaterThan(ink(solid) * 0.4);
    expect(ink(half)).toBeLessThan(ink(solid) * 0.6);
  });
});

describe('repeats drawn flat or only some of them', () => {
  const beads = (patch: Partial<RepeatLayer> = {}): RepeatLayer => ({ ...repeatLayer(), element: 'square', count: 12, size: 0.5, raised: false, snapToCorners: false, ...patch });

  it('a show pattern leaves elements out, keeping the others where they were', () => {
    const g = bandGeometry({ ...createProject().stage, thickness: 0.25 }, SIZE);
    const all = repeatPlacements(beads(), g);
    const odd = repeatPlacements(beads({ show: [false, true] }), g);
    expect(all).toHaveLength(12);
    expect(odd.map((p) => p.index)).toEqual([1, 3, 5, 7, 9, 11]);
    expect(odd[0].p).toEqual(all[1].p);
    expect(repeatPlacements(beads({ show: [true, true, false, false] }), g).map((p) => p.index)).toEqual([0, 1, 4, 5, 8, 9]);
    const half = ink(draw([beads({ show: [true, false] })]));
    expect(half).toBeGreaterThan(ink(draw([beads()])) * 0.4);
    expect(half).toBeLessThan(ink(draw([beads()])) * 0.6);
  });

  it('flat elements are one colour; shaded ones are not', () => {
    const colours = (d: Uint8ClampedArray) => new Set(Array.from({ length: d.length / 4 }, (_x, i) => i).filter((i) => d[i * 4 + 3] === 255).map((i) => `${d[i * 4]},${d[i * 4 + 1]},${d[i * 4 + 2]}`));
    expect(colours(draw([beads({ shaded: false, fill: '#336699' })]))).toEqual(new Set(['51,102,153']));
    expect(colours(draw([beads({ fill: '#336699' })])).size).toBeGreaterThan(5);
    // Beads become plain circles.
    expect(colours(draw([beads({ element: 'bead', shaded: false, fill: '#336699' })]))).toEqual(new Set(['51,102,153']));
  });
});
