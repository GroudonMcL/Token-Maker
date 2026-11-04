import { useSyncExternalStore } from 'react';

/**
 * A tiny router: the current path, and `navigate()` to change it without a
 * page reload. Token Maker lives under /token-maker/ in Token Maker; paths
 * here are written without it ('/about') and BASE is added to the address.
 */
export const BASE = '/token-maker';

/** The address for an in-app path. */
export const hrefFor = (path: string) => BASE + path;

const current = () => {
  const p = window.location.pathname;
  return p === BASE || p.startsWith(BASE + '/') ? p.slice(BASE.length) || '/' : p;
};

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

export function navigate(path: string) {
  if (path === current()) return;
  window.history.pushState(null, '', hrefFor(path));
  window.scrollTo(0, 0);
  listeners.forEach((l) => l());
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, current, () => '/');
}
