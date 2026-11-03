import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openSection } from './panel';

const frameOrder = JSON.parse(readFileSync('src/token-maker/config/frameOrder.json', 'utf8')) as { order: string[]; tags: Record<string, string[]> };

test.beforeEach(async ({ page }) => {
  await page.goto('/token-maker/');
});

test('the gallery opens on All frames in the ranking, with every tag filter in view', async ({ page, isMobile }) => {
  const panel = await openSection(page, 'Frame & shape');
  await panel.getByRole('button', { name: 'Change frame' }).click();
  const gallery = page.getByRole('dialog', { name: 'Choose a frame' });
  await expect(gallery.getByRole('tab').first()).toHaveText(/^All frames/);
  await expect(gallery.getByRole('tab', { name: /All frames/ })).toHaveAttribute('aria-selected', 'true');
  await expect(gallery.getByRole('radio')).toHaveCount(frameOrder.order.length);
  await expect(gallery.getByRole('radio').first()).toHaveText('Stamped');
  await expect(gallery.getByRole('button', { name: 'Rank & tag' })).toHaveCount(0);

  const row = gallery.getByRole('group', { name: 'Show only frames tagged' });
  const chips = row.getByRole('button');
  expect(await chips.count()).toBeGreaterThan(15);
  if (!isMobile) {
    // Every chip shows in full: the row grows to fit them rather than cutting them off.
    const box = (await row.boundingBox())!;
    for (const chip of await chips.all()) {
      const c = (await chip.boundingBox())!;
      expect(c.y).toBeGreaterThanOrEqual(box.y - 1);
      expect(c.y + c.height).toBeLessThanOrEqual(box.y + box.height + 1);
      expect(c.x + c.width).toBeLessThanOrEqual(box.x + box.width + 1);
    }
  } else {
    // On phones the row is one line that scrolls sideways.
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth && getComputedStyle(el).overflowX === 'auto')).toBe(true);
  }

  // A tag filters every tab, keeping the ranking.
  await chips.filter({ hasText: /^Wood$/ }).click();
  const wood = frameOrder.order.filter((id) => frameOrder.tags[id]?.includes('wood'));
  await expect(gallery.getByRole('radio')).toHaveCount(wood.length);
});
