// Renders each converted frame beside its Token Maker original, on every
// shape, and prints how far apart they are (npm run compare-conversions;
// --size=512 for bigger pictures, --frame=paladin for one frame). Writes
// docs/screenshots/conversions/<frame>.png: the original row on top, the
// converted row below it, then the difference (brighter = further apart).

import './napi';
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FRAME_PRESETS, SHAPES } from '../../src/frame-maker/engine/legacy/catalog';
import { CONVERTIBLE_STYLES, convertPreset } from '../../src/frame-maker/project/convert';
import { createProject, legacyFrameLayer } from '../../src/frame-maker/project/defaults';
import { compareFrames } from '../../src/frame-maker/render/compare';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { renderProject } from '../../src/frame-maker/render/renderProject';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const SIZE = Number(process.argv.find((a) => a.startsWith('--size='))?.slice(7) ?? 192);
const only = process.argv.find((a) => a.startsWith('--frame='))?.slice(8);
const out = join(process.cwd(), 'docs', 'frame-maker', 'screenshots', 'conversions');
mkdirSync(out, { recursive: true });

for (const preset of FRAME_PRESETS.filter((p) => CONVERTIBLE_STYLES.includes(p.style) && (!only || p.id === only))) {
  const sheet = createCanvas(SIZE * SHAPES.length, SIZE * 3);
  const sctx = sheet.getContext('2d');
  for (const [i, shape] of SHAPES.entries()) {
    const original = createProject([legacyFrameLayer(preset.id)]);
    const converted = createProject(convertPreset(preset.id)!);
    for (const p of [original, converted]) p.stage = { ...p.stage, shape: shape.id, showArt: false };
    const pictures = [original, converted].map((p) => {
      const c = createCanvas(SIZE, SIZE);
      renderProject(c.getContext('2d') as unknown as Ctx, p, SIZE, { cache: false });
      return c;
    });
    const a = pictures[0].getContext('2d').getImageData(0, 0, SIZE, SIZE);
    const b = pictures[1].getContext('2d').getImageData(0, 0, SIZE, SIZE);
    const d = compareFrames(a.data as unknown as Uint8ClampedArray, b.data as unknown as Uint8ClampedArray);
    console.log(`${preset.name.padEnd(12)} ${shape.id.padEnd(8)} mean ${d.mean.toFixed(3)}  over ${(d.over * 100).toFixed(3)}%  max ${d.max}`);
    sctx.drawImage(pictures[0], i * SIZE, 0);
    sctx.drawImage(pictures[1], i * SIZE, SIZE);
    const diff = sctx.createImageData(SIZE, SIZE);
    for (let k = 0; k < d.map.length; k++) {
      const v = Math.min(255, d.map[k] * 4);
      diff.data.set([v, v, v, 255], k * 4);
    }
    sctx.putImageData(diff, i * SIZE, SIZE * 2);
  }
  writeFileSync(join(out, `${preset.id}.png`), sheet.toBuffer('image/png'));
}
