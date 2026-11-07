import { readFileSync } from 'node:fs';
// Drawing outside the browser (the scripts): @napi-rs/canvas's canvases,
// Path2D (for the icon ornaments) and picture decoder (for photo textures),
// as the tests set them up in src/test/setup.ts.
import { createCanvas, loadImage, Path2D } from '@napi-rs/canvas';
import { setCanvasFactory } from '../../src/frame-maker/render/canvas';
import { setPictureDecoder } from '../../src/frame-maker/render/pictures';

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
(globalThis as { Path2D?: unknown }).Path2D ??= Path2D;
setPictureDecoder(async (url) => loadImage(url.startsWith('data:') ? Buffer.from(url.slice(url.indexOf(',') + 1), 'base64') : readFileSync(`public${url}`)));
