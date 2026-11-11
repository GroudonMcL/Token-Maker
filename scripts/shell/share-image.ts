// Takes the picture shown when a link to the site is shared (public/share.png,
// named by the og:image tags): the front page in the Sunset theme with the
// True Goblin sample loaded, 1200 × 630.
// Taken from the built site, so links that only show while developing (UI kit) are left out.
//   npm run build && npm run preview    (in one window)
//   npm run share-image                 (in another; or pass a base address)
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4173';

// CHROMIUM_PATH lets a pre-installed browser be used instead of Playwright's own.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const storageState = { cookies: [], origins: [{ origin: new URL(base).origin, localStorage: [{ name: 'ts.palette', value: 'sunset' }] }] };
// Laid out at 1440 × 756 and saved at 5/6 scale, so the editor has room and the file is 1200 × 630.
const page = await browser.newPage({ viewport: { width: 1440, height: 756 }, deviceScaleFactor: 1200 / 1440, storageState });
await page.goto(base);
// The front page shows Token Maker in a frame.
const sample = page.frameLocator('iframe[src*="token-maker"]').getByRole('button', { name: 'Try a sample' });
await sample.click();
await sample.waitFor({ state: 'detached' });
// Let the cut-out and the frame finish drawing, and any toast go away.
await page.waitForTimeout(6000);
await page.screenshot({ path: 'public/share.png' });
await browser.close();
