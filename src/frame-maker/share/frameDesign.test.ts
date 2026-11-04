// @vitest-environment node
// Phase 5: what Token Maker uses to draw a Frame Maker design as a frame.
// The design drawn on Token Maker's band (any shape, thickness and spacing,
// with the origin at the token's centre) must be the very picture Frame
// Maker draws for the same band, so a design looks the same in both apps.
import { createCanvas } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { SHAPES } from '../engine/legacy/catalog';
import { editableProject } from '../project/convert';
import { createProject } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { serializeProject } from '../project/migrate';
import type { FrameProject } from '../project/types';
import { setCanvasFactory, type Ctx } from '../render/canvas';
import { renderProject } from '../render/renderProject';
import { drawFrameDesign, previewOf, readFrameDesign } from './frameDesign';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = 240;

function pixels(draw: (ctx: Ctx) => void, size = SIZE): Uint8ClampedArray {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  draw(ctx);
  return ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray;
}

/** Frame Maker's own picture of a design on a band `outer`…`inner` (fractions of the half-size). */
const inFrameMaker = (p: FrameProject, shape: FrameProject['stage']['shape'], outer: number, inner: number) =>
  pixels((ctx) => renderProject(ctx, { ...p, stage: { ...p.stage, shape, showArt: false, outerSpacing: outer, thickness: inner - outer } }, SIZE));

/** The picture Token Maker gets: its frame canvas with the origin at the centre and its band in pixels. */
const inTokenMaker = (p: FrameProject, shape: FrameProject['stage']['shape'], outer: number, inner: number) =>
  pixels((ctx) => {
    ctx.translate(SIZE / 2, SIZE / 2);
    drawFrameDesign(ctx, p, { shape, R: SIZE / 2, outer: outer * (SIZE / 2), inner: inner * (SIZE / 2) });
  });

const designs: [string, FrameProject][] = [
  ['Jewelled', createProject(LAYERED_TEMPLATES.find((t) => t.id === 'jewelled')!.make())],
  ['Paladin (editable)', editableProject('paladin')!],
  ['Night sky', createProject(LAYERED_TEMPLATES.find((t) => t.id === 'night-sky')!.make())],
];

describe('a design drawn as a Token Maker frame', () => {
  it.each(designs)('%s is the same picture on every shape and on thin and thick bands', (_name, design) => {
    // Lit from the bottom right, to check the design's own light is used.
    const p = { ...design, stage: { ...design.stage, light: 45 } };
    for (const s of SHAPES) {
      for (const [outer, inner] of [
        [0.1, 0.24],
        [0.04, 0.4],
      ]) {
        const a = inFrameMaker(p, s.id, outer, inner);
        const b = inTokenMaker(p, s.id, outer, inner);
        expect(b.every((v, i) => v === a[i]), `${s.id} ${outer}–${inner}`).toBe(true);
      }
    }
  });

  it('draws over what is under it rather than clearing it', () => {
    const p = createProject(LAYERED_TEMPLATES[0].make());
    const data = pixels((ctx) => {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.translate(SIZE / 2, SIZE / 2);
      drawFrameDesign(ctx, p, { shape: 'circle', R: SIZE / 2, outer: 12, inner: 30 });
    });
    // The centre is untouched red; the band is drawn.
    const at = (x: number, y: number) => [...data.slice((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4)];
    expect(at(SIZE / 2, SIZE / 2)).toEqual([255, 0, 0, 255]);
    expect(at(SIZE / 2, 20)).not.toEqual([255, 0, 0, 255]);
  });

  it('reads every saved version of a design file, and its preview picture', () => {
    for (const file of ['v1/brass-beads', 'v2/jewelled', 'v3/night-sky']) {
      const result = readFrameDesign(readFileSync(`src/frame-maker/project/fixtures/${file}.framemaker.json`, 'utf8'));
      expect(result.ok, file).toBe(true);
    }
    const p = createProject(LAYERED_TEMPLATES[0].make());
    expect(previewOf(serializeProject(p))).toBeNull();
    const withPreview = serializeProject(p, { preview: 'data:image/png;base64,AAAA' });
    expect(previewOf(withPreview)).toBe('data:image/png;base64,AAAA');
    // The preview is only extra: the file reads exactly as without it.
    expect(readFrameDesign(withPreview)).toEqual(readFrameDesign(serializeProject(p)));
    expect(readFrameDesign('not json').ok).toBe(false);
    // The object a Token Maker document keeps reads the same as the file's text.
    expect(readFrameDesign(JSON.parse(serializeProject(p)))).toEqual(readFrameDesign(serializeProject(p)));
  });
});
