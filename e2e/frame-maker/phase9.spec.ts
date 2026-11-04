import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { registerShippedFonts } from '../../scripts/frame-maker/nodeFonts';
import { parseProject } from '../../src/frame-maker/project/migrate';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { compareFrames } from '../../src/frame-maker/render/compare';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { openSample } from './samples';



// Phase 9: precise control. Runes carved through raised plates share one
// height map with them, seen in the height-map view and in the export;
// masks, combining, moving a group, zoom.

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();

async function data(page: Page) {
  const box = page.getByLabel('Project data');
  if (!(await box.isVisible())) await page.getByText('Advanced: project data').click();
  return JSON.parse(await box.inputValue());
}

async function preview(page: Page): Promise<number[]> {
  await page.waitForTimeout(600);
  return page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((_v, i) => i % 97 === 0)));
}
const changed = (a: number[], b: number[]) => a.length !== b.length || a.some((v, i) => v !== b[i]);


test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('radio', { name: 'Advanced' }).click();
});

test('done when: runes cut through raised plates share one height map, in the height-map view and in the export', async ({ page }, info) => {
  await openSample(page, 'rune-plates');
  const picture = await preview(page);

  // The height-map view shows the carving.
  await page.getByLabel('Show', { exact: true }).selectOption('height');
  const carved = await preview(page);
  expect(changed(picture, carved)).toBe(true);

  // Take the runes out of the shared height map: the height map loses them.
  await page.getByRole('treeitem', { name: /Carved runes/ }).click();
  await expect(page.getByLabel('Shared height')).toHaveValue('carve');
  await page.getByLabel('Shared height').selectOption('none');
  const flat = await preview(page);
  expect(changed(carved, flat)).toBe(true);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(changed(await preview(page), carved)).toBe(false);

  // The normal map, then back to the picture.
  await page.getByLabel('Show', { exact: true }).selectOption('normals');
  expect(changed(await preview(page), carved)).toBe(true);
  await page.getByLabel('Show', { exact: true }).selectOption('picture');

  // The export is the picture the renderer draws from the saved file.
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('project');
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const read = parseProject(readFileSync(await (await saving).path(), 'utf8'));
  if (!read.ok) throw new Error(read.error);
  const group = read.project.layers.find((l) => l.type === 'group');
  expect(group?.type === 'group' && group.children.some((c) => c.heightMode === 'carve')).toBe(true);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('png');
  await page.getByLabel('Picture size').selectOption('512');
  await page.getByLabel('Include the sample picture').uncheck();
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const png = await loadImage(readFileSync(await (await exporting).path()));
  const ref = createCanvas(512, 512);
  ref.getContext('2d').drawImage(png, 0, 0);
  const c = createCanvas(512, 512);
  renderProject(c.getContext('2d') as unknown as Ctx, { ...read.project, stage: { ...read.project.stage, showArt: false } }, 512);
  const diff = compareFrames(c.getContext('2d').getImageData(0, 0, 512, 512).data as unknown as Uint8ClampedArray, ref.getContext('2d').getImageData(0, 0, 512, 512).data as unknown as Uint8ClampedArray);
  info.annotations.push({ type: 'difference', description: `mean ${diff.mean.toFixed(3)}, visibly different ${(diff.over * 100).toFixed(3)} %` });
  expect(diff.mean).toBeLessThan(1.5);
  expect(diff.over).toBeLessThan(0.02);
  // And without the runes carved, the export would differ: the carving is in the picture.
  const noRunes = createCanvas(512, 512);
  renderProject(noRunes.getContext('2d') as unknown as Ctx, { ...read.project, stage: { ...read.project.stage, showArt: false }, layers: read.project.layers.map((l) => (l.type === 'group' ? { ...l, children: l.children.filter((k) => k.type !== 'text') } : l)) }, 512);
  expect(compareFrames(noRunes.getContext('2d').getImageData(0, 0, 512, 512).data as unknown as Uint8ClampedArray, ref.getContext('2d').getImageData(0, 0, 512, 512).data as unknown as Uint8ClampedArray).over).toBeGreaterThan(0.001);
});

test('a mask, combining shapes, moving and turning a group, and zoom', async ({ page }) => {
  await openSample(page, 'jewelled');
  // Turn the group of jewels round the token, then drag it.
  await page.getByRole('treeitem', { name: /Jewels/ }).click();
  const before = (await data(page)).layers.find((l: { name: string }) => l.name === 'Jewels');
  await page.getByRole('button', { name: /15°/ }).last().click();
  const turned = (await data(page)).layers.find((l: { name: string }) => l.name === 'Jewels');
  expect(turned.children[1].along).toBeCloseTo(before.children[1].along + 15 / 360, 3);
  await page.getByLabel('Combine shapes').selectOption('subtract');
  expect((await data(page)).layers.find((l: { name: string }) => l.name === 'Jewels').combine).toBe('subtract');
  await page.getByRole('button', { name: 'Undo' }).click();

  // Drag one of its diamonds: the whole group moves.
  const b = (await page.getByTestId('overlay').boundingBox())!;
  const r = b.width / 2;
  const x = b.x + r;
  const y = b.y + r * (0.1 + 0.14 * 0.5);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 3, y + 8, { steps: 4 });
  await page.mouse.up();
  const moved = (await data(page)).layers.find((l: { name: string }) => l.name === 'Jewels');
  expect(moved.children[0].at).not.toBe(turned.children[0].at);
  expect(moved.children[1].across).not.toBe(turned.children[1].across);

  // A mask: the vine shows only through the silver band's shape, inverted.
  await page.getByRole('treeitem', { name: /Vine/ }).click();
  await page.getByLabel('Mask', { exact: true }).selectOption({ label: 'Outer rim' });
  await page.getByText('Invert the mask').click();
  const vine = (await data(page)).layers.find((l: { name: string }) => l.name === 'Vine');
  expect(vine.mask).toMatchObject({ mode: 'alpha', invert: true });

  // Zoom in and out.
  const small = await page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => c.width);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByRole('button', { name: 'Fit the whole token' })).toHaveText('200%');
  const big = await page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => c.width);
  expect(big).toBeGreaterThan(small);
  await page.getByRole('button', { name: 'Fit the whole token' }).click();
  await expect(page.getByRole('button', { name: 'Fit the whole token' })).toHaveText('100%');
});
