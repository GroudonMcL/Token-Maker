import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { parseProject } from '../../src/frame-maker/project/migrate';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { compareFrames } from '../../src/frame-maker/render/compare';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { openSample } from './samples';

// Phase 8: generators. The Overgrown ruin is made only from generators and
// styles; generators are added and changed in the editor; the four Token
// Maker frames that waited for them turn into editable layers.

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

async function data(page: Page) {
  const box = page.getByLabel('Project data');
  if (!(await box.isVisible())) await page.getByText('Advanced: project data').click();
  return JSON.parse(await box.inputValue());
}

async function preview(page: Page): Promise<number[]> {
  await page.waitForTimeout(500);
  return page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((_v, i) => i % 97 === 0)));
}
const changed = (a: number[], b: number[]) => a.some((v, i) => v !== b[i]);


test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('radio', { name: 'Advanced' }).click();
});

test('done when: the Overgrown ruin is built only from generators and styles, can be changed, and exports as the renderer draws it', async ({ page }, info) => {
  await openSample(page, 'overgrown-ruin');
  const layers = (await data(page)).layers;
  expect(new Set(layers.map((l: { type: string }) => l.type))).toEqual(new Set(['cells', 'fracture', 'knotwork', 'growth']));
  const plates = layers.find((l: { type: string }) => l.type === 'cells');
  expect(plates.missing).toBeGreaterThan(0);
  expect(plates.effects.length).toBeGreaterThan(0);

  // More missing pieces; a new arrangement of plates; antlers instead of roots.
  await page.getByRole('treeitem', { name: /Stone plates/ }).click();
  let before = await preview(page);
  await page.getByLabel('Missing pieces value').fill('40');
  await page.getByLabel('Missing pieces value').press('Enter');
  expect(changed(before, await preview(page))).toBe(true);
  before = await preview(page);
  await page.getByRole('button', { name: 'Shuffle' }).first().click();
  expect(changed(before, await preview(page))).toBe(true);
  await page.getByRole('treeitem', { name: /Roots/ }).click();
  await page.getByLabel('Kind').selectOption('antlers');
  expect((await data(page)).layers.find((l: { name: string }) => l.name === 'Roots').kind).toBe('antlers');

  // Every shape.
  for (const shape of ['Square', 'Hexagon']) {
    before = await preview(page);
    await page.getByRole('radio', { name: shape }).click();
    expect(changed(before, await preview(page))).toBe(true);
  }

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
  const ref = createCanvas(512, 512);
  ref.getContext('2d').drawImage(png, 0, 0);
  const c = createCanvas(512, 512);
  renderProject(c.getContext('2d') as unknown as Ctx, { ...read.project, stage: { ...read.project.stage, showArt: false } }, 512);
  const diff = compareFrames(c.getContext('2d').getImageData(0, 0, 512, 512).data as unknown as Uint8ClampedArray, ref.getContext('2d').getImageData(0, 0, 512, 512).data as unknown as Uint8ClampedArray);
  info.annotations.push({ type: 'difference', description: `mean ${diff.mean.toFixed(3)}, visibly different ${(diff.over * 100).toFixed(3)} %` });
  expect(diff.mean).toBeLessThan(1.5);
  expect(diff.over).toBeLessThan(0.02);
});

test('add each generator from the menu; Druid, Knotwork, Artificer and Barbarian turn into editable layers', async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: /Blank project/ }).click();
  for (const name of ['Growth', 'Plates and cells', 'Cracks and lightning', 'Knotwork', 'Gears', 'Chain']) {
    await page.getByRole('button', { name: 'Add layer' }).click();
    await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click();
  }
  expect((await data(page)).layers.map((l: { type: string }) => l.type)).toEqual(['growth', 'cells', 'fracture', 'knotwork', 'gears', 'chain']);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  expect(result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  for (const frame of ['Druid', 'Knotwork', 'Artificer', 'Barbarian']) {
    await page.getByRole('button', { name: 'New' }).click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await dialog.getByRole('tab', { name: /^Editable layers/ }).click();
    await dialog.getByRole('tabpanel').getByRole('button', { name: new RegExp(`^${frame}`) }).click();
    await expect(dialog).toBeHidden();
    const types = (await data(page)).layers.map((l: { type: string }) => l.type);
    expect(types.some((t: string) => ['growth', 'knotwork', 'gears', 'repeat'].includes(t))).toBe(true);
  }
});
