// Changes to the label (DESIGN.md §6.10), shared by the Label section and
// dragging the label on the canvas.

import { newLabel, RING_TEXT_STYLE, SHAPE_TEXT_STYLE } from '../document/defaults';
import type { LabelAnchor, LabelSettings, LabelShape, TokenDocument } from '../document/types';
import { labelPlacement, labelSnapPoint, LABEL_SNAP, RING_SNAP } from '../render/label';
import type { Point } from '../render/shapes';
import { getDoc, updateDoc } from '../state/tokenStore';

/** Changes the label (does nothing without one). Pass `transient` while dragging. */
export function updateLabel(patch: Partial<LabelSettings> | ((l: LabelSettings) => LabelSettings), transient = false): void {
  updateDoc((d) => (d.label ? { ...d, label: typeof patch === 'function' ? patch(d.label) : { ...d.label, ...patch } } : d), { transient });
}

/** Adds a new label, or removes it. */
export function setLabelOn(on: boolean): void {
  updateDoc((d) => ({ ...d, label: on ? (d.label ?? newLabel()) : null }));
}

/**
 * The label moved to the top, the bottom or set free. A banner's bend turns
 * the other way at the top, so it follows the ring there too.
 */
export function withPlace(l: LabelSettings, place: LabelSettings['place']): LabelSettings {
  const curve = (place === 'top' && l.curve > 0) || (place === 'bottom' && l.curve < 0) ? -l.curve : l.curve;
  return { ...l, place, curve };
}

/** Top, bottom or free from the panel. Free keeps the label exactly where it is. */
export function setLabelPlace(place: LabelSettings['place']): void {
  const doc = getDoc();
  const l = doc.label;
  if (!l || l.place === place) return;
  if (place !== 'free') return updateLabel(withPlace(l, place));
  if (l.shape === 'ring') return updateLabel({ place, angle: l.place === 'top' ? 270 : 90 });
  const at = labelPlacement(doc)?.anchor ?? { x: l.x, y: l.y };
  updateLabel({ place, x: at.x, y: at.y });
}

/** A new anchor point for a free label, keeping the label exactly where it is on the token. */
export function setLabelAnchor(anchor: LabelAnchor): void {
  const doc = getDoc();
  const l = doc.label;
  if (!l || l.anchor === anchor) return;
  const before = labelPlacement(doc)?.centre;
  const after = labelPlacement({ ...doc, label: { ...l, anchor } })?.centre;
  const dx = before && after ? before.x - after.x : 0;
  const dy = before && after ? before.y - after.y : 0;
  updateLabel({ anchor, x: l.x + dx, y: l.y + dy });
}

/** Labels with no shape behind the words: their text needs the light, outlined style. */
const shapeless = (shape: LabelShape) => shape === 'ring' || shape === 'plain';

/** True when the label's text still has `style`'s colour and outline (not changed by hand). */
const hasStyle = (l: LabelSettings, style: typeof RING_TEXT_STYLE) =>
  l.color === style.color && l.textOutline.width === style.textOutline.width && (style.textOutline.width === 0 || l.textOutline.color === style.textOutline.color);

/**
 * A new shape. Ring and plain text have no shape behind them, so they use
 * light outlined letters; a banner, plaque, pill or box uses dark letters
 * with no outline. Switching between the two swaps them, unless the text's
 * colour or outline was changed by hand.
 */
export function setLabelShape(shape: LabelShape): void {
  updateLabel((l) => {
    if (l.shape === shape) return l;
    let next: LabelSettings = { ...l, shape };
    if (shapeless(shape) && !shapeless(l.shape) && hasStyle(l, SHAPE_TEXT_STYLE)) next = { ...next, ...RING_TEXT_STYLE, textOutline: { ...RING_TEXT_STYLE.textOutline } };
    else if (shapeless(l.shape) && !shapeless(shape) && hasStyle(l, RING_TEXT_STYLE)) next = { ...next, ...SHAPE_TEXT_STYLE, textOutline: { ...SHAPE_TEXT_STYLE.textOutline } };
    if (shape === 'ring' && l.place === 'free') next.angle = angleOf({ x: l.x, y: l.y });
    return next;
  });
}

const angleOf = (p: Point) => (Math.atan2(p.y, p.x) * 180) / Math.PI;

/**
 * Where a label goes when its middle is dragged to `to` (token units): it
 * snaps to the top or bottom when near (unless `free`, e.g. Alt is held),
 * else it goes exactly there. Ring text moves round the ring.
 */
export function draggedLabel(doc: TokenDocument, start: LabelSettings, to: Point, free: boolean): LabelSettings {
  if (start.shape === 'ring') {
    const deg = ((angleOf(to) % 360) + 360) % 360;
    if (!free && Math.abs(deg - 90) <= RING_SNAP) return { ...start, place: 'bottom' };
    if (!free && Math.abs(deg - 270) <= RING_SNAP) return { ...start, place: 'top' };
    return { ...start, place: 'free', angle: Math.round(deg * 10) / 10 };
  }
  const d = { ...doc, label: start };
  if (!free) {
    for (const place of ['bottom', 'top'] as const) {
      const p = labelSnapPoint(d, place);
      if (Math.hypot(p.x - to.x, p.y - to.y) <= LABEL_SNAP) return withPlace(start, place);
    }
  }
  return { ...start, place: 'free', x: Math.max(-1, Math.min(1, to.x)), y: Math.max(-1, Math.min(1, to.y)) };
}
