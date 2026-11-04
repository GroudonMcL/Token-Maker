import { useLayoutEffect } from 'react';
import { MAX_OUTER_SPACING, MAX_SQUARES, MIN_SQUARES, SIZE_PRESETS, createDocument } from '../document/defaults';
import { outputSize, squaresLabel } from '../document/sizing';
import type { SizePreset } from '../document/types';
import { SegmentedButtons, Slider } from '../components';
import { updateFrameAndArt } from '../editor/artActions';
import { setEditBounds } from '../editor/tools';
import { commitDoc, useDoc } from '../state/tokenStore';
import { useExportSettings } from '../export/exportSettings';

const DEFAULT_SPACING = createDocument().frame.outerSpacing;

/** Per-square values are shown as a percentage of one grid square (1 unit = half a square). */
const toPct = (v: number) => Math.round(v * 50 * 10) / 10;
const fromPct = (p: number) => p / 50;

/**
 * The token's size (DESIGN.md §6.9), at the top of the Export tab: creature
 * size in grid squares, and the room between the frame and the edge of the
 * picture (the outer spacing, in the Frame tab until the owner moved it). The
 * red square on the canvas gets handles while this shows, to drag that room
 * bigger or smaller.
 */
export function SizeSection() {
  const size = useDoc((d) => d.size);
  const spacing = useDoc((d) => d.frame.outerSpacing);
  const hasArt = useDoc((d) => d.art.assetId !== null);
  const pxPerSquare = useExportSettings((s) => s.pxPerSquare);
  useLayoutEffect(() => {
    setEditBounds(true);
    return () => setEditBounds(false);
  }, []);
  const setPreset = (preset: SizePreset) => {
    const known = SIZE_PRESETS.find((s) => s.id === preset);
    updateFrameAndArt((d) => ({ ...d, size: { preset, squares: known ? known.squares : d.size.squares } }));
  };
  return (
    <>
      <SegmentedButtons
        label="Creature size"
        value={size.preset}
        onChange={setPreset}
        options={[...SIZE_PRESETS.map((s) => ({ value: s.id, label: s.name })), { value: 'custom' as const, label: 'Custom' }]}
      />
      {size.preset === 'custom' && (
        <Slider
          label="Squares across"
          min={MIN_SQUARES}
          max={MAX_SQUARES}
          step={0.5}
          defaultValue={1}
          value={size.squares}
          onChange={(v) => updateFrameAndArt((d) => ({ ...d, size: { preset: 'custom', squares: v } }), { transient: true })}
          onCommit={commitDoc}
        />
      )}
      <Slider
        label="Outer spacing"
        unit="% of a square"
        defaultValue={toPct(DEFAULT_SPACING)}
        min={0}
        max={toPct(MAX_OUTER_SPACING)}
        step={0.5}
        value={toPct(spacing)}
        onChange={(v) => updateFrameAndArt((d) => ({ ...d, frame: { ...d.frame, outerSpacing: fromPct(v) } }), { transient: true })}
        onCommit={commitDoc}
      />
      <p className="control__hint">
        {hasArt
          ? 'Room between the frame and the edge of the picture (the red square on the canvas): drag the square’s corners, or use the slider. More room keeps shadows, decorations and labels from being cut off.'
          : 'Room between the frame and the edge of the picture, for shadows, decorations and labels.'}
      </p>
      <p className="control__hint">
        Covers {squaresLabel(size.squares)} on the map. Exports at{' '}
        <span className="num">
          {outputSize(size.squares, pxPerSquare)} × {outputSize(size.squares, pxPerSquare)} px
        </span>{' '}
        ({pxPerSquare} px per square).
      </p>
    </>
  );
}
