// @vitest-environment node
// Phase 2 renderer checks: shapes and paths, placement on the band or freely,
// mirroring, groups, clipping, wavy lines, repeat patterns, new elements and
// the light direction.
import { createCanvas } from '@napi-rs/canvas';
import { SHAPES } from '../engine/legacy/catalog';
import { bandFillLayer, createProject, GEM_POINTS, groupLayer, legacyFrameLayer, lineLayer, pathLayer, repeatLayer, shapeLayer } from '../project/defaults';
import { SHAPE_KINDS, type FrameProject, type Layer, type PlacedLayer } from '../project/types';
import { acrossOfPoint, alongOfPoint, bandGeometry, outlineAt } from './band';
import { setCanvasFactory, type Ctx } from './canvas';
import { lineOutline, repeatPlacements } from './layers';
import { lightAt, turnTable } from './light';
import { placement, placements, toCanvas, toLocal } from './placed';
import { renderProject } from './renderProject';
import { litTables, localLight } from '../engine/legacy/frameKit';
import { hitsPlaced, placeAt, recentrePath, rotateBy, scaleBy, switchPlace, transformHandles } from './hitTest';

const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
setCanvasFactory(make);

const SIZE = 200;
const project = (layers: Layer[], stage: Partial<FrameProject['stage']> = {}): FrameProject => {
  const p = createProject(layers);
  p.stage = { ...p.stage, showArt: false, ...stage };
  return p;
};
function draw(p: FrameProject, size = SIZE): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  renderProject(ctx, p, size);
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}
const alphaAt = (d: Uint8ClampedArray, x: number, y: number, size = SIZE) => d[(Math.round(y) * size + Math.round(x)) * 4 + 3];
const rgbAt = (d: Uint8ClampedArray, x: number, y: number, size = SIZE) => Array.from(d.slice((Math.round(y) * size + Math.round(x)) * 4, (Math.round(y) * size + Math.round(x)) * 4 + 3));
const opaque = (d: Uint8ClampedArray) => d.reduce((n, _v, i) => (i % 4 === 3 && d[i] > 0 ? n + 1 : n), 0);
const differs = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.some((v, i) => v !== b[i]);
const brightness = (d: Uint8ClampedArray, x: number, y: number) => rgbAt(d, x, y).reduce((a, b) => a + b, 0);
/** Canvas pixel of a point measured from the token's centre. */
const px = (p: { x: number; y: number }) => ({ x: p.x + SIZE / 2, y: p.y + SIZE / 2 });

const flat = <L extends PlacedLayer>(l: L): L => ({ ...l, raised: false, outline: null, shaded: false, fill: '#ff0000' });

describe('shapes', () => {
  it.each(SHAPE_KINDS)('a %s draws where it is anchored on the band', (shape) => {
    const layer = flat({ ...shapeLayer(), shape, along: 0, across: 0.5 });
    const d = draw(project([layer]));
    const g = bandGeometry(project([]).stage, SIZE);
    const t = placement(layer, g)!;
    // A ring and a chevron are hollow where they are anchored.
    if (shape !== 'ring' && shape !== 'chevron') expect(rgbAt(d, px(t).x, px(t).y)).toEqual([255, 0, 0]);
    else expect(alphaAt(d, px(t).x, px(t).y)).toBe(0);
    expect(opaque(d)).toBeGreaterThan(20);
    // Nothing at the bottom of the token.
    expect(alphaAt(d, 100, 190)).toBe(0);
  });

  it('sides, points, corners, size, stretch and rotation change the picture', () => {
    const base = flat({ ...shapeLayer(), size: 1.2 });
    const before = draw(project([base]));
    for (const change of [{ sides: 3 }, { shape: 'star' as const }, { size: 0.6 }, { stretch: 2 }, { rotation: 30 }, { shape: 'rectangle' as const, corner: 1 }]) {
      expect(differs(before, draw(project([{ ...base, ...change }])))).toBe(true);
    }
  });

  it('follows the band on every token shape and thickness (adaptable placement)', () => {
    const layer = { ...shapeLayer(), along: 0.3, across: 0.7 };
    for (const { id } of SHAPES) {
      for (const thickness of [0.08, 0.3]) {
        const g = bandGeometry({ ...project([]).stage, shape: id, thickness }, 400);
        const t = placement(layer, g)!;
        expect(acrossOfPoint(g, t)).toBeCloseTo(0.7, 2);
        expect(alongOfPoint(outlineAt(g, 0.7), t)).toBeCloseTo(0.3, 2);
        // Its height is measured in band widths.
        expect(t.uy * 2).toBeCloseTo(layer.size * (g.inner - g.outer), 5);
      }
    }
  });

  it('placed freely, it stays put whatever the band does', () => {
    const layer = { ...shapeLayer(), place: 'free' as const, x: 0.2, y: -0.4, size: 0.3 };
    const thin = placement(layer, bandGeometry({ ...project([]).stage, thickness: 0.05 }, 400))!;
    const thick = placement(layer, bandGeometry({ ...project([]).stage, thickness: 0.35, shape: 'hexagon' }, 400))!;
    expect(thin).toEqual(thick);
    expect(thin.x).toBeCloseTo(0.2 * 200);
    expect(thin.uy * 2).toBeCloseTo(0.3 * 200);
  });

  it('mirroring adds copies on the other sides', () => {
    const layer = flat({ ...shapeLayer(), along: 0.15 });
    expect(placements(layer, bandGeometry(project([]).stage, SIZE))).toHaveLength(1);
    const pair = { ...layer, mirror: 'leftRight' as const };
    const g = bandGeometry(project([]).stage, SIZE);
    const [a, b] = placements(pair, g);
    expect(b.x).toBeCloseTo(-a.x);
    expect(b.y).toBeCloseTo(a.y);
    const d = draw(project([pair]));
    // The picture is symmetric left to right.
    let asymmetric = 0;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE / 2; x++) if (Math.abs(alphaAt(d, x, y) - alphaAt(d, SIZE - 1 - x, y)) > 40) asymmetric++;
    expect(asymmetric).toBeLessThan(15);
    expect(placements({ ...layer, mirror: 'four' }, g)).toHaveLength(4);
  });

  it('a mirrored copy is lit from the same side as the original, not mirrored', () => {
    const layer = { ...shapeLayer(), shape: 'circle' as const, outline: null, raised: false, size: 1.4, along: 0.25, mirror: 'leftRight' as const, fill: '#808080' };
    const d = draw(project([layer]));
    const g = bandGeometry(project([]).stage, SIZE);
    const [a, b] = placements(layer, g).map(px);
    const r = 4;
    // Light from the top left: the top-left side of each copy is the brighter.
    for (const c of [a, b]) expect(brightness(d, c.x - r, c.y - r)).toBeGreaterThan(brightness(d, c.x + r, c.y + r));
  });
});

describe('paths', () => {
  const gem = flat({ ...pathLayer(GEM_POINTS), size: 1.5 });

  it('a closed path is filled; an open one is only outlined', () => {
    const filled = opaque(draw(project([gem])));
    expect(filled).toBeGreaterThan(30);
    const open = { ...gem, closed: false, outline: '#000000', outlineWidth: 0.05 };
    expect(opaque(draw(project([open])))).toBeLessThan(filled);
    expect(opaque(draw(project([{ ...gem, points: [] }])))).toBe(0);
  });

  it('smooth points curve the outline', () => {
    const curved = { ...gem, points: gem.points.map((p, i) => (i === 3 ? { ...p, handle: { x: 0.6, y: 0 } } : p)) };
    expect(differs(draw(project([gem])), draw(project([curved])))).toBe(true);
  });

  it('re-centring the anchor after drawing leaves the drawing where it was', () => {
    const g = bandGeometry(project([]).stage, 400);
    const drawn = { ...gem, along: 0.1, points: gem.points.map((p, i) => ({ x: p.x + 1.5, y: p.y - 0.4, handle: i === 1 ? { x: 0.3, y: 0.2 } : null })) };
    const centred = { ...drawn, ...recentrePath(drawn, g) };
    const [a] = placements(drawn, g);
    const [b] = placements(centred, g);
    drawn.points.forEach((p, i) => {
      const before = toCanvas(a, p);
      const after = toCanvas(b, centred.points[i]);
      expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(0.5);
    });
    // The new anchor is where the middle of the old drawing was.
    const xs = drawn.points.map((p) => p.x);
    const ys = drawn.points.map((p) => p.y);
    const middle = toCanvas(a, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 });
    expect(Math.hypot(middle.x - b.x, middle.y - b.y)).toBeLessThan(0.5);
  });

  it('local and canvas points convert both ways, flipped copies too', () => {
    const g = bandGeometry(project([]).stage, 400);
    for (const t of placements({ ...gem, along: 0.1, rotation: 25, stretch: 1.4, mirror: 'four' }, g)) {
      const p = { x: 0.3, y: -0.7 };
      const back = toLocal(t, toCanvas(t, p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });
});

describe('transform handles and maths', () => {
  const g = bandGeometry(project([]).stage, 400);
  const shape = { ...shapeLayer(), along: 0.1 };

  it('the turn handle stays on the picture, even for a shape at the very edge', () => {
    for (const across of [-0.5, 0.5, 1]) {
      const h = transformHandles({ ...shape, along: 0, across, size: 2 }, g)!;
      expect(Math.abs(h.rotate.y)).toBeLessThan(g.R);
    }
  });

  it('the scale handle sits at the box corner and grows the size with distance', () => {
    const h = transformHandles(shape, g)!;
    const far = { x: h.anchor.x + (h.scale.x - h.anchor.x) * 2, y: h.anchor.y + (h.scale.y - h.anchor.y) * 2 };
    expect(scaleBy(shape, h.anchor, h.scale, far).size).toBeCloseTo(shape.size * 2);
  });

  it('turning round the anchor adds the angle (Shift snaps to 15°)', () => {
    const a = { x: 0, y: 0 };
    expect(rotateBy(shape, a, { x: 10, y: 0 }, { x: 0, y: 10 }).rotation).toBeCloseTo(90);
    expect(rotateBy({ ...shape, rotation: 170 }, a, { x: 10, y: 0 }, { x: 0, y: 10 }).rotation).toBeCloseTo(-100);
    expect(rotateBy(shape, a, { x: 10, y: 0 }, { x: 10, y: 3 }, true).rotation).toBe(15);
  });

  it('moving puts the anchor where the pointer goes', () => {
    // A point near the band (anchors on the band reach from -50% to 150% across it).
    const target = { x: 50, y: 160 };
    const moved = { ...shape, ...placeAt(shape, g, target) };
    const t = placement(moved, g)!;
    expect(Math.hypot(t.x - target.x, t.y - target.y)).toBeLessThan(1.5);
  });

  it('switching between band and free placement keeps it where it is', () => {
    for (const start of [{ ...shape, rotation: 20 }, { ...shape, place: 'free' as const, x: 0.3, y: -0.75, rotation: -40 }]) {
      const switched = { ...start, ...switchPlace(start, g) };
      expect(switched.place).not.toBe(start.place);
      const a = placement(start, g)!;
      const b = placement(switched, g)!;
      expect(b.x).toBeCloseTo(a.x, 0);
      expect(b.y).toBeCloseTo(a.y, 0);
      expect(b.uy).toBeCloseTo(a.uy, 1);
      expect(Math.cos(b.angle - a.angle)).toBeCloseTo(1, 3);
    }
  });

  it('picks a shape and its mirrored copy', () => {
    const pair = { ...shape, mirror: 'leftRight' as const };
    const [a, b] = placements(pair, g);
    expect(hitsPlaced(pair, g, a)).toBe(true);
    expect(hitsPlaced(pair, g, b)).toBe(true);
    expect(hitsPlaced(pair, g, { x: 0, y: 0 })).toBe(false);
  });
});

describe('groups', () => {
  const red = { ...bandFillLayer(), paint: { kind: 'solid', color: '#ff0000' } as const };
  const blue = { ...bandFillLayer(), paint: { kind: 'solid', color: '#0000ff' } as const };
  const top = (d: Uint8ClampedArray) => rgbAt(d, 100, 15);

  it('draws its layers in order, as if they were in the main list', () => {
    expect(draw(project([groupLayer([red, blue])]))).toEqual(draw(project([red, blue])));
  });

  it('hiding a group hides everything in it', () => {
    expect(opaque(draw(project([{ ...groupLayer([red, blue]), visible: false }])))).toBe(0);
  });

  it('a group’s opacity fades its layers together', () => {
    // Red under blue, the group at 50%: blue at half strength over nothing, never red.
    const d = draw(project([{ ...groupLayer([red, blue]), opacity: 0.5 }]));
    expect(top(d)).toEqual([0, 0, 255]);
    expect(alphaAt(d, 100, 15)).toBeGreaterThan(110);
    expect(alphaAt(d, 100, 15)).toBeLessThan(145);
  });

  it('groups can hold groups', () => {
    expect(top(draw(project([groupLayer([red, groupLayer([blue])])])))).toEqual([0, 0, 255]);
  });
});

describe('clipping', () => {
  it('clipped to the band, a layer shows only inside the band', () => {
    const big = { ...flat(shapeLayer()), place: 'free' as const, x: 0, y: 0, size: 2 };
    const d = draw(project([{ ...big, clip: 'band' }]));
    expect(alphaAt(d, 100, 100)).toBe(0);
    expect(alphaAt(d, 100, 15)).toBe(255);
    expect(alphaAt(draw(project([big])), 100, 100)).toBe(255);
  });

  it('clipped to the layer below, a layer shows only where that layer has paint', () => {
    const narrow = { ...bandFillLayer(), from: 0, to: 0.4, paint: { kind: 'solid', color: '#00ff00' } as const };
    const wide = { ...bandFillLayer(), paint: { kind: 'solid', color: '#ff0000' } as const, clip: 'below' as const };
    const g = bandGeometry(project([]).stage, SIZE);
    const y = (across: number) => g.outer + (g.inner - g.outer) * across;
    const d = draw(project([narrow, wide]));
    expect(rgbAt(d, 100, y(0.2))).toEqual([255, 0, 0]);
    expect(alphaAt(d, 100, y(0.8))).toBe(0);
    // A hidden base hides the clipped layer too.
    expect(opaque(draw(project([{ ...narrow, visible: false }, wide])))).toBe(0);
  });
});

describe('lines', () => {
  it('a wavy line wanders in and out by its wave height', () => {
    const g = bandGeometry(project([]).stage, 400);
    const line = { ...lineLayer(), at: 0.5, waveAmplitude: 0.3, waves: 10 };
    const across = lineOutline(line, g).map((p) => acrossOfPoint(g, p));
    expect(Math.max(...across)).toBeCloseTo(0.8, 1);
    expect(Math.min(...across)).toBeCloseTo(0.2, 1);
    expect(differs(draw(project([lineLayer()])), draw(project([{ ...lineLayer(), waveAmplitude: 0.3 }])))).toBe(true);
    expect(differs(draw(project([line])), draw(project([{ ...line, wavePhase: 0.5 }])))).toBe(true);
  });

  it('with no wave height it is exactly the plain line', () => {
    const g = bandGeometry(project([]).stage, 400);
    expect(lineOutline({ ...lineLayer(), waves: 30 }, g)).toEqual(outlineAt(g, 0.5));
  });
});

describe('repeat patterns', () => {
  const g = bandGeometry(project([]).stage, 400);
  const base = { ...repeatLayer(), count: 12, snapToCorners: false };

  it('alternates colours and sizes', () => {
    const placed = repeatPlacements({ ...base, fill: '#111111', altColors: ['#222222', '#333333'], altSizes: [1, 0.5] }, g);
    expect(placed.slice(0, 4).map((p) => p.color)).toEqual(['#111111', '#222222', '#333333', '#111111']);
    expect(placed[1].h).toBeCloseTo(placed[0].h / 2);
  });

  it('leaves gaps beside the bigger ones (Monk)', () => {
    const placed = repeatPlacements({ ...base, accentEvery: 4, skipAroundAccent: 1 }, g);
    // Of every 4, the accent stays and its two neighbours go: 0 and 2 (of 0..3) → 6 left.
    expect(placed.map((p) => p.index)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(placed.filter((p) => p.accent)).toHaveLength(3);
  });

  it('alternates sides, pointing the other way (Druid)', () => {
    const placed = repeatPlacements({ ...base, at: 0.5, alternateSides: 0.25 }, g);
    expect(acrossOfPoint(g, placed[0].p)).toBeCloseTo(0.25, 2);
    expect(acrossOfPoint(g, placed[1].p)).toBeCloseTo(0.75, 2);
    expect(placed.map((p) => p.flip).slice(0, 2)).toEqual([false, true]);
  });

  it('every pattern option changes the picture', () => {
    const before = draw(project([{ ...base, element: 'leaf', raised: false }]));
    for (const change of [{ altColors: ['#0000ff'] }, { altSizes: [1, 0.4] }, { alternateSides: 0.3 }, { accentEvery: 3, skipAroundAccent: 1 }]) {
      expect(differs(before, draw(project([{ ...base, element: 'leaf' as const, raised: false, ...change }])))).toBe(true);
    }
  });
});

describe('the light direction', () => {
  it('225° (top left) gives exactly the engine’s own lighting', () => {
    const p = { x: 30, y: -40, angle: 0.7 };
    expect(lightAt(p, 225)).toEqual(localLight(p));
    const table = litTables('#c9a24a', { light: 0.8, dark: 0.8 }).band;
    expect(turnTable(table, 225)).toBe(table);
  });

  it('turning the light turns the lit colours round the band with it', () => {
    const table = litTables('#c9a24a', { light: 0.8, dark: 0.8 }).band;
    const turned = turnTable(table, 45);
    expect(turned[45]).toBe(table[225]);
    expect(turned[225]).toBe(table[45]);
  });

  it('a lit band is brightest on the side the light comes from', () => {
    const band = { ...bandFillLayer(), paint: { kind: 'lit', color: '#808080', light: 0.9, dark: 0.9, pressed: false, highlight: null } as const };
    const g = bandGeometry(project([]).stage, SIZE);
    const r = g.R - (g.outer + g.inner) / 2;
    const at = (deg: number) => px({ x: Math.cos((deg * Math.PI) / 180) * r, y: Math.sin((deg * Math.PI) / 180) * r });
    for (const light of [225, 45, 90, 300]) {
      const d = draw(project([band], { light }));
      const lit = at(light);
      const dark = at(light + 180);
      expect(brightness(d, lit.x, lit.y)).toBeGreaterThan(brightness(d, dark.x, dark.y) + 100);
    }
  });

  it('beads and shaded shapes follow it, and raised shadows fall away from it', () => {
    const beads = { ...repeatLayer(), count: 8 };
    const gem = { ...shapeLayer(), size: 1.2 };
    for (const layer of [beads, gem] as Layer[]) {
      expect(differs(draw(project([layer])), draw(project([layer], { light: 45 })))).toBe(true);
    }
    // The light only changes shading: a flat, unshaded shape with no shadow looks the same.
    const plain = flat(shapeLayer());
    expect(differs(draw(project([plain])), draw(project([plain], { light: 45 })))).toBe(false);
  });

  it('Token Maker frames keep their own top-left light (the engine is not edited)', () => {
    const frame = legacyFrameLayer('gilded');
    expect(differs(draw(project([frame])), draw(project([frame], { light: 45 })))).toBe(false);
  });
});

describe('new elements', () => {
  it.each(['chevron', 'tick', 'gear', 'eye', 'note', 'claw'] as const)('repeated %s draws and differs from a plain circle', (element) => {
    const layer = { ...repeatLayer(), element, size: 0.6, count: 8, raised: false };
    const d = draw(project([layer]));
    expect(opaque(d)).toBeGreaterThan(80);
    expect(differs(d, draw(project([{ ...layer, element: 'circle' }])))).toBe(true);
  });
});
