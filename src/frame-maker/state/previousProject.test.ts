import 'fake-indexeddb/auto';
import { del } from 'idb-keyval';
import { createProject, lineLayer } from '../project/defaults';
import { loadPrevious, PREVIOUS_KEY } from './previousProject';
import { history, loadProject, redo, replaceProject, undo } from './projectStore';

// replaceProject keeps the old design without waiting; let IndexedDB finish.
const settle = () => new Promise((r) => setTimeout(r, 50));

describe('replacing the open design (New, Open, a template)', () => {
  beforeEach(async () => {
    await del(PREVIOUS_KEY);
    loadProject(createProject([lineLayer()], 'Mine'));
  });

  it('is one undo step: Undo brings the old design back, Redo the new one', () => {
    const mine = history.getState().present;
    expect(replaceProject(createProject([], 'Other'))).toBe('Mine');
    expect(history.getState().present.name).toBe('Other');
    undo();
    expect(history.getState().present).toBe(mine);
    redo();
    expect(history.getState().present.name).toBe('Other');
  });

  it('keeps the replaced design in this browser for after a reload', async () => {
    expect(await loadPrevious()).toBeNull();
    replaceProject(createProject([], 'Other'));
    await settle();
    const previous = await loadPrevious();
    expect(previous?.project.name).toBe('Mine');
    expect(previous?.project.layers[0]?.type).toBe('line');
    expect(previous?.replacedAt).toBeGreaterThan(0);

    // Opening it swaps the two: the one it replaces is kept in its place.
    replaceProject(previous!.project);
    await settle();
    expect(history.getState().present.name).toBe('Mine');
    expect((await loadPrevious())?.project.name).toBe('Other');
  });
});
