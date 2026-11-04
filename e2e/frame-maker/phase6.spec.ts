import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { parseProject } from '../../src/frame-maker/project/migrate';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { compareFrames } from '../../src/frame-maker/render/compare';
import { renderProject } from '../../src/frame-maker/render/renderProject';
import { SCHEMA_VERSION } from '../../src/frame-maker/project/types';
import { openSample } from './samples';



// Phase 6: effects and the style library in the real editor, the templates
// made with effects, and an exported picture drawn by the browser matching
// the same file drawn by the renderer in node (effects are plain arithmetic,
// so both engines give the same picture).

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

async function pick(page: Page, name: string) {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('button', { name, exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** The preview's pixels, once its sharp picture is drawn. */
async function preview(page: Page): Promise<number[]> {
  await page.waitForTimeout(500);
  return page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((_v, i) => i % 97 === 0)));
}
const changed = (a: number[], b: number[]) => a.some((v, i) => v !== b[i]);

async function axe(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
});

test('done when: a band styled as hammered bronze follows the light, and its export is the picture the renderer draws', async ({ page }, info) => {
  await openSample(page, 'brass-beads');
  await page.getByRole('treeitem', { name: /Brass band/ }).click();
  const before = await preview(page);

  // A style from the library: one click, one undo step.
  await page.getByRole('button', { name: /Styles/ }).click();
  const styles = page.getByRole('dialog', { name: 'Styles' });
  await styles.getByRole('button', { name: 'Hammered bronze' }).click();
  await expect(styles).toBeHidden();
  await expect(page.getByRole('treeitem', { name: /Brass band/ })).toContainText('effects');
  const styled = await preview(page);
  expect(changed(before, styled)).toBe(true);

  // Its effects are ordinary settings: make the dents deeper.
  await page.getByLabel('Surface depth value').fill('150');
  await page.getByLabel('Surface depth value').press('Enter');
  const deeper = await preview(page);
  expect(changed(styled, deeper)).toBe(true);

  // Moving the light relights the bevel.
  await page.getByRole('slider', { name: 'Light direction' }).focus();
  await page.keyboard.press('Shift+ArrowRight');
  const relit = await preview(page);
  expect(changed(deeper, relit)).toBe(true);

  // Undo takes back the light, the depth and the style.
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('treeitem', { name: /Brass band/ })).not.toContainText('effects');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByRole('treeitem', { name: /Brass band/ })).toContainText('effects');

  // Export the project file and a picture; draw the file in node and compare.
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('project');
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const read = parseProject(readFileSync(await (await saving).path(), 'utf8'));
  expect(read.ok).toBe(true);
  if (!read.ok) return;
  expect(read.project.schemaVersion).toBe(SCHEMA_VERSION);

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

test('the templates made with effects open, and effects can be copied onto other layers', async ({ page }) => {
  for (const id of ['dwarven-bronze', 'eldritch-crystal', 'radiant-gold']) await openSample(page, id);
  await pick(page, 'Hellforged iron');
  await expect(page.getByRole('img', { name: 'Preview of Hellforged iron' })).toBeVisible();
  await openSample(page, 'dwarven-bronze');
  await page.getByRole('treeitem', { name: /Plates/ }).click();
  await page.getByRole('button', { name: 'Copy effects' }).click();
  // "Rivets", not "Inner rivets".
  const rivets = page.getByRole('treeitem', { name: /Rivets/ });
  await rivets.click();
  await expect(rivets).not.toContainText('effects');
  await page.getByRole('button', { name: 'Paste effects' }).click();
  await expect(rivets).toContainText('effects');
});

test('add effects one by one, switch one off and cut a shape into facets', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Shape/ }).click();
  const plain = await preview(page);
  await page.getByText('Cut into facets').click();
  await expect(page.getByRole('switch', { name: 'Cut into facets' })).toBeChecked();
  const cut = await preview(page);
  expect(changed(plain, cut)).toBe(true);
  await page.getByLabel('Add an effect').selectOption('glow');
  const glowing = await preview(page);
  expect(changed(cut, glowing)).toBe(true);
  await page.locator('.effect-head').getByText('Glow', { exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Glow' })).not.toBeChecked();
  expect(await preview(page)).toEqual(cut);
});

test('accessibility: no serious problems in the Effects section or the style library', async ({ page }) => {
  await openSample(page, 'dwarven-bronze');
  await page.getByRole('treeitem', { name: /Bronze band/ }).click();
  await page.getByRole('radio', { name: 'Advanced' }).click();
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: /Styles/ }).click();
  await expect(page.getByRole('dialog', { name: 'Styles' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});
