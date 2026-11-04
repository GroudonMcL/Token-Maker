// Takes progress screenshots of the editor into docs/screenshots/.
//   npm run dev            (in one window)
//   npm run screenshots    (in another; or pass a base address)
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = 'docs/frame-maker/screenshots';
mkdirSync(out, { recursive: true });

// CHROMIUM_PATH lets a pre-installed browser be used instead of Playwright's own.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// The welcome card has its own screenshot (16); the others are taken without it.
const welcomed = { cookies: [], origins: [{ origin: new URL(base).origin, localStorage: [{ name: 'frame-studio:welcomed', value: '1' }] }] };
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, storageState: welcomed });
await page.goto(base);
await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
await page.reload();
await page.getByRole('img', { name: /Preview of/ }).waitFor();

// 1. First visit: Token Maker's Stamped frame as one layer.
await page.screenshot({ path: `${out}/01-first-open.png` });

// 2. The template picker.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Infernal', exact: true }).waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/02-templates.png` });

// 3. A design built from editable layers, with its beads selected.
await page.getByRole('button', { name: 'Brass & beads' }).click();
await page.getByRole('treeitem', { name: /Beads/ }).click();
await page.screenshot({ path: `${out}/03-layered-design.png` });

// 4. Infernal plus a ring of glowing spikes, in Advanced mode.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Infernal', exact: true }).click();
await page.getByRole('button', { name: 'Add layer' }).click();
await page.getByRole('menuitem', { name: /Repeated shapes/ }).click();
await page.getByLabel('Shape', { exact: true }).selectOption('spike');
await page.getByLabel('Position across the band value').fill('-5');
await page.getByLabel('Position across the band value').press('Enter');
await page.getByRole('radio', { name: 'Advanced' }).click();
await page.screenshot({ path: `${out}/04-frame-plus-layer.png` });
await page.getByRole('radio', { name: 'Basic' }).click();

// 5. Phase 2: shapes and paths in a group, with the drawn gems selected (mirrored left and right).
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Jewelled' }).click();
await page.getByRole('treeitem', { name: /Gems/ }).click();
await page.screenshot({ path: `${out}/05-shapes-paths-groups.png` });

// 6. Editing the gem's points: square points, round curve handles.
await page.getByRole('button', { name: 'Edit points' }).click();
const box = (await page.getByTestId('overlay').boundingBox())!;
const r = box.width / 2;
const bw = r * 0.14;
// The gem's bottom point (y = 1 in its own units) on the right-hand side of the band, a quarter of the way round.
await page.mouse.dblclick(box.x + r + r * (1 - 0.1 - 0.07) - (0.9 * bw) / 2, box.y + r);
await page.screenshot({ path: `${out}/06-editing-points.png` });
await page.getByRole('button', { name: 'Done editing' }).click();

// 7. The same design on a hexagon, lit from the bottom right.
await page.getByRole('radio', { name: 'Hexagon' }).click();
const dial = (await page.getByRole('slider', { name: 'Light direction' }).boundingBox())!;
await page.mouse.click(dial.x + dial.width * 0.85, dial.y + dial.height * 0.85);
await page.screenshot({ path: `${out}/07-hexagon-light.png` });

// 8. Phase 3: the texture library.
await page.getByRole('radio', { name: 'Circle' }).click();
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: /Blank project/ }).click();
await page.getByRole('button', { name: 'Add layer' }).click();
await page.getByRole('menuitem', { name: /^Texture…/ }).click();
await page.locator('.dialog .tile img').nth(10).waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/08-texture-library.png` });

// 9. Marble, hammered metal and stars, with the stars' settings showing.
await page.getByRole('dialog', { name: 'Add a texture' }).getByRole('button', { name: 'Marble', exact: true }).click();
for (const name of ['Hammered metal', 'Starfield']) {
  await page.getByRole('button', { name: 'Add layer' }).click();
  await page.getByRole('menuitem', { name: /^Texture…/ }).click();
  await page.getByRole('dialog', { name: 'Add a texture' }).getByRole('button', { name, exact: true }).click();
}
await page.screenshot({ path: `${out}/09-textures.png` });

// 10. The Battle-worn steel template, with its battle wear selected.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Battle-worn steel' }).click();
await page.getByRole('tree', { name: /Layers/ }).getByRole('treeitem', { name: /Battle wear Texture/ }).click();
await page.screenshot({ path: `${out}/10-battle-worn-steel.png` });

// 11. Night sky: colours round the ring, with the sky's paint showing.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Night sky' }).click();
await page.getByRole('tree', { name: /Layers/ }).getByRole('treeitem', { name: /Sky Band fill/ }).click();
await page.screenshot({ path: `${out}/11-ring-paint.png` });

// 12. Phase 4: the template picker's Token Maker frames as editable layers.
await page.getByRole('button', { name: 'New' }).click();
const editable = page.getByRole('region', { name: 'Token Maker frames as editable layers' });
await editable.scrollIntoViewIfNeeded();
await editable.locator('.tile img').nth(17).waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/12-editable-frames.png` });

// 13. Paladin as editable layers, with its gold crosses selected.
await editable.getByRole('button', { name: 'Paladin Editable' }).click();
await page.getByRole('treeitem', { name: /Gold crosses/ }).click();
await page.screenshot({ path: `${out}/13-paladin-editable.png` });

// 14. The same on a hexagon, lit from the bottom right: the converted frame follows the light.
await page.getByRole('radio', { name: 'Hexagon' }).click();
const dial2 = (await page.getByRole('slider', { name: 'Light direction' }).boundingBox())!;
await page.mouse.click(dial2.x + dial2.width * 0.85, dial2.y + dial2.height * 0.85);
await page.screenshot({ path: `${out}/14-paladin-hexagon-light.png` });
await page.getByRole('button', { name: 'Light from the top left again' }).click();
await page.getByRole('radio', { name: 'Circle' }).click();

// 15. An original Token Maker frame offering to turn into editable layers.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Gilded', exact: true }).click();
await page.screenshot({ path: `${out}/15-turn-into-layers.png` });

// 16. Phase 5: the welcome card on a first visit.
const first = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await first.goto(base);
await first.getByRole('dialog', { name: 'Welcome to Frame Maker' }).waitFor();
await first.waitForTimeout(300);
await first.screenshot({ path: `${out}/16-welcome.png` });
await first.close();

// 17. A help tip, on the beads of Brass & beads.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Brass & beads' }).click();
await page.getByRole('treeitem', { name: /Beads/ }).click();
await page.locator('.properties .help-tip').nth(4).hover();
await page.screenshot({ path: `${out}/17-help-tip.png` });

// 18. The layer library, with the beads and the Jewelled gems saved in it.
await page.getByRole('button', { name: 'Add to library' }).click();
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Jewelled' }).click();
await page.getByRole('treeitem', { name: /Gem group|Gems/ }).first().click();
await page.getByRole('button', { name: 'Add to library' }).click();
await page.getByRole('button', { name: 'Your library' }).click();
await page.locator('.library-item img').nth(1).waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/18-library.png` });
await page.keyboard.press('Escape');

// 19. The export options.
await page.getByRole('button', { name: 'Export' }).click();
await page.getByLabel('Export as').selectOption('sheet');
await page.screenshot({ path: `${out}/19-export.png` });
await page.keyboard.press('Escape');

// 27–30 are drawn by npm run showcase (ornaments, textures, templates, the last four conversions).

// 31. Warlock as editable layers: its eyes, with their second colour.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Warlock Editable' }).click();
await page.getByRole('treeitem', { name: /Eyes/ }).click();
// Show their second colour, once the library's message has gone.
await page.getByText('White of the eye').scrollIntoViewIfNeeded();
await page.getByRole('status').filter({ hasText: /./ }).waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/31-warlock-eyes.png` });

// 32. Royal: an ornament as a shape of its own (the crown), over fleurs-de-lis and gems.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Royal', exact: true }).click();
await page.getByRole('treeitem', { name: /Crown/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/32-royal-crown.png` });

// 33–35 are drawn by npm run showcase (icons, photos, fills).

// 36. A ring of dragon heads (an icon) filled with the lava photo, each on its own; the reset buttons beside the sliders.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Night sky' }).click();
await page.getByRole('button', { name: 'Add layer' }).click();
await page.getByRole('menuitem', { name: /^Repeated shapes/ }).click();
await page.getByRole('combobox', { name: 'Shape', exact: true }).selectOption('skull');
await page.getByLabel('Size value', { exact: true }).fill('70');
await page.getByLabel('Size value', { exact: true }).press('Enter');
await page.getByRole('combobox', { name: 'Fill with' }).selectOption('paint');
await page.getByRole('combobox', { name: 'Paint' }).selectOption('picture');
await page.getByRole('combobox', { name: 'Photo' }).selectOption('lava');
await page.getByText('Paint each one on its own').click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/36-photo-filled-icons.png` });

// 37. A band fill of a photo texture, bent round the band, with its settings.
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: /Blank project/ }).click();
await page.getByRole('button', { name: 'Add layer' }).click();
await page.getByRole('menuitem', { name: /^Texture…/ }).click();
await page.getByRole('region', { name: 'Photo textures' }).getByRole('button', { name: 'Castle brick' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/37-photo-band.png` });

// 20–21. On a phone: the canvas over a sheet of layers, then of properties.
const phone = await browser.newPage({ ...devices['Pixel 7'], storageState: welcomed });
await phone.goto(base);
await phone.getByRole('button', { name: 'New' }).waitFor();
await phone.getByRole('button', { name: 'New' }).click();
await phone.getByRole('button', { name: 'Paladin Editable' }).click();
await phone.waitForTimeout(300);
await phone.screenshot({ path: `${out}/20-phone-layers.png` });
await phone.getByRole('treeitem', { name: /Gold crosses/ }).click();
await phone.getByRole('tab', { name: 'Properties' }).click();
await phone.screenshot({ path: `${out}/21-phone-properties.png` });

// 22–25. Phase 6: effects and styles.
await page.bringToFront();
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Brass & beads' }).click();
await page.getByRole('treeitem', { name: /Brass band/ }).click();
await page.getByRole('button', { name: /Styles/ }).click();
await page.getByRole('dialog', { name: 'Styles' }).locator('.tile img').nth(5).waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/22-style-library.png` });
await page.getByRole('button', { name: 'Hammered bronze' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/23-effects-panel.png` });
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Dwarven bronze' }).click();
await page.getByRole('treeitem', { name: /Plates/ }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/24-dwarven-bronze.png` });
await page.getByRole('button', { name: 'New' }).click();
await page.getByRole('button', { name: 'Eldritch crystal' }).click();
await page.getByRole('radio', { name: 'Hexagon' }).click();
await page.getByRole('slider', { name: 'Light direction' }).focus();
for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight');
await page.getByRole('treeitem', { name: /Crystals/ }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/25-eldritch-hexagon-light.png` });

await browser.close();
console.log(`Screenshots in ${out}/`);
