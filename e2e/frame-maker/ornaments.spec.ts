import { expect, test, type Page } from '@playwright/test';

// Version 10: the last four Token Maker frames as editable layers, and the
// new ornaments and options, in the browser. The conversions are measured against
// the originals on the real preview, with the limits of
// src/project/convert.test.ts.

const data = async (page: Page) => JSON.parse(await page.getByLabel('Project data').inputValue());

/** Keeps a copy of the preview's pixels in the page, under `key`. */
const snapshot = (page: Page, key: string) =>
  page.getByTestId('preview').evaluate((c: HTMLCanvasElement, k) => {
    const w = window as unknown as { snaps?: Record<string, Uint8ClampedArray> };
    w.snaps = { ...w.snaps, [k]: c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data };
  }, key);

/** Mean difference per channel (0–255) and share of visibly different pixels (%), premultiplied, as src/render/compare.ts measures. */
const compare = (page: Page, a: string, b: string) =>
  page.evaluate(
    ([ka, kb]) => {
      const snaps = (window as unknown as { snaps: Record<string, Uint8ClampedArray> }).snaps;
      const [x, y] = [snaps[ka], snaps[kb]];
      let sum = 0;
      let over = 0;
      for (let i = 0; i < x.length; i += 4) {
        let worst = Math.abs(x[i + 3] - y[i + 3]);
        sum += worst;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(x[i + c] * x[i + 3] - y[i + c] * y[i + 3]) / 255;
          sum += d;
          worst = Math.max(worst, d);
        }
        if (worst > 24) over++;
      }
      return { mean: sum / x.length, over: (over / (x.length / 4)) * 100 };
    },
    [a, b],
  );

async function pick(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  // Found with the search, so it shows whichever tab it is in (Blank project is a button of its own).
  if (typeof name === 'string') await dialog.getByRole('searchbox', { name: 'Search frames' }).fill(name);
  await dialog.getByRole('button', { name, exact: typeof name === 'string' }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('radio', { name: 'Advanced' }).click();
  await page.getByText('Advanced: project data').click();
  await expect(page.getByLabel('Project data')).toBeVisible();
});

test('the last four Token Maker frames open as editable layers that look like the originals', async ({ page }) => {
  // The agreed limits (src/project/convert.test.ts), with a little room for the browser's own drawing.
  for (const [name, mean, over, part] of [
    ['Stamped', 0.3, 0.1, 'Veins and marbling'],
    ['Ranger', 2.9, 8.5, 'Red fletching'],
    ['Bard', 0.7, 0.5, 'Notes'],
    ['Warlock', 2.3, 3.2, 'Eyes'],
  ] as const) {
    await pick(page, name);
    await snapshot(page, 'original');
    await pick(page, `${name} Editable`);
    expect((await data(page)).layers.map((l: { type: string }) => l.type)).not.toContain('legacyFrame');
    await expect(page.getByRole('treeitem', { name: new RegExp(part) }).first()).toBeVisible();
    await snapshot(page, 'editable');
    const d = await compare(page, 'original', 'editable');
    expect(d.mean, `${name}: mean difference`).toBeLessThanOrEqual(mean);
    expect(d.over, `${name}: visibly different pixels (%)`).toBeLessThanOrEqual(over);
  }
});

test('a repeat takes a new ornament, its second colour and random variation; a shape can be an ornament', async ({ page }) => {
  await pick(page, /Blank project/);
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Repeated shapes/ }).click();
  await page.getByRole('combobox', { name: 'Shape', exact: true }).selectOption('watchEye');
  await expect(page.getByRole('switch', { name: 'White of the eye' })).toBeVisible();
  await snapshot(page, 'even');
  await page.getByText('Random variation').click();
  await page.getByLabel('Wander in and out value').fill('40');
  await page.getByLabel('Wander in and out value').press('Enter');
  await expect.poll(async () => (await data(page)).layers[0].wander).toBeCloseTo(0.4);
  await snapshot(page, 'varied');
  expect((await compare(page, 'even', 'varied')).mean).toBeGreaterThan(0.05);
  // A new variation is one click.
  const seed = (await data(page)).layers[0].seed;
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await expect.poll(async () => (await data(page)).layers[0].seed).not.toBe(seed);

  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Shape/ }).click();
  await page.getByRole('combobox', { name: 'Shape', exact: true }).selectOption('ornament');
  await page.getByRole('combobox', { name: 'Ornament' }).selectOption('fleur');
  await expect.poll(async () => (await data(page)).layers[1]).toMatchObject({ type: 'shape', shape: 'ornament', element: 'fleur' });
});

test('a wavy line can fit its waves to the band and take another wave shape', async ({ page }) => {
  await pick(page, /Blank project/);
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Line/ }).click();
  await page.getByText('Wavy', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Wave shape' }).selectOption('square');
  await page.getByText('Fit the waves to the band', { exact: true }).click();
  await expect(page.getByLabel('Waves all the way round value')).toHaveCount(0);
  await expect.poll(async () => (await data(page)).layers[0]).toMatchObject({ waveShape: 'square', waveFit: 1.8 });
  await page.getByText('Raised (small shadow)', { exact: true }).click();
  await expect.poll(async () => (await data(page)).layers[0].raised).toBe(true);
});
