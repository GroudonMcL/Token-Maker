import { expect, test } from '@playwright/test';
import { BUILT_IN_FRAMES } from '../../src/frame-maker/project/builtInFrames';
import { FRAME_PRESETS } from '../../src/frame-maker/engine/legacy/catalog';

// Token Maker's frames in New, a tab per category: every one is offered, the tiles
// get pictures, and picking one opens it as editable layers (with its own
// lighting where it has some).

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
});

test("Token Maker's frames are offered by category with pictures, and open as editable layers", async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  // All frames: every design and every drawn frame Token Maker lists.
  await expect(dialog.getByRole('tabpanel').locator('.tile')).toHaveCount(BUILT_IN_FRAMES.length + FRAME_PRESETS.length);
  await dialog.getByRole('tab', { name: /^Elements/ }).click();
  const elements = dialog.getByRole('tabpanel', { name: 'Elements' });
  // Pictures are drawn as tiles come into view.
  const tiles = await elements.locator('.tile').all();
  for (const tile of tiles) await tile.scrollIntoViewIfNeeded();
  await expect(elements.locator('.tile img')).toHaveCount(tiles.length, { timeout: 30_000 });
  await elements.getByRole('button', { name: 'Hellfire ring', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Preview of Hellfire ring' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Burning cracks/ })).toBeVisible();

  // Its lighting came with it.
  await page.getByRole('radio', { name: 'Advanced' }).click();
  await page.getByText('Advanced: project data').click();
  const data = JSON.parse(await page.getByLabel('Project data').inputValue());
  expect(data.stage.bloom).toBeGreaterThan(0);

  // Another, then undo isn't needed: New replaces the design.
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('tab', { name: /^Metal & Gems/ }).click();
  await page.getByRole('tabpanel', { name: 'Metal & Gems' }).getByRole('button', { name: 'Celtic knot', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Preview of Celtic knot' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Knotwork/ })).toBeVisible();
});
