import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Phase 5 on a phone (Pixel 7: touch, 412 px wide): the canvas on top and the
// panels in a sheet under it, every target at least 44 px, dragging with a
// finger, and no serious accessibility problems.

/** Touches the screen at (x, y), moves to (x2, y2) in steps and lifts: real touch events, as a finger makes. */
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const point = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point({ x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 }) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function data(page: Page) {
  await page.getByRole('tab', { name: 'Properties' }).tap();
  await page.getByRole('radio', { name: 'Advanced' }).tap();
  await page.getByText('Advanced: project data').tap();
  const v = JSON.parse(await page.getByLabel('Project data').inputValue());
  await page.getByRole('radio', { name: 'Basic' }).tap();
  return v;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
});

test('the panels sit in a sheet under the canvas, and every target is big enough for a finger', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Layers' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tree', { name: /Layers/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Properties' })).toHaveCount(0);
  // The canvas is a good size, not squeezed by the controls.
  const canvas = (await page.getByTestId('overlay').boundingBox())!;
  expect(canvas.width).toBeGreaterThan(250);
  // Nothing scrolls sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('tab', { name: 'Properties' }).tap();
  await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();

  for (const tab of ['Layers', 'Properties']) {
    await page.getByRole('tab', { name: tab }).tap();
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.topbar button, .sheet button, .sheet select, .sheet input'))
        .filter((el) => el.offsetParent !== null && !el.classList.contains('help-tip') && el.getAttribute('type') !== 'range')
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        // Toggles are the whole row (label included); a colour picker's hex box sits beside it.
        .filter(({ el, r }) => (el.matches('[role="switch"]') ? (el.closest('label')!.getBoundingClientRect().height < 44) : r.height < 44 || (r.width < 44 && !el.matches('[type="checkbox"]'))))
        .map(({ el, r }) => `${el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(small, tab).toEqual([]);
  }
});

test('a shape is dragged round the band with a finger', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).tap();
  await page.getByRole('menuitem', { name: /^Shape/ }).tap();
  const before = (await data(page)).layers.at(-1);
  expect(before).toMatchObject({ type: 'shape', along: 0 });
  // The new shape sits at the top of the band; drag it to the right-hand side.
  const box = (await page.getByTestId('overlay').boundingBox())!;
  const r = box.width / 2;
  const across = r * (1 - 0.1 - 0.07);
  await swipe(page, { x: box.x + r, y: box.y + r - across }, { x: box.x + r + across * 0.7, y: box.y + r - across * 0.7 });
  const after = (await data(page)).layers.at(-1);
  expect(after.along).toBeGreaterThan(0.08);
  expect(after.along).toBeLessThan(0.17);
});

test('the library and copy and paste work from the touch layout', async ({ page }) => {
  await page.getByRole('treeitem').first().tap();
  await page.getByRole('button', { name: 'Add to library' }).tap();
  await page.getByRole('button', { name: 'Your library' }).tap();
  const lib = page.getByRole('dialog', { name: 'Your library' });
  await lib.getByRole('button', { name: 'Stamped', exact: true }).tap();
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Copy' }).tap();
  await page.getByRole('button', { name: 'Add layer' }).tap();
  await page.getByRole('menuitem', { name: /Paste layers/ }).tap();
  await expect(page.getByRole('treeitem')).toHaveCount(3);
});

test('accessibility on a phone: no serious problems', async ({ page }) => {
  const check = async () => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
    return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };
  expect(await check()).toEqual([]);
  await page.getByRole('tab', { name: 'Properties' }).tap();
  expect(await check()).toEqual([]);
});
