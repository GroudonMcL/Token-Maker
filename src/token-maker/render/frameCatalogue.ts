// Loads the frame catalogue (every built-in design and the frame picker's
// list of them: sections/frameTiles.ts) when it is first needed: the frame
// gallery opening, a token whose frame's colour pickers come from it, or an
// old token being upgraded. It is several hundred kB, so it stays out of the
// editor's first load, which carries only the starting frame
// (defaultDesign.ts).

import { useEffect, useSyncExternalStore } from 'react';

export type FrameCatalogue = typeof import('../sections/frameTiles');

let catalogue: FrameCatalogue | null = null;
let loading: Promise<FrameCatalogue> | null = null;
const listeners = new Set<() => void>();

/** The catalogue, if it has loaded. */
export const frameCatalogue = () => catalogue;

/** Loads the catalogue (once). A failed load can be tried again. */
export function loadFrameCatalogue(): Promise<FrameCatalogue> {
  loading ??= import('../sections/frameTiles').then(
    (m) => {
      catalogue = m;
      for (const fn of listeners) fn();
      return m;
    },
    (err: unknown) => {
      loading = null;
      throw err;
    },
  );
  return loading;
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** The catalogue once it has loaded, else null. `load` starts loading it. */
export function useFrameCatalogue(load = false): FrameCatalogue | null {
  const value = useSyncExternalStore(subscribe, frameCatalogue);
  useEffect(() => {
    if (load && !value) void loadFrameCatalogue().catch(() => {});
  }, [load, value]);
  return value;
}
