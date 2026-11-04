import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { registerShippedFonts } from '../../scripts/frame-maker/nodeFonts';
import { SHAPES } from '../../src/frame-maker/engine/legacy/catalog';
import { parseProject } from '../../src/frame-maker/project/migrate';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { compareFrames } from '../../src/frame-maker/render/compare';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { openSample } from './samples';

// Phase 7: ornaments anywhere. Gems in claw settings follow a path drawn on
// the canvas and an engraved inscription runs round the band, both with
// effects, on every token shape; the exported picture is the picture the
// renderer draws from the saved file (fonts included).

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);
registerShippedFonts();

/** The project as the Advanced data view shows it. */
async function data(page: Page) {
  const box = page.getByLabel('Project data');
  if (!(await box.isVisible())) await page.getByText('Advanced: project data').click();
  return JSON.parse(await box.inputValue());
}

/** The preview's pixels, once its sharp picture is drawn. */
async function preview(page: Page): Promise<number[]> {
  await page.waitForTimeout(500);
  return page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((_v, i) => i % 97 === 0)));
}
const changed = (a: number[], b: number[]) => a.some((v, i) => v !== b[i]);

async function addLayer(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: /Blank project/ }).click();
  await page.getByRole('radio', { name: 'Advanced' }).click();
});

test('done when: gems in claw settings follow a drawn wavy path and an engraved inscription runs round the band, on every shape', async ({ page }, info) => {
  await addLayer(page, /^Band fill/);

  // Draw an open zigzag across the top of the band, and stop without closing it.
  await addLayer(page, /^Path/);
  const b = (await page.getByTestId('overlay').boundingBox())!;
  const r = b.width / 2;
  const cx = b.x + r;
  const top = (across: number) => b.y + r * (0.1 + 0.14 * across);
  for (let i = 0; i <= 6; i++) await page.mouse.click(cx + (i - 3) * r * 0.12, top(i % 2 ? 0.8 : 0.2) + Math.abs(i - 3) * r * 0.05);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  let layers = (await data(page)).layers;
  const path = layers[1];
  expect(path).toMatchObject({ type: 'path', closed: false });
  expect(path.points).toHaveLength(7);

  // A ring of gems in claw settings that follows it.
  await addLayer(page, /^Repeated shapes/);
  await page.getByLabel('Shape', { exact: true }).selectOption('gem');
  await page.getByLabel('Follow').selectOption({ label: 'Path: Path' });
  await page.getByLabel('Number value').fill('7');
  await page.getByLabel('Number value').press('Enter');
  await page.getByLabel('Cut', { exact: true }).selectOption('rose');
  await page.locator('summary', { hasText: /^Setting$/ }).click();
  await page.getByLabel('Setting', { exact: true }).selectOption('claws4');
  await page.getByLabel('Add an effect', { exact: true }).selectOption('shadow');
  layers = (await data(page)).layers;
  expect(layers[2]).toMatchObject({ type: 'repeat', element: 'gem', follow: path.id, count: 7, gemCut: 'rose', setting: 'claws4' });
  expect(layers[2].settingEffects.length).toBeGreaterThan(0);
  expect(layers[2].effects.map((e: { kind: string }) => e.kind)).toEqual(['shadow']);
  const withGems = await preview(page);

  // An engraved inscription round the band.
  await addLayer(page, /^Text Words/);
  await page.getByLabel('Text', { exact: true }).fill('HERE LIES THE KING');
  await page.getByLabel('Position across the band value').fill('80');
  await page.getByLabel('Position across the band value').press('Enter');
  await page.getByLabel('Round the token (from the top) value').fill('50');
  await page.getByLabel('Round the token (from the top) value').press('Enter');
  await page.getByText('Read the other way').click();
  await page.getByRole('button', { name: /Styles/ }).click();
  await page.getByRole('dialog', { name: 'Styles' }).getByRole('button', { name: 'Engraved' }).click();
  layers = (await data(page)).layers;
  expect(layers[3]).toMatchObject({ type: 'text', text: 'HERE LIES THE KING', reverse: true });
  expect(layers[3].effects.length).toBeGreaterThan(0);
  const inscribed = await preview(page);
  expect(changed(withGems, inscribed)).toBe(true);

  // Every token shape: the gems and the inscription follow the band.
  let last = inscribed;
  for (const shape of SHAPES.slice(1)) {
    await page.getByRole('radio', { name: shape.name }).click();
    const now = await preview(page);
    expect(changed(last, now)).toBe(true);
    last = now;
  }

  // Moving the path moves the gems: drag it down a little.
  await page.getByRole('treeitem', { name: /Path Path/ }).click();
  const before = await preview(page);
  await page.getByLabel('Position across the band value').fill('30');
  await page.getByLabel('Position across the band value').press('Enter');
  expect(changed(before, await preview(page))).toBe(true);

  // Export the file and the picture; the renderer draws the same picture from the file.
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('project');
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const read = parseProject(readFileSync(await (await saving).path(), 'utf8'));
  if (!read.ok) throw new Error(read.error);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('png');
  await page.getByLabel('Picture size').selectOption('512');
  await page.getByLabel('Include the sample picture').uncheck();
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const png = await loadImage(readFileSync(await (await exporting).path()));
  const size = 512;
  const ref = createCanvas(size, size);
  ref.getContext('2d').drawImage(png, 0, 0);
  const c = createCanvas(size, size);
  renderProject(c.getContext('2d') as unknown as Ctx, { ...read.project, stage: { ...read.project.stage, showArt: false } }, size);
  const diff = compareFrames(c.getContext('2d').getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray, ref.getContext('2d').getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray);
  info.annotations.push({ type: 'difference', description: `mean ${diff.mean.toFixed(3)}, visibly different ${(diff.over * 100).toFixed(3)} %` });
  expect(diff.mean).toBeLessThan(1.5);
  expect(diff.over).toBeLessThan(0.02);
});

test('a radial array of a shape, contours and the Royal inscription template', async ({ page }) => {
  await addLayer(page, /^Shape/);
  const one = await preview(page);
  await page.getByText('Radial array').click();
  await page.getByLabel('Copies round a point value').fill('6');
  await page.getByLabel('Copies round a point value').press('Enter');
  const six = await preview(page);
  expect(changed(one, six)).toBe(true);
  expect((await data(page)).layers[0].radialCount).toBe(6);

  await addLayer(page, /^Contours/);
  await page.getByLabel('Lines value').fill('5');
  await page.getByLabel('Lines value').press('Enter');
  expect((await data(page)).layers[1]).toMatchObject({ type: 'contours', count: 5 });

  await openSample(page, 'royal-inscription');
  await page.getByRole('treeitem', { name: /Rubies/ }).click();
  await expect(page.getByLabel('Follow')).toHaveValue(/.+/);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  expect(result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
