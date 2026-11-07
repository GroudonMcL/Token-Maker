import type { Page } from '@playwright/test';

/** The tab each section is on (layout A: the tool rail on desktop and tablet, the tab row on phones). */
export const TAB_OF: Record<string, string> = {
  Import: 'Import',
  Colour: 'Colour',
  'Cut-out': 'Cut-out',
  'Pop-out': 'Pop-out',
  'Frame & shape': 'Frame',
  Background: 'Background',
  Lighting: 'Light',
  Shadows: 'Shadow',
  Effects: 'Effects',
  Decorations: 'Decor',
  Label: 'Label',
  Size: 'Export',
  Presets: 'Presets',
  Export: 'Export',
};

/** Opens a section by its title, the same way on every screen size, and returns the panel showing it. */
export async function openSection(page: Page, name: string) {
  await page.getByRole('tab', { name: TAB_OF[name] ?? name, exact: true }).click();
  const panel = page.getByRole('tabpanel');
  // A tab with more than one section opens them one at a time.
  const toggle = panel.locator('button.section__toggle').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  return panel;
}

