import { expect, test, type Browser, type Page } from '@playwright/test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { openSection } from './panel';

// Phase 7: picture frames, decorations and presets (DESIGN.md §6.9).
// Done when: upload my own ring PNG, add mirrored horns, save the look as a
// preset, export the preset file and load it back in another browser.

const GOBLIN = 'e2e/token-maker/fixtures/goblin-boss.png';
const RING = 'e2e/token-maker/fixtures/purple-ring.png';
type Rgba = number[];

/** Phone tab for each section. */
async function exportPixels(page: Page, isMobile: boolean, points: [number, number][]): Promise<Rgba[]> {
  const download = page.waitForEvent('download');
  if (isMobile) await page.locator('.bottom-sheet__summary').getByRole('button', { name: 'Export' }).click();
  else await page.locator('.bottom-bar').getByRole('button', { name: 'Export PNG' }).click();
  const img = await loadImage(readFileSync(await (await download).path()));
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return points.map(([fx, fy]) => [...ctx.getImageData(Math.round(fx * img.width), Math.round(fy * img.height), 1, 1).data]);
}

/** The preview and an exported PNG, both shrunk to 64 px: the average difference per channel. */
async function previewVsExport(page: Page, isMobile: boolean): Promise<number> {
  await page.waitForTimeout(800);
  const previewUrl = await page.getByTestId('token-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL('image/png'));
  const download = page.waitForEvent('download');
  if (isMobile) await page.locator('.bottom-sheet__summary').getByRole('button', { name: 'Export' }).click();
  else await page.locator('.bottom-bar').getByRole('button', { name: 'Export PNG' }).click();
  const shrink = async (src: Buffer) => {
    const img = await loadImage(src);
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 64, 64);
    return ctx.getImageData(0, 0, 64, 64).data;
  };
  const a = await shrink(Buffer.from(previewUrl.split(',')[1]!, 'base64'));
  const b = await shrink(readFileSync(await (await download).path()));
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
  return sum / a.length;
}

async function fresh(page: Page) {
  await page.goto('/token-maker/');
  await page.evaluate(() => {
    localStorage.clear();
    return Promise.all(
      ['token-maker', 'token-maker-frames', 'token-maker-presets'].map(
        (name) =>
          new Promise((r) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = req.onerror = req.onblocked = () => r(null);
          }),
      ),
    );
  });
  await page.reload();
  await page.getByTestId('file-input').first().setInputFiles(GOBLIN);
  await expect(page.locator('.token-summary__name').first()).toHaveText('Goblin Boss');
}

// The purple ring's band (left of the middle, between two studs), the horns
// (beyond the ring at the top corners) and the art in the middle.
const BAND: [number, number] = [0.5 + Math.cos((195 * Math.PI) / 180) * 0.42, 0.5 + Math.sin((195 * Math.PI) / 180) * 0.42];
const MIDDLE: [number, number] = [0.5, 0.5];
// The horn is a thin clipart picture now, so look for it over a patch of points round the top corners.
const HORN_PATCH: [number, number][] = [];
for (let x = 0.7; x <= 0.97; x += 0.03) for (let y = 0.02; y <= 0.3; y += 0.03) HORN_PATCH.push([x, y]);
const POINTS = [BAND, MIDDLE, ...HORN_PATCH, ...HORN_PATCH.map(([x, y]) => [1 - x, y] as [number, number])];
const isPurple = ([r, g, b]: Rgba) => b! > 140 && r! > 80 && g! < 110;

/** Checks a token has the purple ring and both horns. */
async function expectRingAndHorns(page: Page, isMobile: boolean) {
  const [band, middle, ...horns] = await exportPixels(page, isMobile, POINTS);
  expect(isPurple(band!), `band ${band}`).toBe(true);
  const n = HORN_PATCH.length;
  const solid = (px: Rgba[]) => px.filter((p) => p[3]! > 200).length;
  expect(solid(horns.slice(0, n)), 'right horn').toBeGreaterThan(2);
  expect(solid(horns.slice(n)), 'left horn').toBeGreaterThan(2);
  expect(middle![3]).toBe(255);
}

async function anotherBrowser(browser: Browser, isMobile: boolean, contextOptions: Parameters<Browser['newContext']>[0]) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await fresh(page);
  // Nothing from the first browser is here.
  const presets = await openSection(page, 'Presets');
  await expect(presets.getByText('Nothing saved yet.')).toBeVisible();
  return { context, page };
}

test('upload a ring PNG, add mirrored horns, save a preset, export it and load it in another browser', async ({ page, isMobile, browser, contextOptions }) => {
  test.setTimeout(90_000);
  const m = !!isMobile;
  await fresh(page);

  // 1. My own ring PNG as a picture frame: the hole is found automatically.
  let panel = await openSection(page, 'Frame & shape');
  await panel.getByRole('radio', { name: 'Picture' }).click();
  await expect(panel.getByText(/No picture frames yet/)).toBeVisible();
  await panel.getByTestId('frame-file-input').setInputFiles(RING);
  await expect(panel.getByRole('radio', { name: 'Purple Ring' })).toHaveAttribute('aria-checked', 'true');

  // 2. Mirrored horns: one decoration, drawn on both sides.
  panel = await openSection(page, 'Decorations');
  await panel.getByRole('button', { name: /^Horn$/ }).click();
  await expect(panel.getByRole('list', { name: 'Decorations, top first' }).getByRole('listitem')).toHaveText(/Horn\s*top right, mirrored/);
  await expectRingAndHorns(page, m);
  expect(await previewVsExport(page, m)).toBeLessThan(6);

  // 3. Save the look as a preset, and download it as a file.
  panel = await openSection(page, 'Presets');
  await panel.getByLabel('Save this look').fill('Purple horns');
  await panel.getByRole('button', { name: 'Save', exact: true }).click();
  const yours = panel.getByRole('list', { name: 'Your presets' });
  await expect(yours.getByRole('button', { name: 'Purple horns', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await yours.getByRole('button', { name: 'Download Purple horns as a file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('purple-horns.tokenpreset.json');
  const presetPath = await file.path();
  const saved = JSON.parse(readFileSync(presetPath, 'utf8'));
  // Horns are a picture now (owner request: clipart instead of the code-drawn one).
  expect(saved.look.decorations[0]).toMatchObject({ kind: 'picture', image: { type: 'library', id: 'deco-art-horn' }, mirror: true });
  expect(JSON.stringify(saved)).not.toContain('asset:'); // never the art
  // …and as a text code.
  await yours.getByRole('button', { name: 'Copy the code for Purple horns' }).click();
  const code = await panel.getByTestId('preset-code').inputValue();
  expect(code).toMatch(/^TKP1\./);

  // 4. Another browser (a fresh profile): load the file.
  const other = await anotherBrowser(browser, m, contextOptions);
  let p2 = await openSection(other.page, 'Presets');
  await p2.getByTestId('preset-file-input').setInputFiles(presetPath);
  await expect(p2.getByRole('list', { name: 'Your presets' }).getByRole('button', { name: 'Purple horns', exact: true })).toBeVisible();
  await expectRingAndHorns(other.page, m);
  // The ring came along and is now one of this browser's frames too.
  p2 = await openSection(other.page, 'Frame & shape');
  await expect(p2.getByRole('radio', { name: 'Purple Ring' })).toHaveAttribute('aria-checked', 'true');
  await other.context.close();

  // 5. And a third browser: paste the code.
  const third = await anotherBrowser(browser, m, contextOptions);
  const p3 = await openSection(third.page, 'Presets');
  await p3.getByPlaceholder(/Paste a preset code/).fill(code);
  await p3.getByRole('button', { name: 'Add the code' }).click();
  await expect(p3.getByRole('list', { name: 'Your presets' }).getByRole('button', { name: 'Purple horns', exact: true })).toBeVisible();
  await expectRingAndHorns(third.page, m);
  await third.context.close();
});

test('built-in picture frame and preset; drag a decoration on the canvas to another snap point', async ({ page, isMobile }) => {
  const m = !!isMobile;
  await fresh(page);
  let panel = await openSection(page, 'Presets');
  await panel.getByRole('button', { name: /^Celestial$/ }).click();
  panel = await openSection(page, 'Decorations');
  const list = panel.getByRole('list', { name: 'Decorations, top first' });
  await expect(list.getByRole('listitem')).toHaveCount(2);

  // The holy symbol sits at the top of the frame; drag it to the bottom.
  const box = (await page.getByTestId('token-canvas').boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height * 0.085 };
  const to = { x: box.x + box.width / 2, y: box.y + box.height * 0.915 };
  if (m) {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p: { x: number; y: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p.map((q) => ({ x: q.x, y: q.y })) });
    await touch('touchStart', [from]);
    for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: from.x, y: from.y + ((to.y - from.y) * i) / 10 }]);
    await touch('touchEnd', []);
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
  }
  panel = await openSection(page, 'Decorations');
  await expect(panel.getByRole('list', { name: 'Decorations, top first' }).getByRole('listitem').first()).toHaveText(/Holy symbol\s*bottom/);
  // The tapped decoration is selected: its card is open and it has handles.
  await expect(page.getByTestId('decor-rotate-handle')).toBeVisible();

  // A built-in Frame Maker design, listed with the drawn frames (v11).
  panel = await openSection(page, 'Frame & shape');
  await panel.getByRole('radio', { name: 'Drawn' }).click();
  await panel.getByRole('button', { name: 'Change frame' }).click();
  await page.getByRole('searchbox', { name: 'Search frames' }).fill('Runestone');
  await page.getByRole('dialog', { name: 'Choose a frame' }).getByRole('radio', { name: 'Runestone', exact: true }).click();
  await expect(panel.getByTestId('current-frame')).toContainText('Runestone');
  await expect(panel.getByRole('radio', { name: 'Drawn' })).toHaveAttribute('aria-checked', 'true');
  // Its stone photo arrives a moment later; then the preview matches the export.
  await expect.poll(() => previewVsExport(page, m), { timeout: 15_000 }).toBeLessThan(6);
});
