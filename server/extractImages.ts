// Finds the images on a web page (DESIGN.md §6.1 item 4) with a small tag
// scanner, so it runs the same in Workers and in tests: <img> (largest
// srcset entry, lazy-load attributes), <picture><source>, og:image,
// twitter:image, <link rel="image_src">, inline CSS backgrounds and links
// straight to image files. Tiny images (icons) are dropped when the page
// says how big they are; the browser hides the rest once they load.

import type { FoundImage } from './apiTypes.ts';

/** Smaller than this on either side counts as an icon. */
export const MIN_IMAGE_SIDE = 64;
export const MAX_IMAGES = 60;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const isLetter = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isNameChar = (c: string) => isLetter(c) || (c >= '0' && c <= '9') || c === '_' || c === ':' || c === '-';
/** Ends an attribute name. `<` ends the tag: the scanner restarts there. */
const endsAttrName = (c: string) => isSpace(c) || c === '"' || c === "'" || c === '>' || c === '/' || c === '=' || c === '<';
/** Tags whose contents are skipped. */
const RAW_TEXT = new Set(['script', 'style', 'template']);

/**
 * Every start tag in the HTML, skipping comments, scripts and style sheets.
 * A single pass that reads each character a bounded number of times, so a
 * hostile or broken page can't make it slow (a regex version took 24 s on
 * 120 KB of "<a <a <a…").
 */
export function* scanTags(html: string): Generator<{ name: string; attrs: Record<string, string> }> {
  const n = html.length;
  let lower: string | null = null;
  // Searches that found nothing once will find nothing later either.
  const missing = new Set<string>();
  const find = (needle: string, from: number): number => {
    if (missing.has(needle)) return -1;
    const at = html.indexOf(needle, from);
    if (at === -1) missing.add(needle);
    return at;
  };

  let i = 0;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) return;
    if (html.startsWith('<!--', lt)) {
      const close = find('-->', lt + 4);
      i = close === -1 ? lt + 1 : close + 3;
      continue;
    }
    if (lt + 1 >= n || !isLetter(html[lt + 1]!)) {
      i = lt + 1;
      continue;
    }

    let j = lt + 1;
    while (j < n && isNameChar(html[j]!)) j++;
    const name = html.slice(lt + 1, j).toLowerCase();
    const attrs: Record<string, string> = {};
    let end = -1; // index just past '>'

    for (;;) {
      while (j < n && (isSpace(html[j]!) || html[j] === '/')) j++;
      if (j >= n) break;
      const c = html[j]!;
      if (c === '>') {
        end = j + 1;
        break;
      }
      if (c === '<') break; // not a tag; the next one may start here
      if (c === '"' || c === "'" || c === '=') break; // malformed: not a tag
      const nameStart = j;
      while (j < n && !endsAttrName(html[j]!)) j++;
      const attrName = html.slice(nameStart, j).toLowerCase();
      let k = j;
      while (k < n && isSpace(html[k]!)) k++;
      let value = '';
      if (html[k] === '=') {
        k++;
        while (k < n && isSpace(html[k]!)) k++;
        const q = html[k];
        if (q === '"' || q === "'") {
          const close = find(q, k + 1);
          if (close === -1) break; // unclosed quote: not a tag
          value = html.slice(k + 1, close);
          j = close + 1;
        } else {
          const valueStart = k;
          while (k < n && !isSpace(html[k]!) && html[k] !== '>' && html[k] !== '"' && html[k] !== "'") k++;
          value = html.slice(valueStart, k);
          j = k;
        }
      }
      if (!(attrName in attrs)) attrs[attrName] = decodeEntities(value);
    }

    if (end === -1) {
      // Carry on from where this one stopped, so nothing is read twice.
      i = j;
      continue;
    }
    i = end;
    if (RAW_TEXT.has(name)) {
      lower ??= html.toLowerCase();
      const closeTag = skipRawText(lower, name, end, missing);
      if (closeTag !== -1) {
        i = closeTag;
        continue;
      }
    }
    yield { name, attrs };
  }
}

/** Index just past `</name>` (allowing spaces before `>`), or -1 if the element is never closed. */
function skipRawText(lower: string, name: string, from: number, missing: Set<string>): number {
  const needle = `</${name}`;
  if (missing.has(needle)) return -1;
  for (let at = lower.indexOf(needle, from); at !== -1; at = lower.indexOf(needle, at + 1)) {
    let k = at + needle.length;
    while (k < lower.length && isSpace(lower[k]!)) k++;
    if (lower[k] === '>') return k + 1;
  }
  missing.add(needle);
  return -1;
}

export interface SrcsetCandidate {
  url: string;
  width?: number;
  density?: number;
}

/** Parses a srcset, keeping commas that belong inside URLs (e.g. "w_300,h_200"). */
export function parseSrcset(srcset: string): SrcsetCandidate[] {
  const out: SrcsetCandidate[] = [];
  let i = 0;
  while (i < srcset.length) {
    while (i < srcset.length && /[\s,]/.test(srcset[i]!)) i++;
    if (i >= srcset.length) break;
    let end = i;
    while (end < srcset.length && !/\s/.test(srcset[end]!)) end++;
    let url = srcset.slice(i, end);
    i = end;
    let descriptor = '';
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '');
    } else {
      const comma = srcset.indexOf(',', i);
      descriptor = srcset.slice(i, comma === -1 ? srcset.length : comma).trim();
      i = comma === -1 ? srcset.length : comma + 1;
    }
    const w = /^(\d+)w$/i.exec(descriptor);
    const x = /^(\d*\.?\d+)x$/i.exec(descriptor);
    out.push({ url, width: w ? Number(w[1]) : undefined, density: x ? Number(x[1]) : descriptor ? undefined : 1 });
  }
  return out;
}

/** The biggest entry in a srcset (by width, else by pixel density). */
export function largestFromSrcset(srcset: string): SrcsetCandidate | null {
  const list = parseSrcset(srcset).filter((c) => c.url);
  if (!list.length) return null;
  return list.reduce((best, c) => ((c.width ?? 0) * 1000 + (c.density ?? 0) > (best.width ?? 0) * 1000 + (best.density ?? 0) ? c : best));
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp)(?:$|[?#])/i;
const JUNK = /(favicon|apple-touch-icon|sprite|spacer|blank|pixel|tracking|\/emoji\/|gravatar\.com\/avatar|1x1|\/ads?\/)/i;
const TRACKERS = /(^|\.)(facebook\.com|doubleclick\.net|google-analytics\.com|googletagmanager\.com|scorecardresearch\.com|quantserve\.com)$/i;

/** Resolves an attribute value to an https URL we would fetch, or null. */
export function resolveImageUrl(raw: string | undefined, base: URL): string | null {
  const value = raw?.trim();
  if (!value || /^(data|blob|javascript|about):/i.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  if (url.protocol === 'http:') url.protocol = 'https:'; // the proxy only fetches https
  if (url.protocol !== 'https:') return null;
  if (TRACKERS.test(url.hostname) || /\.(svg|ico)(?:$|[?#])/i.test(url.pathname)) return null;
  if (JUNK.test(url.pathname)) return null;
  url.hash = '';
  return url.toString();
}

const num = (v: string | undefined) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const isTiny = (img: FoundImage) =>
  (img.width !== undefined && img.width < MIN_IMAGE_SIDE) || (img.height !== undefined && img.height < MIN_IMAGE_SIDE);

export interface ExtractedPage {
  title: string;
  images: FoundImage[];
}

export function extractImages(html: string, pageUrl: string | URL): ExtractedPage {
  let base = new URL(pageUrl);
  const meta: FoundImage[] = [];
  const body: FoundImage[] = [];
  let ogTitle = '';
  let docTitle = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
  let ogWidth: number | undefined;
  let ogHeight: number | undefined;
  let pictureSource: { url: string; width?: number } | null = null;

  const add = (list: FoundImage[], raw: string | undefined, hint: Partial<FoundImage> = {}) => {
    const url = resolveImageUrl(raw, base);
    if (url) list.push({ url, ...hint });
  };

  for (const { name, attrs } of scanTags(html)) {
    if (name === 'base' && attrs.href) {
      try {
        base = new URL(attrs.href, base);
      } catch {
        /* keep the page URL */
      }
    } else if (name === 'meta') {
      const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? '').toLowerCase();
      const content = attrs.content;
      if (['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes(key)) add(meta, content);
      else if (key === 'og:image:width') ogWidth = num(content);
      else if (key === 'og:image:height') ogHeight = num(content);
      else if (key === 'og:title' && content) ogTitle = content;
    } else if (name === 'link' && /\bimage_src\b/i.test(attrs.rel ?? '')) {
      add(meta, attrs.href);
    } else if (name === 'source' && (attrs.srcset || attrs['data-srcset'])) {
      // <picture> sources: remember the biggest, used for the <img> that follows.
      const best = largestFromSrcset(attrs.srcset || attrs['data-srcset']!);
      if (best && (!pictureSource || (best.width ?? 0) > (pictureSource.width ?? 0))) pictureSource = best;
    } else if (name === 'img') {
      const set = attrs['data-srcset'] || attrs['data-lazy-srcset'] || attrs.srcset;
      const fromSet = set ? largestFromSrcset(set) : null;
      const src =
        attrs['data-src'] || attrs['data-lazy-src'] || attrs['data-original'] || attrs['data-full-url'] || attrs['data-large-file'] || attrs.src;
      const candidate = pictureSource && (pictureSource.width ?? 0) > (fromSet?.width ?? 0) ? pictureSource : fromSet;
      pictureSource = null;
      const width = candidate?.width ?? num(attrs.width);
      const height = candidate?.width ? undefined : num(attrs.height);
      add(body, candidate?.url ?? src, { width, height, alt: attrs.alt?.trim() || undefined });
    } else if (name === 'a' && attrs.href && IMAGE_EXT.test(attrs.href)) {
      add(body, attrs.href);
    }
    if (attrs.style && /background/i.test(attrs.style)) {
      for (const m of attrs.style.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) add(body, m[2]);
    }
  }

  if (meta.length && (ogWidth || ogHeight)) Object.assign(meta[0]!, { width: ogWidth, height: ogHeight });

  // Page-level images (og:image etc.) first: they are usually the main picture.
  const seen = new Map<string, FoundImage>();
  for (const img of [...meta, ...body]) {
    const prev = seen.get(img.url);
    if (!prev) seen.set(img.url, { ...img });
    else {
      prev.width = Math.max(prev.width ?? 0, img.width ?? 0) || undefined;
      prev.height = Math.max(prev.height ?? 0, img.height ?? 0) || undefined;
      prev.alt ??= img.alt;
    }
  }
  const images = [...seen.values()].filter((i) => !isTiny(i)).slice(0, MAX_IMAGES);
  for (const img of images) for (const k of ['width', 'height', 'alt'] as const) if (img[k] === undefined) delete img[k];
  docTitle = decodeEntities(docTitle);
  return { title: (ogTitle || docTitle).replace(/\s+/g, ' ').trim().slice(0, 200), images };
}
