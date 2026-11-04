import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION } from '../../src/frame-maker/project/types';
import { openSample } from './samples';



// A fingerprint of the preview canvas, to tell whether the picture changed.
const previewHash = (page: Page) =>
  page.getByTestId('preview').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0;
    return h;
  });

const layerNames = (page: Page) => page.getByRole('tree', { name: /Layers/ }).getByRole('treeitem').locator('.layer-name').evaluateAll((els) => els.map((e) => e.firstChild?.textContent));

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
});

test('start from a Token Maker frame, add layers, edit, undo and redo', async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'Infernal', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Preview of Infernal' })).toBeVisible();
  const plain = await previewHash(page);

  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /Repeated shapes/ }).click();
  const withBeads = await previewHash(page);
  expect(withBeads).not.toBe(plain);

  await page.getByLabel('Number value').fill('20');
  await page.getByLabel('Number value').press('Enter');
  expect(await previewHash(page)).not.toBe(withBeads);

  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await previewHash(page)).toBe(withBeads);
  await page.keyboard.press('Control+y');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await previewHash(page)).toBe(plain);
  await page.getByRole('button', { name: 'Redo' }).click();
  expect(await previewHash(page)).toBe(withBeads);
});

test('layer visibility, order, duplicate and delete change the picture predictably', async ({ page }) => {
  await openSample(page, 'brass-beads');
  const full = await previewHash(page);
  await page.getByRole('button', { name: 'Hide Beads' }).click();
  const noBeads = await previewHash(page);
  expect(noBeads).not.toBe(full);
  await page.getByRole('button', { name: 'Show Beads' }).click();
  expect(await previewHash(page)).toBe(full);

  // Send the beads to the bottom: the band now covers them.
  await page.getByRole('treeitem', { name: /Beads/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Move down' }).click();
  expect((await layerNames(page)).at(-1)).toBe('Beads');
  expect(await previewHash(page)).toBe(noBeads);

  await page.getByRole('button', { name: 'Duplicate' }).click();
  expect(await layerNames(page)).toContain('Beads copy');
  await page.getByRole('button', { name: 'Delete' }).click();
  expect(await layerNames(page)).not.toContain('Beads copy');
});

test('clicking the canvas picks a layer, and dragging moves it', async ({ page }) => {
  await openSample(page, 'brass-beads');
  await page.getByRole('treeitem', { name: /Brass band/ }).click();
  const box = (await page.getByTestId('overlay').boundingBox())!;
  // The bead at the top of the ring, 60% across a band that starts 10% in and is 14% thick.
  const r = box.width / 2;
  const y = box.y + r * (0.1 + 0.14 * 0.6);
  await page.mouse.click(box.x + r, y);
  await expect(page.getByRole('treeitem', { name: /Beads/ })).toHaveAttribute('aria-selected', 'true');
  const before = await previewHash(page);
  await page.mouse.move(box.x + r, y);
  await page.mouse.down();
  await page.mouse.move(box.x + r + 40, y + 10, { steps: 5 });
  await page.mouse.up();
  expect(await previewHash(page)).not.toBe(before);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await previewHash(page)).toBe(before);
});

test('save, open and export', async ({ page }, info) => {
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'Glowing runes' }).click();
  const original = await previewHash(page);

  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved = await saving;
  expect(saved.suggestedFilename()).toBe('Glowing-runes.framemaker.json');
  const path = info.outputPath('saved.json');
  await saved.saveAs(path);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  expect(json).toMatchObject({ format: 'frame-studio-project', schemaVersion: SCHEMA_VERSION });

  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: /Blank project/ }).click();
  expect(await previewHash(page)).not.toBe(original);
  await page.getByTestId('open-file').setInputFiles(path);
  await expect(page.getByRole('status')).toContainText('Opened "Glowing runes"');
  expect(await previewHash(page)).toBe(original);

  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Picture size').selectOption('512');
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const png = await exporting;
  expect(png.suggestedFilename()).toBe('Glowing-runes.png');
  const bytes = readFileSync(await png.path());
  expect(bytes.readUInt32BE(16)).toBe(512);
  expect(bytes.readUInt32BE(20)).toBe(512);
});

test('a broken file is refused with a message', async ({ page }) => {
  await page.getByTestId('open-file').setInputFiles({ name: 'oops.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') });
  await expect(page.getByRole('alert')).toContainText("isn't a Frame Maker project");
});

test('the project survives a reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Line/ }).click();
  const hash = await previewHash(page);
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByRole('treeitem', { name: /Line/ })).toBeVisible();
  expect(await previewHash(page)).toBe(hash);
});

test('Advanced mode shows extra settings and the data view', async ({ page }) => {
  await expect(page.getByText('Clip', { exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Advanced' }).click();
  await expect(page.getByText('Clip', { exact: true })).toBeVisible();
  await page.getByText('Advanced: project data').click();
  const data = page.getByLabel('Project data');
  await data.fill('{"not": "a project"}');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('status').filter({ hasText: "isn't a Frame Maker project" })).toBeVisible();
});
