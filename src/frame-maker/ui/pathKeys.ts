// Keys for drawing and editing a path's points on the canvas.

import { findLayer } from '../project/tree';
import { finishDrawing, history, setPathEdit, setPathPoints, ui } from '../state/projectStore';

/** Keys while drawing or editing a path: Enter/Escape finish, Delete removes the chosen point. Returns true if it used the key. */
export function pathEditKey(e: KeyboardEvent): boolean {
  const { pathEdit, selectedId } = ui.getState();
  if (!pathEdit) return false;
  if (e.key === 'Enter' || e.key === 'Escape') {
    if (pathEdit.drawing) finishDrawing(e.key === 'Enter');
    else setPathEdit(null);
    return true;
  }
  const layer = findLayer(history.getState().present.layers, selectedId);
  if ((e.key === 'Delete' || e.key === 'Backspace') && pathEdit.point !== null && layer?.type === 'path') {
    if (!layer.locked) setPathPoints(layer.id, layer.points.filter((_p, i) => i !== pathEdit.point));
    setPathEdit({ ...pathEdit, point: null });
    return true;
  }
  return false;
}
