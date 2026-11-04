// @vitest-environment node
import { createProject, GEM_POINTS, groupLayer, lineLayer, legacyFrameLayer, pathLayer, repeatLayer, shapeLayer } from '../project/defaults';
import { bandGeometry } from './band';
import { dragLayer, movePathPart, pathHandles, pathLocal, pickLayer, pickPathPart, toggleSmooth } from './hitTest';
import { placement } from './placed';
import { repeatPlacements } from './layers';

const size = 400;

describe('picking and dragging on the canvas', () => {
  const frame = legacyFrameLayer('gilded');
  const beads = { ...repeatLayer(), count: 8, snapToCorners: false };
  const project = createProject([frame, beads]);
  const g = bandGeometry(project.stage, size);
  const bead = repeatPlacements(beads, g)[2].p;

  it('picks the top-most layer under the pointer', () => {
    expect(pickLayer(project, size, bead)?.id).toBe(beads.id);
    // Between two beads, on the band: the frame below.
    const between = repeatPlacements({ ...beads, offset: 0.5 }, g)[2].p;
    expect(pickLayer(project, size, between)?.id).toBe(frame.id);
    expect(pickLayer(project, size, { x: 0, y: 0 })).toBeNull();
  });

  it('skips hidden and locked layers', () => {
    expect(pickLayer({ ...project, layers: [frame, { ...beads, visible: false }] }, size, bead)?.id).toBe(frame.id);
    expect(pickLayer({ ...project, layers: [frame, { ...beads, locked: true }] }, size, bead)?.id).toBe(frame.id);
  });

  it('dragging inwards moves a line across the band', () => {
    const line = lineLayer();
    const top = (across: number) => ({ x: 0, y: -(g.R - (g.outer + (g.inner - g.outer) * across)) });
    const patch = dragLayer(line, project, size, top(0.5), top(0.75)) as { at: number };
    expect(patch.at).toBeCloseTo(0.75, 2);
  });

  it('dragging round the token slides repeated shapes along', () => {
    const r = g.R - (g.outer + g.inner) / 2;
    const quarter = dragLayer(beads, project, size, { x: 0, y: -r }, { x: r * Math.sin(Math.PI / 8), y: -r * Math.cos(Math.PI / 8) }) as { offset: number; at: number };
    // 1/16 of a turn with 8 beads is half a gap.
    expect(quarter.offset).toBeCloseTo(0.5, 2);
    expect(quarter.at).toBeCloseTo(beads.at, 2);
  });

  it('Token Maker frames are not moved by dragging', () => {
    expect(dragLayer(frame, project, size, { x: 0, y: -150 }, { x: 0, y: -120 })).toBeNull();
  });

  it('picks layers inside groups, but not in hidden or locked groups', () => {
    const inGroup = { ...groupLayer([beads]) };
    expect(pickLayer({ ...project, layers: [frame, inGroup] }, size, bead)?.id).toBe(beads.id);
    expect(pickLayer({ ...project, layers: [frame, { ...inGroup, visible: false }] }, size, bead)?.id).toBe(frame.id);
    expect(pickLayer({ ...project, layers: [frame, { ...inGroup, locked: true }] }, size, bead)?.id).toBe(frame.id);
  });

  it('picks a shape and drags it round the band', () => {
    const shape = { ...shapeLayer(), along: 0 };
    const p = createProject([frame, shape]);
    const t = placement(shape, g)!;
    expect(pickLayer(p, size, t)?.id).toBe(shape.id);
    const patch = dragLayer(shape, p, size, t, { x: t.x + 40, y: t.y + 3 }) as { along: number; across: number };
    expect(patch.along).toBeGreaterThan(0.02);
    // A straight drag at the top of a circle drifts a little outwards.
    expect(Math.abs(patch.across - shape.across)).toBeLessThan(0.1);
  });

  it('finds, moves and smooths path points', () => {
    const path = { ...pathLayer(GEM_POINTS), size: 2 };
    const handles = pathHandles(path, g);
    expect(pickPathPart(path, g, handles[3].at, null)).toEqual({ point: 3, part: 'point' });
    const target = { x: handles[3].at.x + 10, y: handles[3].at.y };
    const moved = movePathPart(path, g, { point: 3, part: 'point' }, target)!;
    expect(moved[3].x).toBeCloseTo(pathLocal(path, g, target)!.x, 2);
    const smooth = toggleSmooth(path.points, 3, true);
    expect(smooth[3].handle).not.toBeNull();
    const withHandle = { ...path, points: smooth };
    const out = pathHandles(withHandle, g)[3].out!;
    expect(pickPathPart(withHandle, g, out, 3)).toEqual({ point: 3, part: 'out' });
    expect(toggleSmooth(smooth, 3, true)[3].handle).toBeNull();
  });
});
