# Frame Maker — Design Document

> **Purpose of this file:** the single source of truth for Frame Maker. Anyone (person or AI) building it reads this whole file first, follows it, and updates it when a decision changes. Read `docs/TOKEN-MAKER-CONTEXT.md` for how the existing Token Maker frames work, and `docs/PROJECT-STARTER.md` for the owner's original brief.

---

## 1. What we are building

A visual editor for **code-drawn artwork**, starting with token frames for D&D and other TTRPGs. It should feel like a much simpler Photoshop or vector editor: a canvas in the middle, a layer list, and a properties panel with sliders, colour pickers and dropdowns. The owner does not code, so nothing in normal use needs code; technical controls live in **Advanced**.

Behind the visual editing, a design is **structured data** (a `FrameProject`), never source code. The renderer reads the data and draws it. That separation (data ↔ editor ↔ renderer) is the foundation everything else rests on.

**Goals**

- Start from any of Token Maker's 27 frames, or from scratch.
- Build designs from layers that adapt to every token shape and thickness.
- Save, reopen and share designs as files; export pictures.
- Later: turn Token Maker's frames into fully editable layers, and use Frame Maker designs inside Token Maker.

**Non-goals for now:** accounts, sharing online (designs travel as files), running user-supplied code. *(Phones and touch came in Phase 5, §6.3.)*

## 2. Owner decisions (October 2026)

| Question | Decision |
|---|---|
| Where does it live? | Its own repository, **GroudonMcL/Frame-Studio**. |
| How is Token Maker's drawing code reused? | **Copied** into `src/engine/legacy/`, byte for byte, with a manifest of hashes, a check script and a test (§3). |
| How does a design relate to the token's shape? | **Adapts to the shape**: layers are placed relative to the frame band, so one design works on circle, rounded, square and both hexagons at any thickness (§4.2). |
| What does it produce first? | Project files (`.framemaker.json`) and PNG pictures. Using designs inside Token Maker is a later phase. |
| How is work delivered? | A pull request per phase. |
| Light direction? *(after Phase 1)* | Add a **light-direction control**, defaulting to the **top left** (225°, Token Maker's light). Built in Phase 2 (§5.1). |
| How do designs reach Token Maker? *(after Phase 1)* | Token Maker **opens `.framemaker.json` project files** directly, so designs stay editable and scale cleanly. Planned for Phase 5 (§8). |
| Free shapes and paths: tied to the band or placed freely? *(after Phase 1)* | **Adaptable by default**: placed at a point round the band (angle + across), so they still fit every shape and thickness. Placing freely stays available as an option. Built in Phase 2 (§4.4). |
| Procedural textures? *(Phase 3 prompt)* | Nine **texture layers** re-implementing Token Maker's textures, each identical to the original at its default settings; a colour-round-the-ring paint; per-layer caching. Built in Phase 3 (§4.6, §5.3). |
| Phase 5: layer library, sharing with Token Maker, phones *(Phase 5 prompt)* | A **personal layer library** in IndexedDB with library files; **copy and paste** through the system clipboard and a shared copy for other tabs; a **phone layout** (canvas over a bottom sheet, 44 px targets) with keyboard access and axe checks; **Token Maker gets Frame Maker's reader and renderer by copy with a manifest** (the engine's own pattern, in the other direction), one renderer in both apps (§10). Built in Phase 5, in both repositories. |
| From editor to procedural studio *(the owner's brief after Phase 5, "Expanding Frame Maker")* | Borders should emerge from combining reusable systems (materials, geometry, lighting, surface detail, effects), easy to use, starting with what helps D&D tokens most. The plan and its order are in `docs/ROADMAP.md`. Phase 6 builds **surfaces and effects**: a 2.5D bevel lit by the stage's light, shadows, glows, material colours, wear, faceted shapes, more blend modes and a library of styles made from them (§5.4, §5.5, §6.4). |
| Converting Token Maker frames? *(Phase 4 prompt)* | A **converter per frame** writes its parts as editable layers with Token Maker's own numbers; each conversion is measured against the original and held to a limit. 18 frames (17 drawing styles) are converted; the originals all stay available. Where a conversion can't be exact, "looks the same" is enough (the owner's answer before Phase 5, §9). Built in Phase 4. |

## 3. Tech stack

Same as Token Maker, so code and habits carry over: TypeScript, React 19 + Vite, Canvas 2D, Zustand (with token-maker's `history.ts` for undo), `idb-keyval` for autosave and the layer library, Vitest (+ `@napi-rs/canvas` for pixel tests), Playwright, ESLint. Same visual identity ("Lamplit Workbench", `src/styles/tokens.css` copied from Token Maker). No new dependencies beyond Token Maker's, except `@axe-core/playwright` (a test-only tool, added in Phase 5 for the accessibility checks the brief asks for).

**The engine copy.** `src/engine/legacy/` holds unchanged copies of token-maker's `src/render/{catalog,color,frameKit,frames,finishes,shapes,sampleArt}.ts` (plus a 9-line `render.ts` stand-in for one type). `SOURCE.json` records the token-maker commit and each file's SHA-256.

- Never edit those files here. Change Token Maker, then `npm run engine:sync -- ../token-maker` (copies changed files, records the new commit and hashes) and run the tests.
- `npm run engine:check -- ../token-maker` reports differences without copying.
- `src/engine/legacy/engine.test.ts` fails if a copied file was edited here.

## 4. The project format

### 4.1 FrameProject (schema version 13)

Defined in `src/project/types.ts`; defaults in `src/project/defaults.ts`; reading and checking in `src/project/migrate.ts`; finding layers anywhere in the tree in `src/project/tree.ts`.

```ts
interface FrameProject {
  format: 'frame-studio-project';
  schemaVersion: 11;
  name: string;
  stage: { shape; thickness; outerSpacing; showArt; backingColor;     // how it's previewed, not the look
           light;                                                     // where the light comes from (§5.1)
           lights: { angle; color; strength; height }[];              // the lighting rig (§5.9, version 9)
           ambient; ambientStrength; bloom; bleed };
  layers: Layer[];                                                    // bottom first
}
// Every layer: id (stable, unique in the whole tree), name, visible, locked, opacity 0–1, blend,
//              clip: 'none' | 'band' | 'below'                        (§5.2)
//              effects: Effect[]                                      (§5.4, version 5)
//              mask: { source; mode: 'alpha' | 'luminance'; invert } | null    (§5.8, version 8)
//              heightMode: 'none' | 'raise' | 'carve'; heightDepth; heightSize  (shared height, §5.8)
type Layer =
  | { type: 'legacyFrame'; presetId; style; color; accent | null }     // a Token Maker frame, one composite layer
  | { type: 'bandFill'; from; to; paint }                              // colours part of the band
  | { type: 'line'; at; width; paint; dash; glow | null;               // a line round the band…
      waveAmplitude; waves; wavePhase; waveFit;                        // …optionally wavy, waves fitted to the band (Phase 8)
      waveShape; raised }                                              // zigzag, scallops, battlements; a small shadow (version 10)
  | { type: 'repeat'; element; mode; count; spacing; snapToCorners;    // one shape repeated round the band
      at; size; stretch; rotation; offset; fill; outline | null; outlineWidth;
      raised; glow | null; accentEvery; accentScale; accentColor | null; seed;
      altColors; altSizes; skipAroundAccent; alternateSides;          // patterns (Phase 2)
      shaded; show;                                                    // flat colour, on/off pattern (Phase 4)
      follow; orient; scaleEnd; jitterSize; jitterAngle; skipChance;  // along a path, variation (Phase 7)
      gemCut; gemTable; gemCrown; gemFacets; gemSparkle;              // gem cuts (Phase 7)
      setting; settingColor; settingEffects;                           // a metal setting with its own effects (Phase 7)
      detail | null; multipleOf; wander; fillPaint | null; paintEach } // second colour, even counts, wandering, paint fills (version 10)
  | { type: 'texture'; kind; from; to; color; color2 | null;           // a procedural surface (§4.6, Phase 3)
      amount; scale; strength; where; seed }
  | { type: 'shape'; ...Placement; ...PlacedStyle;                     // one circle / rectangle / polygon / star
      shape; sides; innerRatio; corner;                               // shape 'ornament' (version 10):
      element; detail | null;                                          // …any repeat element, with its second colour
      seed }                                                           // the burst's and blob's outline (version 11)
  | { type: 'path'; ...Placement; ...PlacedStyle; points; closed;     // a drawn shape (§4.5)
      stroke; taperStart; taperEnd }                                   // drawn as a tapered filled stroke (Phase 9)
  | { type: 'text'; text; font; size; spacing; at; along; align;      // words or runes on the band or a path (§4.10, Phase 7)
      reverse; follow; fill; outline | null; outlineWidth }
  | { type: 'contours'; count; from; spacing; width; taper; paint;     // nested lines, a quick ring (Phase 7)
      altColor | null; dash }
  | { type: 'growth'; kind; follow; at; count; waveLength; amplitude;  // generators (§5.7, Phase 8)
      gnarl; thickness; taper; branching; branchLength; branchAngle; curl; depth;
      extra; extraSpacing; extraSize; color; extraColor; seed }
  | { type: 'fracture'; kind; from; to; count; length; branching; jagged; width; color; seed }
  | { type: 'cells'; pattern; from; to; size; gap; jitter; rounding; missing; vary; color; seed }
  | { type: 'knotwork'; follow; at; waveLength; amplitude; width; color; outline | null;
      outlineWidth; outlineOpacity; shine; double; flip }
  | { type: 'gears'; follow; at; count; snapToCorners; size; teeth; toothDepth; toothShape;
      spokes; hub; domed; altSize; interlock; rotation; offset; color; shaded }
  | { type: 'chain'; follow; at; linkLength; linkWidth; thickness; color; shaded }
  | { type: 'group'; children: Layer[]; collapsed;                    // layers kept together (§5.2)
      combine: 'normal' | 'union' | 'subtract' | 'intersect' | 'exclude' }  // combining shapes (Phase 9)
  | { type: 'unsupported'; originalType; data; reason };               // kept, never drawn (see 4.3)
type Placement = { place: 'band' | 'free'; along; across; x; y;       // §4.4
                   size; stretch; rotation; mirror: 'none' | 'leftRight' | 'topBottom' | 'four';
                   radialCount; radialRadius; radialStart; radialMirror };  // a radial array (Phase 7)
type PlacedStyle = { fill | null; shaded; outline | null; outlineWidth; raised; glow | null;
                     faceted; facetTable; facetDepth;                  // cut into lit faces (§5.5, version 5)
                     fillPaint | null; paintEach };                    // filled with a paint (§4.11, version 10)
type Effect =                                                         // every one has `on`; sizes in band widths
  | { kind: 'bevel'; direction: 'raised' | 'sunken'; profile; size; depth; soften; highlight; highlightOpacity;
      shadow; shadowOpacity; gloss; lightHeight; surface; surfaceDepth; surfaceScale; seed }
  | { kind: 'shadow'; inner; color; opacity; distance; blur }
  | { kind: 'glow'; inner; color; opacity; size }
  | { kind: 'recolour'; stops: GradientStop[]; amount }               // "Material colour": a gradient map
  | { kind: 'adjust'; hue; saturation; brightness; contrast }
  | { kind: 'wear'; chips; polish; grime; grimeColor; scale; seed; scratches }   // scratches: Phase 8
  | { kind: 'distort'; amount; scale; seed }                           // noise displacement (Phase 8)
  | { kind: 'extrude'; depth; shade }                                  // sidewalls (Phase 9)
  | { kind: 'offset'; amount }                                         // grow or shrink (Phase 9)
  | { kind: 'blur'; mode: 'soft' | 'spin' | 'zoom'; amount; keepShape } // blur (version 11)
type Paint =
  | { kind: 'solid'; color }
  | { kind: 'lit'; color; light; dark; pressed;     // token-maker's metal lighting (litTables), turned to stage.light
      highlight | null }                            // the lit side's colour; null = the engine's default (Phase 4)
  | { kind: 'linear'; angle; stops; followLight }   // across the token; optionally turning with the light (Phase 4)
  | { kind: 'acrossBand'; stops }                   // outer edge → inner edge
  | { kind: 'ring'; stops: { angle; color }[]; followLight }  // colours round the ring (Phase 3)
  | { kind: 'picture'; picture; scale; angle; bend; tint | null; lighting }  // a photo texture (§4.11, version 10)
// Gradient stops (linear, acrossBand): { at; color; opacity }  — opacity added in Phase 4
```

Phase 4 added only what the converted frames needed, each useful on its own and off by default:

- `lit.highlight`: the colour the lit side goes towards (Paladin's white, Gilded's pale gold, Arcane's grey…), passed to the engine's `litTables`.
- Gradient stop `opacity`: see-through colours (Token Maker's lit outer rim fades from 90 % to nothing).
- `linear.followLight`: the gradient's angle is for a light at the top left and turns with `stage.light`, so a converted frame's lit rim follows the light dial.
- Repeat `shaded` (off = one flat colour, as Harlequin's diamonds and Cleric's rays) and `show`, an on/off pattern of which elements are drawn (`[true, false]` = every other one). Two repeats with opposite patterns alternate any style, not only colours: Harlequin's light and dark diamonds have different opacities; pairs alternate with `[true, true, false, false]`. Elements left out keep their number, so alternate colours, sizes and rune patterns don't shift.

The **ring paint** blends between colour stops at angles round the token (0° right, 90° below), one colour per degree, drawn as thin wedges like the lit paint (`ringTable`, `angularFill` in `render/paint.ts`). It is how Stamped's hand-sampled colour tables can be expressed. With `followLight` (the default) the colours are for a light at the top left and turn with `stage.light`. On lines, the line is stroked on its own canvas and recoloured (`recolourRound`).

Elements for `repeat`: bead (shaded sphere), circle, diamond, square, triangle, star, cross, rune, leaf, spike, and (Phase 2) chevron, tick mark, gear, eye (iris in the element's colour), music note (single or paired, varied by the seed) and claw marks, and (Phase 6) faceted ones lit by the light (§5.5): cut gem (an eight-sided brilliant), hexagonal plate and crystal shard (pointing outwards).

Phase 6 added, all off (or empty) by default:

- `effects` on every layer, groups included (§5.4).
- `faceted`, `facetTable` (the flat top as a share of the shape, 0 = a point) and `facetDepth` on shapes and paths (§5.5).
- Blend modes: hard light, colour dodge, colour burn, darken, lighten, difference, exclusion, hue, saturation, luminosity, and `destination-out`, which isn't a colour blend but a **knockout**: the layer cuts its shape out of the layers below it in its group. The editor offers it as its own switch ("Cut a hole in the layers below"), never in the blend list, because cutting changes which parts of a shape exist, not how colours mix (the brief's "critical design decision").

Phase 7 added, all off by default (a repeat on the band, Phase 6's brilliant gem, no setting, one copy):

- Repeats can **follow** a path or line layer (`follow`, its id) instead of the band (§4.9), facing along it or upright (`orient`), growing or shrinking along the way (`scaleEnd`), with seeded **random variation** of size, angle and gaps (`jitterSize`, `jitterAngle`, `skipChance`, picked by `seed`).
- **Gem cuts** for the cut gem element (`gemCut`: brilliant, rose, emerald, cabochon, rough; `gemTable`, `gemCrown`, `gemFacets`, `gemSparkle`) and a **setting** round any element (`setting`: bezel, four or six claws; `settingColor`; `settingEffects`, the setting's own style) (§5.6).
- A **radial array** on shapes and paths: `radialCount` copies round the anchor, `radialRadius` out (band widths, or half-sizes when placed freely), the first at `radialStart` degrees from "up", every other one mirrored with `radialMirror`. Each copy points outwards; mirrored copies get their own arrays.
- **Text** and **contours** layers (§4.10).
- References between layers (`follow`) are by id. Copying layers together (`cloneAllWithNewIds`: duplicate, paste, the library, conversions) points the copies' references at the copies; a reference to a layer that isn't there falls back to the band.

Phase 8 added the generators (§5.7: growth, fracture, cells, knotwork, gears, chain), the **distortion** effect, `scratches` on wear, `waveFit` on lines (0 = off: one wave every `waveFit` band widths, so the number of waves fits the band, as Token Maker's vines and knotwork count theirs) and two elements, `tooth` (a ring gear's tooth hanging inwards from its point) and `gash` (Token Maker's three claw gashes). Every reference by `follow` (repeats, text, growth, knotwork, gears, chains) is handled the same way (`referencesOf` in `tree.ts`).

Repeat patterns (Phase 2), all off by default:

- `altColors`: colours taken in turn after `fill` (light, dark, light, dark…; Harlequin, Ranger).
- `altSizes`: sizes taken in turn, as multiples of `size` (big, small…; Cleric's rays).
- `skipAroundAccent`: leave out this many elements either side of each bigger one (Monk's jade beads).
- `alternateSides`: every other element moves inwards by this many band widths, the rest outwards, and points the other way (Druid's leaves).

### 4.2 Units: measured against the band

So a design fits every shape and thickness, nothing is in pixels:

- **Across** positions (`from`, `to`, `at`): 0 = the band's outer edge, 1 = its inner edge. −0.5 … 1.5 is allowed, to reach past the band.
- **Sizes** (`width`, `size`): fractions of the band's width.
- **Along** (`offset`): fractions of one gap between repeated elements.
- **Stage** thickness and outer spacing: fractions of the token's half-size, the same numbers Token Maker uses on a Medium token (0.14 and 0.1 by default).

These are the conventions of token-maker's `frameKit.ts` (`alongBand(g, count, at)`, sizes as multiples of `w`), so converted frames will keep their numbers.

### 4.3 Reading files safely

- A file must say `format: 'frame-studio-project'` and a `schemaVersion` ≤ the one this version knows; otherwise it is refused with a plain-English reason. Future versions add a migration (`MIGRATIONS[n]` turns version n into n + 1).
- Every field is checked; a bad value falls back to its default and a warning is shown. Numbers are clamped to their ranges.
- A layer kind this version doesn't know becomes an `unsupported` layer: kept exactly, saved back exactly, shown with a warning, not drawn. Nothing is silently dropped. This works inside groups too.
- Duplicate layer ids (anywhere in the tree) get fresh ones. Groups can nest up to 8 deep.
- **Version 1 → 2** (`MIGRATIONS[1]`): adds `stage.light = 225` and, on every layer, `clip: 'none'`; lines get no wave, repeats get no patterns. A test (`src/project/fixtures.test.ts`) opens real version-1 files saved by Phase 1 (`src/project/fixtures/v1/`) and checks that they draw pixel for pixel as Phase 1 drew them.
- **Version 2 → 3** (`MIGRATIONS[2]`): only adds things (texture layers, the ring paint), so nothing changes. Version-2 files saved by Phase 2 are in `src/project/fixtures/v2/`.
- **Version 3 → 4** (`MIGRATIONS[3]`): lit paints get `highlight: null`, linear paints `followLight: false`, gradient stops `opacity: 1` and repeats `shaded: true, show: []`, in groups too, so nothing changes. Version-3 files saved by Phase 3 (a lit/pressed/across/linear paint mix on a rounded token lit from 135°, and both texture templates) are in `src/project/fixtures/v3/`.
- **Version 4 → 5** (`MIGRATIONS[4]`): every layer of a kind this version knows gets `effects: []`, shapes and paths `faceted: false, facetTable: 0.5, facetDepth: 1`, in groups too, so nothing changes; a layer of a kind it doesn't know is left exactly as it was. An effect of a kind this version doesn't know is left out with a warning (a layer that can't be read keeps its effects in its kept data). Version-4 files saved by Phase 5 (Jewelled on a hexagon lit from 300°, and Paladin converted to layers on a thick square) are in `src/project/fixtures/v4/`.
- **Version 5 → 6** (`MIGRATIONS[5]`): repeats get `follow: null`, no variation, the brilliant cut at Phase 6's numbers and no setting; shapes and paths `radialCount: 1`; in groups too, so nothing changes. Version-5 files saved by Phase 6 (Dwarven bronze on a hexagon lit from 300°, Eldritch crystal on a square with the sample picture, Radiant gold) are in `src/project/fixtures/v5/`. From Phase 7 on, `npm run make-fixtures -- file:template:shape:light:showArt …` writes a version's fixtures before the next phase changes the format.
- **Version 6 → 7** (`MIGRATIONS[6]`): lines get `waveFit: 0` and wear effects (on layers and on settings) `scratches: 0`, so nothing changes. Version-6 files saved by Phase 7 (the Royal inscription on a square lit from 135° and on a flat hexagon with the sample picture; they have text, so the test loads Frame Maker's fonts) are in `src/project/fixtures/v6/`.
- **Version 7 → 8** (`MIGRATIONS[7]`): only a version number. Masks, shared height, combining, strokes and separate handles are all off when a file leaves them out (`mask: null`, `heightMode: 'none'`, `combine: 'normal'`, `stroke: 0`, no `handleIn`), which is how earlier files have them. Version-7 files saved by Phase 8 (the Overgrown ruin on a hexagon lit from 300° and on a circle with the sample picture) are in `src/project/fixtures/v7/`. An unsupported layer keeps its own mask and height settings in its kept data.
- **Version 8 → 9** (`MIGRATIONS[8]`): only a version number; the lighting rig is off when a file leaves it out (no extra lights, no ambient colour, no bloom or bleed). Version-8 files saved by Phase 9 (the Rune-carved plates on a square lit from 140° and on a circle with the sample picture) are in `src/project/fixtures/v8/`. Library files can carry your own styles since version 9 (`styles: [{ name, effects }]`, §6.8); older readers ignore them.
- **Version 9 → 10** (`MIGRATIONS[9]`): lines get `waveShape: 'sine', raised: false`; repeats `detail: null, multipleOf: 1, wander: 0, fillPaint: null, paintEach: false`; shapes `element: 'heart', detail: null`; shapes and paths `fillPaint: null, paintEach: false`; in groups too, so nothing changes. The new textures, ornaments and the photo paint are new kinds. Version-9 files saved by Phase 10 (the Overgrown ruin on a hexagon lit from 45°, the Royal inscription on a square with the sample picture) are in `src/project/fixtures/v9/`.
- **Version 10 → 11** (`MIGRATIONS[10]`): only a version number; a shape's `seed` is 1 when a file leaves it out. The new textures, shapes and the blur effect are new kinds. Version-10 files (Moon & stars on a circle with the sample picture, Grim iron on a hexagon lit from 300°, Royal on a square lit from 140°) are in `src/project/fixtures/v10/`.
- Fixture files must draw as their version drew them (their `.png` beside them). Since Phase 3 every layer is drawn on its own canvas and composited (§5.3), which changes the rounding of a few nearly transparent edge pixels by a few 255ths; the test allows at most 8/255 in any premultiplied channel and a mean under 0.5/255, which is invisible. A single layer on its own (for example a Token Maker frame against `drawFrame`) is still pixel for pixel.
- Nothing in a file is ever run as code.

### 4.4 Shapes and paths: placed on the band or freely (owner's answer 3)

A shape or path has one anchor point and is drawn in its own little frame around it:

- **On the band** (`place: 'band'`, the default): the anchor is `along` the way round (0–1, clockwise from the top, measured along the outline at its across position) and `across` the band (as in §4.2). Its height is `size` band widths, and it turns with the band: "up" points outwards, so a shape on the right-hand side lies on its side, exactly like the repeated elements. The same design therefore fits every token shape and thickness.
- **Placed freely** (`place: 'free'`): the anchor is at `x`, `y` (fractions of the half-size from the centre, +y down) and the height is `size` half-sizes. It ignores the band. Switching between the two keeps the layer where it is on screen (`switchPlace` in `render/hitTest.ts`); a free layer far inside the opening moves to the nearest allowed place on the band (across −50 % … 150 %).
- `stretch` is width ÷ height, `rotation` degrees clockwise on top of following the band.
- **Mirror** adds copies: a left/right pair, a top/bottom pair or all four. Every token shape is symmetric about both axes, so a mirrored copy lands at the matching place on the band. Copies are flipped, but their shading still comes from the stage's light (not a mirrored light).

The transforms are in `render/placed.ts` (`placement`, `placements`, `toCanvas`, `toLocal`) and are shared by drawing, picking and the on-canvas handles, so they always agree.

### 4.5 Path points

A path's points are in its own units: x along (right), y in (down), where 1 is half the layer's height. A point has an optional `handle`: the curve's control point leaving it, relative to it; the one arriving is its mirror image, so a point is either **sharp** (no handle) or **smooth** (a symmetrical curve). Since version 8 a smooth point can also have `handleIn`, its own arriving control point (written only when the handles are separate), for corners between two curves. That covers gems, leaves, blades and flourishes while staying easy to edit; separate in/out handles can be added later without breaking files (a second optional field). A path is filled only when `closed`; open paths show their outline.

### 4.6 Texture layers (Phase 3)

A texture layer draws a procedural surface over the band between `from` and `to` (across positions, as a band fill), clipped to that part of the band. It is drawn over the layers below it, like token-maker's textures over the band colour. Kinds (`render/textures.ts`), each a re-implementation of the token-maker code it is named after:

| Kind | Token Maker original | Lit by the stage light |
|---|---|---|
| `marble` | `marble` (Stamped-like marbling and flecks; 9 frames) | which side it keeps to |
| `hammered` | `hammerTexture` (Fighter, Magma, Cobblestone, Barbarian, Rogue) | bright flecks on the lit side |
| `wear` | `battleWear` (Fighter, Barbarian) | dents and scratch edges |
| `wood` | Oak's grain and knots (Oak, Druid) | – |
| `stone` | Cobblestone's blocks, mortar and pitting | the pitting |
| `scatter` | Starfield's haze and stars | – |
| `rope` | `ropeStrands` (Monk) | the strands' shading |
| `scales` | `drawScales` (Sorcerer) | – (lit from the outer edge, as the original) |
| `cracks` | Magma's glowing cracks | – |

- `color` is the colour the marks are made from (lighter and darker shades of it), so it should match the band underneath; for `scatter` it is the stars' colour and `color2` the haze (or none); for `cracks` it is the glow.
- `amount` (how many), `scale` (how big) and `strength` (how strongly they show) are all relative: **1 is what Token Maker draws**. `seed` picks the variation (`seededRandom`, so preview and export match).
- `where`: everywhere, mostly on the shaded side, or mostly on the lit side, following `stage.light`. Marble does it as the original does (marbling is left out where the band, lit the usual way in the texture's colour, is light); the others are faded towards that side.
- Every painter, at its default numbers and the original's seed, is **pixel for pixel** the original: `render/textures.test.ts` calls the finishes' own texture functions (`FINISHES.gilded.texture` etc.) and compares, on three shapes. The engine is not edited and its unexported functions are not imported.
- The **texture library** (`TEXTURES` in `project/defaults.ts`; Add layer → Texture…) offers 11 presets with live thumbnails, optionally with a matching band fill under them.

### 4.7 Converted Token Maker frames (Phase 4)

`src/project/convert.ts` turns a Token Maker frame into editable layers. Every drawn frame shares one build (Token Maker's `render/finishes.ts`), so a converter is a few lines on top of shared pieces, written with the numbers in the frame's finish:

| Token Maker part | Layers |
|---|---|
| Band (`litTables` with the finish's lighting) | Band fill, `lit` paint with the finish's light, dark and highlight |
| Pressed-in step | Band fill from `1 − step` to 1, the same paint `pressed` |
| Texture (clipped to the band) | Texture layers, grooves (a group of two lines), patterns; each clipped to the band |
| Crease | Line at `1 − step`, 3 % wide, `#190500` at 55 % opacity |
| Rims | "Outer rim (lit)": line at 2 %, 4 % wide, a see-through gradient from the top left that turns with the light; "Inner rim (shadow)": line at 98.8 %, 2.4 % wide, `#0a0200` at 60 % |
| Ornaments | Repeats (crosses, gems, beads, runes, diamonds…) and lines (Arcane's glowing line) |

Token Maker's see-through colours (`rgba(…, 0.55)`) become a solid colour and the layer's opacity, which draws the same because a line or a repeat doesn't overlap itself. Colours come from the frame's colour and highlights colour at conversion time; after that every layer is independent.

- **In the editor:** New offers "Token Maker frames, as editable layers" (marked *Editable*) above the 27 originals; in "Add a Token Maker frame" the editable ones are added as a group. A Token Maker frame layer whose style has a converter shows **Turn into editable layers** in Properties: a group with the layer's name, visibility, opacity, blend and clip takes its place, as one undo step.
- **Converted frames follow the light** (§5.1), which the originals can't. At the top-left light they are drawn to match the originals.
- **How close each is** (`src/project/convert.test.ts`): the original (a legacy layer, itself pixel for pixel `drawFrame`) and the conversion are drawn on every shape and compared, premultiplied: the mean difference per channel (0–255) and the share of pixels that differ visibly (by more than 24/255). Polished and Paladin are checked at 96, 200 and 320 px and thicknesses 0.14 and 0.25; the others at 200 px on every shape and thick on a circle. Each has a limit a little above what it measures; `npm run compare-conversions` draws them side by side with the difference.

| Frame | Worst mean | Worst visibly different | Limit (mean / %) | What differs |
|---|---|---|---|---|
| Polished | 0.10 | 0 % | 0.15 / 0.01 | Nothing (rounding at the band's edges) |
| Oak, Cobblestone, Starfield, Fighter, Sorcerer, Gilded, Magma | 0.18–0.40 | ≤ 0.16 % | 0.25–0.5 / ≤ 0.25 | Gilded's bead shadows a little stronger; Fighter's and Magma's bright flecks (the texture layer ties their strength to the dents) |
| Double line, Harlequin, Monk | 0.53–0.82 | ≤ 1.2 % | 0.7–1.1 / ≤ 1.5 | Double line's diamonds lit by the light, more softly; Harlequin's outlines fainter on the light diamonds; Monk leaves one more small bead out beside the big one where the count doesn't divide by 9 |
| Engraved, Rogue | ~1.1 | ~1.2 % | 1.4 / 1.6 | Tick marks and stitches are flat bars with square ends (not round-capped strokes) |
| Arcane, Infernal, Wizard | 1.8–2.1 | ≤ 0.65 % | 2.4–2.6 / 0.8–0.9 | Runes and glow match; the marbling is judged by its colour lit the usual way rather than by the band's own lighting, so a few patches move |
| Paladin | 2.0 | 4.1 % | 2.5 / 5 | Frame Maker's crosses: lit from the stage's light (the original lights each one from its own top left, so the bottom crosses look lit from below), with a softer gradient; slightly thinner upright; a single shadow; at hexagon corners a cross can face along the next side |
| Druid (Phase 8) | 0.99 | 1.2 % | 1.2 / 1.5 | A growth layer: the leaves are shaded by the stage's light |
| Artificer (Phase 8) | 1.24 | 1.8 % | 1.5 / 2.2 | Gear teeth and a gears layer; the gears turn with the band, their shadows a shadow effect |
| Barbarian (Phase 8) | 1.32 | 2.7 % | 1.6 / 3.2 | The gash element; every gash leans the same way (the original tilts each a little) |
| Knotwork (Phase 8) | 2.96 | 4.7 % | 3.4 / 5.5 | A knotwork layer with real over/under crossings (the original lays one strand over the other all the way round) |
| Stamped (version 10) | 0.15 | 0.05 % | 0.2 / 0.05 | Nothing (its own ring colours and the veined marble texture: the same picture to within rounding) |
| Bard (version 10) | 0.33 | 0.26 % | 0.6 / 0.35 | Nothing visible: Token Maker's own notes, wandering and single or paired in its random order |
| Warlock (version 10) | 1.93 | 2.4 % | 2.2 / 3 | The eyes are lit from the stage's light and their shadows are softer |
| Ranger (version 10) | 2.42 | 7.1 % | 2.8 / 8 | The thin fletching chevrons sit a hair further along the band |
| Cleric | 4.2 | 9.3 % | 5.5 / 12 | The rays are counted along their own line rather than the band's middle, so there can be one or two more or fewer and they drift out of step; long and short rays share one position across |

  (Worst over every shape, size and thickness tested. A mean of 1/255 is invisible; the differences above are in fine detail, which is why the default is "looks the same", §9.)
- **Converted in Phase 8** with the generators: Druid, Knotwork, Artificer, Barbarian (22 frames, 21 drawing styles, in all).
- **Every frame converts since version 10** (only "No frame" has nothing to convert): the last four needed the pieces in §4.11. **Stamped** is its outer and step colours as two ring paints (`project/stamped.ts`, Token Maker's own tables moved to the frame's colour) and the *Veined marble* texture (`veins`, Token Maker's `stampedTexture`, kept to where Stamped's colours are dark); **Ranger** the *Fletching* element (an open, stroked chevron) in two layers with opposite on/off patterns; **Bard** Token Maker's own note (`bardNote`) with *Wander in and out*, its single or paired choice drawn from the same seeded numbers in Token Maker's order; **Warlock** the detailed eye (`watchEye`), each one's random size from Token Maker's seed written into the repeat's alternating sizes (`tokenMakerSizes` in `convert.ts`).

### 4.8 Layers on the move: copied, saved and in library files (Phase 5)

`src/project/transfer.ts`. Layers that leave a project travel as a small project-shaped object, so they are read by `parseProject` with every check and migration of §4.3 (an old copy is migrated, a layer from a newer version stays `unsupported` and is written back as it came):

```ts
{ format: 'frame-studio-layers', schemaVersion, name, stage, layers }   // copied layers, or one library item
{ format: 'frame-studio-library', schemaVersion, items: [ …the above… ] } // a library file (.framemaker-library.json)
```

- `stage` is the stage they were made on; it is only used to draw the item's thumbnail. Put into a design, the layers follow that design's band (§4.2).
- A project file is accepted anywhere layers are (its layers become one item, named after it). A library file's items that can't be read are left out, each with a warning.
- When layers are put into a design every id is renewed (`cloneWithNewIds`), so the same item can be added any number of times.

**Project files can carry a preview** (Export → Project file with a preview): a 256 px see-through PNG as a data URL in a top-level `preview` field, after the layers, for apps that list designs (Token Maker's frame tiles). Reading a file ignores it; it changes nothing else in the format, so the schema version stays 4.

### 4.9 Tracks: ornaments and text along any path (Phase 7)

`render/track.ts`. A **track** is an outline something runs along, in pixels: the band at an across position (closed), each copy of a path layer (mirrored and radial copies included; open or closed, curves sampled finely) or a line layer's own outline (wavy or not, closed). Repeats and text with `follow` set run along the followed layer's tracks; a hidden path is still followed, so a path can be a guide that isn't drawn.

- On a closed track elements are spaced evenly all the way round (the band's own spacing, so a repeat on the band is placed exactly as before); on an open one from end to end, both ends included. "As many as fit" divides the track's length by the spacing.
- Elements keep counting across a path's copies, so alternate colours, runes and the on/off pattern run on.
- Random variation draws three seeded numbers per element whether or not it is drawn, so leaving some out doesn't move the others.
- The renderer finds followed layers by id (`RenderEnv.find`); a layer's cache key includes the settings of the layers it follows (`depsKey` in `renderProject.ts`), so moving a path redraws the gems following it and nothing else.

### 4.10 Text and contour layers (Phase 7)

`render/text.ts`. A **text** layer places its letters one by one along its track: the band at `at`, or the first track of the layer it follows. `along` (0–1 of the track) is the text's middle (`align: 'centre'`) or its start; letters stand with their tops outwards (to the left of the direction of travel); `reverse` runs the other way with the tops inwards, for the bottom of a token. `size` is the capital height in band widths, `spacing` extra room as a share of it. Text longer than a closed track stops rather than overlapping itself.

- **Fonts:** `runes` is an Elder Futhark alphabet drawn from strokes (letters map to runes, "th" and "ng" have their own, spaces become two dots), identical everywhere; `grenze` (Grenze 600) and `atkinson` (Atkinson Hyperlegible 700) are the fonts Frame Maker already ships. The editor loads them before drawing (`ui/fonts.ts`) and forgets pictures drawn before they arrived; node (tests, scripts) loads the same files (`scripts/nodeFonts.ts`). Token Maker has the same fonts.
- Effects work on text as on any layer: the Engraved style cuts it into the band, a glow makes glowing runes.

A **contours** layer is several lines at once: `count` lines from `from` across, `spacing` apart, the first `width` wide and the last `1 − taper` times that, each with the layer's paint (every other one in `altColor` if set). It is drawn as that many line layers (`contourLines`), so it looks exactly like lines would.

### 4.11 More ornaments, textures and paint fills (version 10)

Built on a separate branch alongside Phases 6–7 and brought onto the Phase 10 code afterwards. Where both had built the same thing, the Phase 7–8 version stayed: fitted waves are `waveFit`, random size and angle are `jitterSize` and `jitterAngle`, and the faceted `gem`, `tooth` and `gash` elements are unchanged (the branch's drawn two-tone gem is `jewel`; `gash` gained a second colour). Everything new is off by default, so a version-9 file opens and draws as before.

- **Ornaments** (repeat elements): Token Maker's details (`fletching`, `bardNote`, `watchEye`, `cog`, `sprig`) and new ones drawn for Frame Maker: heart, crescent moon, flame, fleur-de-lis, shield, sun, snowflake, crown, jewel, drop, scallop shell, spiral, paw print, feather, Celtic knot, skull, arrow. They are written like SVG paths in a −1…1 box (`render/glyphs.ts`); filled parts wind the same way, so overlapping parts join instead of cutting holes. Some have a **second colour** (`detail`: an eye's white, a cog's hub, a flame's core, a gash's lit edge…; null works one out from the main colour; `DETAIL_NAMES` in `elements.ts`).
- *(Removed before the public release:* the 48 ornaments from game-icons.net (CC BY 3.0) that versions 10 and 11 offered as `icon-…` element kinds. Every ornament is now drawn by Frame Maker's own code. A saved design that used one opens with the nearest drawn ornament instead (`LEGACY_ICON_ELEMENTS` in `project/migrate.ts`).*)
- **Shapes** get a fifth kind, **Ornament**: any repeat element placed on its own, with mirroring, radial arrays, raised and glow (`element`, `detail`). It draws its own outline, so it isn't faceted or turned into a path.
- **Repeats:** `detail`; `multipleOf` (round the number to a multiple, so alternating patterns meet up); `wander` (in and out, band widths). Wandering, and Bard's single or paired notes, take numbers from `seededRandom(seed)` in Token Maker's order, separately from the Phase 7 variation's numbers, so converted frames match their originals and changing one setting doesn't reshuffle the other.
- **Lines:** `waveShape` (smooth, zigzag, scallops, battlements; `WAVE` in `track.ts`) and `raised` (the small shadow away from the light).
- **Textures:** Stamped's *veined marble* and nine new kinds — brushed metal, basket weave, chainmail, rust, frost, bark, sparkles, crackle glaze, knurled grip — seeded, scaled to the band and lit by the stage's light where they have a lit side. The texture library has 22 drawn presets.
- **20 photo textures** (CC0, Poly Haven and ambientCG): 512 px JPEGs as data URLs in `render/pictureData.ts`, a separate file the browser fetches only when a design first uses a photo (`render/pictures.ts`). The renderer stays synchronous: a photo not loaded yet is drawn as its average colour (`project/pictures.ts`), loading starts, and when it arrives the preview and thumbnails draw again and the layer cache's key changes (`pictureEpoch`). Exports, token packs, thumbnails and the project file's preview wait for the photos first (`loadPictures`); Token Maker awaits `loadFrameDesignPictures(design)` before drawing a design (§10).
- **The `picture` paint:** `{ kind: 'picture', picture, scale, angle, bend, tint, lighting }` tiles `scale` band widths across, turned `angle`; `bend` follows the band round the token (on band fills; lines and fills lie flat); `tint` recolours it keeping its light and dark; `lighting` lightens the side facing the light and darkens the other. The texture library has a **Photo textures** section that adds a band fill of one.
- **Fills with a paint** (`fillPaint`, `paintEach` on repeats, shapes and paths): metal lighting, gradients, colours round the ring or photos instead of the fill colour. The paint is drawn once over the whole picture (`paintCanvas`) and used as a pattern set at the moment of filling (`paintPattern`): across the token each ornament shows its own part; with `paintEach` the whole paint is shrunk into each one. Shading is laid over it as light and shade. A faceted shape keeps its fill colour.
- **Reset buttons:** the ↺ beside a slider or colour puts it back as a new layer, effect or stage has it, as one undo step; it stays in place, disabled, when there is nothing to reset.
- **Templates:** Moon & stars, Frostbound, Celtic knots, Royal (a crown ornament over fleurs-de-lis and jewels) and Grim iron.
- `npm run showcase -- ornaments|textures|photos|fills|templates|shapes|crafted|converted out.png` draws them on one sheet (docs/screenshots/27–30, 33–35; version 11: 38–40).

### 4.12 Blending, blur, natural and strange textures, more shapes (version 11)

The owner sent six hand-painted ring frames (gilded filigree over red enamel; a gold guild ring with four arrow studs; black feathers between thin copper rims; frosted black iron round a molten ring; a blurred ring of storm wisps; riveted iron plates casting a shadow inwards) and asked for what it takes to make frames like them: blend modes on layers, a crystal facet texture, more natural and strange textures (procedural and photographic), more shapes and a blur. Everything is off or new, so older files draw as before.

- **Opacity and blend mode in Basic mode.** Blend modes existed since Phase 6 but only in Advanced; every layer now has an **Opacity and blend mode** section in Basic too (open by default), with the knockout switch beside it. Advanced keeps clipping, masks and shared height.
- **Blur** (an effect, §5.4): `soft` blurs evenly; `spin` smears each pixel along the circle round the token's middle; `zoom` along the line out from it; `amount` band widths long. Premultiplied, so edges don't darken; `keepShape` keeps the layer's own alpha (a soft inside, crisp edges). Spin and zoom only visit the painted area grown by the length.
- **Textures** (`render/naturalTextures.ts`). Natural: `crystal` (Voronoi faces each tilted its own way and lit by the stage's light, bright edges, glints), `lava` (domain-warped noise and glowing rivers between crusted cells; `color2` the crust), `smoke` (thin bright wisps where stretched, warped noise crosses its levels; `color2` a haze), `feathers` (curved quills with barbs, lit on one side), `filigree` (scrolls curling into spirals with an S-curve stem and a leaf, as a groove with a lit edge), `mottled` (blotches with darker rims and flecks; `color2` the flecks), `lichen` (round colonies with crinkled pale rims and spores), `caustics` (two layers of Voronoi edges, warped). Strange: `nebula` (two-colour warped clouds with a bright core and stars), `circuit` (glowing traces in lanes, stepping between them, ending in nodes), `bubbles` (rims, soft insides and a glint towards the light), `eyes` (watching eyes, some half shut; `color2` their whites). The library has 13 presets for them.
  - The **pixel textures** (crystal, lava, smoke, mottled, lichen, caustics, nebula) are worked out per pixel from where it is on the band: across (0–1) from `insetOf`, the inset whose outline passes through it (exact for every token shape), and along, in band widths, from the band's middle outline measured round 2048 directions, so they follow the band on squares and hexagons. Their noise repeats a whole number of times round the band, so there is no seam at the top. They are drawn at the picture's own size, so they look the same at every size.
- **12 more photo textures** (CC0, Poly Haven and ambientCG, like the first 20; §4.11): ember streaks, molten rock, moss, blue onyx, black onyx, plane tree bark, coral stone, dark rock, forest floor, lichen rock, cracked mud, tiger rock.
- **Shapes** (`render/shapeOutlines.ts`): ring (`innerRatio` the hole, wound the other way so a non-zero fill leaves it empty), crescent (horns outwards), half circle, teardrop (point outwards), almond, cross, arch (`corner` from round to pointed), trapezoid (`innerRatio` the outer side), chevron, flower (`sides` petals), squircle (`corner` from nearly square to round), burst and blob (`sides` points or lumps, `seed` the outline). They are point outlines in the −1…1 box, so drawing, faceting and "Turn into a path" share them (a ring can't become a path).
- **Crafted borders** (`project/craftedTemplates.ts`, a section of New): Gilded filigree, Guild ring (gold and silver), Raven plume, Emberforged, Storm wisps, Riveted plates. Each carries the band thickness (and spacing) it was made for. `npm run fm:compare-pictures -- out.png id=picture.png[@x,y,w,h][#background] …` draws templates beside reference pictures.
- **A "Pale gold" material** (§6.4).
- **Token Maker** draws all of it: `npm run fm:share-copy -- [new files]` copies the reader and renderer into `src/token-maker/frameMaker/` (rewriting only the engine's import path) and updates `SOURCE.json`.

### 4.13 Library pictures (version 13)

The owner asked for Token Maker's effect and decoration pictures (`public/pictures/`) to be usable in Frame Maker, and for better roses in the rose frames.

- **`project/libraryPictures.ts`** lists them: Token Maker's pictures that its pickers offer (ornaments, treasure, creatures, trims, icons, effects) plus Frame Maker's own **roses** (six CC0 Openclipart roses: red rose, shaded rose, rose bud, heraldic rose, a tintable silhouette and a rose spray). The list itself (`libraryPictureList.ts`, with each picture's average colour and shape) is made by `npm run fm:library-pictures` from Token Maker's `render/pictureLibrary.ts`; run it again when that changes. Pictures that cover an area (stone, marble, cracks, embers) are in a **Textures** group.
- **Element `picture`**: a repeat or an ornament shape can draw a library picture (`picture`, its id; `pictureTint`, coloured by the layer's colour keeping its light and dark, or its own colours). It is `h` tall and as wide as the picture's own shape (times `stretch`), its top pointing out of the band like the other emblems. Effects work on it as on any layer (a material colour turns a shaded red rose into gold). The Properties panel shows the pictures as tiles, a group at a time.
- **Texture pictures as photo textures**: a picture paint can also use a Textures picture (e.g. the veined marble), tiled like the photos.
- **Loading**: like photo textures (§4.11), loaded when first used, from `/pictures/<id>.webp`; nothing is drawn for a picture until it has arrived, then the preview draws again (`pictureEpoch`). Exports and Token Maker load a design's pictures first. Node scripts and tests read them from `public/` (`setPictureDecoder`).
- **Colour slots** turn pictures shown in their own colours by hue, as they do photo textures.
- Older files read as before (no layer uses the new element); an unknown picture id reads as the default rose.

## 5. The renderer

`renderProject(ctx, project, size, { art })` in `src/render/renderProject.ts` draws the preview, the template thumbnails, the PNG export and the test images. One renderer, so the export always matches the preview.

1. Clip to the square; origin at the centre.
2. If `stage.showArt`: the backing colour and the sample picture inside the band's middle (where token-maker's art runs to).
3. Layers, bottom first (`drawStack`). Every layer is drawn on its own canvas (its *picture*, kept in the cache, §5.3) and then composited with its opacity and blend mode, so its opacity is even where its parts overlap. A group at full opacity and Normal blend passes its layers straight through; otherwise it is drawn on its own canvas from its layers' pictures and composited the same way.

Two options exist for Token Maker (§10): `band` draws on a given band (shape and edges in pixels) instead of the one the stage makes, and `clear: false` draws over what is already there. The cache key (§5.3) is the band's edges, not the stage's numbers, so both give the same pictures.

Painters per type are in `src/render/layers.ts` (shapes and paths in `src/render/placed.ts`). The legacy layer calls token-maker's `drawFrame` with exactly the geometry token-maker would use; a test checks every frame is pixel-identical to a direct `drawFrame` call.

Editor-only drawing (selection outlines, handles, path points) is on a separate overlay canvas and never reaches the export.

The stage bar keeps a fixed layout (the light's caption has a fixed width and its reset button's room is kept), so moving the light never resizes the canvas.

*(Frame reviews with the library pictures, owner's picks: `project/reviewFrames.ts` lists the chosen frames, and their projects are saved as made in `project/reviewFramesData.ts`. A remake keeps the id of the frame it replaces (its entry leaves `frameVersions.ts`; a kept original with that id, such as Guild ring (gold) or Celestial halo, draws the remake), so tokens made with it get the new look. New frames get new ids. Remakes take the place of the old entry in its list (`remadeFrame`), keeping its group and `after`; their own names, descriptions and colour slots are in `reviewFrames.ts`. Token Maker's code-drawn Cobblestone, Druid, Paladin, Warlock and Fighter were replaced by Frame Maker designs (Stone cobbles, Druid’s oak and Druid’s vine, Paladin’s oath, Warlock’s watchers, Fighter’s plate): they are no longer offered in the picker (`sections/frameTiles.ts`), but tokens made with them still draw them. Owner's rule: every built-in frame's band is 7% of a square thick (`BUILT_IN_THICKNESS` = 0.14 in `builtInFrames.ts`, applied to every built-in project), so picking any frame gives the same thickness.)*

### 5.1 The light direction

`stage.light` is where the light comes from, in degrees (0 right, 90 below, 225 top left). `src/render/light.ts` turns everything Frame Maker lights itself:

- the `lit` paint: token-maker's 360-entry colour tables are turned round so their lit side faces the light (`turnTable`); on lines, the stand-in gradient turns with it;
- beads (`sphere`) and the shading of elements, shapes and paths (`lightAt`, `shadedFill`);
- raised shadows fall away from the light (`raisedFrom`);
- gradients with `followLight`, such as a converted frame's lit outer rim, turn their angle with it.

At 225° every one of these returns exactly the engine's own values, so version-1 designs draw the same. **Token Maker frames** (legacy layers) are lit inside the copied engine, which must not be edited; they stay lit from the top left, and their Properties say so when the light is moved. Converted frames (§4.7) are made of Frame Maker's own layers, so they follow the light.

### 5.2 Groups and clipping

- A **group** holds its own bottom-first list of layers. Hiding it hides them; locking it locks them (they can't be picked or edited); its opacity and blend mode apply to them together. A group at full opacity and Normal blend draws its layers straight into the picture ("pass through").
- **Clip to the band** draws the layer (or group) only between the band's outer and inner edges.
- **Clip to the layer below** works like a clipping mask: the layer shows only where the nearest layer below it that isn't itself clipped has paint. If that layer is hidden, so is the clipped one; with nothing below, nothing shows.

### 5.3 The layer cache (Phase 3)

`render/layerCache.ts` keeps each layer's picture between renders, keyed by everything that changes how it looks: its settings (not its id, name, visibility, lock, opacity or blend mode), the stage's shape, thickness, spacing and light, and the size. So:

- editing one layer redraws only that layer; changing opacity, blend, name, visibility or lock redraws nothing; changing the stage or the size redraws everything once;
- a layer clipped to the one below uses that layer's cached picture as its mask (it used to draw it a second time);
- one picture is kept per layer and size (a replaced picture is let go at once), with a budget of 32 million pixels (about 128 MB), least recently used first;
- renders over 2048 px are never cached (as token-maker); they still draw each layer on its own canvas, so a cached and an uncached render are **exactly** the same (tested);
- `renderStats` says how many layers the last render drew and reused; the preview canvas shows them as `data-drawn` / `data-reused` (used by the end-to-end tests).

Budget (tested): a 10-layer textured design draws at 512 px in about 140 ms from scratch and about 20 ms after editing one layer, on the test machine.

### 5.4 Effects (Phase 6)

`render/effects.ts`. Effects are non-destructive filters on a layer's **picture** (its own canvas, §5.3), applied in the layer's order, first first, before the picture is composited with its opacity and blend mode. Because they work on pixels, they suit every kind of layer — a band, a ring of runes, a texture, a Token Maker frame, a whole group — whatever drew it. Every size is in **band widths**, so an effect looks the same at every token size, shape and thickness (tested by drawing at 200 px and at 400 px halved). Everything is plain arithmetic on the pixels (no canvas filters, which differ between browsers and node), so the preview, the export and the tests make the same picture; the Phase 6 end-to-end test draws an exported file in node and compares it with the browser's export.

| Effect | What it does |
|---|---|
| **Bevel and surface** (`bevel`) | The 2.5D surface system. A height map is made from the picture's shape: each painted pixel's distance from the edge (an exact Euclidean distance transform), divided by the bevel width and put through a **profile** (rounded, chiselled, cove, rim, steps), times the depth; sunk in turns it upside down. A **surface** is added on top (hammered dents, rough grain, brushed streaks running round the token, cracked plates, scales or studs; seeded cell and fractal noise sized in band widths). The height map is softened a little (always at least 2 px, so the pixel steps of an edge don't show as streaks), turned into **normals**, and lit by the stage's light at the bevel's light height: the side facing the light is mixed towards the lit-side colour, the side away towards the shaded-side colour, both measured against how a flat surface is lit (so a flat middle keeps its colour), plus a shine (Blinn–Phong) whose sharpness and strength come from the gloss. |
| **Shadow** | Outside: the picture's shape, moved away from the light by the distance, blurred, put behind it. Inside: the outside moved the same way and blurred, darkening the edge that faces the light (for engraving). |
| **Glow** | Fades with the exact distance from the edge, outside (behind the picture) or inside, so thin runes glow as brightly as a wide band; softened a little. |
| **Material colour** (`recolour`) | A gradient map: each pixel's lightness picks a colour from the stops (dark at 0, light at 1), mixed in by the amount. After a bevel it turns the grey shading into gold, bronze, bone…; 14 ready-made **materials** (`MATERIALS` in `project/styles.ts`). |
| **Colour adjust** | Hue turn (a colour matrix, as CSS's hue-rotate), vividness, brightness, contrast. |
| **Blur** (version 11) | Soft (the box blur run three times, premultiplied), spin (each pixel averaged along the circle round the token's middle) or zoom (along the line out from it), `amount` band widths long; "Keep its shape" keeps the picture's own alpha. |
| **Wear and grime** | Chips bitten out of the edge (where edge nearness plus noise passes a threshold), edges rubbed bright, and blotches of grime colour, weaker at the edge. Put it before a bevel and the bevel follows the chips. |

- **Order matters and is the user's:** a bevel then a material colour gives metal; wear then a bevel gives chipped, bevelled stone; the style library (§6.4) sets sensible orders.
- **Groups:** a group with effects is drawn as one picture and the effects see its layers as one shape (bevel a group of overlapping shapes and they read as one sculpted piece; put a knockout layer in it and the hole gets a bevelled edge). A group with effects is never passed through.
- **Clipping:** a layer clipped to the band has its effects clipped too (its glow doesn't spill out). A layer clipped to the layer below uses that layer's picture **without** its effects as the mask, so the base's shadow or glow doesn't let it spill out.
- **Caching:** a layer's picture without effects and its picture with them are kept separately (`effectsKey` in `layerCache.ts`): changing an effect makes only the second again, from the kept first. Groups with effects are cached too (their key holds their layers' settings).
- **Speed:** a band with a bevel takes about 0.3 s at 1300 px in node. The blur works on a smaller copy for wide radii. On a high-density screen the preview of a design with effects is drawn at the screen's own size first and **sharpened** 0.3 s after editing pauses (`Stage.tsx`), so dragging a slider stays responsive; the export is always drawn at full size.
- **Tested** (`render/phase6.test.ts`): effects off draw exactly as none; each effect changes the picture the same way every time; a raised bevel is lit on the side facing the light and turns with it, a sunken one the other way, the flat middle keeps its colour; every surface textures the middle; effects scale with the size; shadows fall away from the light, outside or inside only; a glow spreads round the shape but not from the picture's edge and is as bright round runes; material colour maps dark and light to its ends; colour adjust; wear chips the edges (by seed) and leaves the middle; effects on a group; clipping with effects; the cache; every token shape; a time budget; and the helpers (the distance transform is exact on a square, the blur keeps the total, noise is repeatable, gradient tables).

### 5.5 Faceted shapes and elements (Phase 6)

`render/facets.ts`. A faceted shape is its outline (curves sampled) cut into flat faces that rise from each edge to a flat top (`facetTable`, a share of the shape's size; 0 rises to a point) at a height set by `facetDepth`. Each face's **normal is worked out in 3D** from its corners and lit by the stage's light (turned into the shape's own frame, mirrored copies included), so one light gives coherent highlights and shadows across a star, a hexagonal plate or a crystal. The whole outline is filled first (so it casts the raised shadow and glow once) and the faces are drawn over it; each face is stroked in its own colour so neighbouring faces leave no seam. The repeat elements gem, plate and shard use the same code with their own cut; "Shaded by the light" off draws them flat.

### 5.6 Gem cuts and settings (Phase 7)

`render/elements.ts` (`drawGem`, `gemOutline`, `drawSetting`). Each cut is faces worked out in 3D and lit by the stage's light, as in §5.5:

| Cut | How it is drawn |
|---|---|
| Brilliant | `gemFacets` sides rising to a table `gemTable` wide (Phase 6's gem is 8 sides, 52 %, crown 0.9) |
| Rose | a ring of facets, then a pyramid of triangles to a point, turned half a facet |
| Emerald | a rectangle with cut corners, three steps down from a flat table |
| Cabochon | a smooth dome, brighter towards the light, with a soft highlight |
| Rough | an irregular outline (different for every element, by the seed) rising to a point |

`gemCrown` is how high the faces rise (how strongly they catch the light); `gemSparkle` adds a four-pointed glint on the side facing the light.

A **setting** follows the gem's outline (or an oval round any other element): a bezel is a wider cup behind the stone and a lip round its edge; claws are four or six prongs behind it and round tips over its edge. The parts behind and in front are drawn on canvases of their own and get `settingEffects` (by default the Polished gold style), so the setting is metal while the gem keeps its own colour and effects; then the layer's own effects apply to the whole.

### 5.7 Generators (Phase 8)

`render/generators.ts`, `render/geometry.ts`. Each generator makes ordinary filled shapes from a few numbers (seeded, so the same every time) and draws them in one colour, so every effect and style works on the result: a bevel on plates bevels each plate, a glow on cracks makes them burn.

| Layer | What it makes |
|---|---|
| **Growth** (`growth`) | A stem along its track (the band at `at`, or a followed path or line): wavy (waves fitted to the band) and gnarled by smooth noise; branches every so often (`branching`) that turn `branchAngle` from the stem, curl, taper and fork again (`depth` levels); leaves (Token Maker's Druid leaf), thorns or berries along the stem on alternate sides. Kinds are starting points: vine, roots, thorny stem, curling tendrils (curl tightening into spirals), antlers (beams growing outwards with tines on one side). Branches are tapered ribbons (`ribbon`); an even closed stem is one stroke. |
| **Cracks and lightning** (`fracture`) | Cracks: random walks from seeded points across the band, jagged, forking, tapering, stopping at the edge of their part of the band. Lightning: bolts running round the band, zigzagging across it and forking. Set the layer to cut a hole to break the band, or clip it to plates. |
| **Plates and cells** (`cells`) | The band between `from` and `to` divided into separate plates: irregular (Voronoi: one jittered point per grid cell, each plate cut from half-planes, wrapping round the ring), honeycomb, bricks, tiles or overlapping scales. Cells are made flat (along × across) so they wrap seamlessly, inset by half the gap, then laid on the band corner by corner (each side cut into short pieces so it bends with the band) and rounded. Pieces can be left out (`missing`) and vary in shade. |
| **Knotwork** (`knotwork`) | Two strands swinging across the track in opposite phase, waves fitted to the band, with real over/under crossings: at each crossing one strand stops short on both sides of the other (the gap worked out from the crossing angle), taking turns, so every strand goes over, under, over… Outline, shine, double strands, swap over/under. |
| **Gears** (`gears`) | Gears round the band or along a path: teeth (square or pointed), tooth depth, a rim with spokes and a hub or a solid wheel, a domed boss lit like a bead, an axle hole; every other one another size and turned half a tooth so neighbours look meshed. |
| **Chain** (`chain`) | Links fitted to the track (an even number on a closed one), face-on rings and edge-on bars in turn; each ring's trailing half is drawn over the bar before it, so they interlock. |

- **Distortion** (effect): every pixel moves by smooth noise (`amount`, `scale` in band widths), sampled between pixels premultiplied so edges don't fringe: wobbly edges, irregular stone, a shimmer.
- **Scratches** (wear): seeded thin bright lines with a dark edge beside them, on painted pixels only.
- Picking a generator on the canvas: plates and cracks by their part of the band; the others within their reach of their track. The selection outline shows that reach.

### 5.8 Masks, shared height, combining and sides (Phase 9)

`render/renderProject.ts` (`masked`, `sharedHeight`, `combine`), `render/effects.ts` (`extrude`, `offset`, `showMaps`).

- **Masks:** a layer with a `mask` is shown only through another layer's picture (with its effects): its shape (alpha) or its brightness (luminance), inverted or not. The mask layer can be hidden. The mask is applied when the layer is composited, so the layer's cached picture is kept as it is; a layer clipped to the one below can be masked too.
- **Shared height map:** a layer in a group can **raise** or **carve** (`heightMode`): its own shape, through a rounded slope `heightSize` band widths wide, `heightDepth` high, is added to (or taken from) the height map of every bevel on its group (the bevel's own map is made from the group's whole shape, as in §5.4). So runes carved through a raised plate are lit as one surface: the plate's bevel slopes down into each rune and the edges facing the light are lit, the far ones shaded. A raising or carving layer at 0 % opacity shapes the surface without painting. Heights only matter to a bevel on the group; without one nothing changes.
- **Views** (`renderProject(…, { view })`): `height` draws every bevel as its height map (grey, lighter higher, mid-grey flat) and `normals` as its normal map (RGB = x, y, z), in place of its lighting; the rest of the picture is drawn as usual. The editor's **Show** menu (Advanced, under the canvas) switches between them; exports always draw the picture.
- **Sides** (`extrude` effect): the picture is pushed back away from the light a pixel at a time, each step darker, and put behind it, so plates look thick.
- **Grow or shrink** (`offset` effect): grows the shape by the distance from its edge (new pixels take their neighbours' colours) or shrinks it.
- **Combining shapes** (`group.combine`): the group draws its first layer, then each layer above added to it (union), cut out of it (subtract), overlapping it (intersect) or excluded from it (exclude), with canvas compositing, so the result is exact at every size; effects on the group follow the combined shape. Pixels rather than polygon booleans: robust for every layer kind (text, generators, Token Maker frames), at the cost of not producing an editable path.
- **Strokes:** a path with `stroke` > 0 is drawn as a filled ribbon round its line, `stroke` times its height wide, narrowing over `taperStart` and `taperEnd` of its length, in its fill colour, so effects see a shape (brush strokes, blades, tendrils). **Turn into a path** makes a shape layer a path with the same outline.

### 5.9 The lighting rig (Phase 10)

`stage.lights`, `ambient`, `ambientStrength`, `bloom`, `bleed`; `render/effects.ts` (`bevel`, `lightPass`).

- **More lights** (up to three besides the light dial): each has a direction, a colour, a strength and a height. They light every **bevel**: where a bevel's surface faces one more than a flat surface would, it is tinted towards that light's colour, so a low cold light from behind gives a rim light and a warm one from the side a fill. Paints, facets and element shading keep to the main light (Token Maker's lighting); the 2.5D surfaces are where colour light matters.
- **Ambient colour:** the colour shaded sides of bevels take on, by `ambientStrength`, instead of each bevel's own shaded colour.
- **Bloom** and **light bleeding** work on the whole design after its layers are composited (it is drawn on its own canvas first): bloom blurs the brightest parts (lightness over 60 %) and adds them like light (screen); bleeding blurs bright, vivid colours wider and adds them, so a glowing gem tints the metal round it. Sizes in band widths. A design with neither is drawn exactly as before.
- Pictures with effects are cached with the rig in their key, so changing a light redraws only bevelled layers.

## 6. The editor

`src/App.tsx` + `src/ui/`. Desktop layout from 960 px wide (narrower screens: §6.3):

- **Top bar:** name (click to rename), New (template picker: laid out like Token Maker's "Choose a frame" gallery, with a search, Token Maker's tags to filter by, and a tab per group — All frames in Token Maker's ranking, each category, and Editable layers — plus a Blank project button), Open, Save (`.framemaker.json`), **Export** (below), Undo/Redo, **Basic / Advanced** switch, **Help** (the welcome card).
- **Layers panel (left):** top of the stack first; a group's layers sit indented under it and the group folds open and shut. Click to select; **Ctrl+click** adds a layer to the selection and **Shift+click** selects a run; eye = show/hide; padlock = lock; double-click or F2 to rename; drag, Alt+↑/↓ or the arrow buttons to reorder (at the top or bottom of a group, moving steps out of it; dropping on the lower half of a group's row puts the layer in it); **Group** (Ctrl+G) puts the selected layers in a new group where the top-most of them was; **Ungroup** (Ctrl+Shift+G); Duplicate (Ctrl+D, a group with everything in it); **Copy** (Ctrl+C; §6.2); **Add to library** (§6.1); Delete (Del). **Add layer** offers Band fill, Line, Repeated shapes, Shape, Path, Group, **Texture…** (the texture library), Token Maker frame… (as editable layers or the original), **From your library…** and **Paste layers**. The books button beside it opens **Your library**.
- **Canvas (middle):** live preview on a checkerboard. Click picks the top-most layer under the pointer (inside groups too). Dragging a line, band fill or repeat moves it across the band; dragging a repeat round the token slides its elements along. Dragging a shape or path moves it (round the band, or anywhere when placed freely). A selected shape or path shows its box, a **square resize handle** (bottom right) and a **round turn handle** beyond the box (Shift snaps to 15°); the turn handle moves to the inner side when the outer side would be off the picture. A drag is one undo step. Below it: token shape, band thickness, the **light dial**, show sample picture (Advanced: outer spacing, backing colour).
- **Drawing a path:** Add layer → Path starts drawing. Each click adds a point (the first click places the path on the band); click the first point or press Enter to finish (the path is then closed), Escape to stop without closing. When drawing ends the path's anchor moves to the middle of what was drawn, so it turns and resizes about its centre. **Edit points** (Properties) shows the points (squares) and curve handles (circles): drag them; double-click a point to make it smooth or sharp; Delete removes the chosen point; **Add points** carries on drawing.
- **Light dial:** drag the sun round, or focus it and use the arrow keys (Shift = 15° steps); the reset button returns it to the top left.
- **Properties panel (right):** controls for the selected layer's type. Basic shows the common ones (for a Token Maker frame with a converter, **Turn into editable layers**; for repeats, **Shaded by the light** and a **Patterns** section: which ones to show (a row of on/off switches), alternate colours and sizes, alternate sides; for lines, **Wavy**; for shapes and paths: fill, shading, outline, mirror, raised, **Place freely**; for textures: kind, colour(s), how many, size, strength, where, variation with a shuffle button, start and end across the band; for the ring paint: a ring preview and each colour with its angle, "Turn with the light"; for shapes and paths, **Cut into facets** with the flat top and facet depth). Under them, for every layer, **Opacity and blend mode** (version 11: opacity, blend mode and **Cut a hole in the layers below**, the knockout, which hides the blend mode while it is on) and the **Effects** section (§6.4). Advanced adds **clip**, outline, glow, "bigger one every…" and "leave gaps beside the bigger ones", rune/note pattern, gradient stop positions and opacities, "Turn with the light" for gradients across the token, highlight/shade amounts and the **highlight colour** of metal paints, the **numeric position, size, stretch and rotation** of shapes and paths, and **Project data** (the JSON, editable and checked like an opened file).
- **Template picker:** Blank; **Token Maker's frames** — every built-in design Token Maker lists (the kept starting designs, Crafted borders and themed borders, and the frame review's versions), filed under broad categories (`frameCategories.ts`); the Token Maker frames that convert into editable layers (marked *Editable*; hovering shows any small difference from the original); and the Token Maker frames as the originals, by category, with live thumbnails. Also used to add a Token Maker frame to a project, as a group of editable layers or as the original.
- **Texture library:** the 11 texture presets as tiles drawn by the renderer on a thick band; "Also add a matching band colour under it" (on by default when the project is empty) adds a lit band fill and the texture as one undo step.
- **Export** (top bar, Phase 5): a picture (PNG) at 256–2048 px or **any size from 16 to 4096 px**, with the middle see-through or the sample picture; a **sheet of the design on every token shape** (five pictures side by side, each up to 1024 px, 1/16 of a picture apart, see-through); or the **project file with a preview picture** (§4.8). All drawn by `renderProject`.
- **Help:** every control has a help tip, one plain sentence (`ui/help.ts`, or a control's own `hint`): a small "?" beside its label shows it when pointed at, tapped or focused, and screen readers hear it as the control's description (`aria-describedby`). A test opens every kind of layer and paint in Advanced mode, the stage bar and the export menu, and fails on any control without one. The **welcome card** shows on a first visit (remembered in localStorage, `frame-maker:welcomed`) and again from the **Help** button in the top bar; it doesn't block the editor.

### 6.4 Effects and the style library (Phase 6)

`ui/EffectsPanel.tsx`, `ui/StyleDialog.tsx`, `project/styles.ts`, `project/effectDefaults.ts`.

- **Effects** (in Properties, in Basic mode too, for every layer and group): **Styles…**, **Copy effects**, **Paste effects** and **Add an effect** (a new effect is set up to look good straight away, `NEW_EFFECT`). Each effect has a switch with its name (off keeps its settings but doesn't draw it), buttons to apply it earlier or later and to remove it, and its settings: the common ones in Basic, the technical ones (a bevel's softening, light height and its lit and shaded colours and strengths; a material's colour positions) in Advanced. Every edit is one undo step; a slider drag is one step. A layer with effects says "· effects" in the layer list.
- **Styles…** opens the style library: 26 styles in six groups (Metal: polished gold, silver, hammered bronze, blackened iron, brushed steel, verdigris copper; Stone and bone: carved stone, cracked flagstone, obsidian, ancient bone, dragon scales; Crystal: glossy gem, amethyst, ice; Carving: engraved, embossed, stepped rim, coin rim; Magic: arcane, hellfire, holy radiance, necrotic, frost; Finish: soft shadow, raised, aged and worn). Each tile is **your design with the selected layer in that style**, drawn by the renderer on a thicker band, so you choose by seeing it. Picking one gives every picked layer the style's effects (each its own copy), replacing theirs or, with "Add to its effects instead of replacing them", after them; one undo step. A style is only effects, so after picking one each effect is ordinary and can be changed, switched off or removed.
- **Copy effects / Paste effects:** copies the selected layer's effects and gives them to every picked layer (Ctrl+click to pick several), in place of their own, one undo step.
- Metal and stone styles are a bevel followed by a material colour, so they work on any colour; crystal, magic and carving styles keep the layer's colour.
- `npm run effects-sheet -- out.png [size] [shape]` draws every style and every effects template on one picture.

### 6.1 The layer library (Phase 5)

`src/state/library.ts`, `src/ui/LibraryDialog.tsx`. Pick a layer or group (or several) and press **Add to library** (the bookmark under the layer list). **Your library** (the books button over the list, or Add layer → From your library…) shows every item as a tile drawn by the renderer on a thick plain band; clicking one adds its layers just above the selected layer, as one undo step, with new ids. Items can be renamed, removed and exported one at a time; **Export all** downloads a library file and **Import…** adds the items of a library file, a file of copied layers or a project file. The library is kept in this browser's IndexedDB (`frame-maker:library`, each item stored as the text of a layers file, so it is migrated when Frame Maker is updated).

### 6.2 Copy, cut and paste (Phase 5)

`src/state/clipboard.ts`. **Ctrl+C / Ctrl+X / Ctrl+V** (when not typing in a box), the **Copy** button under the layer list and **Add layer → Paste layers**. Copied layers (the picked ones, bottom first; a picked group brings its layers) go on the system clipboard as the text of a layers file, so they reach another tab, another browser window or even another browser, and into localStorage (`frame-maker:clipboard`), which every Frame Maker tab of the browser shares, for when the clipboard can't be read without asking (the Paste menu item). Pasting puts them above the selected layer with new ids, as one undo step; other text on the clipboard is left alone. Cut leaves locked layers where they are.

### 6.3 Phones, touch and the keyboard (Phase 5)

- **Narrow screens** (under 960 px): the canvas fills the top, the stage bar scrolls sideways under it, and the panels move into a **bottom sheet** with **Layers / Properties** tabs. Top-bar buttons show only their icons (their names are still read out).
- **Touch:** every target is at least **44 px** on a touch screen (`pointer: coarse`, as in Token Maker); help "?" marks are 24 px. The canvas takes every finger movement (`touch-action: none`), and handles and path points are easier to catch with a finger (20 px instead of 9); on a small shape a handle only wins when the finger is nearer to it than to the shape's centre, so a fingertip on the shape moves it.
- **Keyboard:** the layer list is a tree: ↑/↓, Home/End move the selection (Shift adds), →/← open and fold groups, Space/Enter pick, F2 renames, Alt+↑/↓ reorder; only the picked row is in the tab order. Menus take the focus, move with the arrows and close with Escape (giving the focus back); radio groups (Basic/Advanced, token shape) move with the arrows; the export menu closes with Escape. The **canvas** can be focused: the arrow keys move the selected layer (Shift for bigger steps), each press one undo step. When the focused row is deleted or cut, the focus moves to the row picked in its place.
- **Accessibility checks:** the Playwright tests run **axe** (WCAG 2.1 A/AA and best practice) on the editor in Basic and Advanced, the Add layer menu, the export menu, the template picker, the library and the welcome card, on desktop and on a phone, and fail on any serious or critical problem.

### 6.5 Ornaments anywhere (Phase 7)

- **Repeated shapes:** **Follow** picks the band or any path or line layer (by name); when following, **Facing** (along the path or upright) replaces the position across the band. **Patterns** has **Size at the end**; **Random variation** has vary the size, vary the angle, leave some out and the variation number with a shuffle button. For cut gems, **Gem cut** (cut, facets, table, crown height, sparkle). **Setting** (any element): no setting, bezel, four or six claws, its colour and **Setting style** (gold, silver, bronze, iron, steel, verdigris or plain); in Advanced, the setting's own effect list.
- **Shapes and paths:** a **Radial array** section: copies round a point, distance from the middle, start angle, mirror every other copy. The handles stay on the first copy (moving drags the whole array; turning turns it).
- **Add layer → Text** and **Contours**. Text has the words, font, colour, letter height and spacing, Follow, position across, round the token, line up (centred or starting there), read the other way, outline.
- Template: **Royal inscription** (gold, engraved contour lines and inscription, rubies in gold claw settings following a hidden wavy line).
- A hidden layer's row in the list is muted and slanted rather than half see-through, so it stays readable (an axe finding).

### 6.6 Generators (Phase 8)

- **Add layer** offers Growth, Plates and cells, Cracks and lightning, Knotwork, Gears and Chain. Each has its settings in Properties with a help tip, Follow where it runs along a track, and a variation number with a shuffle button where it is seeded. Growth's **Kind** applies that kind's starting settings.
- **Effects:** Distortion (amount, wobble size, variation); Wear and grime has Scratches. Lines have **Fit the waves to the band** with a wave length.
- **Templates:** Overgrown ruin (stone plates with missing pieces and cracks, a verdigris knotwork band, roots and a creeper, only generators and styles). Druid, Knotwork, Artificer and Barbarian are now Token Maker frames that convert into editable layers (§4.7).

### 6.7 Precise control (Phase 9)

- **Advanced: layer** has **Mask** (no mask or any other layer), **Mask by** (shape or brightness), **Invert the mask**, and **Shared height** (not part of it, raised, carved in) with its depth and slope.
- **Groups:** **Combine shapes**; **turn round the token** 15° either way (band positions slide round, free shapes move round the centre; `turnLayer` in `hitTest.ts`); dragging any of a picked group's layers on the canvas moves the whole group (each layer moves as if it were dragged).
- **Paths:** **Stroke to shape** with tapers; for a smooth point, **Separate handles** / **Join handles**, and holding **Alt** while dragging a handle separates them. **Shapes:** **Turn into a path**.
- **Effects:** Sides (extrude), Grow or shrink.
- **Zoom and pan:** zoom buttons under the canvas (100 %–800 %, or Ctrl + mouse wheel); zoomed in, the mouse wheel or dragging the empty canvas moves about. The canvas is scaled and drawn sharper to match (up to 4096 px); picking, handles and drawing keep working, since points are measured on the scaled canvas.
- **Show** (Advanced): the picture, the height map or the normal map.
- Template: **Rune-carved plates** (bronze plates with sides, runes carved through them in one height map).

### 6.8 Workflow (Phase 10)

`project/variation.ts`, `ui/WorkflowDialogs.tsx`, `state/styles.ts`, `io/zip.ts`.

- **Variations** (top bar): six versions of the design drawn by the renderer, each with new seeds (textures, generators, wear, random variation), its colours turned round the colour wheel together (one turn for the whole design plus a little each, saturation and lightness nudged, greys only lighter or darker) and its sizes, widths and counts nudged, all within **How different**; switches choose which. **Locked layers** (and everything in a locked group) stay exactly as they are, as do ids, names, order and the stage; every result goes through the file checker, so numbers stay in their ranges. Picking one is one undo step; **More variations** draws six others. In Effects, **Vary the style** does the same to one layer's effects.
- **Theme** (top bar): recolours the design from a **theme colour** and, optionally, an **accent colour**. Every colour (Token Maker frame layers and converted frames included) is turned round the colour wheel so the design's average hue (weighted by how colourful each colour is) becomes the theme's, and its colourfulness scaled to the theme's, keeping each colour's lightness, so metal stays metal and shadows stay dark; greys stay grey. With an accent, the colours are split into two families by hue (a few rounds of 2-means on the colour wheel; the family with more colour is the main one) and each follows its own colour. One undo step; locked layers stay. This fixes the old limitation that a converted frame's colours didn't follow a change of the band's colour.
- **Your own styles:** **Save as a style** in Effects keeps the layer's effects under a name in this browser (IndexedDB, `frame-maker:styles`); they appear first in the style library (**Your styles**, with a remove button), are written into library files by **Export all**, and come in with **Import…**.
- **Lighting…** (over the canvas): the rig of §5.9.
- **Export → Token pack:** one ZIP (a small stored-zip writer, no new dependency) with the design on all five token shapes at the chosen sizes (128–1024 px), see-through and, optionally, with the sample picture, plus its project file, in a folder named after the design.

### 6.9 Themed borders (after Phase 10)

`project/themedTemplates.ts`. New has a **Themed borders** section: 21 designs in the styles popular for tabletop tokens (metal and enamel rings, wreaths and fey borders, gothic frames, elemental rings for fire, frost and storm, necrotic, clockwork, Celtic knotwork, scales, stone, nautical, celestial, desert, crystal), built only from ordinary layers, generators and styles, so every part is editable. A few carry their own lighting rig (`stage` patch: bloom, bleed, extra lights, ambient), applied on top of the default stage when they are opened (`themedProject`). A test opens each one, checks it survives a file round trip without warnings, and draws it on every shape. Template pictures are drawn one at a time, only once their tile scrolls into view (`ui/Thumbnail.tsx`), so the picker stays responsive with many tiles.

Undo/redo works on the structured project (token-maker's `history.ts`): every edit is one step; a slider, colour-picker, handle or point drag is one step. Loading a project starts a fresh history.

Autosave: the project's JSON is written to IndexedDB (`frame-maker:project`) 0.4 s after each change and restored on the next visit. First visit opens Token Maker's Stamped frame.

## 7. Quality rules

- Read this file first; update it and `README.md` when something changes.
- Never edit `src/engine/legacy/`; sync from Token Maker instead.
- One renderer for preview and export. Keep it pure and pixel-tested.
- Don't present a Token Maker frame as editable parts until it really is converted. Every converter has a limit in `convert.test.ts` and a row in §4.7.
- Every new layer type: type + defaults + checker in `migrate.ts` + painter + properties + hit test + tests.
- Every new effect: type + defaults (`effectDefaults.ts`) + checker in `migrate.ts` + painter in `effects.ts` (pixels only, sizes in band widths, lit from `stage.light`) + controls with help + tests.
- Every new schema version: a migration, and version-1 (and later) fixture files that must still open and draw the same.
- Don't claim tests passed without running them. Run `npm test`, `npm run e2e`, `npm run typecheck`, `npm run lint`, `npm run build` before a PR.
- Plain-English summaries and Windows PowerShell commands for the owner.
- Progress screenshots: `npm run screenshots` (with `npm run dev` running) writes `docs/screenshots/`.

## 8. Roadmap



| Phase | Goal |
|---|---|
| 1 | Foundation: templates, the format, the first layer types, layers panel, properties, undo, save/open, PNG, autosave **(done)** |
| 2 | Drawing tools: shapes and editable paths (adaptable by default, free placement optional), groups, clipping, transforms, mirroring, more elements, alternating patterns, wavy lines, direct handles on the canvas; the light-direction control **(done)** |
| 3 | Procedural layers: marble, hammered metal, battle wear, wood grain, stone blocks, scatter (stars), rope, scales, cracks; the colour-around-the-ring paint; per-layer caching; texture library **(done)** |
| 4 | Converting Token Maker frames into editable layers, with visual comparison tests: 18 frames, starting with Polished and Paladin **(done)** |
| 5 | Polish and sharing: a personal layer library, copy/paste between projects, touch support, export options, help tips, Token Maker opening `.framemaker.json` files **(done)** |
| 6 | Surfaces and effects: the 2.5D bevel and surfaces lit by the light, shadows, glows, material colours, colour adjust, wear; faceted shapes and gems; more blend modes and a knockout; the style library; templates made with effects **(done)** |
| 7 | Ornaments anywhere: repeat along a path, radial arrays, gem cuts and settings, text on a path, contours **(done)** |
| 8 | Generators: organic growth, cracks and lightning as geometry, plates and cells, knotwork, gears and chains, distortion **(done)** |
| 9 | Precise control: masks, height compositing, boolean geometry, editing (in/out handles, groups on the canvas, zoom) **(done)** |
| 10 | Workflow: randomise, your own styles, a theme colour, a lighting rig, batch export **(done)**; more shapes with Token Maker (waiting, §9) |
| (10) | Brought over from the Phase 6–7 branch (§4.11): the last four conversions, more ornaments and textures, game-icons ornaments, photo textures, paint fills, reset buttons **(done, schema version 10)** |

## 9. Owner answers and open questions

**Answered after Phase 1** (recorded in §2):

1. **Light direction:** add a light-direction control; the default is the top left, as in Token Maker.
   - It is a project setting (`stage.light`, degrees the light comes from: 0 right, 90 below, 225 top left), added in schema version 2 with a migration that gives older projects 225°.
   - It drives everything Frame Maker's own code lights: the `lit` paint, shaded beads and element gradients, and the direction of raised shadows.
   - Token Maker frames (legacy layers) are lit from the top left inside the copied engine, which must not be edited. They stay top-left lit unless converted into editable layers (Phase 4, §4.7); the Properties panel says so when the light is moved.
2. **Using designs in Token Maker:** Token Maker opens `.framemaker.json` project files.
   - Token Maker needs Frame Maker's project reader and renderer (`src/project/`, `src/render/`). Phase 5 decides how they are shared (copied with a manifest like the engine, or a shared package), keeping one renderer so the frame looks the same in both.
   - In Token Maker the design becomes a third frame kind beside "drawn" and "picture", with its band following Token Maker's thickness and spacing.
3. **Free shapes and paths:** adaptable by default.
   - A new shape or path is anchored at a point round the band (an angle round the token and an across position) and sized in band widths, so it follows every shape and thickness.
   - "Place freely" (token units, ignoring the band) is an option per layer, for artwork that should not move with the band.

**Decided while building Phase 2** (sensible defaults within the owner's answers; say if any should change):

1. **Groups are nested in the file** (a group layer holds its `children`), not a flat list with parent ids, so a saved group reads like the layer list looks.
2. **Clipping** is per layer: to the band, or to the layer below (like a Photoshop clipping mask).
3. **Path points are sharp or smooth** (one symmetrical handle). Separate in/out handles can come later without breaking files.
4. **Free placement** measures position and size in fractions of the token's half-size (the same unit as the stage's thickness).

**Decided while building Phase 3** (sensible defaults; say if any should change):

1. **Textures are re-implemented, not imported.** The engine's texture functions aren't exported and can't be edited, so `render/textures.ts` re-implements them; a test proves each is pixel for pixel the original at its defaults, so Phase 4 conversions can match exactly.
2. **"1 = Token Maker"** for amount, size and strength, so numbers read the same across kinds. Hammered metal's 100 % is Magma's density; Fighter's is 50 %.
3. **Textures follow the light** where the original is lit (hammered, wear, stone pitting, rope, marble's side). At the top left they are identical to Token Maker.
4. **"Where" for textures other than marble fades them** towards one side, rather than leaving marks out, so the arrangement doesn't change when switching.
5. **The ring paint turns with the light by default**, since Stamped's colours are lighting; it can be switched off for decorative colour rings.
6. **Every layer is cached**, not only heavy ones, so editing any layer redraws only it. The cost is a few 255ths of rounding in old designs' edge pixels (§4.3).

**Decided while building Phase 4** (sensible defaults; say if any should change):

1. **Converted frames use Frame Maker's own elements** (crosses, beads, runes…) rather than copies of each frame's ornament code, so every part stays an ordinary, editable layer and follows the light. The build, grooves and textures match the originals almost exactly; ornaments look the same but differ in fine detail (§4.7).
2. **Only what was needed was added to the format** (§4.1): a lit paint's highlight colour, see-through gradient colours, gradients that turn with the light, flat repeats and an on/off pattern. Each is off by default.
3. **A converted frame is a group** when it replaces a layer (keeping that layer's name, opacity, blend and clip), and a flat list of layers when it starts a new project.
4. **Frames that would look noticeably different stay unconverted** (Stamped, Ranger, Bard, Warlock, Barbarian, Artificer, Druid, Knotwork) rather than being offered as poor copies.

**Decided while building Phase 5** (sensible defaults; say if any should change):

1. **Token Maker gets Frame Maker's code by copy with a manifest** (§10), not a shared package: it is the pattern already used for the engine, it needs no package publishing, and a test on each side catches edits to the copies. One renderer, as the owner asked.
2. **A design is drawn on Token Maker's band** (its thickness and spacing), on the token's shape, lit from the design's own light.
3. **The library is per browser** (IndexedDB), with library files to move it, like the autosave; nothing is uploaded.
4. **Copied layers are plain text on the clipboard**, so pasting needs no permission prompt; a shared copy in localStorage covers the cases where the clipboard can't be read.
5. **The layer list became a tree** (it was a list box), the right pattern for nested layers with buttons in each row, which the accessibility checks asked for.

**Decided while building Phase 6** (sensible defaults within the owner's brief; say if any should change):

1. **Effects work on pixels, not geometry**, so one system serves every layer kind (and Token Maker frames and groups) and combining them is free. The cost is time per pixel; it is cached per layer, wide blurs work on a smaller copy, and the high-density preview is sharpened after editing pauses.
2. **Effect order is the user's.** Styles set a sensible order (wear → bevel → material colour → glows → shadow) and the arrows change it, so unusual orders stay possible.
3. **Light height is per bevel** (in Advanced), while the direction stays the stage's one light; a fuller lighting rig (several lights, colours) is Phase 10.
4. **Metals are a bevel plus a gradient map**, so "gold" works whatever colour the layer was and the shine and shading stay coherent.
5. **The knockout is a switch, not a blend mode in the list**, as the brief asks: cutting is geometric, blending is about colour.
6. **A mask from a clipped layer ignores the base's effects**, so a shadow or glow on the base doesn't let a clipped texture spill out.
7. **Token Maker needs its copy updated** (`npm run share:export`) to open version-5 files; this build didn't have the token-maker repository, so it is the first step before sharing new designs (`ROADMAP.md`).

**Decided while building Phase 7** (sensible defaults within the brief; say if any should change):

1. **A repeat follows another layer by reference**, not a path of its own, so the path is drawn and edited with the existing tools, can be hidden as a guide, and several layers can follow one path. A wavy line is a ready-made "path" all the way round.
2. **Gem cuts and settings are options of the repeat**, not a new layer, so a ring of set gems is one layer that can follow a path; the setting's metal is a separate effect list on the same layer.
3. **Text uses Frame Maker's own fonts plus stroke-drawn runes**, so it draws the same in the editor, the export, node and Token Maker; no font files are taken from the user's computer.
4. **A radial array is a setting of shapes and paths** (like mirroring), round the layer's own anchor, so it works on the band and placed freely.

**Decided while building Phase 8** (sensible defaults within the brief; say if any should change):

1. **Generators are layers of their own** (growth, cracks and lightning, plates, knotwork, gears, chains), each drawing filled shapes in one colour, so styles and effects give them their material; nothing about effects had to change.
2. **Knotwork really interlaces**: the under strand stops short at each crossing. Token Maker's Knotwork lays one strand over the other; the conversion is the interlaced version, measured and limited like the others.
3. **Cells are laid on the band by share of the way round**, so a pattern fits every shape and thickness and wraps without a seam; plates stay convex so the gap is an exact inset.
4. **Missing fragments are plates left out**, and cracks can be clipped to the plates or cut through the band with the existing knockout, rather than a separate "break" setting.

**Decided while building Phase 9** (sensible defaults within the brief; say if any should change):

1. **Shared height belongs to a group:** layers raise or carve into their group's surface, which the group's bevel lights. A group already is "one sculpted piece" for effects (Phase 6), so this extends it without a new kind of layer.
2. **Boolean geometry is done with pixels** (a group's combine mode), not polygon clipping: exact, live and robust for every layer kind, and effects follow it. The result isn't an editable path; shapes can be turned into paths, and paths can be stroked into shapes.
3. **Masks use the source's finished picture** (with its effects), so a glowing layer masks with its glow; a clip to the layer below still ignores the base's effects (Phase 6).
4. **Moving a group moves each of its layers** in its own terms (round the band, across it, or freely), so the group stays band-relative on every shape; turning a group slides it round the token.
5. **Zoom scales the canvas** and draws it sharper, rather than drawing part of the picture, so the cache and the one renderer are unchanged.

**Decided while building Phase 10** (sensible defaults within the brief; say if any should change):

1. **The padlock is the lock for randomising and recolouring**: a locked layer (or group) is left exactly as it is, so no second kind of lock is needed.
2. **Variations turn all the colours together** (with only a little each on their own), so a variation stays in harmony instead of becoming random colours.
3. **A theme keeps every colour's lightness**, changing only hue and colourfulness, so materials, shading and contrast survive recolouring.
4. **Extra lights light the 2.5D surfaces (bevels) only**; paints and facets keep Token Maker's single light, so converted frames still match the originals.
5. **More token shapes (octagon, triangle, shield) are not built yet.** The shapes live in Token Maker's engine, which Frame Maker copies and must not edit, and a design must draw the same in both apps; they need a change in the token-maker repository first, then `npm run engine:sync`. **Open question for the owner:** should that change be made in token-maker (and its copy of Frame Maker's code updated with `npm run share:export` at the same time)?

**Answered before Phase 5:** "looks the same" is good enough for converted frames (they don't have to be exact copies). The limits in §4.7 stay as they are and the originals stay available beside the editable versions.

**Still open:** the Phase 10 question above (new token shapes and updating Token Maker).

**Decided while bringing over the Phase 6–7 branch (version 10)** (sensible defaults; say if any should change):

1. **Where both versions built the same thing, the one already in use stayed** (fitted waves, random size and angle, the faceted gem, gear tooth and claw gashes), so no design changes; the branch's extras (wandering, a second colour, wave shapes…) were added to it.
2. **Photos are bundled, not fetched from the sites,** 512 px (about 1.2 MB in all) and loaded only when used, so the editor starts as fast as before and works offline.
3. **A paint fill runs across the token by default** (one paint, each ornament showing its part); "each on its own" is a switch.
4. **Reset goes back to a new layer's value,** not to the value a template or conversion started with.
5. **Files saved by the unmerged branch's own formats 5 and 6 aren't read as such:** they would be taken for this line's formats 5 and 6 and lose the branch's new settings. The branch was never merged into main.

## 10. Using designs in Token Maker (Phase 5)

The owner's answer: Token Maker opens `.framemaker.json` project files, as a third frame kind beside drawn frames and picture frames.

**How the code is shared: copied with a manifest.** `npm run share:export -- ../token-maker` copies `src/project/`, `src/render/` and `src/share/` (not the tests) into token-maker's `src/frameMaker/`, changing only the imports of the engine copy (`../engine/legacy/x` → `../../render/x`, the token-maker files it was copied from), and writes `src/frameMaker/SOURCE.json` with this repository's commit and each file's SHA-256. `npm run share:check -- ../token-maker` reports what differs. `scripts/share-bundle.test.ts` checks that every import of every copied file resolves inside the copy or to one of token-maker's `src/render/` files, and that no editor code (state, UI, React) comes along; the copy was also type-checked in a folder laid out like token-maker. Token Maker never edits these files; it changes Frame Maker and exports again, just as Frame Maker syncs the engine (§3).

**What Token Maker calls** (`src/share/frameDesign.ts`):

- `readFrameDesign(textOrObject)`: reads any version of the file (its text, or the object a Token Maker document keeps) with every check of §4.3 (nothing in it is run).
- `drawFrameDesign(ctx, project, g)`: draws the design as a frame on Token Maker's band — the same `FrameGeometry` its `drawFrame` takes (origin at the token's centre, `R`, `outer`, `inner` in pixels) — on the token's shape, lit from the design's light, without clearing what is under it. `src/share/frameDesign.test.ts` checks that this is **the very same picture** Frame Maker draws for that band, on every shape, on a thin and a thick band, for three designs; the Phase 5 end-to-end test exports a project file from the editor, reads it and draws it this way, and compares it with the editor's own PNG export (mean difference 0.22/255; the browser and the test draw with different engines).
- `previewOf(text)`: the preview picture saved in the file (§4.8), for Token Maker's tile.
- `loadFrameDesignPictures(design)`: loads the photo textures a design uses (§4.11); Token Maker awaits it before drawing a design, so its picture never has a photo's stand-in colour.
- Effects (Phase 6) are part of the shared renderer (`render/effects.ts`, `render/facets.ts`, `project/styles.ts`, `project/effectDefaults.ts` are in the bundle), so Token Maker draws them exactly as Frame Maker does. Token Maker's copy was exported again at 0.10.0 (Phases 6–10 and the themed borders) and again for format 10 (§4.11), so it reads every format this version writes; token-maker's `src/render/designFrames.test.ts` draws every themed border in both apps and checks they match. A file newer than the copy is refused with a plain message, so export again after a format change.

**The Token Maker side** (built; token-maker's `docs/DESIGN.md` §6.12):

- `src/frameMaker/` in token-maker is the copy, with `SOURCE.json` and a test there that fails if a copy is edited (`src/frameMaker/frameMaker.test.ts`).
- **Frame type → Frame Maker** (beside Drawn and Picture): **Open a Frame Maker design** reads a `.framemaker.json` file with `readFrameDesign`, keeps it in the browser (`token-maker-designs` in IndexedDB) and uses it as the frame; the designs opened before are tiles to pick again.
- The design is kept **inside the token document** (`frame.kind: 'design'`, `frame.design: { id, name, project }`, token document version 9 with a migration), so Token Maker's renderer stays a pure function of the document and undo, autosave, batch mode and shared presets carry it; a shared preset also adds its design to the other browser's designs.
- Token Maker draws it with `drawFrameDesign` on its cached frame layer, with the same geometry as a drawn frame, so the band follows its Thickness, Outer spacing and Inner spacing and the token's shape.
- **Looks the same in both apps:** token-maker's `src/render/designFrames.test.ts` draws designs saved by Frame Maker through `renderToken` and through this repository's `renderProject` on the same band, on every shape and at other thicknesses, spacings and token sizes, and they are the same picture pixel for pixel. Its Playwright test opens two designs, thickens the band, reloads and exports, on desktop, tablet and phone.
