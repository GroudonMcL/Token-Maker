// @vitest-environment node
// Photo textures, paint fills for
// ornaments, shapes and paths (schema version 6).
import { createCanvas } from '@napi-rs/canvas';
import { bandFillLayer, createProject, pathLayer, photoBand, repeatLayer, shapeLayer, GEM_POINTS } from '../project/defaults';
import { pictureById, PICTURES } from '../project/pictures';
import { LEGACY_ICON_ELEMENTS, parseProject, serializeProject } from '../project/migrate';
import { ELEMENT_KINDS, type FrameProject, type Layer, type Paint } from '../project/types';
import { bandGeometry } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { ELEMENT_NAMES } from './elements';
import { layerKey } from './layerCache';
import { loadPictures, pictureImage, picturesIn } from './pictures';
import { renderProject } from './renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = 200;

function project(layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, thickness: 0.3, ...stage };
  return p;
}

function draw(p: FrameProject): Uint8ClampedArray {
  const c = createCanvas(SIZE, SIZE);
  renderProject(c.getContext('2d') as unknown as Ctx, p, SIZE, { cache: false });
  return c.getContext('2d').getImageData(0, 0, SIZE, SIZE).data as unknown as Uint8ClampedArray;
}

const ink = (d: Uint8ClampedArray) => d.reduce((n, v, i) => (i % 4 === 3 && v > 0 ? n + 1 : n), 0);
const meanDiff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
/** The colour at a point of the top of the band, `across` of the way in. */
const at = (d: Uint8ClampedArray, x: number, y: number) => Array.from(d.slice((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4));

const photo = (patch: Partial<Extract<Paint, { kind: 'picture' }>> = {}): Paint => ({ kind: 'picture', picture: 'wood-planks', scale: 3, angle: 0, bend: true, tint: null, lighting: 0, ...patch });

describe('the icon ornaments taken out before release', () => {
  it('a saved design that used one opens with a drawn ornament in its place', () => {
    const p = project([{ ...repeatLayer(), element: 'heart' }, { ...shapeLayer(), shape: 'ornament', element: 'crown' }]);
    const saved = JSON.parse(serializeProject(p));
    saved.layers[0].element = 'icon-dragon-head';
    saved.layers[1].element = 'icon-crown';
    const r = parseProject(JSON.stringify(saved));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.layers.map((l) => ('element' in l ? l.element : null))).toEqual(['claw', 'crown']);
  });

  it('every stand-in is an ornament this version draws, and none is offered as an icon', () => {
    for (const kind of Object.values(LEGACY_ICON_ELEMENTS)) expect(ELEMENT_KINDS).toContain(kind);
    expect(ELEMENT_KINDS.some((k) => k.startsWith('icon-'))).toBe(false);
    expect(Object.values(ELEMENT_NAMES).some((n) => n.includes('(icon)'))).toBe(false);
  });
});

describe('photo textures', () => {
  it('there are 32, from Poly Haven and ambientCG, each with an average colour', () => {
    expect(PICTURES).toHaveLength(32);
    for (const p of PICTURES) expect(p.average).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('until a picture has loaded it is drawn as its average colour; then as the photo, and cached layers notice', async () => {
    const band = photoBand('lava');
    const g = bandGeometry(project([]).stage, SIZE);
    const before = layerKey(band, g, 225, SIZE);
    if (!pictureImage('lava')) {
      const flat = draw(project([{ ...band, paint: { ...band.paint, lighting: 0 } as Paint }]));
      const avg = pictureById('lava')!.average;
      const [r, gg, b] = at(flat, SIZE / 2, Math.round(SIZE * 0.08));
      expect([r, gg, b]).toEqual([1, 3, 5].map((i) => parseInt(avg.slice(i, i + 2), 16)));
    }
    await loadPictures(project([band]));
    expect(pictureImage('lava')).not.toBeNull();
    expect(layerKey(band, g, 225, SIZE)).not.toBe(before);
  });

  it('bends round the band or lies flat, turns, tints and takes the light', async () => {
    await loadPictures(['wood-planks'].map((picture) => photo({ picture: picture as 'wood-planks' })));
    const fill = (paint: Paint) => draw(project([{ ...bandFillLayer(), paint }]));
    const base = fill(photo());
    expect(ink(base)).toBeGreaterThan(5000);
    expect(meanDiff(base, fill(photo({ bend: false })))).toBeGreaterThan(1);
    expect(meanDiff(base, fill(photo({ angle: 90 })))).toBeGreaterThan(1);
    expect(meanDiff(base, fill(photo({ lighting: 1 })))).toBeGreaterThan(1);
    const tinted = fill(photo({ tint: '#2060ff' }));
    const [r, , b] = at(tinted, SIZE / 2, Math.round(SIZE * 0.1));
    expect(b).toBeGreaterThan(r);
  });

  it('every one draws, bent round every shape', async () => {
    await loadPictures(PICTURES.map((p) => photoBand(p.id)));
    for (const p of PICTURES) for (const shape of ['circle', 'square', 'hexagon'] as const) expect(ink(draw(project([photoBand(p.id)], { shape })))).toBeGreaterThan(3000);
  });

  it('a project knows which pictures it uses, wherever they are', () => {
    const p = project([photoBand('gold'), { ...repeatLayer(), fillPaint: photo({ picture: 'ice' }) }]);
    expect(picturesIn(p).sort()).toEqual(['gold', 'ice']);
  });
});

describe('fills with a paint', () => {
  const red: Paint = { kind: 'solid', color: '#cc2222' };
  const gradient: Paint = { kind: 'linear', angle: 0, followLight: false, stops: [{ at: 0, color: '#ffffff', opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }] };

  it('a flat paint fills an ornament just as its colour does', () => {
    const layer = { ...repeatLayer(), element: 'heart' as const, count: 8, size: 0.7, shaded: false, raised: false, outline: null };
    const byColour = draw(project([{ ...layer, fill: '#cc2222' }]));
    const byPaint = draw(project([{ ...layer, fill: '#888888', fillPaint: red }]));
    expect(meanDiff(byColour, byPaint)).toBeLessThan(0.5);
  });

  it.each(['bead', 'heart', 'rune', 'watchEye', 'cog', 'gash', 'crown', 'knot'] as const)('%s takes a paint, across the token or each on its own', (element) => {
    const layer = { ...repeatLayer(), element, count: 8, size: 0.7, fill: '#808080' };
    const plain = draw(project([layer]));
    const across = draw(project([{ ...layer, fillPaint: gradient }]));
    const each = draw(project([{ ...layer, fillPaint: gradient, paintEach: true }]));
    expect(meanDiff(plain, across)).toBeGreaterThan(0.1);
    expect(meanDiff(across, each)).toBeGreaterThan(0.1);
  });

  it('across the token, the left ornament is lighter than the right; each on its own, they match', () => {
    const layer = { ...repeatLayer(), element: 'circle' as const, count: 4, size: 0.8, shaded: false, raised: false, outline: null, snapToCorners: false, fillPaint: gradient };
    const g = bandGeometry(project([]).stage, SIZE);
    const y = SIZE / 2;
    const left = Math.round(g.outer + (g.inner - g.outer) / 2);
    const right = SIZE - 1 - left;
    const across = draw(project([layer]));
    expect(at(across, left, y)[0]).toBeGreaterThan(at(across, right, y)[0] + 100);
    const each = draw(project([{ ...layer, paintEach: true }]));
    // The left one is turned half way round from the right one, so its middle matches.
    expect(Math.abs(at(each, left, y)[0] - at(each, right, y)[0])).toBeLessThan(40);
  });

  it('shapes, ornament shapes and paths take a paint, mirrored copies too', async () => {
    await loadPictures(['gold']);
    for (const layer of [
      { ...shapeLayer(), size: 1.2, mirror: 'four' as const },
      { ...shapeLayer(), shape: 'ornament' as const, element: 'crown' as const, size: 1.2, mirror: 'leftRight' as const },
      { ...pathLayer(GEM_POINTS), size: 1.2 },
    ]) {
      const plain = draw(project([layer]));
      expect(meanDiff(plain, draw(project([{ ...layer, fillPaint: photo({ picture: 'gold', bend: false }) }])))).toBeGreaterThan(0.1);
      // No fill: no paint either.
      expect(meanDiff(draw(project([{ ...layer, fill: null }])), draw(project([{ ...layer, fill: null, fillPaint: red }])))).toBe(0);
    }
  });
});
