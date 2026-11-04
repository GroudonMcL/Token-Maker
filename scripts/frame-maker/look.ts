// Draws templates on every shape, for checking by eye: npm run look -- out.png id [id…]
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { SHAPES } from '../../src/frame-maker/engine/legacy/catalog';
import { createProject, LAYERED_TEMPLATES } from '../../src/frame-maker/project/defaults';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { THEMED_TEMPLATES, themedProject } from '../../src/frame-maker/project/themedTemplates';
import { sampleArt } from '../../src/frame-maker/engine/legacy/sampleArt';
import { registerShippedFonts } from './nodeFonts';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();
const [out = 'look.png', ...args] = process.argv.slice(2);
// 'themed' draws every themed template.
const ids = args[0] === 'themed' ? THEMED_TEMPLATES.map((t) => t.id) : args;
const SHAPES_SHOWN = process.env.ONE ? SHAPES.slice(0, 1) : SHAPES;
const S = Number(process.env.S ?? 320);
const c = createCanvas(S * SHAPES_SHOWN.length, S * ids.length);
const ctx = c.getContext('2d') as unknown as Ctx;
ctx.fillStyle = '#2a2a30';
ctx.fillRect(0, 0, c.width, c.height);
ids.forEach((id, row) => {
  const themed = THEMED_TEMPLATES.find((x) => x.id === id);
  const t = themed ?? LAYERED_TEMPLATES.find((x) => x.id === id)!;
  SHAPES_SHOWN.forEach((shape, col) => {
    const p = themed ? themedProject(themed) : createProject(t.make(), t.name);
    p.stage = { ...p.stage, shape: shape.id, showArt: process.env.ART === '1', thickness: Number(process.env.T ?? 0.2) };
    ctx.save();
    ctx.translate(col * S, row * S);
    renderProject(ctx, p, S, { cache: false, clear: false, art: p.stage.showArt ? sampleArt((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement, 200) : null });
    ctx.restore();
  });
});
writeFileSync(out, c.toBuffer('image/png'));
