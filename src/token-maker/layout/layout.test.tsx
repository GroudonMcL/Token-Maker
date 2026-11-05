import { fireEvent, render, screen, within } from '@testing-library/react';
import { AdSlot } from './AdSlot';
import { AppShell } from './AppShell';
import { PANEL_TABS, SECTIONS } from './sections';

describe('AppShell (desktop)', () => {
  it('has a tool rail with the tabs in the order a token is made (layout A)', () => {
    render(<AppShell />);
    const rail = screen.getByRole('tablist', { name: 'Settings' });
    expect(rail).toHaveAttribute('aria-orientation', 'vertical');
    expect(within(rail).getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Import',
      'Colour',
      'Cut-out',
      'Background',
      'Pop-out',
      'Frame',
      'Light',
      'Shadow',
      'Effects',
      'Decor',
      'Label',
      'Presets',
      'Export',
    ]);
    expect(PANEL_TABS.flatMap((t) => t.sections).sort()).toEqual(SECTIONS.map((s) => s.id).sort());
  });

  it('shows only the chosen tab in the panel', () => {
    render(<AppShell />);
    const panel = screen.getByRole('complementary', { name: 'Token settings' });
    expect(within(panel).getByRole('heading', { name: 'Import' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Colour' }));
    expect(within(panel).getByRole('heading', { name: 'Colour' })).toBeInTheDocument();
    expect(within(panel).queryByRole('heading', { name: 'Import' })).toBeNull();

    // A tab with one section shows it under a plain heading.
    fireEvent.click(screen.getByRole('tab', { name: 'Shadow' }));
    expect(screen.getByRole('tab', { name: 'Shadow' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel).getByRole('heading', { name: 'Shadows' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Import' })).toBeNull();
  });

  it('groups the tabs as Picture, Style and Finish', () => {
    render(<AppShell />);
    const names = [...document.querySelectorAll('.tool-rail__group-name')].map((el) => el.textContent);
    expect(names).toEqual(['Picture', 'Style', 'Finish']);
  });

  it('ends each tab with a button that opens the next one', () => {
    render(<AppShell />);
    const panel = screen.getByRole('complementary', { name: 'Token settings' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Colour' }));
    expect(screen.getByRole('tab', { name: 'Colour' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(panel).getByTestId('next-tab'));
    expect(screen.getByRole('tab', { name: 'Cut-out' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Export' }));
    expect(within(panel).queryByTestId('next-tab')).toBeNull();
  });

  it('moves between tabs with the arrow keys', () => {
    render(<AppShell />);
    const first = screen.getByRole('tab', { name: 'Import' });
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: 'Colour' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(first, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Export' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the menu style in the top bar’s panel settings', () => {
    render(<AppShell />);
    expect(screen.queryByRole('radiogroup', { name: 'Menu style' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Panel settings' }));
    expect(within(screen.getByRole('dialog', { name: 'Panel settings' })).getByRole('radiogroup', { name: 'Menu style' })).toBeInTheDocument();
  });

  it('has the top bar, toolbar and Export button', () => {
    const { container } = render(<AppShell />);
    expect(screen.getByRole('switch', { name: 'Batch' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Undo' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('toolbar', { name: 'Image tools' })).toBeInTheDocument();
    const bottomBar = container.querySelector<HTMLElement>('.bottom-bar')!;
    expect(within(bottomBar).getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
  });
});

describe('AdSlot', () => {
  it('is hidden while the feature flag is off', () => {
    render(<AdSlot />);
    expect(screen.queryByTestId('ad-slot')).toBeNull();
  });
  it('appears with a notice when switched on', () => {
    render(<AdSlot enabled />);
    expect(screen.getByText(/keep Token Maker free/)).toBeInTheDocument();
  });
});
