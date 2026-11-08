import 'fake-indexeddb/auto';
import { get, set } from 'idb-keyval';
import { createProject } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { AUTOSAVE_KEY, loadAutosave, saveNow, startAutosave, UNREADABLE_KEY } from './autosave';
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
});
