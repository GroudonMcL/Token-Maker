import { createProject, groupLayer, NEW_LAYER } from '../project/defaults';
import { findLayer } from '../project/tree';
import type { Layer } from '../project/types';
import {
  addLayer,
  commit,
  deleteLayer,
  duplicateLayer,
  groupSelected,
  history,
  loadProject,
  moveLayer,
  moveLayerTo,
  redo,
  renameLayer,
  select,
  selectRange,
  toggleLocked,
  toggleSelect,
  toggleVisible,
  ui,
  undo,
  ungroup,
  updateLayer,
} from './projectStore';

const layers = () => history.getState().present.layers;
const names = () => layers().map((l) => l.name);
const named = (name: string): Layer => ({ ...NEW_LAYER.line(), name });

beforeEach(() => loadProject(createProject([named('A'), named('B'), named('C')])));

describe('project store', () => {
  it('adds a layer above the selected one and selects it', () => {
    ui.setState({ selectedId: layers()[0].id });
    const added = addLayer('repeat');
    expect(layers()[1].id).toBe(added.id);
    expect(ui.getState().selectedId).toBe(added.id);
  });

  it('renames, hides and locks', () => {
    const id = layers()[0].id;
    renameLayer(id, '  Rim ');
    toggleVisible(id);
    toggleLocked(id);
    expect(layers()[0]).toMatchObject({ name: 'Rim', visible: false, locked: true });
  });

  it('locked layers ignore edits but can still be shown, hidden and unlocked', () => {
    const id = layers()[0].id;
    toggleLocked(id);
    updateLayer(id, { name: 'Changed' });
    expect(layers()[0].name).toBe('A');
    toggleVisible(id);
    expect(layers()[0].visible).toBe(false);
    toggleLocked(id);
    expect(layers()[0].locked).toBe(false);
  });

  it('reorders', () => {
    moveLayer(layers()[0].id, 'up');
    expect(names()).toEqual(['B', 'A', 'C']);
    moveLayer(layers()[2].id, 'up');
    expect(names()).toEqual(['B', 'A', 'C']);
    moveLayerTo(layers()[2].id, layers()[0].id, 'below');
    expect(names()).toEqual(['C', 'B', 'A']);
  });

  it('duplicates with a new id, right above the original', () => {
    const original = layers()[1];
    duplicateLayer(original.id);
    expect(names()).toEqual(['A', 'B', 'B copy', 'C']);
    expect(layers()[2].id).not.toBe(original.id);
    expect({ ...layers()[2], id: '', name: '' }).toEqual({ ...original, id: '', name: '' });
  });

  it('deletes and selects a neighbour', () => {
    ui.setState({ selectedId: layers()[1].id });
    deleteLayer(layers()[1].id);
    expect(names()).toEqual(['A', 'C']);
    expect(ui.getState().selectedId).toBe(layers()[0].id);
  });

  it('undo and redo step through structured project states', () => {
    const before = history.getState().present;
    deleteLayer(layers()[0].id);
    addLayer('bandFill');
    undo();
    undo();
    expect(history.getState().present).toBe(before);
    redo();
    expect(names()).toEqual(['B', 'C']);
  });

  it('a slider drag is one undo step', () => {
    const id = layers()[0].id;
    for (const at of [0.1, 0.2, 0.3]) updateLayer(id, { at } as Partial<Layer>, { transient: true });
    commit();
    expect(history.getState().past).toHaveLength(1);
    undo();
    expect((layers()[0] as { at: number }).at).toBe(0.5);
  });

  it('loading a project starts a fresh history', () => {
    addLayer('line');
    loadProject(createProject());
    expect(history.getState().past).toHaveLength(0);
  });
});

describe('groups in the store', () => {
  const tree = () => layers().map((l) => (l.type === 'group' ? `${l.name}[${l.children.map((c) => c.name).join(',')}]` : l.name));

  it('groups the picked layers where the top-most one was, keeping their order', () => {
    select(layers()[0].id);
    toggleSelect(layers()[2].id);
    groupSelected();
    expect(tree()).toEqual(['B', 'Group[A,C]']);
    expect(ui.getState().selectedId).toBe(layers()[1].id);
    undo();
    expect(names()).toEqual(['A', 'B', 'C']);
  });

  it('Shift+click picks a run of layers', () => {
    select(layers()[0].id);
    selectRange(layers()[2].id);
    expect(ui.getState().selectedIds).toHaveLength(3);
  });

  it('ungroups in place', () => {
    select(layers()[1].id);
    toggleSelect(layers()[2].id);
    groupSelected();
    ungroup(layers()[1].id);
    expect(names()).toEqual(['A', 'B', 'C']);
  });

  it('moving past the edge of a group steps out of it; dropping on a group puts the layer in it', () => {
    loadProject(createProject([named('A'), { ...groupLayer([named('B'), named('C')]), name: 'G' }]));
    const c = () => findLayer(layers(), layers()[1].type === 'group' ? (layers()[1] as { children: { id: string }[] }).children.at(-1)!.id : '')!;
    moveLayer(c().id, 'up');
    expect(tree()).toEqual(['A', 'G[B]', 'C']);
    moveLayerTo(layers()[2].id, layers()[1].id, 'into');
    expect(tree()).toEqual(['A', 'G[B,C]']);
    moveLayerTo(layers()[0].id, layers()[1].id, 'above');
    expect(tree()).toEqual(['G[B,C]', 'A']);
  });

  it('a group cannot be dropped inside itself', () => {
    loadProject(createProject([{ ...groupLayer([named('B')]), name: 'G' }]));
    const before = history.getState().present;
    const g = layers()[0];
    moveLayerTo(g.id, (g as { children: { id: string }[] }).children[0].id, 'above');
    expect(history.getState().present).toBe(before);
  });

  it('a locked group protects the layers inside it', () => {
    loadProject(createProject([{ ...groupLayer([named('B')]), name: 'G', locked: true }]));
    const inner = (layers()[0] as { children: Layer[] }).children[0];
    updateLayer(inner.id, { name: 'Changed' });
    expect(findLayer(layers(), inner.id)!.name).toBe('B');
  });

  it('duplicating a group gives everything inside it new ids', () => {
    loadProject(createProject([{ ...groupLayer([named('B'), named('C')]), name: 'G' }]));
    duplicateLayer(layers()[0].id);
    const ids = layers().flatMap((l) => [l.id, ...(l.type === 'group' ? l.children.map((c) => c.id) : [])]);
    expect(new Set(ids).size).toBe(6);
  });

  it('deleting a group deletes what is in it', () => {
    loadProject(createProject([named('A'), { ...groupLayer([named('B')]), name: 'G' }]));
    deleteLayer(layers()[1].id);
    expect(tree()).toEqual(['A']);
  });

  it('a new path starts in drawing mode', () => {
    addLayer('path');
    expect(ui.getState().pathEdit).toEqual({ drawing: true, point: null });
    select(null);
    expect(ui.getState().pathEdit).toBeNull();
  });
});
