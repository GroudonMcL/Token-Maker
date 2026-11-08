// The site's two apps, and the message an app sends the page to
// switch to the other one (the switch sits in each app's own top bar).

export type AppId = 'token-maker' | 'frame-maker';

/** `wip`: still being worked on, so its switch button carries a small WIP badge. */
export const APPS: { id: AppId; title: string; src: string; wip?: boolean }[] = [
  { id: 'token-maker', title: 'Token Maker', src: '/token-maker/' },
  { id: 'frame-maker', title: 'Frame Maker', src: '/frame-maker/', wip: true },
];

/** Sent by an app to the page: show this app. */
export const SHOW_APP_MESSAGE = 'tokenmaker:show-app';

/** True when the app is open inside the site's page (both apps), not on its own page. */
export const inSite = (): boolean => typeof window !== 'undefined' && window.parent !== window;

export function showApp(app: AppId): void {
  window.parent.postMessage({ type: SHOW_APP_MESSAGE, app }, window.location.origin);
}
