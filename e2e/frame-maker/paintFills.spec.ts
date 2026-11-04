import { expect, test, type Page } from '@playwright/test';

// Icons, photo textures, paint fills and reset buttons in the browser.

const data = async (page: Page) => JSON.parse(await page.getByLabel('Project data').inputValue());
const previewHash = (page: Page) =>
  page.getByTestId('preview').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0;
    return h;
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('radio', { name: 'Advanced' }).click();
  await page.getByText('Advanced: project data').click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('dialog', { name: 'New project' }).getByRole('button', { name: /Blank project/ }).click();
});

test('a photo texture is added as a band, drawn once its picture arrives, and exports as the preview shows it', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Texture…/ }).click();
  const photos = page.getByRole('dialog', { name: 'Add a texture' }).getByRole('region', { name: 'Photo textures' });
  await photos.getByRole('button', { name: 'Wood planks' }).click();
  await expect.poll(async () => (await data(page)).layers[0].paint).toMatchObject({ kind: 'picture', picture: 'wood-planks', bend: true });
  // The preview gets the photo (not just its average colour): it changes when the photo is turned.
  await expect(page.getByRole('combobox', { name: 'Photo' })).toHaveValue('wood-planks');
  await page.waitForTimeout(500);
  const before = await previewHash(page);
  await page.getByLabel('Turn the photo value').fill('90');
  await page.getByLabel('Turn the photo value').press('Enter');
  await expect.poll(() => previewHash(page)).not.toBe(before);
  // Reset puts it back, and the picture with it.
  await page.getByRole('button', { name: 'Reset Turn the photo' }).click();
  await expect.poll(() => previewHash(page)).toBe(before);
});

test('an ornament is filled with a photo, each on its own', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Repeated shapes/ }).click();
  await page.getByRole('combobox', { name: 'Shape', exact: true }).selectOption('skull');
  await page.waitForTimeout(300);
  const plain = await previewHash(page);
  await page.getByRole('combobox', { name: 'Fill with' }).selectOption('paint');
  await page.getByRole('combobox', { name: 'Paint' }).selectOption('picture');
  await page.getByRole('combobox', { name: 'Photo' }).selectOption('lava');
  await page.getByText('Paint each one on its own').click();
  await expect.poll(async () => (await data(page)).layers[0]).toMatchObject({ element: 'skull', fillPaint: { kind: 'picture', picture: 'lava' }, paintEach: true });
  await expect.poll(() => previewHash(page)).not.toBe(plain);
});

test('the artwork credits are one click from Help', async ({ page }) => {
  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByText('Artwork credits').click();
  await expect(page.getByRole('link', { name: 'Poly Haven' })).toBeVisible();
});
