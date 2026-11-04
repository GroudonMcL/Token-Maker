import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { openSection } from './panel';

// Phase 4: background, foreground overlays and lighting (DESIGN.md §6.3–6.5).
// Since v8 background removal is in Background and the overlays are effects.
// Done when: a character on a blurred forest background with a vignette and
// torchlight from below, and the export matches the preview.

const FLAT = 'e2e/token-maker/fixtures/flat-goblin.png';
type Rgb = number[];

/** Phone tab for each section. */
async function exportPixels(page: Page, isMobile: boolean, points: [number, number][]): Promise<Rgb[]> {
  const download = page.waitForEvent('download');
  if (isMobile) await page.locator('.bottom-sheet__summary').getByRole('button', { name: 'Export' }).click();
  else await page.locator('.bottom-bar').getByRole('button', { name: 'Export PNG' }).click();
  const img = await loadImage(readFileSync(await (await download).path()));
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return points.map(([fx, fy]) => [...ctx.getImageData(Math.round(fx * img.width), Math.round(fy * img.height), 1, 1).data].slice(0, 3));
}

async function previewPixels(page: Page, points: [number, number][]): Promise<Rgb[]> {
  await page.waitForTimeout(800); // the full-size art arrives from the worker
  return page.getByTestId('token-canvas').evaluate((canvas: HTMLCanvasElement, pts) => {
    const ctx = canvas.getContext('2d')!;
    return pts.map(([fx, fy]) => [...ctx.getImageData(Math.round(fx * canvas.width), Math.round(fy * canvas.height), 1, 1).data].slice(0, 3));
  }, points);
}

const lum = (p: Rgb) => 0.299 * p[0]! + 0.587 * p[1]! + 0.114 * p[2]!;
const near = (a: Rgb, b: Rgb, tolerance: number) => a.every((v, i) => Math.abs(v - b[i]!) <= tolerance);

async function setNumber(scope: ReturnType<Page['locator']>, label: string, value: string) {
  const box = scope.getByRole('textbox', { name: `${label} value`, exact: true });
  await box.fill(value);
  await box.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/token-maker/');
  await page.evaluate(() => {
    localStorage.clear();
    return new Promise((r) => {
      const req = indexedDB.deleteDatabase('token-maker');
      req.onsuccess = req.onerror = req.onblocked = () => r(null);
    });
  });
  await page.reload();
  await page.getByTestId('file-input').first().setInputFiles(FLAT);
  await expect(page.locator('.token-summary__name').first()).toHaveText('Flat Goblin');
});

// Spots on the token: forest above the head, the body, the forest beside the body, the edge.
const SKY: [number, number] = [0.5, 0.22];
const BODY: [number, number] = [0.5, 0.72];
const SIDE: [number, number] = [0.27, 0.6];
const EDGE: [number, number] = [0.5, 0.14];

test('a character on a blurred forest with a vignette and torchlight from below; the export matches the preview', async ({ page, isMobile }) => {
  const m = !!isMobile;
  // Cut the character out of its flat background.
  let panel = await openSection(page, 'Cut-out');
  await panel.getByRole('switch', { name: 'Remove background' }).click();

  // A blurred forest behind it.
  panel = await openSection(page, 'Background');
  await panel.getByRole('radio', { name: 'Picture' }).click();
  await panel.getByRole('radio', { name: 'Forest' }).click();
  // A picture's blur, zoom, position and colours are in Advanced.
  await panel.getByRole('button', { name: 'Advanced' }).click();
  await setNumber(panel, 'Blur', '50');
  const [forest] = await previewPixels(page, [SKY]);
  // The forest is greenish, not the flat background or the dark backing.
  expect(forest![1]!).toBeGreaterThan(forest![2]!);
  expect(lum(forest!)).toBeGreaterThan(30);

  // A vignette.
  panel = await openSection(page, 'Effects');
  const [edgeBefore] = await previewPixels(page, [EDGE]);
  await panel.getByRole('button', { name: /^Vignette$/ }).click();
  await expect(panel.getByRole('list', { name: 'Effects, top first' }).getByRole('listitem')).toHaveCount(1);
  const [edgeAfter] = await previewPixels(page, [EDGE]);
  expect(lum(edgeAfter!)).toBeLessThan(lum(edgeBefore!) - 10);

  // Torchlight: from below and warm.
  panel = await openSection(page, 'Lighting');
  const [bodyBefore] = await previewPixels(page, [BODY]);
  await panel.getByRole('button', { name: /Torchlight/ }).click();
  await expect(panel.getByRole('slider', { name: 'Light comes from' })).toHaveAttribute('aria-valuenow', '90');
  await expect(panel.getByRole('switch', { name: 'Art', exact: true })).toHaveAttribute('aria-checked', 'true');
  const [bodyAfter, skyLit] = await previewPixels(page, [BODY, SKY]);
  expect(near(bodyAfter!, bodyBefore!, 4)).toBe(false);
  // The forest is lit too: the lower part, nearer the torch, is warmer than the top.
  expect(skyLit![0]! - skyLit![2]!).toBeGreaterThan(forest![0]! - forest![2]!);

  // The export matches the preview.
  const points = [SKY, BODY, SIDE];
  const preview = await previewPixels(page, points);
  const exported = await exportPixels(page, m, points);
  points.forEach((p, i) => expect(near(exported[i]!, preview[i]!, 28), `pixel at ${p}: export ${exported[i]} vs preview ${preview[i]}`).toBe(true));
});

test('overlays can be reordered, hidden and removed; presets stay editable', async ({ page }) => {
  let panel = await openSection(page, 'Effects');
  await panel.getByRole('button', { name: /^Edge shadow$/ }).click();
  await panel.getByRole('button', { name: /^Vignette$/ }).click();
  const names = () => panel.locator('.overlay-card').evaluateAll((items) => items.map((i) => i.getAttribute('data-effect')));
  expect(await names()).toEqual(['vignette', 'edgeShadow']); // newest on top
  await panel.getByRole('button', { name: 'Move Vignette down' }).click();
  expect(await names()).toEqual(['edgeShadow', 'vignette']);
  await panel.getByRole('button', { name: 'Hide Edge shadow' }).click();
  await expect(panel.getByRole('button', { name: 'Show Edge shadow' })).toBeVisible();
  await panel.getByRole('button', { name: 'Remove Edge shadow' }).click();
  expect(await names()).toEqual(['vignette']);
  await page.getByRole('button', { name: 'Undo' }).first().click();
  expect(await names()).toEqual(['edgeShadow', 'vignette']);

  panel = await openSection(page, 'Lighting');
  await panel.getByRole('button', { name: /Moonlight/ }).click();
  await expect(panel.getByRole('button', { name: /Moonlight/ })).toHaveAttribute('aria-pressed', 'true');
  // Changing a setting by hand keeps the light but it's no longer the preset.
  await setNumber(panel, 'Strength', '30');
  await expect(panel.getByRole('button', { name: /Moonlight/ })).toHaveAttribute('aria-pressed', 'false');
  const dial = panel.getByRole('slider', { name: 'Light comes from' });
  await dial.focus();
  await dial.press('ArrowRight');
  await expect(dial).toHaveAttribute('aria-valuenow', '275');
});

test('the background picture moves with sliders and takes colour changes (v11)', async ({ page }) => {
  // Cut the character out, so the background shows above its head.
  await (await openSection(page, 'Cut-out')).getByRole('switch', { name: 'Remove background' }).click();
  const panel = await openSection(page, 'Background');
  await panel.getByRole('radio', { name: 'Picture' }).click();
  await panel.getByRole('radio', { name: 'Water' }).click();
  await expect(panel.getByTestId('background-credit')).toContainText('Claude Monet');
  const [before] = await previewPixels(page, [SKY]);
  // The sea is blue; turned half way round the colour wheel it goes orange.
  expect(before![2]!).toBeGreaterThan(before![0]!);
  await panel.getByRole('button', { name: 'Advanced' }).click();
  await setNumber(panel, 'Hue', '180');
  await expect.poll(async () => (await previewPixels(page, [SKY]))[0]![0]!).toBeGreaterThan(before![0]! + 10);
  await setNumber(panel, 'Saturation', '-100');
  await expect.poll(async () => {
    const [p] = await previewPixels(page, [SKY]);
    return Math.max(p![0]!, p![1]!, p![2]!) - Math.min(p![0]!, p![1]!, p![2]!);
  }).toBeLessThan(8);
  await panel.getByRole('button', { name: 'Reset colours' }).click();
  await expect(panel.getByRole('button', { name: 'Reset colours' })).toBeDisabled();
  // The position sliders move it, and Reset position puts it back.
  await expect(panel.getByRole('button', { name: 'Reset position' })).toBeDisabled();
  await setNumber(panel, 'Move left or right', '40');
  await setNumber(panel, 'Move up or down', '-30');
  await expect(panel.getByRole('button', { name: 'Reset position' })).toBeEnabled();
  await panel.getByRole('button', { name: 'Reset position' }).click();
  await expect(panel.getByRole('textbox', { name: 'Move left or right value' })).toHaveValue('0');
});

test('your own picture as the background, moved on the canvas', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'canvas drag is covered by the brush tests on phones');
  const panel = await openSection(page, 'Background');
  await panel.getByRole('radio', { name: 'Picture' }).click();
  await panel.getByRole('radio', { name: 'Your own' }).click();
  await page.getByTestId('background-file-input').setInputFiles('e2e/token-maker/fixtures/goblin-boss.png');
  // The art is unchanged; the background now has a picture of its own.
  await expect(page.locator('.token-summary__name').first()).toHaveText('Flat Goblin');
  await expect(panel.getByRole('button', { name: 'Reset position' })).toBeDisabled();
  // Choosing a picture here turns on moving it on the canvas, with handles to resize it.
  await expect(panel.getByRole('button', { name: 'Move on the canvas' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('background-scale-handle-2')).toBeVisible();
  const box = (await page.getByTestId('token-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(panel.getByRole('button', { name: 'Reset position' })).toBeEnabled();
  // The art itself didn't move.
  await expect(page.locator('.float-toolbar__readout')).toHaveText('100%');
  // Leaving the section stops moving the background.
  await panel.getByRole('button', { name: 'Move on the canvas' }).click();
  await openSection(page, 'Frame');
  await expect(page.getByRole('toolbar', { name: 'Move background' })).toHaveCount(0);
});
