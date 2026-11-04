// Text layers (DESIGN.md §4.10): a line of letters standing on the band, or
// on a path or line layer it follows, each turned with the track. Runes are
// drawn from strokes (an Elder Futhark alphabet, the same everywhere); the
// other fonts are the ones Frame Maker ships (Grenze, Atkinson Hyperlegible),
// which the editor loads before drawing and the tests load from their files.

import type { FrameGeometry } from '../engine/legacy/frameKit';
import type { Point } from '../engine/legacy/shapes';
import type { TextFont, TextLayer } from '../project/types';
import { bandWidthPx } from './band';
import { context2d, newCanvas, type Ctx } from './canvas';
import { findNothing, pointAlong, trackLength, tracksFor, type FindLayer } from './track';

/** The CSS font of each shipped font, for a letter `px` pixels tall (its capitals). */
export const FONT_FAMILIES: Record<Exclude<TextFont, 'runes'>, { family: string; weight: number; file?: string }> = {
  grenze: { family: 'Grenze', weight: 600 },
  atkinson: { family: 'Atkinson Hyperlegible', weight: 700 },
  babelstone: { family: 'fs-BabelStone Runic', weight: 400, file: 'babelstone-runic.ttf' },
  outerRim: { family: 'fs-Outer Rim AF', weight: 400, file: 'outer-rim-af.otf' },
  sith: { family: 'fs-Sith AF', weight: 400, file: 'sith-af.otf' },
  yugurian: { family: 'fs-Yugurian', weight: 400, file: 'yugurian.ttf' },
};

/** Where the bundled font files are served (public/fonts/). */
const fontBase = () => {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}fonts/`;
};

let registered: Promise<void> | null = null;
/** Adds the bundled font files to the page (once), so canvases can draw with them once loaded. */
export function registerBundledFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return Promise.resolve();
  registered ??= Promise.all(
    Object.values(FONT_FAMILIES)
      .filter((f) => f.file)
      .map(async (f) => {
        const face = new FontFace(f.family, `url("${fontBase()}${f.file}")`, { weight: String(f.weight) });
        (document.fonts as unknown as { add(f: FontFace): void }).add(face);
        await face.load().catch(() => {});
      }),
  ).then(() => {});
  return registered;
}

/** The fonts a design's text layers use. */
export function fontsIn(value: unknown, out = new Set<TextFont>()): Set<TextFont> {
  if (Array.isArray(value)) for (const v of value) fontsIn(v, out);
  else if (value && typeof value === 'object') {
    const o = value as { type?: unknown; font?: unknown };
    if (o.type === 'text' && typeof o.font === 'string') out.add(o.font as TextFont);
    for (const v of Object.values(value)) if (v && typeof v === 'object') fontsIn(v, out);
  }
  return out;
}

/** Loads the fonts a design's text layers use (call before drawing it; a font not loaded yet is drawn in a stand-in). */
export async function loadTextFonts(value: unknown): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const fonts = [...fontsIn(value)].filter((f): f is Exclude<TextFont, 'runes'> => f !== 'runes');
  if (!fonts.length) return;
  await registerBundledFonts();
  await Promise.all(fonts.map((f) => document.fonts.load(`${FONT_FAMILIES[f].weight} 32px "${FONT_FAMILIES[f].family}"`).catch(() => [])));
}

/** Elder Futhark in Unicode, for BabelStone Runic. */
const UNICODE_RUNES: Record<string, string> = {
  a: 'ᚨ', b: 'ᛒ', c: 'ᚲ', d: 'ᛞ', e: 'ᛖ', f: 'ᚠ', g: 'ᚷ', h: 'ᚺ', i: 'ᛁ', j: 'ᛃ', k: 'ᚲ', l: 'ᛚ', m: 'ᛗ',
  n: 'ᚾ', o: 'ᛟ', p: 'ᛈ', q: 'ᚲ', r: 'ᚱ', s: 'ᛊ', t: 'ᛏ', u: 'ᚢ', v: 'ᚹ', w: 'ᚹ', x: 'ᛉ', y: 'ᛃ', z: 'ᛉ', th: 'ᚦ', ng: 'ᛜ',
};
/** Latin letters as Unicode runes: th and ng get their own, spaces become the rune word dot, · the double dot. */
export function unicodeRunesOf(text: string): string[] {
  const out: string[] = [];
  const t = text.toLowerCase();
  for (let i = 0; i < t.length; i++) {
    const two = t.slice(i, i + 2);
    if (two === 'th' || two === 'ng') {
      out.push(UNICODE_RUNES[two]);
      i++;
    } else if (UNICODE_RUNES[t[i]]) out.push(UNICODE_RUNES[t[i]]);
    else if (t[i] === '·') out.push('᛬');
    else if (/\s/.test(t[i])) out.push('᛫');
    else if (/[0-9.,:;!?'-]/.test(t[i])) out.push(t[i]);
  }
  return out;
}
/** Capital height as a share of the font size. */
const CAP = 0.7;
export const fontCss = (font: Exclude<TextFont, 'runes'>, px: number) => `${FONT_FAMILIES[font].weight} ${px / CAP}px "${FONT_FAMILIES[font].family}"`;

type Glyph = number[][];
/**
 * Elder Futhark runes as strokes (polylines of x, y pairs), in a box 0.6 wide
 * and 1 tall centred on the origin, y down.
 */
const R: Record<string, Glyph> = {
  f: [[0, -0.5, 0, 0.5], [0, -0.15, 0.28, -0.45], [0, 0.12, 0.28, -0.18]],
  u: [[-0.24, 0.5, -0.24, -0.5, 0.24, -0.2, 0.24, 0.5]],
  th: [[0, -0.5, 0, 0.5], [0, -0.28, 0.26, 0, 0, 0.28]],
  a: [[0, -0.5, 0, 0.5], [0, -0.5, 0.26, -0.24], [0, -0.2, 0.26, 0.06]],
  r: [[-0.1, -0.5, -0.1, 0.5], [-0.1, -0.5, 0.2, -0.25, -0.1, 0, 0.22, 0.5]],
  k: [[0.2, -0.42, -0.2, -0.1, 0.2, 0.22]],
  g: [[-0.28, -0.5, 0.28, 0.5], [0.28, -0.5, -0.28, 0.5]],
  w: [[-0.1, -0.5, -0.1, 0.5], [-0.1, -0.5, 0.22, -0.25, -0.1, 0]],
  h: [[-0.22, -0.5, -0.22, 0.5], [0.22, -0.5, 0.22, 0.5], [-0.22, -0.18, 0.22, 0.18]],
  n: [[0, -0.5, 0, 0.5], [-0.2, -0.16, 0.2, 0.14]],
  i: [[0, -0.5, 0, 0.5]],
  j: [[-0.02, -0.42, -0.24, -0.16, -0.02, 0.1], [0.02, -0.1, 0.24, 0.16, 0.02, 0.42]],
  ei: [[0, -0.5, 0, 0.5], [0, -0.5, 0.2, -0.3], [0, 0.5, -0.2, 0.3]],
  p: [[-0.2, -0.5, -0.2, 0.5], [-0.2, -0.5, 0.14, -0.24, 0.24, -0.4], [-0.2, 0.5, 0.14, 0.24, 0.24, 0.4]],
  z: [[0, -0.5, 0, 0.5], [0, -0.12, -0.28, -0.46], [0, -0.12, 0.28, -0.46]],
  s: [[-0.2, -0.5, 0.16, -0.16, -0.16, 0.16, 0.2, 0.5]],
  t: [[0, -0.5, 0, 0.5], [0, -0.5, -0.27, -0.2], [0, -0.5, 0.27, -0.2]],
  b: [[-0.18, -0.5, -0.18, 0.5], [-0.18, -0.5, 0.2, -0.25, -0.18, 0, 0.2, 0.25, -0.18, 0.5]],
  e: [[-0.24, 0.5, -0.24, -0.5, 0, -0.16, 0.24, -0.5, 0.24, 0.5]],
  m: [[-0.24, -0.5, -0.24, 0.5], [0.24, -0.5, 0.24, 0.5], [-0.24, -0.5, 0.24, -0.08], [0.24, -0.5, -0.24, -0.08]],
  l: [[-0.08, -0.5, -0.08, 0.5], [-0.08, -0.5, 0.22, -0.2]],
  ng: [[0, -0.34, 0.24, 0, 0, 0.34, -0.24, 0, 0, -0.34]],
  o: [[-0.22, -0.2, 0, -0.5, 0.22, -0.2], [-0.22, -0.2, 0.26, 0.5], [0.22, -0.2, -0.26, 0.5]],
  d: [[-0.24, -0.5, -0.24, 0.5], [0.24, -0.5, 0.24, 0.5], [-0.24, -0.5, 0.24, 0.5], [0.24, -0.5, -0.24, 0.5]],
};

/** Which rune each letter is written with. */
const LETTER: Record<string, string> = {
  a: 'a', b: 'b', c: 'k', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm',
  n: 'n', o: 'o', p: 'p', q: 'k', r: 'r', s: 's', t: 't', u: 'u', v: 'w', w: 'w', x: 'z', y: 'ei', z: 'z',
};

/** The runes (or the word separator, ' ') a text is written in: "th" and "ng" have runes of their own. */
export function runesOf(text: string): string[] {
  const out: string[] = [];
  const t = text.toLowerCase();
  for (let i = 0; i < t.length; i++) {
    const two = t.slice(i, i + 2);
    if (two === 'th' || two === 'ng') {
      out.push(two);
      i++;
    } else if (LETTER[t[i]]) out.push(LETTER[t[i]]);
    else if (/\s/.test(t[i])) out.push(' ');
  }
  return out;
}

let measurer: Ctx | null = null;
const measureCtx = () => (measurer ??= context2d(newCanvas(4, 4)));

export interface PlacedGlyph {
  /** A character, a rune name, or ' ' (a rune word separator). */
  ch: string;
  p: Point;
  /** The letter's turn: its +x along the reading direction, its top towards −y. */
  angle: number;
  /** Its advance, in pixels. */
  width: number;
}

/** Where each letter of a text layer goes. */
export function textGlyphs(layer: TextLayer, g: FrameGeometry, find: FindLayer = findNothing): { glyphs: PlacedGlyph[]; height: number } {
  const height = layer.size * bandWidthPx(g);
  const [track] = tracksFor(layer.follow, layer.at, g, find);
  if (!track || height <= 0 || !layer.text) return { glyphs: [], height };
  const gap = layer.spacing * height;
  const chars = layer.font === 'runes' ? runesOf(layer.text) : layer.font === 'babelstone' ? unicodeRunesOf(layer.text) : [...layer.text];
  let widths: number[];
  if (layer.font === 'runes') widths = chars.map((c) => (c === ' ' ? 0.36 : 0.62) * height);
  else {
    const m = measureCtx();
    m.font = fontCss(layer.font, height);
    widths = chars.map((c) => m.measureText(c).width);
  }
  let total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, chars.length - 1);
  const L = trackLength(track);
  // Text longer than the way round a closed track ends after the last phrase
  // (or failing that, word) that fits, with a word gap left for the join, and
  // the spare room is shared out between the word gaps, so it meets its start
  // again evenly.
  if (layer.fit && track.closed && total > L) {
    const isBreak = (c: string) => c === ' ' || c === '᛫';
    const isDot = (c: string) => c === '·' || c === '᛬';
    let used = 0;
    let phrase = 0;
    let phraseUsed = 0;
    let word = 0;
    for (let i = 0; i < chars.length; i++) {
      used += widths[i] + gap;
      if (used > L) break;
      if (isBreak(chars[i])) {
        word = i + 1;
        if (i > 0 && isDot(chars[i - 1])) [phrase, phraseUsed] = [i + 1, used];
      }
    }
    // A whole phrase unless that would leave a big gap to share out.
    const cut = phrase && phraseUsed > L * 0.88 ? phrase : word;
    if (cut > 0) {
      chars.length = cut;
      widths.length = cut;
      const breaks = chars.reduce((n, c) => n + (isBreak(c) ? 1 : 0), 0);
      const spare = L - widths.reduce((s, w) => s + w, 0) - gap * chars.length;
      if (breaks > 0 && spare > 0) chars.forEach((c, i) => isBreak(c) && (widths[i] += spare / breaks));
    }
  }
  total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, chars.length - 1);
  const at = layer.along * L;
  const dir = layer.reverse ? -1 : 1;
  const start = layer.align === 'centre' ? at - (dir * total) / 2 : at;
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  chars.forEach((ch, i) => {
    const mid = start + dir * (x + widths[i] / 2);
    x += widths[i] + gap;
    // A closed track wraps; text longer than the way round would overlap itself, so it stops.
    if (track.closed && x - gap > L + 1) return;
    const p = pointAlong(track, mid);
    if (!p) return;
    glyphs.push({ ch, p: { x: p.x, y: p.y }, angle: p.angle + (layer.reverse ? Math.PI : 0), width: widths[i] });
  });
  return { glyphs, height };
}

function runeStrokes(ctx: Ctx, ch: string, h: number): void {
  ctx.beginPath();
  if (ch === ' ') {
    // The word separator: two dots.
    for (const y of [-0.18, 0.18]) {
      ctx.moveTo(0.001, y * h);
      ctx.lineTo(0, y * h);
    }
    return;
  }
  for (const line of R[ch] ?? []) {
    for (let k = 0; k < line.length; k += 2) (k ? ctx.lineTo : ctx.moveTo).call(ctx, line[k] * h, line[k + 1] * h);
  }
}

/** Draws a text layer, letter by letter along its track. */
export function drawText(ctx: Ctx, layer: TextLayer, g: FrameGeometry, _light: number, find: FindLayer = findNothing): void {
  const { glyphs, height: h } = textGlyphs(layer, g, find);
  if (glyphs.length === 0) return;
  const line = Math.max(1, h * 0.11);
  const outline = layer.outline && layer.outlineWidth > 0 ? Math.max(0.5, h * layer.outlineWidth) : 0;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (layer.font !== 'runes') {
    ctx.font = fontCss(layer.font, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
  }
  // Outlines under every letter first, so neighbours don't cover each other's.
  for (const pass of outline ? ['outline', 'fill'] : ['fill']) {
    for (const { ch, p, angle } of glyphs) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      if (layer.font === 'runes') {
        runeStrokes(ctx, ch, h);
        ctx.strokeStyle = pass === 'outline' ? layer.outline! : layer.fill;
        ctx.lineWidth = pass === 'outline' ? line + outline * 2 : line;
        ctx.stroke();
      } else if (pass === 'outline') {
        ctx.strokeStyle = layer.outline!;
        ctx.lineWidth = outline * 2;
        ctx.strokeText(ch, 0, h / 2);
      } else {
        ctx.fillStyle = layer.fill;
        ctx.fillText(ch, 0, h / 2);
      }
      ctx.restore();
    }
  }
  ctx.restore();
}
