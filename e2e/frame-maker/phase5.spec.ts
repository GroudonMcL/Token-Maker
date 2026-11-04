import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { bandGeometry } from '../../src/frame-maker/render/band';
import { setCanvasFactory, type Ctx } from '../../src/frame-maker/render/canvas';
import { compareFrames } from '../../src/frame-maker/render/compare';
import { drawFrameDesign, previewOf, readFrameDesign } from '../../src/frame-maker/share/frameDesign';
import { openSample } from './samples';



// Phase 5: the layer library, copy and paste between tabs, the export
// options, keyboard access and accessibility checks (axe), and a design
// file read and drawn the way Token Maker draws it.

setCanvasFactory((w, h) => createCanvas(w, h) as unknown as HTMLCanvasElement);

const layerNames = (page: Page) => page.getByRole('tree', { name: /Layers/ }).getByRole('treeitem').locator('.layer-name').evaluateAll((els) => els.map((e) => e.firstChild?.textContent));

async function pick(page: Page, name: string) {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('button', { name, exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Serious and critical accessibility problems axe finds on the page as it is. */
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

test('done when: a design saved to the library, reused in another design, and opened as a Token Maker frame from its file', async ({ page }, info) => {
  // Save the beads of one design to the library.
  await openSample(page, 'brass-beads');
  await page.getByRole('treeitem', { name: /Beads/ }).click();
  await page.getByRole('button', { name: 'Add to library' }).click();
  await expect(page.getByRole('status')).toContainText('Saved "Beads" to your library');

  // Reuse them in another design, after a reload (the library is kept).
  await openSample(page, 'jewelled');
  await page.waitForTimeout(800); // the autosave
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Jewelled' })).toBeVisible();
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /From your library/ }).click();
  const lib = page.getByRole('dialog', { name: 'Your library' });
  await lib.getByRole('button', { name: 'Beads', exact: true }).click();
  await expect(lib).toBeHidden();
  expect((await layerNames(page))[0]).toBe('Beads');

  // Export the project file with a preview, and a picture of the same size.
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('project');
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const file = await saving;
  expect(file.suggestedFilename()).toBe('Jewelled.framemaker.json');
  const text = readFileSync(await file.path(), 'utf8');

  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('png');
  await page.getByLabel('Picture size').selectOption('512');
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const png = await loadImage(readFileSync(await (await exporting).path()));

  // What Token Maker does with the file: read it, and draw it on its band.
  const read = readFrameDesign(text);
  expect(read.ok).toBe(true);
  if (!read.ok) return;
  expect(read.project.layers.map((l) => l.name)).toContain('Beads');
  expect(previewOf(text)).toMatch(/^data:image\/png;base64,/);
  const size = 512;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d') as unknown as Ctx;
  ctx.translate(size / 2, size / 2);
  drawFrameDesign(ctx, read.project, bandGeometry(read.project.stage, size));
  const ref = createCanvas(size, size);
  const rctx = ref.getContext('2d');
  rctx.drawImage(png, 0, 0);
  const diff = compareFrames(ctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray, rctx.getImageData(0, 0, size, size).data as unknown as Uint8ClampedArray);
  info.annotations.push({ type: 'difference', description: `mean ${diff.mean.toFixed(3)}, visibly different ${(diff.over * 100).toFixed(3)} %` });
  // Two different drawing engines (the browser's and the test's), so not to the pixel: the same picture to the eye.
  expect(diff.mean).toBeLessThan(1);
  expect(diff.over).toBeLessThan(0.01);
});

test('copy layers in one tab and paste them into a different design in another', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openSample(page, 'brass-beads');
  await page.getByRole('treeitem', { name: /Beads/ }).click();
  await page.keyboard.press('Control+c');

  const other = await context.newPage();
  await other.goto('/frame-maker/');
  await expect(other.getByRole('img', { name: /Preview of/ })).toBeVisible();
  await pick(other, 'Glowing runes');
  const before = await layerNames(other);
  await other.getByRole('treeitem').first().click();
  await other.keyboard.press('Control+v');
  await expect(other.getByRole('status')).toContainText('Pasted "Beads"');
  const after = await layerNames(other);
  expect(after).toHaveLength(before.length + 1);
  expect(after[0]).toBe('Beads');

  // Cut in the first tab, then paste back: the layer returns, as one undo step.
  await page.bringToFront();
  await page.getByRole('treeitem', { name: /Beads/ }).click();
  await page.keyboard.press('Control+x');
  await expect(page.getByRole('treeitem', { name: /Beads/ })).toHaveCount(0);
  await page.keyboard.press('Control+v');
  await expect(page.getByRole('treeitem', { name: /Beads/ })).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(page.getByRole('treeitem', { name: /Beads/ })).toHaveCount(0);
});

test('export a picture at any size and a sheet of every shape', async ({ page }) => {
  await openSample(page, 'jewelled');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Picture size').selectOption('custom');
  await page.getByLabel('Size in pixels').fill('300');
  let downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  let bytes = readFileSync(await (await downloading).path());
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([300, 300]);

  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Export as').selectOption('sheet');
  await page.getByLabel('Picture size').selectOption('256');
  downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const sheet = await downloading;
  expect(sheet.suggestedFilename()).toBe('Jewelled-every-shape.png');
  bytes = readFileSync(await sheet.path());
  // Five shapes, each 256 px, with a 16 px gap between them.
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([5 * 256 + 4 * 16, 256]);
  // See-through around the token: the top-left corner pixel of the sheet has no colour.
  const img = await loadImage(bytes);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  expect(ctx.getImageData(0, 0, 1, 1).data[3]).toBe(0);
});

test('keyboard: reach the layers and move one on the canvas with the arrow keys', async ({ page }) => {
  await openSample(page, 'jewelled');
  await page.getByRole('treeitem', { name: /Gems/ }).click();
  const data = async () => {
    await page.getByRole('radio', { name: 'Advanced' }).click();
    await page.getByText('Advanced: project data').click();
    const v = JSON.parse(await page.getByLabel('Project data').inputValue());
    await page.getByRole('radio', { name: 'Basic' }).click();
    return v;
  };
  const gems = (p: { layers: { type: string; children?: { name: string; along: number }[] }[] }) => p.layers.flatMap((l) => l.children ?? []).find((l) => l.name === 'Gems')!;
  const before = gems(await data());
  await page.getByTestId('overlay').focus();
  // The gems sit on the right-hand side: down the screen is clockwise round the token.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  const after = gems(await data());
  expect(after.along).toBeGreaterThan(before.along);
  // One undo step per key press.
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  expect(gems(await data()).along).toBe(before.along);
});

test('accessibility: no serious problems in the editor, its menus and dialogs, or the welcome card', async ({ page }) => {
  // Scanning New, which lists every built-in frame, takes a while under load.
  test.setTimeout(60_000);
  await openSample(page, 'brass-beads');
  await page.getByRole('treeitem', { name: /Beads/ }).click();
  expect(await axe(page)).toEqual([]);

  await page.getByRole('radio', { name: 'Advanced' }).click();
  await page.getByText('Advanced: project data').click();
  expect(await axe(page)).toEqual([]);
  await page.getByRole('radio', { name: 'Basic' }).click();

  await page.getByRole('button', { name: 'Add layer' }).click();
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Export' }).click();
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press('Escape');

  for (const [open, name] of [
    [() => page.getByRole('button', { name: 'New' }).click(), 'New project'],
    [() => page.getByRole('button', { name: 'Your library' }).click(), 'Your library'],
  ] as const) {
    await open();
    await expect(page.getByRole('dialog', { name })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await axe(page), name).toEqual([]);
    await page.keyboard.press('Escape');
  }

  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome to Frame Maker' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test.describe('a first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('shows the welcome card once', async ({ page }) => {
    const card = page.getByRole('dialog', { name: 'Welcome to Frame Maker' });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Show me the templates' }).click();
    await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByRole('img', { name: /Preview of/ })).toBeVisible();
    await expect(card).toBeHidden();
  });
});
