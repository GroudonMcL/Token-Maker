// The open project, its undo history and every edit the editor can make.
// Components call these actions; none of them touch the project directly.
// Layers form a tree (groups hold layers), so edits find layers by id
// wherever they are (project/tree.ts).

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { convertLegacyLayer } from '../project/convert';
import { createProject, groupLayer, newId, NEW_LAYER } from '../project/defaults';
import { cloneWithNewIds, findLayer, flatten, insertLayer, isLocked, locate, mapLayer, removeLayer } from '../project/tree';
import type { EditableLayerType, Effect, FrameProject, Layer, PathPoint, StageSettings } from '../project/types';
import { bandGeometry } from '../render/band';
import { finder, recentrePath, turnLayer } from '../render/hitTest';
import { repeatPlacements } from '../render/layers';
import { shapeAsPath } from '../render/placed';
import { createHistoryStore } from './history';

export const history = createHistoryStore<FrameProject>(createProject());

/** Drawing or editing the points of the selected path on the canvas. */
export interface PathEdit {
  /** Clicks on the canvas add points (a new path is being drawn). */
  drawing: boolean;
  /** The chosen point, for Delete and "smooth/sharp". */
  point: number | null;
}

interface UiState {
  /** The layer whose settings are shown (the last one picked). */
  selectedId: string | null;
  /** Every picked layer, for grouping (always includes selectedId). */
  selectedIds: string[];
  /** Basic hides the Advanced sections; Advanced shows them and the project data view. */
  mode: 'basic' | 'advanced';
  pathEdit: PathEdit | null;
  /** Effects copied with Copy effects, for Paste effects. */
  copiedEffects: Effect[] | null;
}

export const ui = createStore<UiState>(() => ({ selectedId: null, selectedIds: [], mode: 'basic', pathEdit: null, copiedEffects: null }));

export const useProject = () => useStore(history, (s) => s.present);
export const useCanUndo = () => useStore(history, (s) => s.past.length > 0 || s.pendingBase !== null);
export const useCanRedo = () => useStore(history, (s) => s.future.length > 0);
export const useUi = <T>(pick: (s: UiState) => T) => useStore(ui, pick);

const get = () => history.getState().present;

export interface EditOptions {
  /** Part of a drag: shown at once, recorded as one undo step by commit(). */
  transient?: boolean;
}

function update(fn: (p: FrameProject) => FrameProject, opts?: EditOptions): void {
  history.getState().set(fn(get()), opts);
}

const withLayers = (fn: (layers: Layer[]) => Layer[]) => (p: FrameProject) => ({ ...p, layers: fn(p.layers) });

/** Picks one layer (or none). */
export const select = (id: string | null) => ui.setState({ selectedId: id, selectedIds: id ? [id] : [], pathEdit: null });

/** Adds a layer to the picked ones, or takes it out (Ctrl+click). */
export function toggleSelect(id: string): void {
  const { selectedIds } = ui.getState();
  if (selectedIds.includes(id)) {
    const rest = selectedIds.filter((x) => x !== id);
    ui.setState({ selectedIds: rest, selectedId: rest.at(-1) ?? null, pathEdit: null });
  } else ui.setState({ selectedIds: [...selectedIds, id], selectedId: id, pathEdit: null });
}

/** Picks every layer between the selected one and `id` in the list (Shift+click), among the same group's layers. */
export function selectRange(id: string): void {
  const from = ui.getState().selectedId;
  const a = from ? locate(get().layers, from) : null;
  const b = locate(get().layers, id);
  if (!a || !b || a.parent?.id !== b.parent?.id) return select(id);
  const siblings = b.parent ? b.parent.children : get().layers;
  const [lo, hi] = a.index < b.index ? [a.index, b.index] : [b.index, a.index];
  ui.setState({ selectedIds: siblings.slice(lo, hi + 1).map((l) => l.id), selectedId: id, pathEdit: null });
}

export const setMode = (mode: UiState['mode']) => ui.setState({ mode });
export const setPathEdit = (pathEdit: PathEdit | null) => ui.setState({ pathEdit });
export const commit = () => history.getState().commit();
export const undo = () => history.getState().undo();
export const redo = () => history.getState().redo();

export function selectedLayer(): Layer | undefined {
  return findLayer(get().layers, ui.getState().selectedId);
}

/** Replaces the open project (new, open, template): a fresh undo history. */
export function loadProject(project: FrameProject): void {
  history.getState().reset(project);
  select(project.layers.at(-1)?.id ?? null);
}

export function newProject(): void {
  loadProject(createProject());
}

/** Adds a layer just above the selected one, in the same group (or on top), and selects it. */
export function addLayer(layerOrType: Layer | EditableLayerType): Layer {
  const layer = typeof layerOrType === 'string' ? NEW_LAYER[layerOrType]() : layerOrType;
  const sel = ui.getState().selectedId ? locate(get().layers, ui.getState().selectedId!) : null;
  update(withLayers((layers) => (sel ? insertLayer(layers, sel.parent?.id ?? null, sel.index + 1, layer) : [...layers, layer])));
  select(layer.id);
  // A new path is drawn by clicking on the canvas.
  if (layer.type === 'path' && layer.points.length === 0) setPathEdit({ drawing: true, point: null });
  return layer;
}

/** Adds several layers (bottom first) just above the selected one, as one undo step, and selects the top one. */
export function addLayers(added: Layer[]): void {
  if (added.length === 0) return;
  const sel = ui.getState().selectedId ? locate(get().layers, ui.getState().selectedId!) : null;
  update(withLayers((layers) => added.reduce((acc, layer, k) => (sel ? insertLayer(acc, sel.parent?.id ?? null, sel.index + 1 + k, layer) : [...acc, layer]), layers)));
  select(added[added.length - 1].id);
}

/** Changes a layer's settings. Locked layers (or ones in a locked group) can't be changed, except to unlock, show/hide or fold them. */
export function updateLayer(id: string, patch: Partial<Layer>, opts?: EditOptions): void {
  if (!findLayer(get().layers, id)) return;
  const harmless = Object.keys(patch).every((k) => k === 'locked' || k === 'visible' || k === 'collapsed');
  if (isLocked(get().layers, id) && !harmless) return;
  update(withLayers((layers) => mapLayer(layers, id, (l) => ({ ...l, ...patch }) as Layer)), opts);
}

export const renameLayer = (id: string, name: string) => updateLayer(id, { name: name.trim() || 'Layer' });
export const toggleVisible = (id: string) => updateLayer(id, { visible: !findLayer(get().layers, id)?.visible });
export const toggleLocked = (id: string) => updateLayer(id, { locked: !findLayer(get().layers, id)?.locked });
export const toggleCollapsed = (id: string) => {
  const l = findLayer(get().layers, id);
  if (l?.type === 'group') updateLayer(id, { collapsed: !l.collapsed });
};

export function duplicateLayer(id: string): void {
  const found = locate(get().layers, id);
  if (!found) return;
  const copy = { ...cloneWithNewIds(found.layer, newId), name: `${found.layer.name} copy`, locked: false };
  update(withLayers((layers) => insertLayer(layers, found.parent?.id ?? null, found.index + 1, copy)));
  select(copy.id);
}

export function deleteLayer(id: string): void {
  const found = locate(get().layers, id);
  if (!found) return;
  const siblings = found.parent ? found.parent.children : get().layers;
  update(withLayers((layers) => removeLayer(layers, id)));
  const sel = ui.getState().selectedId;
  if (sel === id || (found.layer.type === 'group' && sel && !findLayer(get().layers, sel))) {
    select(siblings[found.index - 1]?.id ?? siblings[found.index + 1]?.id ?? found.parent?.id ?? null);
  }
}

/**
 * Moves a layer up (towards the top of the stack, drawn later) or down among
 * its group's layers. At the top or bottom of a group it steps out of the
 * group, to just above or below it.
 */
export function moveLayer(id: string, direction: 'up' | 'down'): void {
  const found = locate(get().layers, id);
  if (!found) return;
  const siblings = found.parent ? found.parent.children : get().layers;
  const j = direction === 'up' ? found.index + 1 : found.index - 1;
  if (j >= 0 && j < siblings.length) {
    const swapped = [...siblings];
    [swapped[found.index], swapped[j]] = [swapped[j], swapped[found.index]];
    update(withLayers((layers) => (found.parent ? mapLayer(layers, found.parent.id, (g) => ({ ...g, children: swapped }) as Layer) : swapped)));
    return;
  }
  if (!found.parent) return;
  const outer = locate(get().layers, found.parent.id)!;
  update(
    withLayers((layers) => insertLayer(removeLayer(layers, id), outer.parent?.id ?? null, direction === 'up' ? outer.index + 1 : outer.index, found.layer)),
  );
}

/**
 * Moves a layer next to another one (drag and drop in the layer list):
 * 'above' or 'below' it in its group, or 'into' a group (on top).
 */
export function moveLayerTo(id: string, targetId: string, where: 'above' | 'below' | 'into'): void {
  if (id === targetId) return;
  const moving = findLayer(get().layers, id);
  // A group can't go inside itself.
  if (!moving || (moving.type === 'group' && flatten(moving.children).some((l) => l.id === targetId))) return;
  const without = removeLayer(get().layers, id);
  const target = locate(without, targetId);
  if (!target) return;
  const next =
    where === 'into' && target.layer.type === 'group'
      ? insertLayer(without, target.layer.id, target.layer.children.length, moving)
      : insertLayer(without, target.parent?.id ?? null, where === 'above' ? target.index + 1 : target.index, moving);
  if (JSON.stringify(next) === JSON.stringify(get().layers)) return;
  update(withLayers(() => next));
}

/**
 * Puts the picked layers into a new group, where the top-most of them was.
 * Layers inside a picked group come along with it.
 */
export function groupSelected(): void {
  const all = get().layers;
  const ids = ui.getState().selectedIds.filter((id) => findLayer(all, id));
  if (ids.length === 0) return;
  // Leave out layers already inside another picked group.
  const picked = ids.filter((id) => !locate(all, id)!.ancestors.some((g) => ids.includes(g.id)));
  // Keep their stacking order: bottom first, as the flattened list has them.
  const order = flatten(all).map((l) => l.id);
  picked.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const top = locate(all, picked.at(-1)!)!;
  const group = { ...groupLayer(picked.map((id) => findLayer(all, id)!)), name: 'Group' };
  // Insert the group just above the top-most picked layer, then take the layers out of their old places.
  let layers = insertLayer(all, top.parent?.id ?? null, top.index + 1, group);
  for (const id of picked) {
    layers = removeOutside(layers, id, group.id);
  }
  update(withLayers(() => layers));
  select(group.id);
}

/** Removes layer `id` everywhere except inside group `keepIn`. */
function removeOutside(layers: Layer[], id: string, keepIn: string): Layer[] {
  return layers
    .filter((l) => l.id !== id)
    .map((l) => (l.type === 'group' && l.id !== keepIn ? { ...l, children: removeOutside(l.children, id, keepIn) } : l));
}

/**
 * Turns a Token Maker frame layer into a group of editable layers in its
 * place (project/convert.ts), as one undo step, and selects the group.
 * Returns false if the frame has no converter or the layer is locked.
 */
export function convertToLayers(id: string): boolean {
  const layer = findLayer(get().layers, id);
  if (layer?.type !== 'legacyFrame' || isLocked(get().layers, id)) return false;
  const group = convertLegacyLayer(layer);
  if (!group) return false;
  update(withLayers((layers) => mapLayer(layers, id, () => group)));
  select(group.id);
  return true;
}

/** Takes a group's layers out, in its place, and removes the group. */
export function ungroup(id: string): void {
  const found = locate(get().layers, id);
  if (!found || found.layer.type !== 'group') return;
  const children = found.layer.children;
  let layers = removeLayer(get().layers, id);
  children.forEach((c, k) => {
    layers = insertLayer(layers, found.parent?.id ?? null, found.index + k, c);
  });
  update(withLayers(() => layers));
  ui.setState({ selectedIds: children.map((c) => c.id), selectedId: children.at(-1)?.id ?? null, pathEdit: null });
}

export function updateStage(patch: Partial<StageSettings>, opts?: EditOptions): void {
  update((p) => ({ ...p, stage: { ...p.stage, ...patch } }), opts);
}

export function renameProject(name: string): void {
  update((p) => ({ ...p, name: name.trim() || 'Untitled frame' }));
}

/** Changes the selected path's points (one undo step unless transient). */
export function setPathPoints(id: string, points: PathPoint[], opts?: EditOptions): void {
  updateLayer(id, { points } as Partial<Layer>, opts);
}

/**
 * Stops drawing the selected path (keeps editing its points). Its anchor
 * moves to the middle of what was drawn, so it turns about its centre.
 */
export function finishDrawing(close: boolean): void {
  const layer = selectedLayer();
  if (layer?.type !== 'path') return setPathEdit(null);
  // Placements scale with the picture, so any size gives the same numbers.
  const g = bandGeometry(get().stage, 1000);
  const patch = { ...recentrePath(layer, g), ...(close && layer.points.length > 2 ? { closed: true } : {}) };
  if (Object.keys(patch).length) updateLayer(layer.id, patch as Partial<Layer>);
  setPathEdit({ drawing: false, point: null });
}

/** Changes a layer's effects (one undo step unless transient). */
export function setEffects(id: string, effects: Effect[], opts?: EditOptions): void {
  updateLayer(id, { effects }, opts);
}

/**
 * Gives every picked layer (that isn't locked) these effects, replacing its
 * own or added after them, as one undo step. A style (project/styles.ts) is
 * applied this way. Each layer gets its own copy.
 */
export function applyEffectsToSelected(effects: Effect[], mode: 'replace' | 'add' = 'replace'): void {
  const ids = ui.getState().selectedIds.length ? ui.getState().selectedIds : ui.getState().selectedId ? [ui.getState().selectedId!] : [];
  let layers = get().layers;
  for (const id of ids) {
    if (!findLayer(layers, id) || isLocked(layers, id)) continue;
    layers = mapLayer(layers, id, (l) => (l.type === 'unsupported' ? l : ({ ...l, effects: [...(mode === 'add' ? l.effects : []), ...structuredClone(effects)] } as Layer)));
  }
  if (layers !== get().layers) update(withLayers(() => layers));
}

/** Keeps the selected layer's effects for Paste effects. */
export function copyEffects(): void {
  const layer = selectedLayer();
  if (layer) ui.setState({ copiedEffects: structuredClone(layer.effects) });
}

/** Gives every picked layer the copied effects, in place of their own. */
export function pasteEffects(): void {
  const copied = ui.getState().copiedEffects;
  if (copied) applyEffectsToSelected(copied, 'replace');
}

/** Changes several layers at once (one undo step unless transient); locked ones are left alone. */
export function updateLayers(patches: { id: string; patch: Partial<Layer> }[], opts?: EditOptions): void {
  let layers = get().layers;
  for (const { id, patch } of patches) {
    if (!findLayer(layers, id) || isLocked(layers, id)) continue;
    layers = mapLayer(layers, id, (l) => ({ ...l, ...patch }) as Layer);
  }
  if (layers !== get().layers) update(withLayers(() => layers), opts);
}

/** The layers inside a group that move with it (not groups themselves, not locked ones). */
export function movableIn(group: Layer): Layer[] {
  return group.type === 'group' ? flatten(group.children).filter((l) => l.type !== 'group' && !isLocked(get().layers, l.id)) : [];
}

/** Turns everything in a group round the token's centre (one undo step). */
export function turnGroup(id: string, degrees: number): void {
  const group = findLayer(get().layers, id);
  if (!group || group.type !== 'group' || isLocked(get().layers, id)) return;
  const g = bandGeometry(get().stage, 1000);
  const find = finder(get());
  const patches = movableIn(group).flatMap((l) => {
    const n = l.type === 'repeat' ? Math.max(1, repeatPlacements(l, g, find).length) : l.type === 'gears' ? Math.max(1, l.count) : 1;
    const patch = turnLayer(l, degrees, n);
    return patch ? [{ id: l.id, patch }] : [];
  });
  updateLayers(patches);
}

/** Turns a shape layer into a path layer in its place, with the same look, so its points can be edited (one undo step). */
export function shapeToPath(id: string): void {
  const layer = findLayer(get().layers, id);
  if (layer?.type !== 'shape' || isLocked(get().layers, id)) return;
  const { shape: _s, sides: _d, innerRatio: _i, corner: _c, type: _t, ...rest } = layer;
  const path: Layer = { ...rest, type: 'path', points: shapeAsPath(layer), closed: true, stroke: 0, taperStart: 0, taperEnd: 0 };
  update(withLayers((layers) => mapLayer(layers, id, () => path)));
}

/** Puts a whole new set of layers in place of the project's (a variation or a recolouring), as one undo step, keeping the selection where it can. */
export function replaceLayers(layers: Layer[]): void {
  update(withLayers(() => layers));
  const sel = ui.getState().selectedId;
  if (sel && !findLayer(layers, sel)) select(null);
}
