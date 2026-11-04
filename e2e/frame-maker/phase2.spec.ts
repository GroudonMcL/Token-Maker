import { expect, test, type Page } from '@playwright/test';

// Phase 2: drawing tools. Positions on the canvas are worked out from the
// stage settings: the band starts 10% of the half-size in and is 14% thick.

const previewHash = (page: Page) =>
  page.getByTestId('preview').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0;
    return h;
  });

/** The project as the Advanced data view shows it. */
async function data(page: Page) {
  const box = page.getByLabel('Project data');
  if (!(await box.isVisible())) await page.getByText('Advanced: project data').click();
  return JSON.parse(await box.inputValue());
}

/** The canvas's centre, half-size and the band's width, in screen pixels. */
async function geometry(page: Page) {
  const b = (await page.getByTestId('overlay').boundingBox())!;
  const r = b.width / 2;
  return { cx: b.x + r, cy: b.y + r, r, bw: r * 0.14, top: (across: number) => b.y + r * (0.1 + 0.14 * across) };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: /Blank project/ }).click();
  await page.getByRole('radio', { name: 'Advanced' }).click();
});

/** Draws a five-point gem at the top of the band and closes it by clicking the first point. */
async function drawGem(page: Page) {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Path/ }).click();
  await expect(page.getByText('Click on the canvas to place the first point.')).toBeVisible();
  const { cx, top, bw } = await geometry(page);
  const y = top(0.5);
  const s = bw / 2;
  const points = [
    [cx - 0.5 * s, y - 0.8 * s],
    [cx + 0.5 * s, y - 0.8 * s],
    [cx + 0.9 * s, y - 0.3 * s],
    [cx, y + s],
    [cx - 0.9 * s, y - 0.3 * s],
  ];
  for (const [x, py] of points) await page.mouse.click(x, py);
  await page.mouse.click(points[0][0], points[0][1]);
  return points;
}

test('draw a path by clicking, then edit its points', async ({ page }) => {
  const blank = await previewHash(page);
  const points = await drawGem(page);
  let path = (await data(page)).layers[0];
  expect(path).toMatchObject({ type: 'path', closed: true });
  expect(path.points).toHaveLength(5);
  // It is anchored on the band at the middle of what was drawn.
  const xs = path.points.map((p: { x: number }) => p.x);
  expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0, 1);
  expect(path.along).toBeLessThan(0.01);
  expect(path.across).toBeGreaterThan(0.4);
  expect(path.across).toBeLessThan(0.7);
  expect(await previewHash(page)).not.toBe(blank);

  // Drag the bottom point further down.
  const before = path.points[3].y;
  await page.mouse.move(points[3][0], points[3][1]);
  await page.mouse.down();
  await page.mouse.move(points[3][0], points[3][1] + 12, { steps: 4 });
  await page.mouse.up();
  path = (await data(page)).layers[0];
  expect(path.points[3].y).toBeGreaterThan(before + 0.3);

  // Double-click a point to make it smooth: it gets a curve handle.
  await page.mouse.dblclick(points[2][0], points[2][1]);
  path = (await data(page)).layers[0];
  expect(path.points[2].handle).not.toBeNull();

  // Undo takes back the last change; the drag was a single step.
  await page.getByRole('button', { name: 'Undo' }).click();
  path = (await data(page)).layers[0];
  expect(path.points[2].handle).toBeNull();
  expect(path.points[3].y).toBeGreaterThan(before + 0.3);

  // Delete a point with the Delete key while editing.
  await page.mouse.click(points[1][0], points[1][1]);
  await page.keyboard.press('Delete');
  expect((await data(page)).layers[0].points).toHaveLength(4);
  await page.getByRole('button', { name: 'Done editing' }).click();
});

test('a shape can be moved, resized and turned with its handles', async ({ page }) => {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Shape/ }).click();
  const { cx, top, bw } = await geometry(page);
  const y = top(0.5);
  const unit = (0.8 * bw) / 2;
  const start = (await data(page)).layers[0];

  // The resize handle is at the bottom-right corner of its box.
  await page.mouse.move(cx + unit, y + unit);
  await page.mouse.down();
  await page.mouse.move(cx + unit * 2, y + unit * 2, { steps: 4 });
  await page.mouse.up();
  const bigger = (await data(page)).layers[0];
  expect(bigger.size).toBeGreaterThan(start.size * 1.6);

  // The turn handle sits beyond the box: on the inner side here, as the outer side is off the picture.
  const unit2 = (bigger.size * bw) / 2;
  await page.mouse.move(cx, y + unit2 + 22);
  await page.mouse.down();
  await page.mouse.move(cx + 60, y, { steps: 6 });
  await page.mouse.up();
  const turned = (await data(page)).layers[0];
  expect(Math.abs(turned.rotation)).toBeGreaterThan(45);

  // Dragging its middle moves it round the band.
  await page.mouse.move(cx, y);
  await page.mouse.down();
  await page.mouse.move(cx + 80, y + 10, { steps: 6 });
  await page.mouse.up();
  const moved = (await data(page)).layers[0];
  expect(moved.along).toBeGreaterThan(0.03);
});

test('done when: a mirrored gem grouped with alternating diamonds follows a hexagon, lit from the bottom right', async ({ page }) => {
  // A ring of diamonds in two alternating colours.
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Repeated shapes/ }).click();
  await page.getByLabel('Shape', { exact: true }).selectOption('diamond');
  await page.getByText('Patterns', { exact: true }).click();
  await page.getByRole('group', { name: 'Alternate colours' }).getByRole('button', { name: 'Add' }).click();

  // A custom gem, moved a quarter of the way round and mirrored on the other side.
  await drawGem(page);
  await page.getByRole('button', { name: 'Done editing' }).click();
  await page.getByLabel('Round the token (from the top) value').fill('25');
  await page.getByLabel('Round the token (from the top) value').press('Enter');
  await page.getByLabel('Mirror').selectOption('leftRight');

  // Group the gem with the diamonds.
  await page.getByRole('treeitem', { name: /Repeated shapes/ }).click({ modifiers: ['ControlOrMeta'] });
  await page.getByRole('button', { name: 'Group', exact: true }).click();
  let project = await data(page);
  expect(project.layers).toHaveLength(1);
  const group = project.layers[0];
  expect(group.type).toBe('group');
  expect(group.children.map((l: { type: string }) => l.type)).toEqual(['repeat', 'path']);
  const gem = group.children[1];
  expect(gem).toMatchObject({ mirror: 'leftRight', along: 0.25, place: 'band' });
  expect(group.children[0].altColors).toHaveLength(1);

  // A hexagon token: the design is still anchored to the band, so nothing in it changes.
  const onCircle = await previewHash(page);
  await page.getByRole('radio', { name: 'Hexagon' }).click();
  expect(await previewHash(page)).not.toBe(onCircle);
  project = await data(page);
  expect(project.stage.shape).toBe('hexagon');
  expect(project.layers[0].children[1]).toMatchObject({ along: gem.along, across: gem.across, size: gem.size });

  // Light from the bottom right.
  const onHexagon = await previewHash(page);
  const dial = page.getByRole('slider', { name: 'Light direction' });
  const d = (await dial.boundingBox())!;
  await page.mouse.click(d.x + d.width * 0.85, d.y + d.height * 0.85);
  await expect(dial).toHaveAttribute('aria-valuenow', '45');
  await expect(dial).toHaveAttribute('aria-valuetext', /bottom right/);
  expect(await previewHash(page)).not.toBe(onHexagon);
  expect((await data(page)).stage.light).toBe(45);
});

test('the light dial works from the keyboard and resets to the top left', async ({ page }) => {
  const dial = page.getByRole('slider', { name: 'Light direction' });
  await expect(dial).toHaveAttribute('aria-valuenow', '225');
  await dial.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(dial).toHaveAttribute('aria-valuenow', '240');
  await page.getByRole('button', { name: 'Light from the top left again' }).click();
  await expect(dial).toHaveAttribute('aria-valuenow', '225');
});
