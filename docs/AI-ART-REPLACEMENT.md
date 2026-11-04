# AI-made art to replace

Every picture, icon and pattern in Token Maker that was made by the AI (drawn by code the AI wrote, or saved from that code), so the owner can swap each one for their own. Open-licence art (the Kenney sprites and icons, the Openclipart ornaments, the museum paintings, NASA pictures, Poly Haven and ambientCG photos, and the Lucide interface icons) is **not** on this list. It is credited in `ASSETS-CREDITS.md`.

The replacement pack (`token-maker-ai-art.zip`) has:

- **`A-replace-these-files/`**: the AI-made files in `public/`. Make your own version with the **same name, size and format** and send it back. Each one is a straight swap.
- **`B-code-drawn-reference/`**: a 512 px picture of each piece of art that has no file because code draws it as the page runs. Send back a picture (PNG with a see-through background, at least 1024 px) or a Frame Maker design (`.framemaker.json`). The code then changes so the app uses yours. The Frame Maker templates also come as `.framemaker.json` files, so you can open the AI's version in Frame Maker and rework it.

How much each group matters:

- **Artwork** is what people see and pick: frames, decorations, backgrounds, the logo. Replace all of it.
- **Patterns** are procedural looks such as textures, smoke, fire and foliage. They are art too, so replace them if you want everything to be yours.
- **Tools** are geometric primitives and image filters such as a circle shape, a glow or a vignette. They are not really artwork, so keeping them is reasonable. It's your call.

## Token Maker

### Files (`A-replace-these-files/public/`)

| ✓ | What | Files | Size and format |
|---|---|---|---|
| [x] | 10 drawn backgrounds ("Drawn" group): forest, dungeon, parchment, night-sky, lava, water, tavern, snow, swamp, desert | `backgrounds/<name>.webp` + `<name>-thumb.webp` | **Done:** replaced by open-licence paintings, a NASA photo and an ambientCG texture (credited in `ASSETS-CREDITS.md`); the "Drawn" group is gone |
| [~] | 8 picture frames: gilded-laurel, iron-rivets, runestone, thorns, dragon-scales, celestial, rope, shield-rim | was `frames/<name>.webp` | **Rebuilt as Frame Maker designs** (listed under Drawn → Crafted; `src/frame-maker/project/pictureFrameTemplates.ts`). The picture files are gone, but the designs were still made by the AI: open one in Frame Maker (New → Token Maker's built-in frames), rework it and send the `.framemaker.json` back |
| [x] | "Try a sample" goblin | now `sample/true-goblin.png` | **Done:** the owner's True Goblin |
| [x] | Favicon (browser-tab icon) | `favicon.svg` | **Done:** the owner's TM ring, also the top-bar logo |

### Drawn by code (`B-code-drawn-reference/token-maker/`)

| ✓ | Group | Items | Code | Kind |
|---|---|---|---|---|
| [ ] | 25 code-drawn frames (Frame type → Classic, Textures, Classes) | Stamped, Gilded, Engraved, Arcane, Infernal, Double line, Polished · Oak, Cobblestone, Magma, Harlequin, Knotwork, Starfield · Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard, Artificer | `src/token-maker/render/catalog.ts`, `finishes.ts`, `frames.ts`, `frameKit.ts` (copied in `src/frame-maker/engine/legacy/`) | Artwork. **Best replaced by your Frame Maker designs**, which can become the built-in frame list |
| [ ] | 18 code-drawn decorations | Gem, Round gem, Crown, Star · Skull, Horn, Wing · Ribbon, Laurel, Chain, Leaf · Sword, Dagger, Shield, Staff, Bow, Holy symbol, Lute | `src/token-maker/render/decorationPainters.ts` | Artwork. Send PNGs |
| [ ] | 15 effects with drawn parts | Fire, Frost, Poison, Lightning, Necrotic, Radiant · Bloodied, Petrified, Ethereal, Frightened, Poisoned, Charmed, Unconscious · Embers, Sparkles | `src/token-maker/render/effectPainters.ts` | Patterns |
| [ ] | 4 overlay effects | Mist, Smoke, Foliage, Cobwebs | `effectPainters.ts`, `overlays.ts` | Patterns |
| [ ] | 5 filter effects | Outer glow, Inner glow, Vignette, Gradient, Edge shadow | `effectPainters.ts`, `overlays.ts` | Tools (fine to keep) |
| [ ] | 4 label shapes | Banner, Plaque, Pill, Box | `src/token-maker/render/label.ts` | Artwork (the banner especially) |
| [ ] | 8 built-in presets | Boss, Undead, Party member, Minion, Fey, Fiend, Celestial, Construct | `src/token-maker/presets/builtins.ts` | Made from the frames and decorations above. They change when those do; check them afterwards |
| [ ] | Stand-in portrait | The sky, hills and figure in frame tiles, thumbnails and sheets (Frame Maker uses it too) | `src/token-maker/render/sampleArt.ts` | Artwork |
| [ ] | 5 token shapes | Circle, Rounded, Square, Hexagon, Flat hex | `src/token-maker/render/shapes.ts` | Tools (fine to keep) |

### Interface (`B-code-drawn-reference/ui-icons/`)

| ✓ | What | Code |
|---|---|---|
| [x] | Logo in the top bar (now the owner's TM ring, same as the favicon) | `src/token-maker/layout/BrandMark.tsx` |
| [ ] | 6 label-shape picker icons | `src/token-maker/sections/LabelSection.tsx` (`ShapeIcon`) |

Every other interface icon is from Lucide (ISC licence), not the AI.

## Frame Maker (`B-code-drawn-reference/frame-maker/`)

| ✓ | Group | Items | Code | Kind |
|---|---|---|---|---|
| [ ] | 17 basic templates (`.png` + `.framemaker.json`) | Brass & beads, Glowing runes, Jewelled, Battle-worn steel, Night sky, Dwarven bronze, Eldritch crystal, Radiant gold, Hellforged iron, Royal inscription, Rune-carved plates, Overgrown ruin, Moon & stars, Frostbound, Celtic knots, Royal, Grim iron | `src/frame-maker/project/defaults.ts` (`LAYERED_TEMPLATES`) | Artwork. Replace with your own designs |
| [ ] | 21 themed borders (`.png` + `.framemaker.json`) | Enamelled gold, Worn iron ring, Rose wreath, Fey glade, Gothic thorns, Tidal ring, Archmage's sigil ring, Starship hull, Hellfire ring, Frostbound ring, Stormcaller, Necropolis, Clockwork brass, Celtic knot, Dragonscale, Mossy stone circle, Nautical rope, Autumn leaves, Celestial halo, Desert tomb, Amethyst geode | `src/frame-maker/project/themedTemplates.ts` | Artwork |
| [ ] | 7 crafted borders (`.png` + `.framemaker.json`) | Gilded filigree, Guild ring (gold), Guild ring (silver), Raven plume, Emberforged, Storm wisps, Riveted plates | `src/frame-maker/project/craftedTemplates.ts` | Artwork |
| [ ] | 26 Token Maker frames as templates | The same 26 frames as in Token Maker, opened as starting points | `src/frame-maker/engine/legacy/` and `project/convert.ts` | Artwork. Replaced with Token Maker's |
| [ ] | 43 drawn ornaments (all of them; the game-icons.net icons were removed) | Arrow, bead, Celtic knot, chevron, circle, claw gashes, claw marks, cog, crescent moon, cross, crown, crystal shard, cut gem, diamond, drop, warlock eye, eye, feather, flame, fletching, fleur-de-lis, gear tooth, gear, two-tone gem, heart, hexagonal plate, druid leaf, leaf, bard note, music note, paw print, rune, scallop shell, shield, skull, snowflake, spike, spiral, square, star, sun, tick, triangle | `src/frame-maker/render/elements.ts` | Artwork (crown, skull, fleur, eye and the like) or tools (circle, square, triangle, diamond) |
| [ ] | 35 procedural textures | Marble, Heavy marble, Hammered metal, Hide, Battle wear, Wood grain, Stone blocks, Starfield, Rope, Dragon scales, Magma cracks, Veined marble, Brushed metal, Basket weave, Chainmail, Rust, Frost, Bark, Sparkles, Gold dust, Crackle glaze, Knurled grip, Crystal facets, Ice crystal, Molten lava, Smoke and wisps, Feathers, Filigree scrolls, Mottled patina, Lichen, Water caustics, Nebula, Arcane circuitry, Bubbles, Watching eyes | `src/frame-maker/render/textures.ts`, `naturalTextures.ts` | Patterns. Can be swapped for tileable photo or painted textures |
| [ ] | Generators | Vine, roots, thorns, tendrils, antlers; cracks, lightning; contours; cells | `src/frame-maker/render/generators.ts` | Patterns or tools |
| [ ] | 18 shapes and 37 styles | Shape layer shapes (ring, crescent, teardrop…); style library (Gold, Bronze, Ruby, Hellfire…) | `render/shapeOutlines.ts`, `project/styles.ts` | Tools (fine to keep) |

## Made from the art above (redone automatically, not by hand)

These are drawn by scripts from the art above, so they update once the art is replaced:

- `public/help/*.webp`: 209 before/after help pictures. Run `npm run tm:help-images`.
- `docs/frame-maker/screenshots/`: Frame Maker's documentation screenshots. Run `npm run fm:screenshots`. They aren't on the site.
- `e2e/token-maker/fixtures/` (goblin-boss, flat-goblin, purple-ring, the AI cut-out mask) and `scripts/token-maker/make-fixture.ts`: pictures for the tests only. They are never shown to visitors.
- Frame, decoration, effect and preset tiles in the panels: drawn as the page runs.
