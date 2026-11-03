import { expect, test } from '@playwright/test';
import { openSection } from './panel';

test.beforeEach(async ({ page }) => {
  await page.goto('/token-maker/');
  await page.evaluate(() => localStorage.removeItem('tm.frameRanking'));
  await page.reload();
});

test('sort frames into tiers with tags, compare them, and the picker shows that order', async ({ page }) => {
  const panel = await openSection(page, 'Frame & shape');
  await panel.getByRole('button', { name: 'Change frame' }).click();
  const gallery = page.getByRole('dialog', { name: 'Choose a frame' });
  await expect(gallery.getByRole('tab', { name: /My ranking/ })).toHaveCount(0);
  await gallery.getByRole('button', { name: 'Rank & tag' }).click();
  const ranker = page.getByRole('dialog', { name: 'Rank & tag frames' });

  // Tiers: the first two frames in S (the first tagged Gems), the third in A.
  await ranker.getByRole('button', { name: 'Sort into tiers' }).click();
  const current = ranker.locator('.ranker__tier-frame strong').first();
  await expect(current).toHaveText('Simple');
  await ranker.getByRole('group', { name: 'Tags for Simple' }).getByRole('button', { name: 'Gems', exact: true }).click();
  await page.keyboard.press('1');
  await expect(current).not.toHaveText('Simple');
  const second = (await current.textContent())!;
  await page.keyboard.press('s');
  await expect(current).not.toHaveText(second);
  const third = (await current.textContent())!;
  await ranker.getByRole('group', { name: `Tier for ${third}` }).getByRole('button', { name: /^A/ }).click();
  await expect(ranker.getByText(/^3 of \d+ frames in a tier/)).toBeVisible();

  // Compare within tier S: one choice.
  await ranker.getByRole('tab', { name: 'Start' }).click();
  await ranker.getByRole('button', { name: /Tier S only: 2 frames/ }).click();
  await expect(ranker.getByText('Which frame do you like better?')).toBeVisible();
  const winner = (await ranker.locator('.ranker__side--new .ranker__pick strong').textContent())!;
  await page.keyboard.press('ArrowLeft');
  await expect(ranker.getByText('Which frame do you like better?')).toBeHidden();

  // Escape closes the ranker only.
  await page.keyboard.press('Escape');
  await expect(ranker).toBeHidden();
  await expect(gallery).toBeVisible();
  await page.keyboard.press('Escape');
  await panel.getByRole('button', { name: 'Change frame' }).click();

  // The gallery opens on the ranking: the winner, the other S frame, then the A frame.
  await expect(gallery.getByRole('tab', { name: /My ranking/ })).toHaveAttribute('aria-selected', 'true');
  const tiles = gallery.getByRole('radio');
  await expect(tiles.nth(0)).toContainText(winner);
  await expect(tiles.nth(1)).toContainText(winner === 'Simple' ? second : 'Simple');
  await expect(tiles.nth(2)).toContainText(third);

  // Filter by tag, and search finds tags.
  const all = await tiles.count();
  await gallery.getByRole('group', { name: 'Show only frames tagged' }).getByRole('button', { name: 'Gems' }).click();
  // Simple (tagged Gems here) is one of the two S frames, ahead of every other frame with gems.
  await expect(tiles.first()).toContainText('Simple');
  expect(await tiles.count()).toBeLessThan(all);
  await gallery.getByRole('group', { name: 'Show only frames tagged' }).getByRole('button', { name: 'Gems' }).click();
  await gallery.getByRole('searchbox', { name: 'Search frames' }).fill('gems');
  await expect(gallery.getByRole('radio', { name: 'Simple', exact: true })).toBeVisible();

  // It's kept after a reload.
  await page.reload();
  const again = await openSection(page, 'Frame & shape');
  await again.getByRole('button', { name: 'Change frame' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose a frame' }).getByRole('radio').nth(2)).toContainText(third);
});
