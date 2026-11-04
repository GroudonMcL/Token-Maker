// Sheets of the ornaments, textures, templates and last conversions added
// in version 10, for checking by eye (npm run showcase -- <what> out.png):
//   ornaments   every repeat shape drawn by Frame Maker, round a band
//   textures    the texture library
//   photos      the photo textures, bent round the band
//   fills       ornaments and shapes filled with paints and photos
//   templates   the designs built from layers
//   shapes      the shape layer's shapes (version 11 added thirteen)
//   crafted     the crafted borders (version 11)
//   converted   the Token Maker frames beside their editable versions (--frames=stamped,ranger…)
import './napi';
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { FRAME_PRESETS, type ShapeId } from '../../src/frame-maker/engine/legacy/catalog';
import { convertPreset } from '../../src/frame-maker/project/convert';
import { bandFillLayer, createProject, LAYERED_TEMPLATES, legacyFrameLayer, photoBand, repeatLayer, shapeLayer, textureBand, textureFromPreset, TEXTURES } from '../../src/frame-maker/project/defaults';
import { PICTURES } from '../../src/frame-maker/project/pictures';
import { loadPictures } from '../../src/frame-maker/render/pictures';
import { DRAWN_ELEMENT_KINDS, SHAPE_KINDS, type Layer, type Paint, type ShapeKind } from '../../src/frame-maker/project/types';
import { CRAFTED_TEMPLATES } from '../../src/frame-maker/project/craftedTemplates';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { ELEMENT_NAMES } from '../../src/frame-maker/render/elements';
import { renderProject } from '../../src/frame-maker/render/renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
const [what = 'ornaments', out = `${what}.png`] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const frames = process.argv.find((a) => a.startsWith('--frames='))?.slice(9).split(',') ?? ['stamped', 'ranger', 'bard', 'warlock'];
const size = 240;
const SHAPE_LABELS: Record<ShapeKind, string> = {
  circle: 'Circle', rectangle: 'Rectangle', polygon: 'Polygon', star: 'Star', ornament: 'Ornament', ring: 'Ring', crescent: 'Crescent', semicircle: 'Half circle',
  teardrop: 'Teardrop', lens: 'Almond', cross: 'Cross', arch: 'Arch', trapezoid: 'Trapezoid', chevron: 'Chevron', flower: 'Flower', squircle: 'Squircle', burst: 'Burst', blob: 'Blob',
};

interface Item {
  name: string;
  layers: Layer[];
  thickness: number;
  shape?: ShapeId;
}
const band = { ...bandFillLayer(), paint: { kind: 'lit' as const, color: '#4a5a7a', light: 0.7, dark: 0.8, pressed: false, highlight: null } };
const shapes: ShapeId[] = ['circle', 'rounded', 'square', 'hexagon', 'flatHex'];
const photo = (picture: (typeof PICTURES)[number]['id'], patch: Partial<Extract<Paint, { kind: 'picture' }>> = {}): Paint => ({ kind: 'picture', picture, scale: 3, angle: 0, bend: false, tint: null, lighting: 0.5, ...patch });
const gradient: Paint = { kind: 'linear', angle: 90, followLight: false, stops: [{ at: 0, color: '#fff2a8', opacity: 1 }, { at: 0.5, color: '#e05a2a', opacity: 1 }, { at: 1, color: '#5a1040', opacity: 1 }] };
const rainbow: Paint = { kind: 'ring', followLight: false, stops: [0, 60, 120, 180, 240, 300].map((angle, i) => ({ angle, color: ['#e04040', '#e0b040', '#60c040', '#40b0e0', '#5060e0', '#c050d0'][i] })) };
const fills: Item[] = [
  { name: 'Fleurs-de-lis: gold photo, each', thickness: 0.3, layers: [band, { ...repeatLayer(), element: 'fleur', count: 8, size: 0.8, fillPaint: photo('gold', { scale: 0.6 }), paintEach: true }] },
  { name: 'Claws: lava photo across', thickness: 0.3, layers: [band, { ...repeatLayer(), element: 'claw', count: 6, size: 0.85, fillPaint: photo('lava', { scale: 2 }) }] },
  { name: 'Hearts: gradient, each', thickness: 0.3, layers: [band, { ...repeatLayer(), element: 'heart', count: 10, size: 0.6, fillPaint: gradient, paintEach: true }] },
  { name: 'Gems: colours round the ring', thickness: 0.3, layers: [band, { ...repeatLayer(), element: 'jewel', count: 12, size: 0.6, stretch: 0.8, fillPaint: rainbow }] },
  { name: 'Shields: wood photo, each', thickness: 0.3, layers: [band, { ...repeatLayer(), element: 'shield', count: 8, size: 0.75, fillPaint: photo('medieval-wood', { scale: 0.8 }), paintEach: true, outline: '#2a1a0a', outlineWidth: 0.05 }] },
  { name: 'Crown shape: rough gold', thickness: 0.2, layers: [photoBand('marble'), { ...shapeLayer(), shape: 'ornament', element: 'crown', across: 0.2, size: 1.4, stretch: 1.3, fill: '#e2b85a', fillPaint: photo('gold', { scale: 1 }), paintEach: true, outline: null }] },
];
const items: Item[] =
  what === 'ornaments'
    ? DRAWN_ELEMENT_KINDS.map((element) => ({ name: ELEMENT_NAMES[element], thickness: 0.3, layers: [band, { ...repeatLayer(), element, count: 8, size: 0.7, fill: '#e0b850' }] }))
    : what === 'photos'
      ? PICTURES.map((p) => ({ name: p.name, thickness: 0.3, layers: [photoBand(p.id)] }))
    : what === 'fills'
      ? fills
    : what === 'textures'
      ? TEXTURES.map((t) => ({ name: t.name, thickness: 0.32, layers: [textureBand(t), textureFromPreset(t)] }))
      : what === 'templates'
        ? LAYERED_TEMPLATES.map((t) => ({ name: t.name, thickness: 0.2, layers: t.make() }))
      : what === 'shapes'
        ? SHAPE_KINDS.map((shape) => ({ name: SHAPE_LABELS[shape], thickness: 0.34, layers: [band, { ...shapeLayer(), name: shape, shape, element: 'fleur' as const, sides: shape === 'blob' ? 5 : shape === 'flower' ? 8 : 6, along: 0, across: 0.5, size: 1.1, fill: '#e0b850', outline: '#3a2408', outlineWidth: 0.04, radialCount: 1, mirror: 'four' as const }] }))
      : what === 'crafted'
        ? CRAFTED_TEMPLATES.map((t) => ({ name: t.name, thickness: t.stage?.thickness ?? 0.2, layers: t.make() }))
        : frames.flatMap((id, i) => {
            const name = FRAME_PRESETS.find((p) => p.id === id)!.name;
            const shape = shapes[i % shapes.length];
            return [
              { name: `${name}: original`, thickness: 0.18, shape, layers: [legacyFrameLayer(id)] },
              { name: `${name}: editable`, thickness: 0.18, shape, layers: convertPreset(id)! },
            ];
          });

await loadPictures(items);
const cols = what === 'converted' ? 4 : 6;
const label = 26;
const sheet = createCanvas(cols * size, Math.ceil(items.length / cols) * (size + label));
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#2b2d33';
ctx.fillRect(0, 0, sheet.width, sheet.height);
items.forEach((item, i) => {
  const p = createProject(item.layers);
  p.stage = { ...p.stage, showArt: false, thickness: item.thickness, shape: item.shape ?? 'circle' };
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, p, size, { cache: false });
  const x = (i % cols) * size;
  const y = Math.floor(i / cols) * (size + label);
  ctx.drawImage(c, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(item.name, x + 8, y + size + 18);
});
writeFileSync(out, sheet.toBuffer('image/png'));
console.log(`${items.length} pictures → ${out}`);
