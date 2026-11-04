import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Opens one of the sample designs saved in fixtures/: starting designs the
 * frame review removed from New, which the tests still use as rich projects.
 */
export async function openSample(page: Page, id: string) {
  const path = `e2e/frame-maker/fixtures/${id}.framemaker.json`;
  const { name } = JSON.parse(readFileSync(path, 'utf8')) as { name: string };
  await page.getByTestId('open-file').setInputFiles(path);
  await expect(page.getByRole('img', { name: `Preview of ${name}` })).toBeVisible();
}
