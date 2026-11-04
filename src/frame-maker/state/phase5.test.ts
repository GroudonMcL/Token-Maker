// Phase 5: layers on the move. The layers file (copy and paste, the library),
// library files, the library kept in IndexedDB, and copy / cut / paste
// between projects and tabs (localStorage stands in for another tab).
import 'fake-indexeddb/auto';
import { del } from 'idb-keyval';
import { bandFillLayer, createProject, groupLayer, lineLayer, repeatLayer } from '../project/defaults';
import { SAMPLE_LAYERED as LAYERED_TEMPLATES } from '../test/sampleDesigns';
import { serializeProject } from '../project/migrate';
import { flatten } from '../project/tree';
import { LAYERS_FORMAT, LIBRARY_FORMAT, parseLayers, parseLibrary, serializeLayers, serializeLibrary } from '../project/transfer';
import type { Layer } from '../project/types';
import { CLIPBOARD_KEY, copyPicked, cutPicked, pasteLayers, pickedLayers } from './clipboard';
import { importLibrary, insertLibraryItem, library, LIBRARY_KEY, loadLibrary, removeFromLibrary, renameLibraryItem, resetLibrary, saveToLibrary } from './library';
import { history, loadProject, select, toggleSelect, undo } from './projectStore';

const stage = createProject().stage;
const present = () => history.getState().present;
const ids = (layers: Layer[]) => flatten(layers).map((l) => l.id);

describe('the layers file', () => {
  it('round-trips layers, groups and the stage', () => {
    const layers = [bandFillLayer(), groupLayer([lineLayer(), repeatLayer()])];
    const text = serializeLayers({ name: 'Bits', layers, stage: { ...stage, light: 90 } });
    expect(JSON.parse(text).format).toBe(LAYERS_FORMAT);
    const r = parseLayers(text);
    expect(r.ok && r.set).toEqual({ name: 'Bits', layers, stage: { ...stage, light: 90 } });
  });

  it('reads old versions through the migrations, and keeps layers it does not know', () => {
    const v1 = { format: LAYERS_FORMAT, schemaVersion: 1, name: 'Old', stage: {}, layers: [{ type: 'line', id: 'a', name: 'Rim', at: 0.1, width: 0.05, paint: { kind: 'solid', color: '#ffffff' } }, { type: 'sparkles', id: 'b', name: 'From the future' }] };
    const r = parseLayers(JSON.stringify(v1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.set.layers[0]).toMatchObject({ type: 'line', clip: 'none', waveAmplitude: 0 });
    expect(r.set.layers[1]).toMatchObject({ type: 'unsupported', originalType: 'sparkles' });
    expect(JSON.parse(serializeLayers(r.set)).layers[1]).toMatchObject({ type: 'sparkles', name: 'From the future' });
  });

  it('reads a whole project file as its layers, and refuses anything else', () => {
    const p = createProject(LAYERED_TEMPLATES[0].make(), 'Brass');
    const r = parseLayers(serializeProject(p));
    expect(r.ok && r.set.layers).toEqual(p.layers);
    expect(parseLayers('hello').ok).toBe(false);
    expect(parseLayers('{"format":"something-else"}').ok).toBe(false);
    expect(parseLayers(JSON.stringify({ format: LAYERS_FORMAT, schemaVersion: 99, layers: [lineLayer()] }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer Frame Maker/) });
    expect(parseLayers(JSON.stringify({ format: LAYERS_FORMAT, schemaVersion: 4, layers: [] }))).toMatchObject({ ok: false });
  });

  it('library files hold several items; bad items are left out with a warning', () => {
    const a = { name: 'A', layers: [lineLayer()], stage };
    const b = { name: 'B', layers: [groupLayer([repeatLayer()])], stage };
    const text = serializeLibrary([a, b]);
    expect(JSON.parse(text).format).toBe(LIBRARY_FORMAT);
    const r = parseLibrary(text);
    expect(r.ok && r.sets.map((s) => s.name)).toEqual(['A', 'B']);
    const broken = JSON.parse(text);
    broken.items.push({ format: 'nope' });
    const r2 = parseLibrary(JSON.stringify(broken));
    expect(r2.ok && r2.sets.length).toBe(2);
    expect(r2.ok && r2.warnings).toEqual([expect.stringMatching(/Item 3/)]);
    // A layers file or a project file is one item.
    expect(parseLibrary(serializeLayers(a))).toMatchObject({ ok: true, sets: [{ name: 'A' }] });
    expect(parseLibrary('[]').ok).toBe(false);
  });
});

describe('the library', () => {
  beforeEach(async () => {
    resetLibrary();
    await del(LIBRARY_KEY);
    loadProject(createProject(LAYERED_TEMPLATES[0].make()));
  });

  it('keeps saved items in IndexedDB, newest first, and survives a reload', async () => {
    await saveToLibrary({ name: 'Rim', layers: [lineLayer()], stage });
    await saveToLibrary({ name: 'Group', layers: [groupLayer([repeatLayer(), lineLayer()])], stage });
    expect(library.getState().items.map((i) => i.name)).toEqual(['Group', 'Rim']);
    resetLibrary();
    const loaded = await loadLibrary();
    expect(loaded.map((i) => i.name)).toEqual(['Group', 'Rim']);
    expect(loaded[0].layers[0]).toMatchObject({ type: 'group', children: [{ type: 'repeat' }, { type: 'line' }] });
  });

  it('renames, removes and imports items', async () => {
    const item = await saveToLibrary({ name: 'Rim', layers: [lineLayer()], stage });
    await renameLibraryItem(item.id, 'Gold rim');
    expect(library.getState().items[0].name).toBe('Gold rim');
    const r = await importLibrary(serializeLibrary([{ name: 'X', layers: [bandFillLayer()], stage }, { name: 'Y', layers: [repeatLayer()], stage }]));
    expect(r).toMatchObject({ ok: true, count: 2 });
    expect(library.getState().items.map((i) => i.name)).toEqual(['X', 'Y', 'Gold rim']);
    await removeFromLibrary(item.id);
    resetLibrary();
    expect((await loadLibrary()).map((i) => i.name)).toEqual(['X', 'Y']);
    expect(await importLibrary('nonsense')).toMatchObject({ ok: false });
  });

  it('adds an item to a design with fresh ids, as one undo step, and can do so again', async () => {
    const saved = await saveToLibrary({ name: 'Group', layers: [groupLayer([repeatLayer(), lineLayer()])], stage });
    const before = present().layers.length;
    insertLibraryItem(saved);
    insertLibraryItem(saved);
    const all = ids(present().layers);
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain(saved.layers[0].id);
    expect(present().layers.length).toBe(before + 2);
    undo();
    expect(present().layers.length).toBe(before + 1);
  });
});

describe('copy, cut and paste', () => {
  beforeEach(() => {
    localStorage.clear();
    loadProject(createProject(LAYERED_TEMPLATES[0].make()));
  });

  it('copies the picked layers bottom first, leaving out those inside a picked group', () => {
    const [band, , , , beads] = present().layers;
    select(beads.id);
    toggleSelect(band.id);
    expect(pickedLayers().map((l) => l.name)).toEqual([band.name, beads.name]);
    const text = copyPicked()!;
    expect(localStorage.getItem(CLIPBOARD_KEY)).toBe(text);
    const r = parseLayers(text);
    expect(r.ok && r.set.layers.map((l) => l.name)).toEqual([band.name, beads.name]);
  });

  it('pastes into another project (another tab: from the shared copy) with new ids, above the selection', () => {
    const beads = present().layers.at(-1)!;
    select(beads.id);
    copyPicked();
    // "Another tab": a different project; the clipboard couldn't be read, so the shared copy is used.
    loadProject(createProject([bandFillLayer()], 'Other'));
    expect(pasteLayers(null)).toBe(true);
    expect(present().layers.map((l) => l.name)).toEqual(['Band fill', beads.name]);
    expect(present().layers[1].id).not.toBe(beads.id);
    expect(present().layers[1]).toEqual({ ...beads, id: present().layers[1].id });
    // Pasting twice gives two copies with different ids.
    pasteLayers(null);
    expect(new Set(ids(present().layers)).size).toBe(3);
  });

  it('prefers layers on the system clipboard, and leaves other text alone', () => {
    const text = serializeLayers({ name: 'Rim', layers: [{ ...lineLayer(), name: 'From the clipboard' }], stage });
    expect(pasteLayers(text)).toBe(true);
    expect(present().layers.at(-1)!.name).toBe('From the clipboard');
    const n = present().layers.length;
    expect(pasteLayers('a shopping list')).toBe(false);
    expect(present().layers.length).toBe(n);
  });

  it('cut copies and removes the picked layers, except locked ones', () => {
    const [band, step] = present().layers;
    history.getState().set({ ...present(), layers: present().layers.map((l) => (l.id === step.id ? { ...l, locked: true } : l)) });
    select(band.id);
    toggleSelect(step.id);
    cutPicked();
    expect(present().layers.map((l) => l.id)).not.toContain(band.id);
    expect(present().layers.map((l) => l.id)).toContain(step.id);
    const r = parseLayers(localStorage.getItem(CLIPBOARD_KEY));
    expect(r.ok && r.set.layers.length).toBe(2);
  });
});
