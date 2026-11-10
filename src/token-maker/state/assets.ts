// Images used by documents, kept outside the document (DESIGN.md §4.1).
// An imported picture stays in memory while the token, the batch or the undo
// history uses it, so undo can bring it back (assetCleanup.ts drops the rest).

import { createStore } from 'zustand/vanilla';
import type { AssetMap, RenderSource } from '../render/render';

export interface Asset extends RenderSource {
  id: string;
  /** The original file, kept for autosave. */
  blob: Blob;
}

interface AssetState {
  assets: ReadonlyMap<string, Asset>;
}

export const assetStore = createStore<AssetState>(() => ({ assets: new Map() }));

export function addAsset(asset: Asset): void {
  const next = new Map(assetStore.getState().assets);
  next.set(asset.id, asset);
  assetStore.setState({ assets: next });
}

/** Drops these assets (pictures nothing uses any more). */
export function removeAssets(ids: readonly string[]): void {
  const next = new Map(assetStore.getState().assets);
  let changed = false;
  for (const id of ids) changed = next.delete(id) || changed;
  if (changed) assetStore.setState({ assets: next });
}

export function clearAssets(): void {
  assetStore.setState({ assets: new Map() });
}

export function getAssets(): AssetMap {
  return assetStore.getState().assets;
}

export function newAssetId(): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `asset:${rnd}`;
}
