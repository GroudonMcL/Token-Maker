// Phase 5 in the panels: the welcome card, keyboard access to the layer list,
// the Add layer menu and the Basic/Advanced switch, the library dialog, and
// copy and paste from the buttons.
import 'fake-indexeddb/auto';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { del } from 'idb-keyval';
import { App } from '../App';
import { createProject, lineLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { library, LIBRARY_KEY, resetLibrary, saveToLibrary } from '../state/library';
import { history, loadProject, select, ui } from '../state/projectStore';
import { LayersPanel } from './LayersPanel';
import { LibraryDialog } from './LibraryDialog';
import { TopBar } from './TopBar';
import { WELCOMED_KEY } from './welcome';

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};

const rows = () => within(screen.getByRole('tree', { name: /Layers/ })).getAllByRole('treeitem');
const present = () => history.getState().present;

describe('the welcome card', () => {
  beforeEach(() => localStorage.clear());

  it('shows on the first visit, is remembered once closed, and comes back from Help', async () => {
    const { unmount } = render(<App />);
    const card = await screen.findByRole('dialog', { name: 'Welcome to Frame Maker' });
    expect(within(card).getByRole('button', { name: 'Start' })).toHaveFocus();
    await userEvent.click(within(card).getByRole('button', { name: 'Start' }));
    expect(screen.queryByRole('dialog', { name: 'Welcome to Frame Maker' })).toBeNull();
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('1');
    unmount();

    render(<App />);
    await screen.findByRole('img', { name: /Preview of/ });
    expect(screen.queryByRole('dialog', { name: 'Welcome to Frame Maker' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByRole('dialog', { name: 'Welcome to Frame Maker' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Welcome to Frame Maker' })).toBeNull();
  });
});

describe('keyboard access', () => {
  beforeEach(() => loadProject(createProject(LAYERED_TEMPLATES[0].make())));

  it('the arrow keys move through the layer list, and Shift+arrow picks a run', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    const user = userEvent.setup();
    rows()[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(ui.getState().selectedId).toBe(present().layers.at(-2)!.id);
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    expect(rows()[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(ui.getState().selectedId).toBe(present().layers[0].id);
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(ui.getState().selectedIds).toHaveLength(2);
    // Only the picked row is in the tab order.
    expect(rows().filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });

  it('the Add layer menu takes the focus, moves with the arrows and closes with Escape', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} onOpenLibrary={() => {}} />);
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Add layer' });
    await user.click(button);
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(items.at(-1)).toHaveFocus();
    await user.keyboard('{Home}{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('Basic / Advanced moves with the arrow keys, like any radio group', async () => {
    render(<TopBar onNew={() => {}} onHelp={() => {}} onMessage={() => {}} />);
    const user = userEvent.setup();
    screen.getByRole('radio', { name: 'Basic' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(ui.getState().mode).toBe('advanced');
    expect(screen.getByRole('radio', { name: 'Advanced' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(ui.getState().mode).toBe('basic');
  });
});

describe('the library dialog', () => {
  beforeEach(async () => {
    resetLibrary();
    await del(LIBRARY_KEY);
    localStorage.clear();
    loadProject(createProject(LAYERED_TEMPLATES[0].make()));
  });

  it('saves the picked layer from the list, shows it, and adds it to another design', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    const user = userEvent.setup();
    await user.click(rows()[0]);
    await user.click(screen.getByRole('button', { name: 'Add to library' }));
    await vi.waitFor(() => expect(library.getState().items.map((i) => i.name)).toEqual(['Beads']));

    loadProject(createProject([lineLayer()], 'Another'));
    render(<LibraryDialog onClose={() => {}} />);
    await user.click(await screen.findByRole('button', { name: 'Beads' }));
    expect(present().layers.map((l) => l.name)).toEqual(['Line', 'Beads']);
  });

  it('renames and removes items, and says when it is empty', async () => {
    await saveToLibrary({ name: 'Rim', layers: [lineLayer()], stage: present().stage });
    render(<LibraryDialog onClose={() => {}} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Rename Rim' }));
    const box = screen.getByRole('textbox', { name: 'Item name' });
    await user.clear(box);
    await user.type(box, 'Gold rim{Enter}');
    await vi.waitFor(() => expect(library.getState().items[0].name).toBe('Gold rim'));
    await user.click(screen.getByRole('button', { name: 'Remove Gold rim' }));
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it('the Copy button and Paste layers menu item copy a layer into another design', async () => {
    render(<LayersPanel onAddFrame={() => {}} onAddTexture={() => {}} />);
    const user = userEvent.setup();
    select(present().layers.at(-1)!.id);
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    await vi.waitFor(() => expect(localStorage.getItem('frame-studio:clipboard')).toMatch(/Beads/));
    act(() => loadProject(createProject([lineLayer()], 'Another')));
    await user.click(screen.getByRole('button', { name: 'Add layer' }));
    await user.click(screen.getByRole('menuitem', { name: /Paste layers/ }));
    await vi.waitFor(() => expect(present().layers.map((l) => l.name)).toEqual(['Line', 'Beads']));
  });
});
