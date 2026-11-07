import { createCanvas } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { recolourProject } from './colourSlots';
import { createProject, repeatLayer, shapeLayer } from './defaults';
import { DEFAULT_LIBRARY_PICTURE, LIBRARY_PICTURES, TEXTURE_PICTURES, libraryPictureThumbUrl, libraryPictureUrl } from './libraryPictures';
import { parseProject, serializeProject } from './migrate';
import { SCHEMA_VERSION, type FrameProject, type RepeatLayer } from './types';
import { loadPictures, picturesIn } from '../render/pictures';
import { renderProject } from '../render/renderProject';
import { setCanvasFactory, type Ctx } from '../render/canvas';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const roses = (o: Partial<RepeatLayer> = {}): RepeatLayer => ({ ...repeatLayer(), element: 'picture', picture: 'deco-rose-bloom', pictureTint: false, count: 4, size: 1, ...o });
const opaque = (p: FrameProject) => {
  const c = createCanvas(200, 200);
  renderProject(c.getContext('2d') as unknown as Ctx, { ...p, stage: { ...p.stage, showArt: false } }, 200, { cache: false });
  const d = c.getContext('2d').getImageData(0, 0, 200, 200).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++;
  return n;
};

describe('library pictures (version 13)', () => {
  it('every listed picture and its thumbnail is in public/', () => {
    for (const p of LIBRARY_PICTURES) {
      expect(existsSync(`public${libraryPictureUrl(p.id)}`), p.id).toBe(true);
      expect(existsSync(`public${libraryPictureThumbUrl(p.id)}`), p.id).toBe(true);
    }
    expect(LIBRARY_PICTURES.some((p) => p.group === 'Roses')).toBe(true);
    expect(TEXTURE_PICTURES.map((p) => p.id)).toContain('fx-stone-marble');
  });

  it('reads and writes a repeat and a shape of pictures, and older files read as before', () => {
    const project = createProject([roses(), { ...shapeLayer(), shape: 'ornament', element: 'picture', picture: 'deco-rose-heraldic', pictureTint: true }]);
    const read = parseProject(serializeProject(project));
    expect(read.ok && read.project.schemaVersion).toBe(SCHEMA_VERSION);
    if (!read.ok) return;
    expect(read.project.layers[0]).toMatchObject({ element: 'picture', picture: 'deco-rose-bloom', pictureTint: false });
    expect(read.project.layers[1]).toMatchObject({ element: 'picture', picture: 'deco-rose-heraldic', pictureTint: true });
    const old = parseProject({ ...JSON.parse(serializeProject(createProject([repeatLayer()]))), schemaVersion: 12 });
    expect(old.ok && old.project.layers[0]).toMatchObject({ element: 'bead', picture: DEFAULT_LIBRARY_PICTURE, pictureTint: false });
  });

  it('an unknown picture becomes the default, and texture pictures are photo textures', () => {
    const file = JSON.parse(serializeProject(createProject([roses()])));
    file.layers[0].picture = 'https://example.com/x.png';
    const read = parseProject(file);
    expect(read.ok && (read.project.layers[0] as RepeatLayer).picture).toBe(DEFAULT_LIBRARY_PICTURE);
    const paint = (picture: string) => {
      const r = parseProject(createProject([{ ...repeatLayer(), fillPaint: { kind: 'picture', picture, scale: 3, angle: 0, bend: true, tint: null, lighting: 0.5 } }]));
      return r.ok ? (r.project.layers[0] as RepeatLayer).fillPaint : null;
    };
    expect(paint('fx-stone-marble')).toMatchObject({ picture: 'fx-stone-marble' });
    expect(paint('deco-rose-bloom')).toMatchObject({ picture: 'bark' });
  });

  it('finds the pictures a design uses, and draws them once loaded', async () => {
    const project = createProject([roses()]);
    expect(picturesIn(project)).toEqual(['deco-rose-bloom']);
    await loadPictures(project);
    expect(opaque(project)).toBeGreaterThan(500);
    // Coloured in, a white sprite takes the layer's colour.
    const tinted = createProject([roses({ picture: 'fx-sparkle', pictureTint: true, fill: '#ff0000' })]);
    await loadPictures(tinted);
    expect(opaque(tinted)).toBeGreaterThan(50);
  });

  it('a colour slot turns pictures in their own colours by hue', () => {
    const project = createProject([{ ...roses(), name: 'Roses' }]);
    const red = recolourProject(project, [{ id: 'r', name: 'Rose colour', default: '#c01020', layers: ['Roses'] }], { r: '#2040c0' });
    expect(red.layers[0].effects[0]).toMatchObject({ kind: 'adjust' });
  });
});
