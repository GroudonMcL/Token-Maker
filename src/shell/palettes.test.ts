// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { PALETTES, THEME_SCRIPT } from './palettes';

// Every theme in palettes.css meets WCAG AA contrast, like the themes in tokens.css,
// and every page applies it before painting.

const css = readFileSync(new URL('./palettes.css', import.meta.url), 'utf8');

function block(id: string): Record<string, string> {
  const start = css.indexOf(`[data-palette='${id}'],`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]!] = m[2]!;
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe.each(PALETTES.map((p) => [p.id]))('the %s theme', (id) => {
  const t = block(id);
  it('sets every colour', () => {
    for (const k of ['bg-top', 'bg', 'surface', 'surface-raised', 'surface-sunken', 'border', 'border-strong', 'text', 'text-muted', 'text-faint', 'accent', 'accent-hover', 'on-accent', 'focus']) expect(t[k], k).toMatch(/^#/);
  });
  it.each(['bg', 'bg-top', 'surface', 'surface-raised'])('body and muted text are readable on --%s', (s) => {
    expect(ratio(t.text!, t[s]!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t['text-muted']!, t[s]!)).toBeGreaterThanOrEqual(4.5);
  });
  it('accent text is readable on panels, and text on accent buttons', () => {
    expect(ratio(t.accent!, t.surface!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t['on-accent']!, t.accent!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t['on-accent']!, t['accent-hover']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('faint text and the focus ring are visible (3:1)', () => {
    expect(ratio(t['text-faint']!, t.surface!)).toBeGreaterThanOrEqual(3);
    expect(ratio(t.focus!, t.surface!)).toBeGreaterThanOrEqual(3);
  });
});

describe('applying the theme', () => {
  it.each(['index.html', 'token-maker/index.html', 'frame-maker/index.html'])('%s applies it before painting, with the current list', (page) => {
    expect(readFileSync(new URL(`../../${page}`, import.meta.url), 'utf8')).toContain(THEME_SCRIPT);
  });
});
