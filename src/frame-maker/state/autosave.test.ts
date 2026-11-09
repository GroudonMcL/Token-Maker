import 'fake-indexeddb/auto';
import { get, set } from 'idb-keyval';
import { messages } from './messages';
import { createProject } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { AUTOSAVE_KEY, loadAutosave, SAVE_FAILED_MESSAGE, saveNow, startAutosave, UNREADABLE_KEY } from './autosave';

// Storing goes through the real idb-keyval, but a test can make it fail.
vi.mock('idb-keyval', async (importOriginal) => {
  const actual = await importOriginal<typeof import('idb-keyval')>();
  return { ...actual, set: vi.fn(actual.set) };
});
const settle = () => new Promise((r) => setTimeout(r, 20));
import { addLayer, loadProject } from './projectStore';

describe('autosave', () => {
  it('saves and restores the project', async () => {
    const p = createProject(LAYERED_TEMPLATES[1].make(), 'Saved one');
    await saveNow(p);
    expect(await loadAutosave()).toEqual({ project: p });
  });

  it('saves shortly after a change', async () => {
    loadProject(createProject([], 'Watch me'));
    const stop = startAutosave();
    addLayer('repeat');
    await new Promise((r) => setTimeout(r, 600));
    stop();
    const saved = (await loadAutosave()).project;
    expect(saved?.name).toBe('Watch me');
    expect(saved?.layers[0].type).toBe('repeat');
  });

  it("sets aside a saved project it can't read, instead of letting autosave overwrite it", async () => {
    for (const text of ['{"format":"frame-studio-project","schemaVersion":1.5}', 'not json', 42]) {
      await set(AUTOSAVE_KEY, text);
      expect(await loadAutosave()).toEqual({ project: null, unreadable: true });
      expect((await get<{ text: unknown }>(UNREADABLE_KEY))?.text).toBe(text);
    }
  });

  it('saves at once when the page is closed, without waiting', async () => {
    loadProject(createProject([], 'Closing'));
    const stop = startAutosave();
    addLayer('repeat');
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    stop();
    expect((await loadAutosave()).project?.layers[0]?.type).toBe('repeat');
  });

  it("says once, not on every change, when the browser won't store the design", async () => {
    vi.mocked(set).mockRejectedValue(new Error('QuotaExceededError'));
    messages.setState({ current: null });
    loadProject(createProject([], 'Full'));
    const stop = startAutosave();
    const shown: string[] = [];
    const unsub = messages.subscribe((m) => m.current && shown.push(m.current.text));
    for (let i = 0; i < 3; i++) {
      addLayer('line');
      window.dispatchEvent(new Event('pagehide'));
      await settle();
    }
    unsub();
    stop();
    vi.mocked(set).mockImplementation((await vi.importActual<typeof import('idb-keyval')>('idb-keyval')).set);
    expect(shown).toEqual([SAVE_FAILED_MESSAGE]);
  });
});
