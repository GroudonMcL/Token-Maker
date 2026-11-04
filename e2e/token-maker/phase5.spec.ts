import { expect, test, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { openSection } from './panel';

// Phase 5: pop-out art and shadows (DESIGN.md §6.6, §6.7).
// Done when: part of the creature breaks over the border with a matching
// shadow, and stays on the creature when the art moves.

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

const near = (a: Rgb, b: Rgb, tolerance: number) => a.every((v, i) => Math.abs(v - b[i]!) <= tolerance);

/** A horizontal stroke across the token at height `fy`, with the mouse or a finger. */
async function stroke(page: Page, isMobile: boolean, fy: number) {
  const box = (await page.getByTestId('token-canvas').boundingBox())!;
  const y = box.y + box.height * fy;
  const from = { x: box.x + box.width * 0.3, y };
  const to = { x: box.x + box.width * 0.7, y };
  if (!isMobile) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * i) / 12, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
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

// The goblin's red body runs down under the bottom of the frame.
const RED = [0x7a, 0x2e, 0x2e];
const ON_FRAME: [number, number] = [0.5, 0.925];
const INSIDE: [number, number] = [0.5, 0.75];

test('paint part of the art over the frame; it moves with the art, and the export matches the preview', async ({ page, isMobile }) => {
  const m = !!isMobile;
  let panel = await openSection(page, 'Cut-out');
  await panel.getByRole('switch', { name: 'Remove background' }).click();

  const [frameBefore] = await exportPixels(page, m, [ON_FRAME]);
  expect(near(frameBefore!, RED, 40)).toBe(false); // the frame covers the body there

  // Paint the bottom of the body so it breaks over the frame.
  panel = await openSection(page, 'Pop-out');
  const size = panel.getByRole('textbox', { name: 'Pop-out brush size value' });
  await size.fill('90');
  await size.press('Enter');
  // Opening Pop-out turns its brush on.
  await expect(panel.getByRole('button', { name: /^Painting/ })).toHaveAttribute('aria-pressed', 'true');
  const toolbar = page.getByRole('toolbar', { name: 'Pop-out brush' });
  await expect(toolbar).toBeVisible();
  // On a phone the sheet stays open with the brush on; lower it to reach the bottom of the token.
  if (m) {
    await page.getByRole('button', { name: 'Resize settings panel' }).click();
    await expect(page.locator('.bottom-sheet')).toHaveAttribute('data-snap', 'peek');
    await page.waitForTimeout(400);
  }
  await stroke(page, m, ON_FRAME[1]);
  await toolbar.getByRole('button', { name: 'Done' }).click();

  const preview = await previewPixels(page, [ON_FRAME, INSIDE]);
  const exported = await exportPixels(page, m, [ON_FRAME, INSIDE]);
  expect(near(exported[0]!, RED, 40), `on the frame: ${exported[0]}`).toBe(true);
  expect(near(exported[1]!, RED, 40)).toBe(true);
  // The preview shows what was exported (the frame is solid again after Done).
  expect(near(preview[0]!, exported[0]!, 28)).toBe(true);

  // Move the art up: the painted part goes with the body, so the frame shows again.
  await page.locator('.stage').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowUp');
  const [frameAfterMove] = await exportPixels(page, m, [ON_FRAME]);
  expect(near(frameAfterMove!, RED, 40), `after the move: ${frameAfterMove}`).toBe(false);

  // Undo the moves: it pops out again.
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Undo' }).first().click();
  const [frameBack] = await exportPixels(page, m, [ON_FRAME]);
  expect(near(frameBack!, RED, 40)).toBe(true);

  // Switching the pop-out off puts it back behind the frame without losing it.
  panel = await openSection(page, 'Pop-out');
  await panel.getByRole('switch', { name: 'Pop-out on' }).click();
  const [frameOff] = await exportPixels(page, m, [ON_FRAME]);
  expect(near(frameOff!, RED, 40)).toBe(false);
  await expect(panel.getByRole('button', { name: 'Clear pop-out' })).toBeEnabled();
});

test('shadows follow the light until unlinked', async ({ page, isMobile }) => {
  const m = !!isMobile;
  const panel = await openSection(page, 'Shadows');
  // One shadow at a time, starting with the drop shadow; a dot marks the ones that are on.
  await expect(panel.getByRole('radio', { name: 'Drop' })).toHaveAttribute('aria-checked', 'true');
  const follow = panel.getByRole('switch', { name: 'Drop shadow: follow the light' });
  await expect(follow).toHaveAttribute('aria-checked', 'true');
  await expect(panel.getByRole('slider', { name: 'Drop shadow direction' })).toHaveCount(0);
  // Following the light only sets the direction: the rest can still be changed.
  await expect(panel.getByRole('slider', { name: 'Drop shadow distance' })).toBeVisible();
  await expect(panel.getByRole('slider', { name: 'Drop shadow size' })).toBeVisible();

  const alphaAt = async (points: [number, number][]) => {
    const download = page.waitForEvent('download');
    if (m) await page.locator('.bottom-sheet__summary').getByRole('button', { name: 'Export' }).click();
    else await page.locator('.bottom-bar').getByRole('button', { name: 'Export PNG' }).click();
    const img = await loadImage(readFileSync(await (await download).path()));
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return points.map(([fx, fy]) => ctx.getImageData(Math.round(fx * img.width), Math.round(fy * img.height), 1, 1).data[3]!);
  };
  // Light from the top left: the shadow falls down and right. Just outside the circle on the diagonal:
  // the bottom right is in shadow, the top left isn't.
  const OUT_BR: [number, number] = [0.825, 0.825];
  const OUT_TL: [number, number] = [0.175, 0.175];
  const [a1, b1] = await alphaAt([OUT_BR, OUT_TL]);
  expect(a1!).toBeGreaterThan(b1! + 20);

  // Unlink and point the shadow up and left instead.
  await follow.click();
  const dial = panel.getByRole('slider', { name: 'Drop shadow direction' });
  await expect(dial).toHaveAttribute('aria-valuenow', '45'); // starts where it was
  await dial.focus();
  for (let i = 0; i < 12; i++) await dial.press('Shift+ArrowRight'); // 45° → 225°
  const [a2, b2] = await alphaAt([OUT_BR, OUT_TL]);
  expect(b2!).toBeGreaterThan(a2! + 20);

  // The inner shadow can be switched off.
  await panel.getByRole('radio', { name: 'Inner' }).click();
  await expect(panel.getByRole('switch', { name: 'Drop shadow' })).toHaveCount(0);
  await panel.getByRole('switch', { name: 'Inner shadow' }).click();
  await expect(panel.getByRole('textbox', { name: 'Inner shadow strength value' })).toHaveCount(0);
});
