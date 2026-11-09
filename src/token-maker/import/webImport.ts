// Importing from the web (DESIGN.md §6.1 items 2–5). Typed, pasted and
// dragged addresses all come here:
//
//   an address that looks like an image file → /api/fetch-image → load it
//   anything else → /api/page-images: an image loads straight away; a page
//     shows its pictures in the Import section for the user to pick one
//
// Each image is first fetched straight from its site, which works when the
// site allows it (CORS) and needs no server. Most sites don't, so the proxy
// is the fallback. Either way the picture arrives as a Blob, so the canvas
// is never tainted and the token can always be exported.

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { ApiErrorBody, ApiErrorCode, FoundImage, PageImagesResult } from '../../../server/apiTypes.ts';
import { revealSection } from '../layout/reveal';
import { toast } from '../ui/toast';
import { importTo, newImportTicket, type ImportTarget } from './importImage';
import { friendlyError, isDataImageUrl, looksLikeImageUrl, nameFromImageUrl, nameFromTitle, normaliseAddress } from './webAddress';

export interface WebImportState {
  status: 'idle' | 'loading' | 'choosing' | 'error';
  /** The address being looked at. */
  address: string;
  /** Pictures found on a page, for the user to pick from. */
  images: FoundImage[];
  pageTitle: string;
  /** The picture being loaded, or last loaded, from `images`. */
  picked?: string;
  error?: string;
  /** Where the picture goes: the art (Import section) or the background (Background section). */
  target: ImportTarget;
}

const IDLE: WebImportState = { status: 'idle', address: '', images: [], pageTitle: '', target: 'art' };
const target = () => webImportStore.getState().target;

export const webImportStore = createStore<WebImportState>(() => IDLE);
export const useWebImport = <T>(select: (s: WebImportState) => T) => useStore(webImportStore, select);

export class WebImportError extends Error {
  constructor(readonly code: ApiErrorCode | 'offline' | 'no_server' | 'unknown', serverMessage?: string) {
    super(friendlyError(code, serverMessage));
  }
}

/** Only the newest request may change the state; older ones finish quietly. */
let generation = 0;

export const proxiedImageUrl = (url: string) => `/api/fetch-image?url=${encodeURIComponent(url)}`;

/**
 * True when /api/* answered with a web page: the site is served without its
 * image server (e.g. deployed as a plain static site or a Worker without
 * worker/index.ts), so every address falls through to the editor's own page.
 */
const isHtml = (res: Response) => /^\s*text\/html/i.test(res.headers.get('content-type') ?? '');

async function apiError(res: Response): Promise<WebImportError> {
  if (isHtml(res)) return new WebImportError('no_server');
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (body?.error?.code) return new WebImportError(body.error.code, body.error.message);
  } catch {
    /* not our JSON: e.g. the functions aren't running */
  }
  return new WebImportError(res.status === 404 ? 'offline' : 'unknown');
}

async function apiFetch(path: string): Promise<Response> {
  try {
    return await fetch(path);
  } catch {
    throw new WebImportError('offline');
  }
}

const DIRECT_TIMEOUT_MS = 8000;

/**
 * Fetches a picture straight from its site. Null when the site doesn't
 * allow it (a CORS error), doesn't answer, or sends something that isn't a
 * picture (e.g. a page).
 */
async function fetchDirect(url: string): Promise<Blob | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DIRECT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: abort.signal });
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') ?? '')) return null;
    return await res.blob();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** One web import: where its picture goes, its place in the queue (importImage.ts), and whether it is still wanted. */
interface Job {
  to: ImportTarget;
  ticket: number;
  /** False once the user closed the import or started another one. */
  wanted: () => boolean;
}

/** Downloads an image (straight from its site, else through the proxy) and puts it where the job says. */
async function loadImage(url: string, name: string, job: Job, tryDirect = true): Promise<void> {
  const direct = tryDirect ? await fetchDirect(url) : null;
  const fileName = name || nameFromImageUrl(url);
  if (direct) {
    if (job.wanted()) await importTo(job.to, direct, fileName, job.ticket);
    return;
  }
  const res = await apiFetch(proxiedImageUrl(url));
  if (!res.ok || isHtml(res)) throw await apiError(res);
  const blob = await res.blob();
  if (job.wanted()) await importTo(job.to, blob, fileName, job.ticket);
}

async function findImages(url: string): Promise<PageImagesResult> {
  const res = await apiFetch(`/api/page-images?url=${encodeURIComponent(url)}`);
  if (!res.ok || isHtml(res)) throw await apiError(res);
  try {
    return (await res.json()) as PageImagesResult;
  } catch {
    // Not our JSON: something other than the image server answered.
    throw new WebImportError('no_server');
  }
}

export type ImportSource = 'box' | 'paste' | 'drop';

/**
 * Imports from a web address (or a data: image URL). Returns false when the
 * text isn't an address at all, so callers can treat it as ordinary text.
 */
export function importFromAddress(text: string, source: ImportSource = 'box', to: ImportTarget = 'art'): boolean {
  const raw = text.trim();
  webImportStore.setState({ target: to });
  if (isDataImageUrl(raw)) {
    void importDataUrl(raw, source, to);
    return true;
  }
  const url = normaliseAddress(raw);
  if (!url) {
    if (source === 'box') setError(new WebImportError('bad_url'), raw, source);
    return false;
  }
  void run(url, source);
  return true;
}

async function importDataUrl(dataUrl: string, source: ImportSource, to: ImportTarget) {
  const ticket = newImportTicket();
  try {
    const blob = await (await fetch(dataUrl)).blob();
    await importTo(to, blob, '', ticket);
  } catch (err) {
    setError(err, '', source);
  }
}

type RunResult = 'loaded' | 'choosing' | 'failed' | 'overtaken';

async function run(url: URL, source: ImportSource): Promise<RunResult> {
  const mine = ++generation;
  const address = url.toString();
  const to = target();
  webImportStore.setState({ ...IDLE, status: 'loading', address, target: to });
  if (source !== 'box') revealSection('import');
  const current = () => mine === generation;
  const job: Job = { to, ticket: newImportTicket(), wanted: current };
  try {
    // Any address may be a picture its site lets us read directly, even without the proxy.
    const direct = await fetchDirect(address);
    if (direct) {
      if (!current()) return 'overtaken';
      await importTo(to, direct, nameFromImageUrl(address), job.ticket);
      if (current()) webImportStore.setState({ ...IDLE, target: to });
      return 'loaded';
    }
    if (!current()) return 'overtaken';
    if (looksLikeImageUrl(url)) {
      try {
        await loadImage(address, '', job, false);
        if (current()) webImportStore.setState({ ...IDLE, target: to });
        return 'loaded';
      } catch (err) {
        // Some "image" addresses are really pages (e.g. a gallery page per picture).
        if (!(err instanceof WebImportError && err.code === 'not_image')) throw err;
      }
    }
    const found = await findImages(address);
    if (!current()) return 'overtaken';
    if (found.kind === 'image') {
      await loadImage(found.url, '', job);
      if (current()) webImportStore.setState({ ...IDLE, target: to });
    } else if (found.images.length === 1) {
      await loadImage(found.images[0]!.url, nameForPicked(found.images[0]!, found.title), job);
      if (current()) webImportStore.setState({ ...IDLE, target: to });
    } else {
      webImportStore.setState({ status: 'choosing', address: found.url, images: found.images, pageTitle: found.title, target: to });
      if (source !== 'box') toast(`Found ${found.images.length} pictures. Pick one in the Import section.`);
      return 'choosing';
    }
    return 'loaded';
  } catch (err) {
    if (current()) setError(err, address, source);
    return 'failed';
  }
}

/** Splits text into the web addresses in it (one per line or separated by spaces). */
export function splitAddresses(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && (isDataImageUrl(t) || normaliseAddress(t)));
}

/**
 * Several links at once (batch mode, DESIGN.md §6.1): each picture joins the
 * batch in turn. A page with several pictures can't be picked from in the
 * middle of a list, so the last such page stays open to pick from.
 */
export async function importManyAddresses(addresses: readonly string[], source: ImportSource = 'box'): Promise<void> {
  webImportStore.setState({ target: 'art' });
  let loaded = 0;
  let failed = 0;
  let pages = 0;
  let lastPage: WebImportState | null = null;
  for (const text of addresses) {
    const url = normaliseAddress(text);
    if (!url) {
      failed++;
      continue;
    }
    const result = await run(url, source);
    if (result === 'loaded') loaded++;
    else if (result === 'choosing') {
      pages++;
      lastPage = webImportStore.getState();
    } else failed++;
  }
  if (lastPage) webImportStore.setState(lastPage);
  else if (loaded) webImportStore.setState({ ...IDLE, target: 'art' });
  const parts = [`Added ${loaded} of ${addresses.length} pictures.`];
  if (pages) parts.push(`${pages === 1 ? 'One link was a page' : `${pages} links were pages`} with several pictures: pick from ${pages === 1 ? 'it' : 'the last one'} in the Import section, or paste ${pages === 1 ? 'it' : 'the others'} on ${pages === 1 ? 'its' : 'their'} own.`);
  if (failed) parts.push(`${failed} couldn't be loaded.`);
  toast(parts.join(' '), failed && !loaded ? 'error' : 'info', 8000);
}

function nameForPicked(img: FoundImage, pageTitle: string): string {
  return nameFromImageUrl(img.url) || nameFromTitle(img.alt ?? '') || nameFromTitle(pageTitle);
}

/** Loads one of the pictures found on a page. */
export async function pickWebImage(url: string): Promise<void> {
  const state = webImportStore.getState();
  const img = state.images.find((i) => i.url === url);
  if (!img) return;
  const mine = ++generation;
  webImportStore.setState({ status: 'loading', picked: url, error: undefined });
  try {
    await loadImage(url, nameForPicked(img, state.pageTitle), { to: state.target, ticket: newImportTicket(), wanted: () => mine === generation });
  } catch (err) {
    if (mine !== generation) return;
    webImportStore.setState({ status: 'choosing', error: messageOf(err) });
    return;
  }
  if (mine === generation) webImportStore.setState({ status: 'choosing' });
}

/** Hides the picture strip and any message. */
export function clearWebImport(): void {
  generation++;
  webImportStore.setState(IDLE);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : friendlyError('unknown');
}

function setError(err: unknown, address: string, source: ImportSource) {
  const error = messageOf(err);
  webImportStore.setState({ ...IDLE, status: 'error', address, error, target: target() });
  if (source !== 'box') toast(error, 'error', 8000);
}
