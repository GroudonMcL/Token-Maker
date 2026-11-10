// Settings for the selected layer. Each layer type has its own controls; the
// ones most people need come first and the technical ones sit in Advanced.

import { useState } from 'react';
import { PenTool, Plus, RotateCcw, RotateCw, Shuffle, Trash2 } from 'lucide-react';
import { FRAME_PRESETS } from '../engine/legacy/catalog';
import { mix, shade } from '../engine/legacy/color';
import { frameAccent } from '../engine/legacy/frames';
import { canConvert, differenceNote } from '../project/convert';
import { GROWTH_PRESETS, LAYER_TYPE_NAMES, NEW_LAYER, TEXTURES, textureLayer } from '../project/defaults';
import { findLayer, locate } from '../project/tree';
import {
  BLEND_MODES,
  CLIP_MODES,
  DEFAULT_LIGHT,
  ELEMENT_KINDS,
  CELL_PATTERNS,
  COMBINE_MODES,
  HEIGHT_MODES,
  GEM_CUTS,
  GEM_SETTINGS,
  GROWTH_EXTRAS,
  GROWTH_KINDS,
  MIRROR_MODES,
  TEXT_FONTS,
  SHAPE_KINDS,
  TEXTURE_KINDS,
  WAVE_SHAPES,
  TEXTURE_PLACES,
  type BlendMode,
  type ClipMode,
  type CombineMode,
  type HeightMode,
  type ContoursLayer,
  type GemCut,
  type CellsLayer,
  type CellPattern,
  type ChainLayer,
  type FractureLayer,
  type GearsLayer,
  type GrowthExtra,
  type GrowthKind,
  type GrowthLayer,
  type KnotworkLayer,
  type GemSetting,
  type TextFont,
  type TextLayer,
  type GradientStop,
  type Layer,
  type MirrorMode,
  type Paint,
  type PathLayer,
  type PlacedLayer,
  type RepeatLayer,
  type ShapeLayer,
  type RingStop,
  type ShapeKind,
  type TextureLayer,
  type TexturePlace,
  type WaveShape,
} from '../project/types';
import { bandGeometry } from '../render/band';
import { litFor } from '../render/paint';
import { TEXTURE_NAMES } from '../render/textures';
import { DETAIL_NAMES, ELEMENT_NAMES, LINE_ELEMENTS } from '../render/elements';
import { PICTURES, pictureById } from '../project/pictures';
import { LIBRARY_PICTURE_GROUPS, LIBRARY_PICTURES, TEXTURE_PICTURES, libraryPictureById, libraryPictureThumbUrl, type LibraryPictureGroup } from '../project/libraryPictures';
import { switchPlace, toggleSeparate, toggleSmooth } from '../render/hitTest';
import { commit, convertToLayers, finishDrawing, setPathEdit, setPathPoints, shapeToPath, turnGroup, ungroup, updateLayer, useProject, useProjectPart, useUi } from '../state/projectStore';
import { ColorField, ColorList, Fold, OptionalColor, PatternField, PercentList, Select, Slider, TextField, Toggle } from './controls';
import { DataView } from './DataView';
import { EffectStack, EffectsSection } from './EffectsPanel';
import { STYLES } from '../project/styles';
import { flatten } from '../project/tree';

const BLEND_NAMES: Record<BlendMode, string> = {
  'source-over': 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  'soft-light': 'Soft light',
  lighter: 'Add (glow)',
  color: 'Colour',
  'hard-light': 'Hard light',
  'color-dodge': 'Colour dodge (bright)',
  'color-burn': 'Colour burn (dark)',
  darken: 'Darken',
  lighten: 'Lighten',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  luminosity: 'Luminosity',
  'destination-out': 'Cut a hole (knockout)',
};

const CLIP_NAMES: Record<ClipMode, string> = {
  none: 'Not clipped',
  band: 'Only inside the band',
  below: 'Only on the layer below',
};

const MIRROR_NAMES: Record<MirrorMode, string> = {
  none: 'No mirror',
  leftRight: 'Left and right (a pair)',
  topBottom: 'Top and bottom (a pair)',
  four: 'All four sides',
};

const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'Circle or oval',
  rectangle: 'Rectangle',
  polygon: 'Polygon',
  star: 'Star',
  ornament: 'Ornament (heart, fleur-de-lis…)',
  ring: 'Ring',
  crescent: 'Crescent',
  semicircle: 'Half circle (dome)',
  teardrop: 'Teardrop',
  lens: 'Almond (pointed oval)',
  cross: 'Cross',
  arch: 'Arch (round or pointed)',
  trapezoid: 'Trapezoid',
  chevron: 'Chevron',
  flower: 'Flower (rosette)',
  squircle: 'Rounded square (squircle)',
  burst: 'Burst (uneven star)',
  blob: 'Blob (organic)',
};

/** What a shape's numbers mean, for the shapes that use them: [label, hint, min, max]. */
const SHAPE_SIDES: Partial<Record<ShapeKind, [string, string, number, number]>> = {
  polygon: ['Sides', 'How many sides it has.', 3, 16],
  star: ['Points', 'How many points it has.', 3, 16],
  burst: ['Points', 'How many points it has.', 3, 24],
  flower: ['Petals', 'How many petals it has.', 3, 16],
  blob: ['Lumps', 'How many lumps and hollows its outline has.', 3, 8],
};
const SHAPE_RATIO: Partial<Record<ShapeKind, [string, string]>> = {
  star: ['Inner points', 'How far in the points between the tips are.'],
  burst: ['Inner points', 'How far in the points between the tips are.'],
  ring: ['Hole size', 'How big the hole in the middle is.'],
  crescent: ['Thinness', 'How much is cut away: a fat crescent at 0%, a thin sliver at 100%.'],
  cross: ['Arm width', 'How wide the arms are.'],
  chevron: ['Thickness', 'How thick its arms are.'],
  trapezoid: ['Top width', 'How wide its outer side is, as a share of the inner side.'],
  flower: ['Petal depth', 'How deep the dips between the petals are.'],
  teardrop: ['Plumpness', 'How round its body is.'],
  blob: ['Lumpiness', 'How lumpy it is.'],
};
const SHAPE_CORNER: Partial<Record<ShapeKind, [string, string]>> = {
  rectangle: ['Round the corners', 'How rounded its corners are.'],
  squircle: ['Roundness', 'From nearly square (0%) to a circle (100%).'],
  arch: ['Pointed top', 'A round arch at 0%, a tall pointed (Gothic) arch at 100%.'],
};

const COMBINE_NAMES: Record<CombineMode, string> = {
  normal: 'Drawn over each other',
  union: 'Added together',
  subtract: 'Cut out of the bottom one',
  intersect: 'Only where they overlap',
  exclude: 'All but the overlaps',
};

const HEIGHT_NAMES: Record<HeightMode, string> = {
  none: 'Not part of it',
  raise: 'Raised',
  carve: 'Carved in',
};

const CUT_NAMES: Record<GemCut, string> = {
  brilliant: 'Brilliant (round, many facets)',
  rose: 'Rose (domed, to a point)',
  emerald: 'Emerald (stepped rectangle)',
  cabochon: 'Cabochon (smooth dome)',
  rough: 'Rough crystal',
};

const SETTING_NAMES: Record<GemSetting, string> = {
  none: 'No setting',
  bezel: 'Bezel (a rim all round)',
  claws4: 'Four claws',
  claws6: 'Six claws',
};

const FONT_NAMES: Record<TextFont, string> = {
  runes: 'Runes (Elder Futhark)',
  grenze: 'Grenze (old style)',
  atkinson: 'Atkinson (plain, easy to read)',
  babelstone: 'BabelStone Runic (real runes)',
  outerRim: 'Outer Rim (alien script)',
  sith: 'Sith (ancient script)',
  yugurian: 'Yugurian (fantasy script)',
};

/** Metal styles a setting can take. */
const SETTING_STYLES = ['gold', 'silver', 'hammered-bronze', 'blackened-iron', 'brushed-steel', 'verdigris'];

const WAVE_NAMES: Record<WaveShape, string> = {
  sine: 'Smooth waves',
  zigzag: 'Zigzag',
  scallop: 'Scallops',
  square: 'Battlements',
};

const DETAIL_HINT = 'The colour of its second part; off works one out from the main colour.';

const WHERE_NAMES: Record<TexturePlace, string> = {
  everywhere: 'Everywhere',
  shaded: 'Mostly on the shaded side',
  lit: 'Mostly on the lit side',
};

type Set<L extends Layer> = (patch: Partial<L>, transient?: boolean) => void;

function setterFor<L extends Layer>(layer: L): Set<L> {
  return (patch, transient) => updateLayer(layer.id, patch as Partial<Layer>, { transient });
}

const NO_DEFAULTS: Record<string, unknown> = {};
const layerDefaults = new Map<string, Record<string, unknown>>();

/**
 * A new layer of the same kind: what the reset buttons put settings back to.
 * Made once per kind and kept: every slider asks for it each time the panel
 * is drawn, which is on every step of a slider being dragged. Only read from.
 */
function defaultsFor(layer: Layer): Record<string, unknown> {
  if (layer.type === 'unsupported') return NO_DEFAULTS;
  const kind = layer.type === 'texture' ? `texture:${layer.kind}` : layer.type;
  let made = layerDefaults.get(kind);
  if (!made) {
    made = (layer.type === 'texture' ? textureLayer(layer.kind) : NEW_LAYER[layer.type]()) as unknown as Record<string, unknown>;
    layerDefaults.set(kind, made);
  }
  return made;
}

/** A slider bound to one numeric setting of a layer, with a button that puts it back as a new layer has it. */
function num<L extends Layer>(layer: L, set: Set<L>, key: keyof L & string, label: string, min: number, max: number, extra: Partial<Parameters<typeof Slider>[0]> = {}) {
  const standard = defaultsFor(layer)[key];
  return (
    <Slider
      key={key}
      label={label}
      value={layer[key] as number}
      min={min}
      max={max}
      disabled={layer.locked}
      defaultValue={typeof standard === 'number' ? standard : undefined}
      onChange={(v, transient) => set({ [key]: v } as Partial<L>, transient)}
      onCommit={commit}
      {...extra}
    />
  );
}

const pct = { scale: 100, unit: '%', step: 0.005 };

export function PropertiesPanel() {
  const project = useProject();
  const selectedId = useUi((s) => s.selectedId);
  const advanced = useUi((s) => s.mode === 'advanced');
  const layer = findLayer(project.layers, selectedId);
  const inLockedGroup = !!layer && !!locate(project.layers, layer.id)?.ancestors.some((g) => g.locked);

  return (
    <aside className="panel properties" aria-label="Properties">
      <h2 className="panel-title">Properties</h2>
      {!layer ? (
        <p className="muted">Pick a layer in the list or on the canvas to change it.</p>
      ) : (
        <div className="props" key={layer.id}>
          <p className="layer-kind">
            {LAYER_TYPE_NAMES[layer.type]}
            {(layer.locked || inLockedGroup) && <span className="badge">{layer.locked ? 'Locked' : 'In a locked group'}</span>}
          </p>
          <LayerControls layer={inLockedGroup ? ({ ...layer, locked: true } as Layer) : layer} light={project.stage.light} />
          {layer.type !== 'unsupported' && <EffectsSection layer={inLockedGroup ? ({ ...layer, locked: true } as Layer) : layer} />}
          {layer.type !== 'unsupported' && <BlendingControls layer={inLockedGroup ? ({ ...layer, locked: true } as Layer) : layer} />}
          {advanced && layer.type !== 'unsupported' && (
            <Fold title="Advanced: layer" defaultOpen>
              <Select
                label="Clip"
                hint="Show this layer only inside the band, or only where the layer below it has paint."
                value={layer.clip}
                disabled={layer.locked}
                options={CLIP_MODES.map((c) => ({ value: c, label: CLIP_NAMES[c] }))}
                onChange={(clip) => updateLayer(layer.id, { clip })}
              />
              <AdvancedControls layer={layer} />
              <MaskControls layer={inLockedGroup ? ({ ...layer, locked: true } as Layer) : layer} />
              <HeightControls layer={inLockedGroup ? ({ ...layer, locked: true } as Layer) : layer} />
            </Fold>
          )}
        </div>
      )}
      {advanced && <DataView />}
    </aside>
  );
}

/** Opacity, blend mode and knockout: how the layer mixes with the layers under it (in Basic and Advanced). */
function BlendingControls({ layer }: { layer: Layer }) {
  const knockout = layer.blend === 'destination-out';
  return (
    <Fold title="Opacity and blend mode" defaultOpen>
      {layer.type !== 'group' && num(layer, setterFor(layer), 'opacity', 'Opacity', 0, 1, { ...pct, hint: 'How solid the layer is: at 0% it is invisible, at 100% fully drawn.' })}
      {!knockout && (
        <Select
          label="Blend mode"
          hint="How its colours mix with the layers under it: Multiply darkens (shadows, stains), Screen and Add lighten (glows, light), Overlay and Soft light add contrast, Colour and Hue recolour."
          value={layer.blend}
          disabled={layer.locked}
          options={BLEND_MODES.filter((b) => b !== 'destination-out').map((b) => ({ value: b, label: BLEND_NAMES[b] }))}
          onChange={(blend) => updateLayer(layer.id, { blend })}
        />
      )}
      <Toggle
        label="Cut a hole in the layers below"
        hint="A knockout: instead of being drawn, it cuts its shape out of the layers under it (in its group). Put a bevel on the group to give the hole an edge."
        checked={knockout}
        disabled={layer.locked}
        onChange={(on) => updateLayer(layer.id, { blend: on ? 'destination-out' : 'source-over' })}
      />
    </Fold>
  );
}

function LayerControls({ layer, light }: { layer: Layer; light: number }) {
  const layers = useProjectPart((p) => p.layers);
  const disabled = layer.locked;
  switch (layer.type) {
    case 'legacyFrame': {
      const set = setterFor(layer);
      const accent = frameAccent(layer.style);
      const convertible = canConvert(layer.style);
      return (
        <>
          <p className="note">
            A Token Maker frame, drawn by its original code. It is one layer: its colour{accent ? ' and highlights colour' : ''} can be changed
            {convertible ? '. Turn it into editable layers to change its parts one by one.' : ", but its parts can't be edited one by one yet."}
          </p>
          {light !== DEFAULT_LIGHT && (
            <p className="note warning" role="note">
              This frame is always lit from the top left: Token Maker's drawing code can't follow the light you moved. Your own layers do follow it
              {convertible ? ', and so will this frame once it is turned into layers.' : '.'}
            </p>
          )}
          {convertible && (
            <div className="convert">
              <button type="button" className="btn small" disabled={disabled} onClick={() => convertToLayers(layer.id)}>
                Turn into editable layers
              </button>
              <p className="note">
                Puts a group of layers in its place (band, step, rims, textures, ornaments), drawn to look like this frame. Undo brings the original back.
                {differenceNote(layer.style) && ` ${differenceNote(layer.style)}`}
              </p>
            </div>
          )}
          <Select
            label="Frame"
            value={layer.presetId}
            disabled={disabled}
            options={FRAME_PRESETS.map((p) => ({ value: p.id, label: `${p.name} (${p.group})` }))}
            onChange={(presetId) => {
              const p = FRAME_PRESETS.find((f) => f.id === presetId)!;
              set({ presetId, style: p.style, color: p.color, accent: null, name: layer.name === FRAME_PRESETS.find((f) => f.id === layer.presetId)?.name ? p.name : layer.name });
            }}
          />
          <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={FRAME_PRESETS.find((f) => f.id === layer.presetId)?.color} onChange={(color, t) => set({ color }, t)} />
          {accent && (
            <ColorField
              label="Highlights colour"
              hint="The colour of the frame's own details (beads, eyes, stars…)."
              value={layer.accent ?? accent}
              disabled={disabled}
              onChange={(c, t) => set({ accent: c }, t)}
            />
          )}
        </>
      );
    }
    case 'bandFill': {
      const set = setterFor(layer);
      return (
        <>
          <PaintEditor paint={layer.paint} disabled={disabled} onChange={(paint, t) => set({ paint }, t)} />
          {num(layer, set, 'from', 'Starts at (outer edge = 0%)', -0.5, 1.5, pct)}
          {num(layer, set, 'to', 'Ends at (inner edge = 100%)', -0.5, 1.5, pct)}
        </>
      );
    }
    case 'line': {
      const set = setterFor(layer);
      return (
        <>
          <PaintEditor paint={layer.paint} disabled={disabled} onChange={(paint, t) => set({ paint }, t)} />
          {num(layer, set, 'at', 'Position across the band', -0.5, 1.5, pct)}
          {num(layer, set, 'width', 'Width', 0.005, 1, pct)}
          <Select
            label="Style"
            value={layer.dash}
            disabled={disabled}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            onChange={(dash) => set({ dash })}
          />
          <OptionalColor label="Glow" value={layer.glow} fallback="#6fc3ff" disabled={disabled} onChange={(glow, t) => set({ glow }, t)} />
          <Toggle
            label="Wavy"
            hint="The line wanders in and out as it goes round, for vines and knotwork."
            checked={layer.waveAmplitude > 0}
            disabled={disabled}
            onChange={(on) => set({ waveAmplitude: on ? 0.2 : 0 })}
          />
          {layer.waveAmplitude > 0 && (
            <>
              <Select label="Wave shape" value={layer.waveShape} disabled={disabled} options={WAVE_SHAPES.map((w) => ({ value: w, label: WAVE_NAMES[w] }))} onChange={(waveShape) => set({ waveShape })} />
              {num(layer, set, 'waveAmplitude', 'Wave height', 0.01, 1, { ...pct, hint: 'How far it wanders, as a share of the band width.' })}
              <Toggle
                label="Fit the waves to the band"
                hint="On: the waves keep their length and their number changes with the band, as Token Maker's vines and knotwork do. Off: a set number of waves."
                checked={layer.waveFit > 0}
                disabled={disabled}
                onChange={(on) => set({ waveFit: on ? 1.8 : 0 })}
              />
              {layer.waveFit > 0
                ? num(layer, set, 'waveFit', 'Wave length', 0.2, 8, { step: 0.05, scale: 100, unit: '%', hint: 'How long one wave is, as a share of the band width.' })
                : num(layer, set, 'waves', 'Waves all the way round', 1, 64, { step: 1 })}
              {num(layer, set, 'wavePhase', 'Slide the waves', 0, 1, pct)}
            </>
          )}
          <Toggle label="Raised (small shadow)" checked={layer.raised} disabled={disabled} onChange={(raised) => set({ raised })} />
        </>
      );
    }
    case 'texture':
      return <TextureControls layer={layer} />;
    case 'text':
      return <TextControls layer={layer} />;
    case 'contours':
      return <ContoursControls layer={layer} />;
    case 'growth':
      return <GrowthControls layer={layer} />;
    case 'fracture':
      return <FractureControls layer={layer} />;
    case 'cells':
      return <CellsControls layer={layer} />;
    case 'knotwork':
      return <KnotworkControls layer={layer} />;
    case 'gears':
      return <GearsControls layer={layer} />;
    case 'chain':
      return <ChainControls layer={layer} />;
    case 'shape':
    case 'path':
      return <PlacedControls layer={layer} />;
    case 'group':
      return (
        <>
          <p className="note">
            {layer.children.length === 0
              ? 'An empty group. Drag layers onto it in the list, or pick several layers (Ctrl+click) and press Group.'
              : `Holds ${layer.children.length} layer${layer.children.length === 1 ? '' : 's'}. Hiding, locking or fading the group does the same to all of them.`}
          </p>
          {num(layer, setterFor(layer), 'opacity', 'Opacity', 0, 1, pct)}
          <Select
            label="Combine shapes"
            hint="Draw its layers over each other, or combine their shapes: the bottom one with the others added, cut out of it, overlapping it, or everything but the overlaps. Effects on the group follow the result."
            value={layer.combine}
            disabled={disabled}
            options={COMBINE_MODES.map((c) => ({ value: c, label: COMBINE_NAMES[c] }))}
            onChange={(combine) => setterFor(layer)({ combine })}
          />
          <div className="row wrap" role="group" aria-label="Turn round the token">
            <button type="button" className="btn small" disabled={disabled} onClick={() => turnGroup(layer.id, -15)} title="Turn everything in it 15° anticlockwise round the token">
              <RotateCcw size={16} /> 15°
            </button>
            <button type="button" className="btn small" disabled={disabled} onClick={() => turnGroup(layer.id, 15)} title="Turn everything in it 15° clockwise round the token">
              <RotateCw size={16} /> 15°
            </button>
          </div>
          <p className="note">Drag any of its layers on the canvas to move the whole group.</p>
          <button type="button" className="btn small" disabled={disabled} onClick={() => ungroup(layer.id)}>
            Ungroup
          </button>
        </>
      );
    case 'repeat': {
      const set = setterFor(layer);
      return (
        <>
          <Select label="Shape" value={layer.element} disabled={disabled} options={ELEMENT_KINDS.map((k) => ({ value: k, label: ELEMENT_NAMES[k] }))} onChange={(element) => set({ element })} />
          {layer.element === 'picture' && <PicturePicker layer={layer} disabled={disabled} set={set as never} />}
          <ColorField label="Colour" value={layer.fill} disabled={disabled} defaultValue={defaultsFor(layer).fill as string} onChange={(fill, t) => set({ fill }, t)} />
          <FillPaintControls layer={layer} set={set as never} />
          {DETAIL_NAMES[layer.element] && <OptionalColor label={DETAIL_NAMES[layer.element]!} hint={DETAIL_HINT} value={layer.detail} fallback="#f2ead8" disabled={disabled} onChange={(detail, t) => set({ detail }, t)} />}
          <Select
            label="How many"
            value={layer.mode}
            disabled={disabled}
            options={[
              { value: 'count', label: 'A set number' },
              { value: 'spacing', label: 'As many as fit' },
            ]}
            onChange={(mode) => set({ mode })}
          />
          {layer.mode === 'count'
            ? num(layer, set, 'count', 'Number', 1, 96, { step: 1 })
            : num(layer, set, 'spacing', 'Spacing', 0.1, 6, { step: 0.05, scale: 100, unit: '%', hint: 'Distance between centres, as a share of the band width.' })}
          {num(layer, set, 'size', 'Size', 0.02, 1.5, pct)}
          <FollowSelect layer={layer} onChange={(follow) => set({ follow })} />
          {!following(layer, layers) && num(layer, set, 'at', 'Position across the band', -0.5, 1.5, pct)}
          <Select
            label="Facing"
            hint={
              following(layer, layers)
                ? 'Turned to follow the path, square to its edge, or all standing upright on the screen.'
                : 'Turned with the band (emblems such as crowns and moons point straight out from the centre, so on a hexagon they don’t twist), all square to the band’s edge, or all standing upright on the screen.'
            }
            value={layer.orient}
            disabled={disabled}
            options={[
              { value: 'along', label: following(layer, layers) ? 'Along the path' : 'Along the band' },
              { value: 'edge', label: 'Square to the edge' },
              { value: 'upright', label: 'Upright' },
            ]}
            onChange={(orient) => set({ orient })}
          />
          {num(layer, set, 'rotation', 'Rotation', -180, 180, { step: 1, unit: '°' })}
          {num(layer, set, 'offset', 'Slide along', 0, 1, pct)}
          <Toggle label="Raised (small shadow)" checked={layer.raised} disabled={disabled} onChange={(raised) => set({ raised })} />
          <Toggle
            label="Shaded by the light"
            hint="Lighter on the side facing the light. Off: one flat colour."
            checked={layer.shaded}
            disabled={disabled}
            onChange={(shaded) => set({ shaded })}
          />
          <Toggle
            label="One on every corner"
            hint="Rounds the number so square and hexagon corners each get one."
            checked={layer.snapToCorners}
            disabled={disabled}
            onChange={(snapToCorners) => set({ snapToCorners })}
          />
          <Fold title="Patterns" defaultOpen={layer.altColors.length > 0 || layer.altSizes.length > 0 || layer.alternateSides > 0 || layer.show.length > 0}>
            <PatternField
              label="Show"
              hint="Which ones are drawn, as a pattern that repeats: on, off = every other one. Two layers with opposite patterns can alternate styles."
              values={layer.show}
              disabled={disabled}
              onChange={(show) => set({ show })}
            />
            <ColorList
              label="Alternate colours"
              hint="Colours taken in turn after the main one: light, dark, light, dark…"
              values={layer.altColors}
              disabled={disabled}
              onChange={(altColors, t) => set({ altColors }, t)}
            />
            <PercentList
              label="Alternate sizes"
              hint="Sizes taken in turn, e.g. 100, 60 for big, small, big, small. Leave empty for all the same."
              values={layer.altSizes}
              disabled={disabled}
              onChange={(altSizes) => set({ altSizes })}
            />
            {num(layer, set, 'alternateSides', 'Alternate sides', 0, 1, { ...pct, hint: 'Every other one moves inwards and points the other way, like leaves on a vine. 0 = off.' })}
            {num(layer, set, 'scaleEnd', 'Size at the end', 0.1, 3, { ...pct, step: 0.05, hint: 'How big the last one is compared with the first; they grow or shrink evenly along the way.' })}
            {num(layer, set, 'multipleOf', 'Make the number a multiple of', 1, 12, { step: 1, hint: 'Rounds how many there are to a multiple of this: 2 keeps it even, so alternating patterns meet up all the way round.' })}
          </Fold>
          <Fold title="Random variation" defaultOpen={layer.jitterSize > 0 || layer.jitterAngle > 0 || layer.skipChance > 0 || layer.wander > 0}>
            {num(layer, set, 'wander', 'Wander in and out', 0, 1.5, { ...pct, hint: 'Moves each one in or out across the band by a random amount, like Bard’s dancing notes.' })}
            {num(layer, set, 'jitterSize', 'Vary the size', 0, 1, { ...pct, hint: 'Makes each one a little bigger or smaller, at random.' })}
            {num(layer, set, 'jitterAngle', 'Vary the angle', 0, 180, { step: 1, unit: '°', hint: 'Turns each one a little either way, at random, up to this many degrees.' })}
            {num(layer, set, 'skipChance', 'Leave some out', 0, 0.9, { ...pct, hint: 'The chance of each one being left out, for a scattered look.' })}
            <div className="row">
              {num(layer, set, 'seed', 'Variation', 0, 999, { step: 1, hint: 'Each number gives a different random arrangement (and different runes or notes).' })}
              <button type="button" className="icon-btn" aria-label="Shuffle" title="Try another variation" disabled={disabled} onClick={() => set({ seed: Math.floor(Math.random() * 999) })}>
                <Shuffle size={16} />
              </button>
            </div>
          </Fold>
          {layer.element === 'gem' && <GemControls layer={layer} />}
          <SettingControls layer={layer} />
        </>
      );
    }
    case 'unsupported':
      return (
        <p className="note warning">
          This layer was made by a newer Frame Maker (kind “{layer.originalType}”). It is kept and saved as it was, but this version can't draw or edit it.
        </p>
      );
  }
}

/** Technical settings, shown only in Advanced mode. */
function AdvancedControls({ layer }: { layer: Layer }) {
  const disabled = layer.locked;
  if (layer.type === 'shape' || layer.type === 'path') return <PlacedAdvanced layer={layer} />;
  if (layer.type !== 'repeat') return null;
  const set = setterFor(layer);
  return (
    <>
      {num(layer, set, 'stretch', 'Width ÷ height', 0.2, 3, { step: 0.05 })}
      <OptionalColor label="Outline" value={layer.outline} fallback="#1a1008" disabled={disabled} onChange={(outline, t) => set({ outline }, t)} />
      {num(layer, set, 'outlineWidth', LINE_ELEMENTS.has(layer.element) ? 'Stroke width' : 'Outline width', 0, 0.4, pct)}
      <OptionalColor label="Glow" value={layer.glow} fallback="#6fc3ff" disabled={disabled} onChange={(glow, t) => set({ glow }, t)} />
      {num(layer, set, 'accentEvery', 'Bigger one every… (0 = off)', 0, 24, { step: 1 })}
      {layer.accentEvery > 0 && num(layer, set, 'accentScale', 'Bigger by', 0.2, 4, { step: 0.05, scale: 100, unit: '%' })}
      {layer.accentEvery > 0 && <OptionalColor label="Own colour for the bigger ones" value={layer.accentColor} fallback="#3d8c6a" disabled={disabled} onChange={(accentColor, t) => set({ accentColor }, t)} />}
      {layer.accentEvery > 0 && num(layer, set, 'skipAroundAccent', 'Leave gaps beside the bigger ones', 0, 4, { step: 1, hint: 'How many to leave out on each side of every bigger one.' })}
      {(layer.element === 'rune' || layer.element === 'note') && num(layer, set, 'seed', layer.element === 'rune' ? 'Rune pattern' : 'Note pattern', 0, 999, { step: 1 })}
    </>
  );
}

const PAINT_KINDS: { value: Paint['kind']; label: string }[] = [
  { value: 'lit', label: 'Metal (lit from the top left)' },
  { value: 'solid', label: 'Flat colour' },
  { value: 'linear', label: 'Gradient across the token' },
  { value: 'acrossBand', label: 'Gradient across the band' },
  { value: 'ring', label: 'Colours round the ring' },
  { value: 'picture', label: 'Photo texture' },
];

function colorOf(paint: Paint): string {
  if (paint.kind === 'picture') return paint.tint ?? (pictureById(paint.picture) ?? libraryPictureById(paint.picture))?.average ?? '#808080';
  return 'color' in paint ? paint.color : paint.stops[0].color;
}

/** Ring colours that start out looking like the metal lighting: the lit table sampled every 30°. */
function ringFromLit(color: string, light: number, dark: number, pressed: boolean, highlight: string | null = null): RingStop[] {
  const t = litFor(color, light, dark, highlight);
  const table = pressed ? t.step : t.band;
  return Array.from({ length: 12 }, (_x, i) => ({ angle: i * 30, color: table[i * 30] }));
}

function convert(paint: Paint, kind: Paint['kind']): Paint {
  const c = colorOf(paint);
  const stops: GradientStop[] = paint.kind === 'linear' || paint.kind === 'acrossBand' ? paint.stops : [{ at: 0, color: c, opacity: 1 }, { at: 1, color: '#000000', opacity: 1 }];
  switch (kind) {
    case 'ring':
      return { kind, stops: paint.kind === 'lit' ? ringFromLit(c, paint.light, paint.dark, paint.pressed, paint.highlight) : ringFromLit(c, 0.85, 0.8, false), followLight: true };
    case 'solid':
      return { kind, color: c };
    case 'lit':
      return { kind, color: c, light: 0.85, dark: 0.8, pressed: false, highlight: null };
    case 'linear':
      return { kind, angle: 45, stops, followLight: false };
    case 'acrossBand':
      return { kind, stops };
    case 'picture':
      return { kind, picture: 'gold', scale: 3, angle: 0, bend: true, tint: null, lighting: 0.5 };
  }
}

/**
 * Element 'picture''s picture (version 13): the site's library pictures as
 * tiles, a group at a time. Picking one starts it in its own colours, or (a
 * single-colour picture) tinted with its usual colour.
 */
function PicturePicker({ layer, disabled, set }: { layer: RepeatLayer | ShapeLayer; disabled: boolean; set: (patch: { picture?: string; pictureTint?: boolean; fill?: string }) => void }) {
  const current = libraryPictureById(layer.picture);
  const [group, setGroup] = useState<LibraryPictureGroup>(current?.group ?? 'Roses');
  return (
    <>
      <Select label="Pictures" value={group} disabled={disabled} options={LIBRARY_PICTURE_GROUPS.map((g) => ({ value: g, label: g }))} onChange={setGroup} />
      <div className="picture-tiles" role="group" aria-label={`${group} pictures`}>
        {LIBRARY_PICTURES.filter((p) => p.group === group).map((p) => (
          <button
            key={p.id}
            type="button"
            className="picture-tile"
            aria-pressed={p.id === layer.picture}
            title={p.name}
            aria-label={p.name}
            disabled={disabled}
            onClick={() => set({ picture: p.id, pictureTint: p.tint, ...(p.tint ? { fill: p.color } : {}) })}
          >
            <img src={libraryPictureThumbUrl(p.id)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <Toggle label="Colour it in" checked={layer.pictureTint} disabled={disabled} hint="Colours the picture with the layer's colour, keeping its light and dark." onChange={(pictureTint) => set({ pictureTint })} />
    </>
  );
}

/** A repeat's, shape's or path's fill: its colour, or a paint (Version 6). */
function FillPaintControls({ layer, set }: { layer: RepeatLayer | PlacedLayer; set: (patch: { fillPaint?: Paint | null; paintEach?: boolean }, transient?: boolean) => void }) {
  const disabled = layer.locked;
  const color = 'element' in layer && layer.type === 'repeat' ? layer.fill : (layer.fill ?? '#808080');
  return (
    <>
      <Select
        label="Fill with"
        value={layer.fillPaint ? 'paint' : 'colour'}
        disabled={disabled}
        options={[
          { value: 'colour', label: 'A colour' },
          { value: 'paint', label: 'A paint (gradient, metal, photo…)' },
        ]}
        onChange={(v) => set({ fillPaint: v === 'paint' ? { kind: 'lit', color, light: 0.85, dark: 0.8, pressed: false, highlight: null } : null })}
      />
      {layer.fillPaint && (
        <>
          <PaintEditor paint={layer.fillPaint} disabled={disabled} ornament onChange={(fillPaint, t) => set({ fillPaint }, t)} />
          <Toggle label="Paint each one on its own" checked={layer.paintEach} disabled={disabled} onChange={(paintEach) => set({ paintEach })} />
        </>
      )}
    </>
  );
}

export function PaintEditor({ paint, disabled, onChange, ornament = false }: { paint: Paint; disabled: boolean; onChange: (p: Paint, transient?: boolean) => void; ornament?: boolean }) {
  const advanced = useUi((s) => s.mode === 'advanced');
  return (
    <>
      <Select label="Paint" value={paint.kind} disabled={disabled} options={PAINT_KINDS} onChange={(k) => onChange(convert(paint, k))} />
      {paint.kind === 'picture' && (
        <>
          <Select label="Photo" value={paint.picture} disabled={disabled} options={[...PICTURES.map((p) => ({ value: p.id as string, label: p.name })), ...TEXTURE_PICTURES.map((p) => ({ value: p.id, label: `${p.name} (library)` }))]} onChange={(picture) => onChange({ ...paint, picture })} />
          <Slider label="Tile size" value={paint.scale} min={0.5} max={15} step={0.05} scale={100} unit="%" disabled={disabled} defaultValue={3} onChange={(scale, t) => onChange({ ...paint, scale }, t)} onCommit={commit} />
          <Slider label="Turn the photo" value={paint.angle} min={-180} max={180} step={1} unit="°" disabled={disabled} defaultValue={0} onChange={(angle, t) => onChange({ ...paint, angle }, t)} onCommit={commit} />
          {!ornament && <Toggle label="Bend round the band" checked={paint.bend} disabled={disabled} onChange={(bend) => onChange({ ...paint, bend })} />}
          <OptionalColor label="Tint" value={paint.tint} fallback={(pictureById(paint.picture) ?? libraryPictureById(paint.picture))?.average ?? '#c9a24a'} disabled={disabled} onChange={(tint, t) => onChange({ ...paint, tint }, t)} />
          <Slider label="Light and shade" value={paint.lighting} min={0} max={1} disabled={disabled} {...pct} defaultValue={0.5} onChange={(lighting, t) => onChange({ ...paint, lighting }, t)} onCommit={commit} />
        </>
      )}
      {(paint.kind === 'solid' || paint.kind === 'lit') && <ColorField label="Colour" value={paint.color} disabled={disabled} onChange={(color, t) => onChange({ ...paint, color }, t)} />}
      {paint.kind === 'lit' && (
        <>
          <Toggle label="Pressed in (lit from the other side)" checked={paint.pressed} disabled={disabled} onChange={(pressed) => onChange({ ...paint, pressed })} />
          {advanced && (
            <>
              <Slider label="Highlight" value={paint.light} min={0} max={1} disabled={disabled} {...pct} defaultValue={0.85} onChange={(light, t) => onChange({ ...paint, light }, t)} onCommit={commit} />
              <Slider label="Shade" value={paint.dark} min={0} max={1} disabled={disabled} {...pct} defaultValue={0.8} onChange={(dark, t) => onChange({ ...paint, dark }, t)} onCommit={commit} />
              <OptionalColor
                label="Highlight colour"
                hint="The colour of the lit side. Off: a warm, pale version of the colour, as Token Maker draws it."
                value={paint.highlight}
                fallback={mix(shade(paint.color, 0.6), '#fff3c4', 0.35)}
                disabled={disabled}
                onChange={(highlight, t) => onChange({ ...paint, highlight }, t)}
              />
            </>
          )}
        </>
      )}
      {paint.kind === 'ring' && <RingStops paint={paint} disabled={disabled} onChange={onChange} />}
      {paint.kind === 'linear' && (
        <>
          <Slider label="Angle" value={paint.angle} min={-180} max={180} step={1} unit="°" disabled={disabled} defaultValue={45} onChange={(angle, t) => onChange({ ...paint, angle }, t)} onCommit={commit} />
          <Toggle
            label="Turn with the light"
            hint="On: the angle is for a light at the top left and turns when you move the light, like a lit rim. Off: it stays where it is."
            checked={paint.followLight}
            disabled={disabled}
            onChange={(followLight) => onChange({ ...paint, followLight })}
          />
        </>
      )}
      {(paint.kind === 'linear' || paint.kind === 'acrossBand') && (
        <div className="stops">
          {paint.stops.map((s, i) => (
            <div className="stop" key={i}>
              <ColorField label={`Colour ${i + 1}`} value={s.color} disabled={disabled} onChange={(color, t) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, color } : x)) }, t)} />
              {advanced && (
                <Slider
                  label={`Colour ${i + 1} position`}
                  value={s.at}
                  min={0}
                  max={1}
                  disabled={disabled}
                  {...pct}
                  onChange={(at, t) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, at } : x)) }, t)}
                  onCommit={commit}
                />
              )}
              {advanced && (
                <Slider
                  label={`Colour ${i + 1} opacity`}
                  value={s.opacity}
                  min={0}
                  max={1}
                  disabled={disabled}
                  {...pct}
                  onChange={(opacity, t) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, opacity } : x)) }, t)}
                  onCommit={commit}
                />
              )}
              {paint.stops.length > 2 && (
                <button type="button" className="icon-btn" aria-label={`Remove colour ${i + 1}`} disabled={disabled} onClick={() => onChange({ ...paint, stops: paint.stops.filter((_x, k) => k !== i) })}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {paint.stops.length < 8 && (
            <button
              type="button"
              className="btn small"
              disabled={disabled}
              onClick={() => {
                const last = paint.stops[paint.stops.length - 1];
                const spread = paint.stops.map((s, k) => ({ ...s, at: k / paint.stops.length }));
                onChange({ ...paint, stops: [...spread, { at: 1, color: last.color, opacity: last.opacity }] });
              }}
            >
              <Plus size={16} /> Add a colour
            </button>
          )}
        </div>
      )}
    </>
  );
}

const ringCss = (stops: RingStop[]) => {
  // CSS measures conic angles from the top; ours start at the right.
  const sorted = [...stops].sort((a, b) => a.angle - b.angle);
  const all = [...sorted, { angle: sorted[0].angle + 360, color: sorted[0].color }];
  return `conic-gradient(from 90deg, ${all.map((s) => `${s.color} ${s.angle}deg`).join(', ')})`;
};

/** The colours of a ring paint, each at an angle round the token. */
function RingStops({ paint, disabled, onChange }: { paint: Extract<Paint, { kind: 'ring' }>; disabled: boolean; onChange: (p: Paint, transient?: boolean) => void }) {
  const setStop = (i: number, patch: Partial<RingStop>, transient?: boolean) => onChange({ ...paint, stops: paint.stops.map((x, k) => (k === i ? { ...x, ...patch } : x)) }, transient);
  const addStop = () => {
    // Halfway across the widest gap.
    const sorted = [...paint.stops].sort((a, b) => a.angle - b.angle);
    let best = { gap: -1, angle: 0, color: sorted[0].color };
    sorted.forEach((s, i) => {
      const next = sorted[(i + 1) % sorted.length];
      const gap = (((next.angle - s.angle) % 360) + 360) % 360 || 360;
      if (gap > best.gap) best = { gap, angle: Math.round((s.angle + gap / 2) % 360), color: s.color };
    });
    onChange({ ...paint, stops: [...paint.stops, { angle: best.angle, color: best.color }] });
  };
  return (
    <div className="stops" role="group" aria-label="Colours round the ring">
      <div className="ring-preview" aria-hidden="true" style={{ background: ringCss(paint.stops) }} />
      <p className="note">Each colour sits at an angle round the token (0° right, 90° bottom, 180° left, 270° top) and blends into the next.</p>
      {paint.stops.map((s, i) => (
        <div className="stop" key={i}>
          <ColorField label={`Colour ${i + 1}`} value={s.color} disabled={disabled} onChange={(color, t) => setStop(i, { color }, t)} />
          <Slider label={`Colour ${i + 1} angle`} value={s.angle} min={0} max={359} step={1} unit="°" disabled={disabled} onChange={(angle, t) => setStop(i, { angle }, t)} onCommit={commit} />
          {paint.stops.length > 2 && (
            <button type="button" className="icon-btn" aria-label={`Remove colour ${i + 1}`} disabled={disabled} onClick={() => onChange({ ...paint, stops: paint.stops.filter((_x, k) => k !== i) })}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {paint.stops.length < 36 && (
        <button type="button" className="btn small" disabled={disabled} onClick={addStop}>
          <Plus size={16} /> Add a colour
        </button>
      )}
      <Toggle
        label="Turn with the light"
        hint="On: the colours are for a light at the top left and turn when you move the light. Off: they stay where they are."
        checked={paint.followLight}
        disabled={disabled}
        onChange={(followLight) => onChange({ ...paint, followLight })}
      />
    </div>
  );
}

const TEXTURE_COLOUR_LABEL: Partial<Record<TextureLayer['kind'], [string, string]>> = {
  scatter: ['Star colour', 'The colour of the stars.'],
  cracks: ['Glow colour', 'The colour the cracks glow.'],
  rust: ['Rust colour', 'The colour of the rust patches.'],
  frost: ['Ice colour', 'The colour of the frost and its crystals.'],
  sparkle: ['Sparkle colour', 'The colour of the sparkles.'],
  crystal: ['Crystal colour', 'The colour of the crystal; its faces are lighter and darker shades of it.'],
  lava: ['Glow colour', 'The colour of the molten rock where it glows.'],
  smoke: ['Wisp colour', 'The colour of the wisps.'],
  feathers: ['Feather colour', 'The colour of the feathers; the side facing the light is lighter.'],
  filigree: ['Metal colour', 'The colour of the metal it is chased into: match it to the band underneath.'],
  mottled: ['Blotch colour', 'The colour of the blotches.'],
  lichen: ['Lichen colour', 'The colour of the lichen.'],
  caustics: ['Light colour', 'The colour of the shimmering light.'],
  nebula: ['Cloud colour', 'The colour of the clouds.'],
  circuit: ['Glow colour', 'The colour the traces glow.'],
  bubbles: ['Bubble colour', 'The colour of the bubbles.'],
  eyes: ['Iris colour', 'The colour of the eyes’ irises.'],
};

/** Textures with a second colour: [label, hint, colour used when it is switched on]. */
const TEXTURE_COLOUR2: Partial<Record<TextureLayer['kind'], [string, string, string]>> = {
  scatter: ['Haze', 'Soft clouds of colour behind the stars.', '#6a5acd'],
  lava: ['Crust colour', 'The colour of the cooled crust between the glowing rivers.', '#1a0806'],
  smoke: ['Haze', 'A soft haze behind the wisps.', '#1a3a5a'],
  mottled: ['Fleck colour', 'The colour of the flecks inside the blotches.', '#fff0b0'],
  nebula: ['Second cloud colour', 'The clouds blend between their colour and this one.', '#3a6aff'],
  eyes: ['White colour', 'The colour of the whites of the eyes.', '#efe6d0'],
};

function TextureControls({ layer }: { layer: TextureLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  const [colourLabel, colourHint] = TEXTURE_COLOUR_LABEL[layer.kind] ?? ['Colour', 'Its marks are lighter and darker shades of this: match it to the band underneath.'];
  return (
    <>
      <Select
        label="Texture"
        value={layer.kind}
        disabled={disabled}
        options={TEXTURE_KINDS.map((k) => ({ value: k, label: TEXTURE_NAMES[k] }))}
        onChange={(kind) => {
          const preset = TEXTURES.find((t) => t.layer.kind === kind)!.layer;
          const named = layer.name === 'Texture' || TEXTURES.some((t) => t.layer.name === layer.name);
          set({ kind, seed: preset.seed ?? layer.seed, color2: TEXTURE_COLOUR2[kind] ? (preset.color2 ?? layer.color2 ?? null) : layer.color2, ...(named ? { name: preset.name } : {}) });
        }}
      />
      <ColorField label={colourLabel} hint={colourHint} value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      {TEXTURE_COLOUR2[layer.kind] && (
        <OptionalColor label={TEXTURE_COLOUR2[layer.kind]![0]} hint={TEXTURE_COLOUR2[layer.kind]![1]} value={layer.color2} fallback={TEXTURE_COLOUR2[layer.kind]![2]} disabled={disabled} onChange={(color2, t) => set({ color2 }, t)} />
      )}
      {num(layer, set, 'amount', 'How many', 0.1, 3, { ...pct, step: 0.05, hint: '100% is as many as Token Maker draws.' })}
      {num(layer, set, 'scale', 'Size', 0.2, 3, { ...pct, step: 0.05, hint: '100% is the size Token Maker draws them.' })}
      {num(layer, set, 'strength', 'Strength', 0, 2, { ...pct, step: 0.05, hint: 'How strongly it shows. 100% is as strong as in Token Maker.' })}
      <Select
        label="Where"
        hint="Keep it to the side away from the light (like Stamped's marbling), the side facing it, or all the way round. Follows the light dial."
        value={layer.where}
        disabled={disabled}
        options={TEXTURE_PLACES.map((w) => ({ value: w, label: WHERE_NAMES[w] }))}
        onChange={(where) => set({ where })}
      />
      <div className="row">
        {num(layer, set, 'seed', 'Variation', 0, 99999, { step: 1, hint: 'Each number gives a different arrangement of the same texture.' })}
        <button type="button" className="icon-btn" aria-label="Shuffle" title="Try another variation" disabled={disabled} onClick={() => set({ seed: Math.floor(Math.random() * 99999) })}>
          <Shuffle size={16} />
        </button>
      </div>
      {num(layer, set, 'from', 'Starts at (outer edge = 0%)', -0.5, 1.5, pct)}
      {num(layer, set, 'to', 'Ends at (inner edge = 100%)', -0.5, 1.5, pct)}
    </>
  );
}

/** A nominal render size for converting placements (they are the same at every size). */
const NOMINAL = 1000;

function PlacedControls({ layer }: { layer: PlacedLayer }) {
  const project = useProject();
  const pathEdit = useUi((s) => s.pathEdit);
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      {layer.type === 'shape' ? (
        <>
          <Select label="Shape" value={layer.shape} disabled={disabled} options={SHAPE_KINDS.map((k) => ({ value: k, label: SHAPE_NAMES[k] }))} onChange={(shape) => set({ shape })} />
          {SHAPE_SIDES[layer.shape] && num(layer, set, 'sides', SHAPE_SIDES[layer.shape]![0], SHAPE_SIDES[layer.shape]![2], SHAPE_SIDES[layer.shape]![3], { step: 1, hint: SHAPE_SIDES[layer.shape]![1] })}
          {SHAPE_RATIO[layer.shape] && num(layer, set, 'innerRatio', SHAPE_RATIO[layer.shape]![0], 0.05, 0.95, { ...pct, hint: SHAPE_RATIO[layer.shape]![1] })}
          {SHAPE_CORNER[layer.shape] && num(layer, set, 'corner', SHAPE_CORNER[layer.shape]![0], 0, 1, { ...pct, hint: SHAPE_CORNER[layer.shape]![1] })}
          {(layer.shape === 'burst' || layer.shape === 'blob') && (
            <div className="row">
              {num(layer, set, 'seed', 'Variation', 0, 99999, { step: 1, hint: 'Each number gives a differently shaped outline.' })}
              <button type="button" className="icon-btn" aria-label="Shuffle" title="Try another outline" disabled={disabled} onClick={() => set({ seed: Math.floor(Math.random() * 99999) })}>
                <Shuffle size={16} />
              </button>
            </div>
          )}
          {layer.shape === 'ornament' && (
            <Select label="Ornament" value={layer.element} disabled={disabled} options={ELEMENT_KINDS.map((k) => ({ value: k, label: ELEMENT_NAMES[k] }))} onChange={(element) => set({ element })} />
          )}
          {layer.shape === 'ornament' && layer.element === 'picture' && <PicturePicker layer={layer} disabled={disabled} set={set as never} />}
          {layer.shape === 'ornament' && DETAIL_NAMES[layer.element] && (
            <OptionalColor label={DETAIL_NAMES[layer.element]!} hint={DETAIL_HINT} value={layer.detail} fallback="#f2ead8" disabled={disabled} onChange={(detail, t) => set({ detail }, t)} />
          )}
          {layer.shape !== 'ornament' && layer.shape !== 'ring' && (
            <button type="button" className="btn small" disabled={disabled} onClick={() => shapeToPath(layer.id)} title="Make it a path with the same outline, so its points can be moved one by one">
              <PenTool size={16} /> Turn into a path
            </button>
          )}
        </>
      ) : (
        <>
          <PathPoints layer={layer} editing={pathEdit} />
          {num(layer, set, 'stroke', 'Stroke to shape', 0, 1, { ...pct, hint: 'Draws the line itself as a filled shape this wide (a share of its height), for brush strokes, tendrils and blades; 0% is off.' })}
          {layer.stroke > 0 && num(layer, set, 'taperStart', 'Taper at the start', 0, 1, { ...pct, hint: 'How far from its start it narrows to a point.' })}
          {layer.stroke > 0 && num(layer, set, 'taperEnd', 'Taper at the end', 0, 1, { ...pct, hint: 'How far from its end it narrows to a point.' })}
        </>
      )}
      <OptionalColor label="Fill" value={layer.fill} fallback="#5fa8d3" disabled={disabled} onChange={(fill, t) => set({ fill }, t)} />
      {layer.fill !== null && !(layer.type === 'shape' && layer.shape === 'ornament') && (
        <Toggle
          label="Cut into facets"
          hint="Cuts it into flat faces rising to a flat top or a point, each lit by the light, like a cut gem, a star badge or a metal plate."
          checked={layer.faceted}
          disabled={disabled}
          onChange={(faceted) => set({ faceted })}
        />
      )}
      {layer.fill !== null && layer.faceted && (
        <>
          {num(layer, set, 'facetTable', 'Flat top', 0, 0.95, { ...pct, hint: 'How big the flat top is: 0% rises to a point, like a pyramid or a crystal.' })}
          {num(layer, set, 'facetDepth', 'Facet depth', 0.2, 3, { step: 0.05, scale: 100, unit: '%', hint: 'How steep the faces are, so how strongly they catch the light.' })}
        </>
      )}
      {layer.fill !== null && !layer.faceted && <FillPaintControls layer={layer} set={set as never} />}
      {layer.fill !== null && !layer.faceted && <Toggle label="Shaded by the light" checked={layer.shaded} disabled={disabled} onChange={(shaded) => set({ shaded })} />}
      <OptionalColor label="Outline" value={layer.outline} fallback="#1a1008" disabled={disabled} onChange={(outline, t) => set({ outline }, t)} />
      {layer.outline !== null && num(layer, set, 'outlineWidth', 'Outline width', 0.005, 0.4, pct)}
      <Select
        label="Mirror"
        hint="Adds mirrored copies on the other side of the token, like a matching pair of decorations."
        value={layer.mirror}
        disabled={disabled}
        options={MIRROR_MODES.map((m) => ({ value: m, label: MIRROR_NAMES[m] }))}
        onChange={(mirror) => set({ mirror })}
      />
      <Toggle label="Raised (small shadow)" checked={layer.raised} disabled={disabled} onChange={(raised) => set({ raised })} />
      <Fold title="Radial array" defaultOpen={layer.radialCount > 1}>
        {num(layer, set, 'radialCount', 'Copies round a point', 1, 36, { step: 1, hint: 'Repeats it round its anchor, each copy pointing outwards, for rosettes, sigils, compass roses and clusters; 1 is off.' })}
        {layer.radialCount > 1 && (
          <>
            {num(layer, set, 'radialRadius', 'Distance from the middle', 0, 3, { ...pct, step: 0.01, hint: layer.place === 'band' ? 'How far each copy is from the anchor, as a share of the band width.' : 'How far each copy is from the anchor, as a share of half the token.' })}
            {num(layer, set, 'radialStart', 'Start angle', -180, 180, { step: 1, unit: '°', hint: 'Turns the whole array: where the first copy is, clockwise from straight up.' })}
            <Toggle label="Mirror every other copy" hint="Flips every other copy, for patterns that face each other in pairs." checked={layer.radialMirror} disabled={disabled} onChange={(radialMirror) => set({ radialMirror })} />
          </>
        )}
      </Fold>
      <Toggle
        label="Place freely"
        hint="Off: it sits on the band and follows every token shape and thickness. On: it stays where you put it, whatever the band does."
        checked={layer.place === 'free'}
        disabled={disabled}
        onChange={() => set(switchPlace(layer, bandGeometry(project.stage, NOMINAL)))}
      />
      <p className="note">Drag it on the canvas to move it; drag the corner handle to resize and the round handle to turn it.</p>
    </>
  );
}

function PlacedAdvanced({ layer }: { layer: PlacedLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      {layer.place === 'band' ? (
        <>
          {num(layer, set, 'along', 'Round the token (from the top)', 0, 1, pct)}
          {num(layer, set, 'across', 'Position across the band', -0.5, 1.5, pct)}
          {num(layer, set, 'size', 'Height (band widths)', 0.05, 5, { step: 0.01, scale: 100, unit: '%' })}
        </>
      ) : (
        <>
          {num(layer, set, 'x', 'Left / right', -1.2, 1.2, pct)}
          {num(layer, set, 'y', 'Up / down', -1.2, 1.2, pct)}
          {num(layer, set, 'size', 'Height (of the token’s half-width)', 0.02, 2, { step: 0.005, scale: 100, unit: '%' })}
        </>
      )}
      {num(layer, set, 'stretch', 'Width ÷ height', 0.1, 5, { step: 0.05 })}
      {num(layer, set, 'rotation', 'Rotation', -180, 180, { step: 1, unit: '°' })}
      <OptionalColor label="Glow" value={layer.glow} fallback="#6fc3ff" disabled={disabled} onChange={(glow, t) => set({ glow }, t)} />
    </>
  );
}

function PathPoints({ layer, editing }: { layer: PathLayer; editing: { drawing: boolean; point: number | null } | null }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  const point = editing?.point ?? null;
  return (
    <>
      {editing?.drawing ? (
        <p className="note" role="status">
          {layer.points.length === 0
            ? 'Click on the canvas to place the first point.'
            : layer.points.length < 3
              ? 'Keep clicking to add points.'
              : 'Keep clicking to add points. Click the first point (or press Enter) to finish.'}
        </p>
      ) : (
        <p className="note">
          {layer.points.length} point{layer.points.length === 1 ? '' : 's'}.{' '}
          {editing ? 'Drag points and their round handles; double-click a point to make it smooth or sharp.' : ''}
        </p>
      )}
      <div className="row">
        <button
          type="button"
          className={`btn small${editing ? ' primary' : ''}`}
          disabled={disabled}
          aria-pressed={!!editing}
          onClick={() => (editing?.drawing ? (finishDrawing(false), setPathEdit(null)) : setPathEdit(editing ? null : { drawing: layer.points.length === 0, point: null }))}
        >
          <PenTool size={16} /> {editing ? 'Done editing' : 'Edit points'}
        </button>
        {editing && !editing.drawing && (
          <button type="button" className="btn small" disabled={disabled} onClick={() => setPathEdit({ drawing: true, point: null })}>
            Add points
          </button>
        )}
      </div>
      {editing && point !== null && point < layer.points.length && (
        <div className="row">
          <button type="button" className="btn small" disabled={disabled} onClick={() => setPathPoints(layer.id, toggleSmooth(layer.points, point, layer.closed))}>
            {layer.points[point].handle ? 'Make point sharp' : 'Make point smooth'}
          </button>
          {layer.points[point].handle && (
            <button type="button" className="btn small" disabled={disabled} title="Separate handles move on their own (or hold Alt while dragging one)" onClick={() => setPathPoints(layer.id, toggleSeparate(layer.points, point))}>
              {layer.points[point].handleIn ? 'Join handles' : 'Separate handles'}
            </button>
          )}
          <button
            type="button"
            className="btn small"
            disabled={disabled}
            onClick={() => {
              setPathPoints(
                layer.id,
                layer.points.filter((_p, i) => i !== point),
              );
              setPathEdit({ ...editing, point: null });
            }}
          >
            <Trash2 size={16} /> Delete point
          </button>
        </div>
      )}
      <Toggle label="Closed shape" hint="Joins the last point back to the first so the shape can be filled." checked={layer.closed} disabled={disabled} onChange={(closed) => set({ closed })} />
    </>
  );
}

/** Whether a repeat or text follows a path or line (rather than the band). */
function following(layer: RepeatLayer | TextLayer, layers: Layer[]): boolean {
  const l = layer.follow ? findLayer(layers, layer.follow) : undefined;
  return !!l && (l.type === 'line' || (l.type === 'path' && l.points.length > 1));
}

/** Choose what a repeat or text runs along: the band, or a path or line layer. */
function FollowSelect({ layer, onChange }: { layer: RepeatLayer | TextLayer | GrowthLayer | KnotworkLayer | GearsLayer | ChainLayer; onChange: (follow: string | null) => void }) {
  const project = useProject();
  const tracks = flatten(project.layers).filter((l) => (l.type === 'path' || l.type === 'line') && l.id !== layer.id);
  const value = layer.follow && tracks.some((t) => t.id === layer.follow) ? layer.follow : '';
  return (
    <Select
      label="Follow"
      hint="Runs round the band, or along a path you drew or a line (wavy or not). The path can be hidden and is still followed."
      value={value}
      disabled={layer.locked}
      options={[{ value: '', label: 'The band' }, ...tracks.map((t) => ({ value: t.id, label: `${t.type === 'path' ? 'Path' : 'Line'}: ${t.name}` }))]}
      onChange={(v) => onChange(v || null)}
    />
  );
}

function GemControls({ layer }: { layer: RepeatLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <Fold title="Gem cut" defaultOpen>
      <Select label="Cut" hint="How the gem is cut; every facet is lit by the light dial." value={layer.gemCut} disabled={disabled} options={GEM_CUTS.map((c) => ({ value: c, label: CUT_NAMES[c] }))} onChange={(gemCut) => set({ gemCut })} />
      {(layer.gemCut === 'brilliant' || layer.gemCut === 'rose' || layer.gemCut === 'rough') && num(layer, set, 'gemFacets', 'Facets', 3, 16, { step: 1, hint: 'How many sides the gem has.' })}
      {(layer.gemCut === 'brilliant' || layer.gemCut === 'emerald') && num(layer, set, 'gemTable', 'Table', 0, 0.9, { ...pct, hint: 'How big the flat top of the gem is.' })}
      {layer.gemCut !== 'cabochon' && num(layer, set, 'gemCrown', 'Crown height', 0.2, 3, { step: 0.05, scale: 100, unit: '%', hint: 'How high the facets rise, so how strongly they catch the light.' })}
      {num(layer, set, 'gemSparkle', 'Sparkle', 0, 1, { ...pct, hint: 'A glint of light inside the gem, on the side facing the light.' })}
    </Fold>
  );
}

function SettingControls({ layer }: { layer: RepeatLayer }) {
  const advanced = useUi((s) => s.mode === 'advanced');
  const disabled = layer.locked;
  const set = setterFor(layer);
  const styleId = SETTING_STYLES.find((id) => JSON.stringify(STYLES.find((s) => s.id === id)!.effects()) === JSON.stringify(layer.settingEffects)) ?? (layer.settingEffects.length ? 'custom' : 'plain');
  return (
    <Fold title="Setting" defaultOpen={layer.setting !== 'none'}>
      <Select label="Setting" hint="A metal setting holding each one: a rim all round, or claws." value={layer.setting} disabled={disabled} options={GEM_SETTINGS.map((g) => ({ value: g, label: SETTING_NAMES[g] }))} onChange={(setting) => set({ setting, ...(setting !== 'none' && layer.settingEffects.length === 0 ? { settingEffects: STYLES.find((s) => s.id === 'gold')!.effects() } : {}) })} />
      {layer.setting !== 'none' && (
        <>
          <Select
            label="Setting style"
            hint="The metal the setting is made of; it has effects of its own, apart from the gems'."
            value={styleId}
            disabled={disabled}
            options={[
              ...SETTING_STYLES.map((id) => ({ value: id, label: STYLES.find((s) => s.id === id)!.name })),
              { value: 'plain', label: 'Plain colour' },
              ...(styleId === 'custom' ? [{ value: 'custom', label: 'Your own effects' }] : []),
            ]}
            onChange={(id) => id !== 'custom' && set({ settingEffects: id === 'plain' ? [] : STYLES.find((s) => s.id === id)!.effects() })}
          />
          <ColorField label="Setting colour" hint="The setting's colour (a metal style turns it into that metal)." value={layer.settingColor} disabled={disabled} defaultValue={defaultsFor(layer).settingColor as string} onChange={(settingColor, t) => set({ settingColor }, t)} />
          {advanced && <EffectStack effects={layer.settingEffects} disabled={disabled} advanced={advanced} label="setting" onChange={(settingEffects, t) => set({ settingEffects }, t)} />}
        </>
      )}
    </Fold>
  );
}

function TextControls({ layer }: { layer: TextLayer }) {
  const layers = useProjectPart((p) => p.layers);
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <TextField label="Text" hint="The words. Runes turn letters into Elder Futhark runes (th and ng have their own) and spaces into dots." value={layer.text} disabled={disabled} onChange={(text, t) => set({ text }, t)} />
      <Select label="Font" hint="The letters' style: runes, an old-style face, a plain one, or a fictional alphabet." value={layer.font} disabled={disabled} options={TEXT_FONTS.map((f) => ({ value: f, label: FONT_NAMES[f] }))} onChange={(font) => set({ font })} />
      <ColorField label="Colour" value={layer.fill} disabled={disabled} defaultValue={defaultsFor(layer).fill as string} onChange={(fill, t) => set({ fill }, t)} />
      {num(layer, set, 'size', 'Letter height', 0.05, 1.5, { ...pct, hint: 'How tall the letters are, as a share of the band width.' })}
      {num(layer, set, 'spacing', 'Letter spacing', -0.3, 1.5, { ...pct, hint: 'Extra room between the letters.' })}
      <FollowSelect layer={layer} onChange={(follow) => set({ follow })} />
      {!following(layer, layers) && num(layer, set, 'at', 'Position across the band', -0.5, 1.5, pct)}
      {num(layer, set, 'along', 'Round the token (from the top)', 0, 1, { ...pct, hint: 'Where the text is: round the token clockwise from the top, or along the path from its start.' })}
      <Select
        label="Line up"
        hint="Whether the position is the middle of the text or where it starts."
        value={layer.align}
        disabled={disabled}
        options={[
          { value: 'centre', label: 'Centred there' },
          { value: 'start', label: 'Starting there' },
        ]}
        onChange={(align) => set({ align })}
      />
      <Toggle label="Fit round the band" hint="Text too long to go all the way round ends at the last whole phrase that fits, spaced out to meet its start." checked={layer.fit} disabled={disabled} onChange={(fit) => set({ fit })} />
      <Toggle label="Read the other way" hint="Runs the other way with the letters' tops inwards, so text along the bottom of the token reads left to right." checked={layer.reverse} disabled={disabled} onChange={(reverse) => set({ reverse })} />
      <OptionalColor label="Outline" value={layer.outline} fallback="#1a1008" disabled={disabled} onChange={(outline, t) => set({ outline }, t)} />
      {layer.outline !== null && num(layer, set, 'outlineWidth', 'Outline width', 0.01, 0.3, pct)}
      <p className="note">Give it the Engraved style (Effects → Styles…) to cut it into the band, or a glow for magic runes.</p>
    </>
  );
}

function ContoursControls({ layer }: { layer: ContoursLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <PaintEditor paint={layer.paint} disabled={disabled} onChange={(paint, t) => set({ paint }, t)} />
      {num(layer, set, 'count', 'Lines', 1, 12, { step: 1, hint: 'How many lines run round the band, one inside the other.' })}
      {num(layer, set, 'from', 'First line at', -0.5, 1.5, { ...pct, hint: 'Where the outermost line is: 0% on the outer edge of the band, 100% on the inner edge.' })}
      {num(layer, set, 'spacing', 'Spacing', 0, 0.6, { ...pct, hint: 'How far apart the lines are, as a share of the band width.' })}
      {num(layer, set, 'width', 'Width', 0.005, 0.5, { ...pct, hint: 'How thick the first line is, as a share of the band width.' })}
      {num(layer, set, 'taper', 'Taper', -1, 0.95, { ...pct, hint: 'How much thinner the last line is than the first; below 0% they get thicker.' })}
      <OptionalColor label="Alternate colour" hint="Every other line in another colour (for flat and metal paints)." value={layer.altColor} fallback="#c9a24a" disabled={disabled} onChange={(altColor, t) => set({ altColor }, t)} />
      <Select
        label="Style"
        value={layer.dash}
        disabled={disabled}
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
        ]}
        onChange={(dash) => set({ dash })}
      />
    </>
  );
}

const GROWTH_NAMES: Record<GrowthKind, string> = {
  vine: 'Vine',
  roots: 'Roots',
  thorns: 'Thorny stem',
  tendrils: 'Curling tendrils',
  antlers: 'Antlers',
};

const EXTRA_NAMES: Record<GrowthExtra, string> = {
  none: 'Nothing',
  leaves: 'Leaves',
  thorns: 'Thorns',
  berries: 'Berries',
};

const PATTERN_NAMES: Record<CellPattern, string> = {
  voronoi: 'Irregular plates (flagstones)',
  hex: 'Honeycomb',
  brick: 'Bricks',
  grid: 'Tiles',
  scales: 'Scales',
};

/** A seed slider with a shuffle button. */
function SeedRow<L extends Layer & { seed: number }>({ layer, hint }: { layer: L; hint: string }) {
  const set = setterFor(layer);
  return (
    <div className="row">
      {num(layer, set, 'seed', 'Variation', 0, 99999, { step: 1, hint })}
      <button type="button" className="icon-btn" aria-label="Shuffle" title="Try another variation" disabled={layer.locked} onClick={() => set({ seed: Math.floor(Math.random() * 99999) } as Partial<L>)}>
        <Shuffle size={16} />
      </button>
    </div>
  );
}

/** Follow (the band or a path) and the position across the band, for generators that run along a track. */
function TrackControls({ layer }: { layer: GrowthLayer | KnotworkLayer | GearsLayer | ChainLayer }) {
  const layers = useProjectPart((p) => p.layers);
  const set = setterFor(layer);
  const target = layer.follow ? findLayer(layers, layer.follow) : undefined;
  const onPath = !!target && (target.type === 'line' || (target.type === 'path' && target.points.length > 1));
  return (
    <>
      <FollowSelect layer={layer} onChange={(follow) => set({ follow } as Partial<typeof layer>)} />
      {!onPath && num(layer, set, 'at', 'Position across the band', -0.5, 1.5, pct)}
    </>
  );
}

function GrowthControls({ layer }: { layer: GrowthLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <Select
        label="Kind"
        hint="What grows: each kind starts with settings that suit it, which you can then change."
        value={layer.kind}
        disabled={disabled}
        options={GROWTH_KINDS.map((k) => ({ value: k, label: GROWTH_NAMES[k] }))}
        onChange={(kind) => set({ ...GROWTH_PRESETS[kind], kind })}
      />
      <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      <TrackControls layer={layer} />
      {num(layer, set, 'count', layer.kind === 'antlers' ? 'How many antlers' : 'Stems', 1, layer.kind === 'antlers' ? 24 : 4, { step: 1, hint: layer.kind === 'antlers' ? 'How many antlers grow round the band.' : 'How many stems twine round, each its own way.' })}
      {num(layer, set, 'thickness', 'Thickness', 0.01, 0.4, { ...pct, hint: 'How thick the stem is, as a share of the band width.' })}
      {layer.kind !== 'antlers' && num(layer, set, 'waveLength', 'Wave length', 0, 6, { step: 0.05, scale: 100, unit: '%', hint: 'How long each wave of the stem is (fitted to the band); 0 for a straight stem.' })}
      {layer.kind !== 'antlers' && num(layer, set, 'amplitude', 'Wave height', 0, 0.8, { ...pct, hint: 'How far the stem wanders in and out.' })}
      {num(layer, set, 'gnarl', 'Gnarled', 0, 1, { ...pct, hint: 'How twisted and knobbly the stem and branches are.' })}
      <Fold title="Branches" defaultOpen>
        {layer.kind !== 'antlers' && num(layer, set, 'branching', 'Branching', 0, 1, { ...pct, hint: 'How often branches grow from the stem.' })}
        {num(layer, set, 'branchLength', 'Branch length', 0.05, 3, { ...pct, step: 0.01, hint: 'How long the branches are, as a share of the band width.' })}
        {num(layer, set, 'branchAngle', 'Branch angle', 0, 120, { step: 1, unit: '°', hint: 'How sharply branches turn away from the stem.' })}
        {num(layer, set, 'curl', 'Curl', -800, 800, { step: 5, unit: '°', hint: 'How much branches curl as they grow (degrees per band width); negative curls the other way.' })}
        {num(layer, set, 'taper', 'Taper', 0, 1, { ...pct, hint: 'How thin the branch tips get.' })}
        {num(layer, set, 'depth', 'Levels', 1, 3, { step: 1, hint: 'Branches on branches: 1 is none, 3 is very bushy.' })}
      </Fold>
      <Select label="Along it" hint="Leaves, thorns or berries along the stem (and leaves or berries on the branch tips)." value={layer.extra} disabled={disabled} options={GROWTH_EXTRAS.map((e) => ({ value: e, label: EXTRA_NAMES[e] }))} onChange={(extra) => set({ extra })} />
      {layer.extra !== 'none' && (
        <>
          <ColorField label="Their colour" hint="The colour of the leaves, thorns or berries." value={layer.extraColor} disabled={disabled} defaultValue={defaultsFor(layer).extraColor as string} onChange={(extraColor, t) => set({ extraColor }, t)} />
          {num(layer, set, 'extraSpacing', 'Spacing', 0.1, 3, { ...pct, step: 0.01, hint: 'How far apart they are along the stem, as a share of the band width.' })}
          {num(layer, set, 'extraSize', 'Their size', 0.05, 1.5, { ...pct, hint: 'How big they are, as a share of the band width.' })}
        </>
      )}
      <SeedRow layer={layer} hint="Each number grows it differently." />
    </>
  );
}

function FractureControls({ layer }: { layer: FractureLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <Select
        label="Kind"
        hint="Cracks wander across the band; lightning runs round it."
        value={layer.kind}
        disabled={disabled}
        options={[
          { value: 'cracks', label: 'Cracks' },
          { value: 'lightning', label: 'Lightning' },
        ]}
        onChange={(kind) => set(kind === 'lightning' ? { kind, color: '#d8eeff', count: 3, length: 5, width: 0.035, jagged: 0.6 } : { kind, color: '#1a1208', count: 6, length: 1.6, width: 0.05, jagged: 0.5 })}
      />
      <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      {num(layer, set, 'count', 'How many', 1, 40, { step: 1, hint: 'How many cracks or bolts.' })}
      {num(layer, set, 'length', 'Length', 0.1, 10, { ...pct, step: 0.05, hint: 'How long each one is, as a share of the band width.' })}
      {num(layer, set, 'width', 'Width', 0.005, 0.3, { ...pct, hint: 'How wide each is where it starts; they taper to their ends.' })}
      {num(layer, set, 'branching', 'Forking', 0, 1, { ...pct, hint: 'How often they fork.' })}
      {num(layer, set, 'jagged', 'Jagged', 0, 1, { ...pct, hint: 'How sharply they zigzag.' })}
      {num(layer, set, 'from', 'Starts at (outer edge = 0%)', -0.5, 1.5, pct)}
      {num(layer, set, 'to', 'Ends at (inner edge = 100%)', -0.5, 1.5, pct)}
      <SeedRow layer={layer} hint="Each number gives different cracks." />
      <p className="note">Cut them into the band with Advanced → Cut a hole in the layers below, or make them glow with an effect.</p>
    </>
  );
}

function CellsControls({ layer }: { layer: CellsLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <Select label="Pattern" hint="How the band is divided into plates." value={layer.pattern} disabled={disabled} options={CELL_PATTERNS.map((c) => ({ value: c, label: PATTERN_NAMES[c] }))} onChange={(pattern) => set({ pattern })} />
      <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      {num(layer, set, 'size', 'Plate size', 0.08, 2, { ...pct, hint: 'How big each plate is, as a share of the band width.' })}
      {num(layer, set, 'gap', 'Gap', 0, 0.3, { ...pct, hint: 'The gap between plates, as a share of the band width.' })}
      {layer.pattern === 'voronoi' && num(layer, set, 'jitter', 'Irregular', 0, 1, { ...pct, hint: 'How uneven the plates are: 0% is a neat grid.' })}
      {layer.pattern !== 'scales' && num(layer, set, 'rounding', 'Round the corners', 0, 1, pct)}
      {num(layer, set, 'missing', 'Missing pieces', 0, 0.9, { ...pct, hint: 'The share of plates left out, for a broken, ruined look.' })}
      {num(layer, set, 'vary', 'Vary the colour', 0, 1, { ...pct, hint: 'How much each plate is lighter or darker than the next.' })}
      {num(layer, set, 'from', 'Starts at (outer edge = 0%)', -0.5, 1.5, pct)}
      {num(layer, set, 'to', 'Ends at (inner edge = 100%)', -0.5, 1.5, pct)}
      <SeedRow layer={layer} hint="Each number gives different plates." />
      <p className="note">Give it a style (carved stone, scales…): each plate gets its own bevel.</p>
    </>
  );
}

function KnotworkControls({ layer }: { layer: KnotworkLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      <TrackControls layer={layer} />
      {num(layer, set, 'width', 'Strand width', 0.02, 0.6, { ...pct, hint: 'How wide each strand is, as a share of the band width.' })}
      {num(layer, set, 'amplitude', 'Swing', 0, 0.8, { ...pct, hint: 'How far the strands swing in and out.' })}
      {num(layer, set, 'waveLength', 'Wave length', 0.2, 6, { step: 0.05, scale: 100, unit: '%', hint: 'How long each twist is (fitted to the band, so it always joins up).' })}
      <OptionalColor label="Outline" value={layer.outline} fallback="#000000" disabled={disabled} onChange={(outline, t) => set({ outline }, t)} />
      {layer.outline !== null && num(layer, set, 'outlineWidth', 'Outline width', 0, 0.2, pct)}
      {layer.outline !== null && num(layer, set, 'outlineOpacity', 'Outline strength', 0, 1, { ...pct, hint: 'How dark the outline is.' })}
      <Toggle label="Shine" hint="A thin bright line down each strand." checked={layer.shine} disabled={disabled} onChange={(shine) => set({ shine })} />
      <Toggle label="Double strands" hint="Each strand drawn as two bands with a line between." checked={layer.double} disabled={disabled} onChange={(double) => set({ double })} />
      <Toggle label="Swap over and under" hint="Swaps which strand goes over at every crossing." checked={layer.flip} disabled={disabled} onChange={(flip) => set({ flip })} />
    </>
  );
}

function GearsControls({ layer }: { layer: GearsLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      <TrackControls layer={layer} />
      {num(layer, set, 'count', 'Number', 1, 48, { step: 1 })}
      {num(layer, set, 'size', 'Size', 0.05, 2, pct)}
      {num(layer, set, 'teeth', 'Teeth', 3, 40, { step: 1, hint: 'How many teeth each gear has.' })}
      {num(layer, set, 'toothDepth', 'Tooth depth', 0, 0.5, { ...pct, hint: 'How long the teeth are, as a share of the gear.' })}
      <Select
        label="Tooth shape"
        hint="Square teeth, or pointed ones like a star."
        value={layer.toothShape}
        disabled={disabled}
        options={[
          { value: 'square', label: 'Square' },
          { value: 'pointed', label: 'Pointed' },
        ]}
        onChange={(toothShape) => set({ toothShape })}
      />
      {num(layer, set, 'spokes', 'Spokes', 0, 12, { step: 1, hint: 'Spokes between the rim and the hub; 0 is a solid wheel.' })}
      {num(layer, set, 'hub', 'Hub', 0, 0.9, { ...pct, hint: 'How big the hub (or, on a solid wheel, the axle hole) is.' })}
      <Toggle label="Domed middle" hint="A rounded boss in the middle, lit by the light." checked={layer.domed} disabled={disabled} onChange={(domed) => set({ domed })} />
      {num(layer, set, 'altSize', 'Every other one', 0.2, 3, { ...pct, step: 0.05, hint: 'The size of every other gear, compared with the rest.' })}
      <Toggle label="Mesh the teeth" hint="Turns every other gear by half a tooth, so neighbours look as if they mesh." checked={layer.interlock} disabled={disabled} onChange={(interlock) => set({ interlock })} />
      {num(layer, set, 'rotation', 'Rotation', -180, 180, { step: 1, unit: '°' })}
      {num(layer, set, 'offset', 'Slide along', 0, 1, pct)}
      <Toggle label="Shaded by the light" checked={layer.shaded} disabled={disabled} onChange={(shaded) => set({ shaded })} />
      <Toggle label="One on every corner" hint="Rounds the number so square and hexagon corners each get one." checked={layer.snapToCorners} disabled={disabled} onChange={(snapToCorners) => set({ snapToCorners })} />
    </>
  );
}

function ChainControls({ layer }: { layer: ChainLayer }) {
  const disabled = layer.locked;
  const set = setterFor(layer);
  return (
    <>
      <ColorField label="Colour" value={layer.color} disabled={disabled} defaultValue={defaultsFor(layer).color as string} onChange={(color, t) => set({ color }, t)} />
      <TrackControls layer={layer} />
      {num(layer, set, 'linkLength', 'Link length', 0.05, 2, { ...pct, hint: 'How long each link is, as a share of the band width; the number of links fits the band.' })}
      {num(layer, set, 'linkWidth', 'Link width', 0.2, 1.5, { ...pct, hint: 'How wide a link is compared with its length.' })}
      {num(layer, set, 'thickness', 'Metal thickness', 0.01, 0.4, { ...pct, hint: 'How thick the metal of each link is.' })}
      <Toggle label="Shaded by the light" checked={layer.shaded} disabled={disabled} onChange={(shaded) => set({ shaded })} />
    </>
  );
}

/** A mask from another layer (Advanced). */
function MaskControls({ layer }: { layer: Layer }) {
  const project = useProject();
  if (layer.type === 'unsupported') return null;
  const inside = layer.type === 'group' ? new Set(flatten(layer.children).map((l) => l.id)) : new Set<string>();
  const sources = flatten(project.layers).filter((l) => l.id !== layer.id && !inside.has(l.id) && l.type !== 'unsupported');
  const set = (mask: Layer['mask']) => updateLayer(layer.id, { mask });
  const value = layer.mask && sources.some((l) => l.id === layer.mask!.source) ? layer.mask.source : '';
  return (
    <>
      <Select
        label="Mask"
        hint="Show this layer only through another layer's shape (or its brightness). The mask layer can be hidden and still masks."
        value={value}
        disabled={layer.locked}
        options={[{ value: '', label: 'No mask' }, ...sources.map((l) => ({ value: l.id, label: l.name }))]}
        onChange={(source) => set(source ? { source, mode: layer.mask?.mode ?? 'alpha', invert: layer.mask?.invert ?? false } : null)}
      />
      {layer.mask && value && (
        <>
          <Select
            label="Mask by"
            hint="Its shape (where it has paint) or its brightness (light shows, dark hides)."
            value={layer.mask.mode}
            disabled={layer.locked}
            options={[
              { value: 'alpha', label: 'Its shape' },
              { value: 'luminance', label: 'Its brightness' },
            ]}
            onChange={(mode) => set({ ...layer.mask!, mode })}
          />
          <Toggle label="Invert the mask" hint="Shows this layer where the mask isn't, instead of where it is." checked={layer.mask.invert} disabled={layer.locked} onChange={(invert) => set({ ...layer.mask!, invert })} />
        </>
      )}
    </>
  );
}

/** How a layer shapes its group's shared height map (Advanced). */
function HeightControls({ layer }: { layer: Layer }) {
  if (layer.type === 'unsupported' || layer.type === 'group') return null;
  const set = setterFor(layer);
  return (
    <>
      <Select
        label="Shared height"
        hint="Raise it out of, or carve it into, the surface of its group: a bevel on the group then lights everything as one sculpted surface. At 0% opacity it only shapes the surface."
        value={layer.heightMode}
        disabled={layer.locked}
        options={HEIGHT_MODES.map((h) => ({ value: h, label: HEIGHT_NAMES[h] }))}
        onChange={(heightMode) => set({ heightMode })}
      />
      {layer.heightMode !== 'none' && num(layer, set, 'heightDepth', 'Height depth', 0, 3, { step: 0.05, scale: 100, unit: '%', hint: 'How high it rises or how deep it is carved.' })}
      {layer.heightMode !== 'none' && num(layer, set, 'heightSize', 'Height slope', 0.01, 1, { ...pct, hint: 'How far in from its edge the slope reaches, as a share of the band width.' })}
    </>
  );
}
