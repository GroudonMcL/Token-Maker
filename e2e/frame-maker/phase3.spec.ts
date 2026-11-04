import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Phase 3: texture layers, the texture library and the per-layer cache.

/** The project as the Advanced data view shows it. */
async function data(page: Page) {
  const box = page.getByLabel('Project data');
  if (!(await box.isVisible())) await page.getByText('Advanced: project data').click();
  return JSON.parse(await box.inputValue());
}

const drawn = (page: Page) => page.getByTestId('preview').getAttribute('data-drawn');

/** Adds a texture from the library, with or without a band under it. */
async function addTexture(page: Page, name: string, withBand = false) {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Texture…/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a texture' });
  await expect(dialog).toBeVisible();
  const band = dialog.getByRole('switch', { name: /matching band colour/ });
  if ((await band.isChecked()) !== withBand) await dialog.getByText(/matching band colour/).click();
  await dialog.getByRole('button', { name, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function setValue(page: Page, label: string, value: string) {
  const box = page.getByLabel(`${label} value`);
  await box.fill(value);
  await box.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: /Blank project/ }).click();
});

test('the texture library shows every texture with a picture and adds one', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Texture…/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a texture' });
  const drawn = dialog.getByRole('region', { name: 'Drawn textures' });
  await expect(drawn.locator('.tile')).toHaveCount(35);
  // Every tile gets its picture as it comes into view, the photo textures' too.
  for (const tile of await drawn.locator('.tile').all()) await tile.scrollIntoViewIfNeeded();
  await expect(drawn.locator('.tile img')).toHaveCount(35, { timeout: 15_000 });
  // Pictures are drawn as tiles come into view.
  const photos = dialog.getByRole('region', { name: 'Photo textures' });
  for (const tile of await photos.locator('.tile').all()) await tile.scrollIntoViewIfNeeded();
  await expect(photos.locator('.tile img')).toHaveCount(32, { timeout: 20_000 });
  // A blank project gets a band under the texture by default.
  await expect(dialog.getByRole('switch', { name: /matching band colour/ })).toBeChecked();
  await dialog.getByRole('button', { name: 'Wood grain', exact: true }).click();
  await page.getByRole('radio', { name: 'Advanced' }).click();
  const layers = (await data(page)).layers;
  expect(layers.map((l: { type: string }) => l.type)).toEqual(['bandFill', 'texture']);
  expect(layers[1]).toMatchObject({ kind: 'wood', from: 0, to: 1 });
  await expect(page.getByRole('treeitem', { name: /Wood grain/ }).first()).toBeVisible();
});

test('texture settings change the picture and are one undo step each', async ({ page }) => {
  await addTexture(page, 'Hammered metal', true);
  const hash = () => page.getByTestId('preview').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const before = await hash();
  await setValue(page, 'How many', '200');
  expect(await hash()).not.toBe(before);
  await page.getByLabel('Where').selectOption('shaded');
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await hash()).toBe(before);
});

test('done when: marble, hammered metal and stars render the same in the preview and the export, and editing one redraws only that one', async ({ page }) => {
  await page.getByText('Show sample picture').click();
  await expect(page.getByRole('switch', { name: 'Show sample picture' })).not.toBeChecked();
  await addTexture(page, 'Marble', true);
  await addTexture(page, 'Hammered metal');
  await addTexture(page, 'Starfield');
  await page.getByRole('radio', { name: 'Advanced' }).click();
  const kinds = (await data(page)).layers.map((l: { kind?: string; type: string }) => l.kind ?? l.type);
  expect(kinds).toEqual(['bandFill', 'marble', 'hammered', 'scatter']);

  // Editing the stars redraws only the stars; the band, marble and metal come from the cache.
  await setValue(page, 'Strength', '150');
  await expect.poll(() => drawn(page)).toBe('1');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-reused', '3');
  // Fading a layer redraws nothing at all.
  await page.getByRole('tree', { name: /Layers/ }).getByRole('treeitem', { name: /Marble Texture/ }).click();
  await setValue(page, 'Opacity', '80');
  await expect.poll(() => drawn(page)).toBe('0');

  // The exported picture, scaled to the preview's size, matches the preview.
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('dialog', { name: 'Export' }).getByLabel('Picture size').selectOption('1024');
  const exporting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const png = readFileSync(await (await exporting).path()).toString('base64');
  const diff = await page.getByTestId('preview').evaluate(async (preview: HTMLCanvasElement, b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = preview.width;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const a = ctx.getImageData(0, 0, c.width, c.height).data;
    const b = preview.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let painted = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
      if (i % 4 === 3 && b[i] > 0) painted++;
    }
    return { mean: sum / a.length, painted: painted / (a.length / 4) };
  }, png);
  console.log(`export vs preview: mean difference ${diff.mean.toFixed(2)} of 255`);
  expect(diff.painted).toBeGreaterThan(0.1);
  expect(diff.mean).toBeLessThan(3);
});
