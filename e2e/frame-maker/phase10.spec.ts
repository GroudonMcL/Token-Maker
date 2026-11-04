import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SHAPES } from '../../src/frame-maker/engine/legacy/catalog';
import { unzip } from '../../src/frame-maker/io/zip';
import { parseProject } from '../../src/frame-maker/project/migrate';
import { openSample } from './samples';



// Phase 10: workflow. A design randomised into three variations, each
// recoloured from a theme colour and exported as a pack on every shape; your
// own styles; the lighting rig.

async function data(page: Page) {
  const box = page.getByLabel('Project data');
  if (!(await box.isVisible())) await page.getByText('Advanced: project data').click();
  return JSON.parse(await box.inputValue());
}

async function preview(page: Page): Promise<number[]> {
  await page.waitForTimeout(600);
  return page.getByRole('img', { name: /Preview of/ }).evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((_v, i) => i % 97 === 0)));
}
const changed = (a: number[], b: number[]) => a.some((v, i) => v !== b[i]);


test.beforeEach(async ({ page }) => {
  await page.goto('/frame-maker/');
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await expect(page.getByRole('img', { name: 'Preview of Stamped' })).toBeVisible();
  await page.getByRole('radio', { name: 'Advanced' }).click();
});

test('done when: a design is randomised into three variations, each recoloured from a theme colour and exported as a pack on every shape', async ({ page }) => {
  test.setTimeout(120_000);
  await openSample(page, 'brass-beads');
  const original = await data(page);
  const seen: string[] = [];
  for (const [i, colour] of [
    [1, '#2a6ad0'],
    [2, '#c03040'],
    [3, '#30a060'],
  ] as const) {
    // A variation, as one undo step.
    await page.getByRole('button', { name: 'Variations' }).click();
    const vary = page.getByRole('dialog', { name: 'Variations' });
    await vary.getByRole('button', { name: `Variation ${i}`, exact: true }).click();
    await expect(vary).toBeHidden();
    const varied = await data(page);
    expect(JSON.stringify(varied.layers)).not.toBe(JSON.stringify(original.layers));

    // Recoloured from a theme colour.
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
    const theme = page.getByRole('dialog', { name: 'Theme colour' });
    await theme.getByLabel('Theme colour hex code').fill(colour);
    await theme.getByRole('button', { name: 'Recolour the design' }).click();
    await expect(theme).toBeHidden();
    const themed = await data(page);
    expect(JSON.stringify(themed.layers)).not.toBe(JSON.stringify(varied.layers));
    seen.push(JSON.stringify(themed.layers));

    // Exported as a pack: every shape, two sizes, see-through and with the sample picture, and the project file.
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByLabel('Export as').selectOption('pack');
    const saving = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const download = await saving;
    expect(download.suggestedFilename()).toMatch(/token-pack\.zip$/);
    const files = unzip(new Uint8Array(readFileSync(await download.path())));
    const pngs = files.filter((f) => f.name.endsWith('.png'));
    expect(pngs).toHaveLength(SHAPES.length * 2 * 2);
    for (const s of SHAPES) for (const size of [256, 512]) {
      expect(pngs.some((f) => f.name.endsWith(`/${s.id}-${size}.png`))).toBe(true);
      expect(pngs.some((f) => f.name.endsWith(`/${s.id}-${size}-with-picture.png`))).toBe(true);
    }
    // Real PNGs.
    for (const f of pngs) expect(Array.from(f.data.subarray(1, 4))).toEqual([80, 78, 71]);
    const inPack = parseProject(new TextDecoder().decode(files.find((f) => f.name.endsWith('.framemaker.json'))!.data));
    expect(inPack.ok && JSON.stringify(inPack.project.layers)).toBe(JSON.stringify(themed.layers));

    // Back to the original for the next variation.
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Undo' }).click();
    expect(JSON.stringify((await data(page)).layers)).toBe(JSON.stringify(original.layers));
  }
  expect(new Set(seen).size).toBe(3);
});

test('your own style, varying a style, the lighting rig, and axe on the new dialogs', async ({ page }) => {
  await openSample(page, 'brass-beads');
  await page.getByRole('treeitem', { name: /Brass band/ }).click();
  await page.getByRole('button', { name: /Styles/ }).click();
  await page.getByRole('dialog', { name: 'Styles' }).getByRole('button', { name: 'Hammered bronze' }).click();

  // Save it as a style of your own; it shows in the style library.
  await page.getByRole('button', { name: 'Save as a style' }).click();
  await page.getByLabel('Style name').fill('Old brass');
  await page.getByRole('button', { name: 'Save the style' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved the style' })).toBeVisible();
  await page.getByRole('treeitem', { name: /Outer rim/ }).click();
  await page.getByRole('button', { name: /Styles/ }).click();
  const styles = page.getByRole('dialog', { name: 'Styles' });
  await expect(styles.getByRole('region', { name: 'Your styles' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await styles.getByRole('button', { name: 'Old brass', exact: true }).click();
  const rim = (await data(page)).layers.find((l: { name: string }) => l.name === 'Outer rim');
  expect(rim.effects.map((e: { kind: string }) => e.kind)).toEqual(['bevel', 'recolour']);

  // Vary the style.
  const before = JSON.stringify(rim.effects);
  await page.getByRole('button', { name: 'Vary the style' }).click();
  expect(JSON.stringify((await data(page)).layers.find((l: { name: string }) => l.name === 'Outer rim').effects)).not.toBe(before);

  // The lighting rig: a second light changes the picture.
  const lit = await preview(page);
  await page.getByRole('button', { name: 'Lighting…' }).click();
  const lighting = page.getByRole('dialog', { name: 'Lighting' });
  await lighting.getByRole('button', { name: 'Add a light' }).click();
  await lighting.getByLabel('Bloom value').fill('60');
  await lighting.getByLabel('Bloom value').press('Enter');
  expect(changed(lit, await preview(page))).toBe(true);
  expect((await data(page)).stage).toMatchObject({ bloom: 0.6 });
  expect((await data(page)).stage.lights).toHaveLength(1);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await lighting.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Variations' }).click();
  await expect(page.getByRole('dialog', { name: 'Variations' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
