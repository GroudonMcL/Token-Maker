import { expect, test, type Page } from '@playwright/test';

// Phase 4: Token Maker frames as editable layers, in the browser. The
// conversions are measured against the originals in the unit tests
// (src/project/convert.test.ts); here the same measure is taken on the real
// preview canvas, through the template picker and the Properties button.

/** The project as the Advanced data view shows it (opened in beforeEach, so the preview keeps its size). */
const data = async (page: Page) => JSON.parse(await page.getByLabel('Project data').inputValue());

/** Keeps a copy of the preview's pixels in the page, under `key` (copying them out of the browser is slow). */
const snapshot = (page: Page, key: string) =>
  page.getByTestId('preview').evaluate((c: HTMLCanvasElement, k) => {
    const w = window as unknown as { snaps?: Record<string, Uint8ClampedArray> };
    w.snaps = { ...w.snaps, [k]: c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data };
  }, key);

/** Mean difference per channel (0–255) and share of visibly different pixels (%) between two snapshots, premultiplied, as src/render/compare.ts measures. */
const compare = (page: Page, a: string, b: string) =>
  page.evaluate(
    ([ka, kb]) => {
      const snaps = (window as unknown as { snaps: Record<string, Uint8ClampedArray> }).snaps;
      const [x, y] = [snaps[ka], snaps[kb]];
      if (x.length !== y.length) throw new Error(`The preview changed size (${x.length} → ${y.length} values)`);
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

async function pick(page: Page, name: string) {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('button', { name, exact: true }).click();
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

test('done when: Polished and Paladin open as editable layer stacks that match the originals', async ({ page }) => {
  // The agreed limits (src/project/convert.test.ts).
  for (const [name, limit] of [
    ['Polished', { mean: 0.15, over: 0.01 }],
    ['Paladin', { mean: 2.5, over: 5 }],
  ] as const) {
    await pick(page, name);
    await snapshot(page, 'original');
    expect((await data(page)).layers.map((l: { type: string }) => l.type)).toEqual(['legacyFrame']);

    await pick(page, `${name} Editable`);
    const project = await data(page);
    expect(project.name).toBe(name);
    expect(project.layers.length).toBeGreaterThan(4);
    expect(project.layers.map((l: { type: string }) => l.type)).not.toContain('legacyFrame');
    await expect(page.getByRole('treeitem', { name: /Outer rim \(lit\)/ })).toBeVisible();
    await snapshot(page, 'editable');
    const d = await compare(page, 'original', 'editable');
    expect(d.mean, `${name}: mean difference`).toBeLessThanOrEqual(limit.mean);
    expect(d.over, `${name}: visibly different pixels (%)`).toBeLessThanOrEqual(limit.over);
  }
  // Every part can be changed: Paladin's crosses, for one.
  await page.getByRole('treeitem', { name: /Gold crosses/ }).click();
  await expect(page.getByRole('combobox', { name: 'Shape', exact: true })).toHaveValue('cross');
});

test('a Token Maker frame layer turns into editable layers from its Properties, follows the light, and undo brings it back', async ({ page }) => {
  await pick(page, 'Paladin');
  await snapshot(page, 'original');
  await page.getByRole('button', { name: 'Turn into editable layers' }).click();
  await expect(page.getByText('Group', { exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Gold crosses/ })).toBeVisible();
  const layers = (await data(page)).layers;
  expect(layers).toHaveLength(1);
  expect(layers[0]).toMatchObject({ type: 'group', name: 'Paladin' });
  await snapshot(page, 'converted');
  expect((await compare(page, 'original', 'converted')).mean).toBeLessThanOrEqual(2.5);

  // The converted frame follows the light; the original couldn't.
  const dial = page.getByRole('slider', { name: 'Light direction' });
  const box = (await dial.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.85);
  await expect(dial).toHaveAttribute('aria-valuenow', '45');
  await snapshot(page, 'lit from the bottom right');
  expect((await compare(page, 'converted', 'lit from the bottom right')).mean).toBeGreaterThan(3);

  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  expect((await data(page)).layers[0]).toMatchObject({ type: 'legacyFrame', presetId: 'paladin' });
});

test('the template picker marks converted frames as editable and keeps every original', async ({ page }) => {
  await page.getByRole('button', { name: 'New' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  const editable = dialog.getByRole('region', { name: 'Token Maker frames as editable layers' });
  // Every frame but "No frame" (version 10 converted the last four; Cleric was removed in the frame review).
  await expect(editable.locator('.tile')).toHaveCount(25);
  // Pictures are drawn as tiles come into view.
  for (const tile of await editable.locator('.tile').all()) await tile.scrollIntoViewIfNeeded();
  await expect(editable.locator('.tile img')).toHaveCount(25, { timeout: 20_000 });
  await expect(editable.getByText('Editable').first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Stamped', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Stamped Editable' })).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'No frame Editable' })).toHaveCount(0);
});
