// Writes Frame Maker's list of the site's library pictures
// (src/frame-maker/project/libraryPictureList.ts): Token Maker's effect and
// decoration pictures that its pickers offer, plus Frame Maker's own (the
// roses), each with its average colour (drawn until it has loaded). Also makes
// the pickers' thumbnails for Frame Maker's own pictures. Run it again after
// Token Maker's picture library changes.
//   npm run fm:library-pictures
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { DECORATION_PICTURES, EFFECT_PICTURES, offeredAsDecoration, offeredAsEffect } from '../../src/token-maker/render/pictureLibrary';

type Group = 'Roses' | 'Ornaments' | 'Treasure' | 'Creatures' | 'Trims' | 'Icons' | 'Effects' | 'Textures';
interface Row {
  id: string;
  name: string;
  group: Group;
  /** Starts coloured by the layer's colour (single-colour pictures). */
  tint: boolean;
  color: string;
}

/** Frame Maker's own pictures (Openclipart CC0; ASSETS-CREDITS.md). */
const OWN: Row[] = [
  { id: 'deco-rose-bloom', name: 'Red rose', group: 'Roses', tint: false, color: '#c01020' },
  { id: 'deco-rose-shaded', name: 'Shaded rose', group: 'Roses', tint: false, color: '#c01020' },
  { id: 'deco-rose-bud', name: 'Rose bud', group: 'Roses', tint: false, color: '#a01828' },
  { id: 'deco-rose-heraldic', name: 'Heraldic rose', group: 'Roses', tint: false, color: '#c01020' },
  { id: 'deco-rose-silhouette', name: 'Rose silhouette', group: 'Roses', tint: true, color: '#a01828' },
  { id: 'deco-rose-spray', name: 'Rose spray', group: 'Roses', tint: false, color: '#c0605a' },
];

/** Effect pictures that cover an area (stone, cracks…): also offered as photo textures. */
const TEXTURES = new Set(['fx-stone', 'fx-stone-marble', 'fx-stone-weathered', 'fx-cracks', 'fx-cracks-impact', 'fx-cracks-glass', 'fx-embers-rising', 'fx-embers-spray']);

const rows: Row[] = [
  ...OWN,
  ...DECORATION_PICTURES.filter((p) => !p.retired).map((p): Row => ({
    id: p.id,
    name: p.name,
    group: p.group === 'Pictures' ? 'Icons' : p.group,
    tint: p.tint,
    color: p.color,
  })),
  ...EFFECT_PICTURES.filter((p) => offeredAsEffect(p) || offeredAsDecoration(p) || TEXTURES.has(p.id)).map((p): Row => ({
    id: p.id,
    name: p.name,
    group: TEXTURES.has(p.id) ? 'Textures' : 'Effects',
    tint: p.defaults.tint !== false,
    color: p.defaults.color,
  })),
];

const seen = new Set<string>();
const out: string[] = [];
for (const r of rows) {
  if (seen.has(r.id)) continue;
  seen.add(r.id);
  const img = await loadImage(readFileSync(`public/pictures/${r.id}.webp`));
  const c = createCanvas(8, 8);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  let [rr, gg, bb, aa] = [0, 0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    rr += d[i] * d[i + 3];
    gg += d[i + 1] * d[i + 3];
    bb += d[i + 2] * d[i + 3];
    aa += d[i + 3];
  }
  const hex = (v: number) => Math.round(v / Math.max(1, aa)).toString(16).padStart(2, '0');
  const average = `#${hex(rr)}${hex(gg)}${hex(bb)}`;
  out.push(
    `  { id: '${r.id}', name: ${JSON.stringify(r.name)}, group: '${r.group}', tint: ${r.tint}, color: '${r.color}', average: '${average}', aspect: ${+(img.width / img.height).toFixed(3)} },`,
  );
}

// Thumbnails for Frame Maker's own pictures (Token Maker's are made by tm:picture-thumbs).
for (const r of OWN) {
  const img = await loadImage(readFileSync(`public/pictures/${r.id}.webp`));
  const k = 96 / Math.max(img.width, img.height);
  const c = createCanvas(Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k)));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  writeFileSync(`public/pictures/thumbs/${r.id}.webp`, await c.encode('webp', 85));
}

writeFileSync(
  'src/frame-maker/project/libraryPictureList.ts',
  `// Made by scripts/frame-maker/library-pictures.ts (npm run fm:library-pictures); don't edit by hand.
// The site's library pictures (public/pictures/), as Frame Maker offers them.

export const LIBRARY_PICTURE_LIST = [
${out.join('\n')}
] as const;
`,
);
console.log(`Wrote ${out.length} library pictures`);
