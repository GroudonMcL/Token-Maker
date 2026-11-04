import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openSection } from './panel';

const FIXTURE = 'e2e/token-maker/fixtures/goblin-boss.png';

/** Width and height from a PNG file's header. */
function pngSize(buf: Buffer) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function upload(page: Page) {
  await page.getByTestId('file-input').first().setInputFiles(FIXTURE);
  await expect(page.locator('.token-summary__name').first()).toHaveText('Goblin Boss');
}

async function exportPng(page: Page, isMobile: boolean) {
  const download = page.waitForEvent('download');
  if (isMobile) await page.locator('.bottom-sheet__summary').getByRole('button', { name: 'Export' }).click();
  else await page.locator('.bottom-bar').getByRole('button', { name: 'Export PNG' }).click();
  const file = await download;
  const path = await file.path();
  return { name: file.suggestedFilename(), size: pngSize(readFileSync(path)) };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/token-maker/');
  // Start clean: clear any autosave left by an earlier test.
  await page.evaluate(() => new Promise((r) => {
    const req = indexedDB.deleteDatabase('token-maker');
    req.onsuccess = req.onerror = req.onblocked = () => r(null);
  }));
  await page.reload();
});

test('import an image and download a 512 px PNG', async ({ page, isMobile }) => {
  await upload(page);
  await expect(page.getByTestId('token-canvas')).toBeVisible();
  const out = await exportPng(page, !!isMobile);
  expect(out.name).toBe('Goblin-Boss.png');
  expect(out.size).toEqual({ width: 512, height: 512 });
});

test('Large tokens export at 1024 px with the size shown', async ({ page, isMobile }) => {
  await upload(page);
  const panel = await openSection(page, 'Size');
  await panel.getByRole('radio', { name: 'Large' }).click();
  await expect(page.getByTestId('pixel-size').first()).toHaveText('1024 × 1024 px');
  const out = await exportPng(page, !!isMobile);
  expect(out.size).toEqual({ width: 1024, height: 1024 });
});

test('pick a frame and undo it', async ({ page }) => {
  await upload(page);
  const panel = await openSection(page, 'Frame & shape');
  await panel.getByRole('button', { name: 'Change frame' }).click();
  const gallery = page.getByRole('dialog', { name: 'Choose a frame' });
  await gallery.getByRole('tab', { name: /Wood & Nature/ }).click();
  await gallery.getByRole('radio', { name: 'Oak', exact: true }).click();
  await expect(gallery).toBeHidden();
  await expect(panel.getByTestId('current-frame')).toContainText('Oak');
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await expect(panel.getByTestId('current-frame')).toContainText('Simple');
});

test('drag the art, then use the scale and rotate handles', async ({ page }) => {
  await upload(page);
  const canvas = page.getByTestId('token-canvas');
  const box = (await canvas.boundingBox())!;
  const readout = page.locator('.float-toolbar__readout');
  const before = await readout.textContent();

  // Scale handle: drag the bottom-right corner outwards.
  const handle = page.getByTestId('scale-handle-2');
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 60, h.y + 60, { steps: 6 });
  await page.mouse.up();
  await expect(readout).not.toHaveText(before!);

  // One drag = one undo step.
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await expect(readout).toHaveText(before!);

  // Rotate handle, then move the art by dragging it.
  const rot = (await page.getByTestId('rotate-handle').boundingBox())!;
  await page.mouse.move(rot.x + rot.width / 2, rot.y + rot.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 40, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo' }).first()).toBeEnabled();
});

test('drop and paste import images', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop gestures');
  const b64 = readFileSync(FIXTURE).toString('base64');
  for (const kind of ['drop', 'paste'] as const) {
    await page.evaluate(
      async ({ b64, kind }) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const file = new File([bytes], kind === 'drop' ? 'cave-troll.png' : 'image.png', { type: 'image/png' });
        const dt = new DataTransfer();
        dt.items.add(file);
        if (kind === 'drop') window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
        else document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      },
      { b64, kind },
    );
    // A dropped file names the token; a pasted "image.png" keeps the current name.
    await expect(page.locator('.token-summary__name')).toHaveText('Cave Troll');
  }
});

test('the token survives a page reload (autosave)', async ({ page }) => {
  await upload(page);
  const panel = await openSection(page, 'Frame & shape');
  await panel.getByRole('radio', { name: 'Hexagon' }).click();
  // Autosave runs shortly after changes: wait until the saved token has the new shape.
  const savedShape = () =>
    page.evaluate(
      () =>
        new Promise<string | null>((resolve) => {
          const open = indexedDB.open('token-maker');
          open.onerror = () => resolve(null);
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains('autosave')) return resolve(null);
            const get = db.transaction('autosave').objectStore('autosave').get('current-doc');
            get.onsuccess = () => resolve((get.result as { shape?: string } | undefined)?.shape ?? null);
            get.onerror = () => resolve(null);
          };
        }),
    );
  await expect.poll(savedShape, { timeout: 10_000 }).toBe('hexagon');
  await page.reload();
  await expect(page.locator('.token-summary__name').first()).toHaveText('Goblin Boss');
  const panel2 = await openSection(page, 'Frame & shape');
  await expect(panel2.getByRole('radio', { name: 'Hexagon' })).toHaveAttribute('aria-checked', 'true');
});

test('the panel shows one tab at a time', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'side panel');
  const panel = page.getByRole('complementary', { name: 'Token settings' });
  await expect(panel.getByRole('heading', { name: 'Import' })).toBeVisible();
  await page.getByRole('tab', { name: 'Colour' }).click();
  await expect(panel.getByRole('heading', { name: 'Colour' })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Import' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Frame' }).click();
  await expect(panel.getByRole('heading', { name: 'Frame & shape' })).toBeVisible();
});

test('the wheel zooms the view over the token and scrolls the panel elsewhere', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'mouse wheel');
  await upload(page);
  const canvas = page.getByTestId('token-canvas');
  const box = (await canvas.boundingBox())!;
  const readout = page.locator('.float-toolbar__readout');
  const artZoom = await readout.textContent();

  // Over the token: the view zooms in (the token gets bigger on screen) but the art's own zoom is unchanged.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(box.width * 1.3);
  await expect(readout).toHaveText(artZoom!);
  await page.getByRole('button', { name: /Reset view/ }).click();
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeCloseTo(box.width, 0);

  // Away from the token and art: the side panel scrolls instead.
  const panel = page.getByRole('complementary', { name: 'Token settings' });
  // Decorations is long enough to scroll even on a tall tablet.
  await page.getByRole('tab', { name: 'Decor' }).click();
  await expect(panel.getByRole('group', { name: 'Ornaments' })).toBeVisible(); // its code loads on first use
  await panel.evaluate((el) => (el.scrollTop = 0));
  const stage = (await page.locator('.stage').boundingBox())!;
  // Close to the canvas's left edge: on a tablet the tool rail leaves a narrow canvas, mostly covered by the art.
  await page.mouse.move(stage.x + 6, stage.y + stage.height - 60);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect((await canvas.boundingBox())!.width).toBeCloseTo(box.width, 0);
});
