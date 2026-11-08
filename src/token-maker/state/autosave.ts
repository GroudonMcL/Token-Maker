// Autosave to IndexedDB (DESIGN.md §4.4): the current document and the
// images it uses survive a refresh or a closed tab. "New" clears it.

import { batchStore, loadBatch, syncedItems, type BatchItem, type BatchState } from '../batch/batch';
import { createStore as createIdbStore, del, get, keys, set, type UseStore } from 'idb-keyval';
import { migrateDocument } from '../document/migrate';
import type { TokenDocument } from '../document/types';
import { decodeImage } from '../import/decode';
import { addAsset, assetStore } from './assets';
import { docHistory, resetDoc } from './tokenStore';

const DOC_KEY = 'current-doc';
const BATCH_KEY = 'batch';
/** A saved token that couldn't be reopened, kept so autosave doesn't overwrite it. "New" clears it. */
const UNREADABLE_KEY = 'unreadable-doc';
const ASSET_PREFIX = 'asset:';
let idb: UseStore | null = null;

/**
 * Saved pictures that must not be deleted this session, although the token
 * on screen doesn't use them: pictures that couldn't be reopened, or every
 * saved picture when the saved token itself couldn't be.
 */
let keptPictures: ReadonlySet<string> | 'all' = new Set();
/** True when the saved token couldn't be read or backed up: saving would overwrite it. */
let savingBlocked = false;

function store(): UseStore | null {
  if (typeof indexedDB === 'undefined') return null;
  idb ??= createIdbStore('token-maker', 'autosave');
  return idb;
}

/** The user's own pictures the document uses (the art, and a background picture of their own). */
export function usedAssetIds(doc: TokenDocument, batch: readonly BatchItem[] = []): string[] {
  const ids = [doc.art.assetId, doc.background.image?.type === 'asset' ? doc.background.image.assetId : null, ...batch.map((it) => it.assetId)];
  return [...new Set(ids.filter((id): id is string => !!id && id.startsWith(ASSET_PREFIX)))];
}

/** Saves the document, the batch and their pictures (if not saved yet), and removes pictures no longer used. */
export async function saveNow(doc: TokenDocument, batch: BatchState = batchStore.getState()): Promise<void> {
  const db = store();
  if (!db || savingBlocked) return;
  const items = syncedItems(batch, doc);
  await set(DOC_KEY, doc, db);
  await set(BATCH_KEY, { ...batch, items }, db);
  const used = usedAssetIds(doc, items);
  const saved = (await keys(db)).filter((k): k is string => typeof k === 'string' && k.startsWith(ASSET_PREFIX));
  for (const id of used) {
    if (saved.includes(id)) continue;
    const asset = assetStore.getState().assets.get(id);
    if (asset) await set(id, asset.blob, db);
  }
  const kept = keptPictures;
  if (kept === 'all') return;
  await Promise.all(saved.filter((k) => !used.includes(k) && !kept.has(k)).map((k) => del(k, db)));
}

/**
 * What happened when the autosaved token was reopened:
 * - `restored`: it is on screen. `missingPictures` counts pictures that
 *   couldn't be opened; they are left out, but kept in storage.
 * - `none`: nothing was saved.
 * - `unreadable`: it couldn't be reopened. It was kept (`kept`), and its
 *   pictures with it, so autosaving the new token doesn't overwrite it; if
 *   it couldn't even be kept, autosave stays off for this visit.
 */
export type RestoreResult =
  | { status: 'restored'; missingPictures: number }
  | { status: 'none' }
  | { status: 'unreadable'; kept: boolean };

/** Loads the autosaved token, if any. A picture or a token that can't be reopened is never deleted. */
export async function restore(): Promise<RestoreResult> {
  const db = store();
  if (!db) return { status: 'none' };
  let raw: unknown;
  let rawBatch: unknown;
  let doc: TokenDocument;
  let batch: BatchState | null;
  try {
    raw = await get(DOC_KEY, db);
    if (!raw) return { status: 'none' };
    rawBatch = await get(BATCH_KEY, db);
    doc = migrateDocument(raw);
    batch = readBatch(rawBatch);
  } catch (err) {
    console.warn('Could not restore the autosaved token', err);
    return { status: 'unreadable', kept: await keepUnreadable(db, raw, rawBatch) };
  }

  try {
    const unopened = new Set<string>();
    for (const id of usedAssetIds(doc, batch?.items)) {
      try {
        const blob = await get<Blob>(id, db);
        if (blob) addAsset({ id, blob, ...(await decodeImage(blob)) });
      } catch (err) {
        console.warn(`Could not reopen the saved picture ${id}`, err);
        unopened.add(id);
      }
    }
    // While a token that couldn't be reopened is kept, so are all its pictures.
    keptPictures = (await get(UNREADABLE_KEY, db).catch(() => true)) === undefined ? unopened : 'all';
    const has = (id: string | null) => !!id && assetStore.getState().assets.has(id);
    if (doc.art.assetId && !has(doc.art.assetId)) doc.art.assetId = null;
    if (doc.background.image?.type === 'asset' && !has(doc.background.image.assetId)) doc.background.image = null;
    resetDoc(doc);
    if (batch) {
      // Pictures that couldn't be found are left out of the batch.
      const items = batch.items.filter((it) => it.id === batch.activeId || has(it.assetId));
      loadBatch({ ...batch, items, activeId: items.some((it) => it.id === batch.activeId) ? batch.activeId : null });
    }
    return { status: 'restored', missingPictures: unopened.size };
  } catch (err) {
    console.warn('Could not restore the autosaved token', err);
    return { status: 'unreadable', kept: await keepUnreadable(db, raw, rawBatch) };
  }
}

/**
 * Moves a saved token that couldn't be reopened out of autosave's way, and
 * keeps every saved picture, so a later version of the site can still open
 * it. If that fails, saving is turned off for this visit instead.
 */
async function keepUnreadable(db: UseStore, raw: unknown, rawBatch: unknown): Promise<boolean> {
  keptPictures = 'all';
  try {
    if (raw === undefined) throw new Error('The saved token could not be read');
    await set(UNREADABLE_KEY, { savedAt: Date.now(), doc: raw, batch: rawBatch ?? null }, db);
    return true;
  } catch (err) {
    console.warn('Could not keep the unreadable token; autosave is off for this visit', err);
    savingBlocked = true;
    return false;
  }
}

/** Deletes everything saved ("New"), including a token that couldn't be reopened, and starts saving again. */
export async function clearAutosave(): Promise<void> {
  keptPictures = new Set();
  savingBlocked = false;
  const db = store();
  if (!db) return;
  const all = await keys(db);
  await Promise.all(all.map((k) => del(k, db)));
}

/** A saved batch, checked field by field (anything odd is left out). */
function readBatch(raw: unknown): BatchState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<BatchState>;
  if (!r.on || !Array.isArray(r.items)) return null;
  const items = r.items.filter(
    (it): it is BatchItem =>
      !!it && typeof it.id === 'string' && typeof it.name === 'string' && !!it.transform && Array.isArray(it.strokes) && Array.isArray(it.popOutStrokes),
  );
  return { on: true, items, activeId: typeof r.activeId === 'string' ? r.activeId : null };
}

/** Starts saving shortly after every change. Returns a function that stops it. */
export function startAutosave(delayMs = 400): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void saveNow(docHistory.getState().present).catch((e) => console.warn('Autosave failed', e)), delayMs);
  };
  const unsubscribe = docHistory.subscribe((state, prev) => {
    if (state.present !== prev.present) later();
  });
  const unsubscribeBatch = batchStore.subscribe(later);
  return () => {
    clearTimeout(timer);
    unsubscribe();
    unsubscribeBatch();
  };
}
