import 'fake-indexeddb/auto';
import { createProject } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { loadAutosave, saveNow, startAutosave } from './autosave';
import { addLayer, loadProject } from './projectStore';

describe('autosave', () => {
  it('saves and restores the project', async () => {
    const p = createProject(LAYERED_TEMPLATES[1].make(), 'Saved one');
    await saveNow(p);
    expect(await loadAutosave()).toEqual(p);
  });

  it('saves shortly after a change', async () => {
    loadProject(createProject([], 'Watch me'));
    const stop = startAutosave();
    addLayer('repeat');
    await new Promise((r) => setTimeout(r, 600));
    stop();
    const saved = await loadAutosave();
    expect(saved?.name).toBe('Watch me');
    expect(saved?.layers[0].type).toBe('repeat');
  });
});
