import { expect, test, type Page } from '@playwright/test';
import { openSection, setMenuStyle } from './panel';

// Owner feedback after Phase 10 (document v8): menu styles, slider resets,
// the resizable panel, the two-way theme, picture effects and decorations,
// plain and turned labels, the new creature sizes, and a clear message when
// the image server is missing.

async function sample(page: Page) {
  await page.goto('/token-maker/');
  await page.getByRole('button', { name: /Try a sample/ }).click();
  await expect(page.locator('.token-summary__name').first()).toHaveText('True Goblin');
}

test('menu style hides, folds or shows the Advanced settings, and is remembered', async ({ page }) => {
  await sample(page);
  const style = (name: 'Simple' | 'Expert') => setMenuStyle(page, name);
  await style('Simple');
  let panel = await openSection(page, 'Colour');
  await expect(panel.getByRole('button', { name: 'Advanced' })).toHaveCount(0);
  await expect(panel.getByRole('textbox', { name: 'Hue value' })).toHaveCount(0);
  await style('Expert');
  panel = await openSection(page, 'Colour');
  await expect(panel.getByRole('button', { name: 'Advanced' })).toHaveCount(0);
  await expect(panel.getByRole('textbox', { name: 'Hue value' })).toBeVisible();
  await page.reload();
  panel = await openSection(page, 'Colour');
  await expect(panel.getByRole('textbox', { name: 'Hue value' })).toBeVisible();
});

test('a slider reset button puts its default back as one undo step', async ({ page }) => {
  await sample(page);
  const panel = await openSection(page, 'Colour');
  const box = panel.getByRole('textbox', { name: 'Brightness value' });
  await box.fill('40');
  await box.press('Enter');
  const reset = panel.getByRole('button', { name: 'Reset Brightness' });
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(box).toHaveValue('0');
  await expect(reset).toBeDisabled();
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await expect(box).toHaveValue('40');
});

test('the side panel can be dragged wider, and Themes picks a light or dark theme', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'phones use the bottom sheet');
  await page.goto('/token-maker/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const panel = page.getByRole('complementary', { name: 'Token settings' });
  const before = (await panel.boundingBox())!.width;
  const handle = page.getByRole('separator', { name: 'Resize the settings panel' });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x - 120, box.y + 100, { steps: 6 });
  await page.mouse.up();
  const wider = (await panel.boundingBox())!.width;
  expect(wider).toBeGreaterThan(before + 80);
  await page.reload();
  expect(Math.abs((await panel.boundingBox())!.width - wider)).toBeLessThan(4);
  await handle.dblclick();
  expect(Math.abs((await panel.boundingBox())!.width - before)).toBeLessThan(4);

  // One Themes menu instead of a light/dark switch; Light and Day are light, the rest dark.
  await page.getByRole('button', { name: 'Themes' }).click();
  await page.getByRole('menuitemradio', { name: /^Light/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'light');
  await page.getByRole('button', { name: 'Themes' }).click();
  await page.getByRole('menuitemradio', { name: /^Sunset/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'sunset');
});

test('picture effects and decorations, and a plain label turned round its anchor', async ({ page }) => {
  await sample(page);
  let panel = await openSection(page, 'Effects');
  await panel.locator('[data-effect-picture="fx-twinkles"]').click();
  const card = panel.getByRole('list', { name: 'Effects, top first' }).getByRole('listitem');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Twinkles');
  await expect(card.getByRole('textbox', { name: 'Rotation value' })).toBeVisible();

  panel = await openSection(page, 'Decorations');
  await panel.locator('[data-decoration-picture="deco-orn-laurel-wreath"]').click();
  await expect(panel.getByRole('list', { name: 'Decorations, top first' }).getByRole('listitem')).toContainText('Laurel wreath');

  panel = await openSection(page, 'Label');
  await panel.getByRole('button', { name: 'Add a label' }).click();
  await panel.getByRole('radio', { name: 'Plain text' }).click();
  await panel.getByRole('radio', { name: 'Free' }).click();
  await panel.locator('[data-anchor="left"]').click();
  await expect(panel.locator('[data-anchor="left"]')).toHaveAttribute('aria-checked', 'true');
  const rotation = panel.getByRole('textbox', { name: 'Rotation value' });
  await rotation.fill('-20');
  await rotation.press('Enter');
  await expect(rotation).toHaveValue('-20');
  await expect(panel.getByText('Shape colour')).toHaveCount(0); // no shape behind plain text

  // Everything survives a reload, pictures included.
  await page.waitForTimeout(1200);
  await page.reload();
  panel = await openSection(page, 'Effects');
  await expect(panel.getByRole('list', { name: 'Effects, top first' }).getByRole('listitem')).toContainText('Twinkles');
});

test('Small covers 0.8 of a square and Tiny half of one', async ({ page }) => {
  await sample(page);
  const panel = await openSection(page, 'Size');
  await panel.getByRole('radio', { name: 'Small' }).click();
  await expect(panel.getByText(/Covers 0.8 of a square/)).toBeVisible();
  await panel.getByRole('radio', { name: 'Tiny' }).click();
  await expect(panel.getByText(/Covers ½ square/)).toBeVisible();
  // All seven size buttons fit inside the panel.
  const row = (await panel.locator('.segmented__row').first().boundingBox())!;
  for (const b of await panel.locator('.segmented__row').first().getByRole('radio').all()) {
    const r = (await b.boundingBox())!;
    expect(r.x + r.width).toBeLessThanOrEqual(row.x + row.width + 1);
  }
});

test('a web link explains when the image server is missing instead of a JSON error', async ({ page }) => {
  await page.goto('/token-maker/');
  // Like a static deploy: every /api address answers with the editor's page.
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Token Maker</title>' }));
  const panel = await openSection(page, 'Import');
  await panel.getByLabel('Web address').fill('https://www.example.com/goblins/');
  await panel.getByRole('button', { name: 'Get' }).click();
  await expect(panel.getByText('That site blocks direct loading. Right-click the image, choose “Copy image”, then press Ctrl+V here.')).toBeVisible();
});
