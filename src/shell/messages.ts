// The messages between the site's page (src/shell/Shell.tsx) and the two apps
// in its frames. Every one is posted to, and only accepted from, this site's
// own origin, and each side also checks which window sent it.
//
//   app → page        SHOW_APP        show the other app (the switch in each app's top bar)
//   Frame Maker → page SEND_FRAME     a design for Token Maker (io/sendToTokenMaker.ts)
//   page → Token Maker FRAME          that design, with an id (editor/shellBridge.ts)
//   Token Maker → page FRAME_RECEIVED the design with that id arrived
//   Token Maker → page READY          Token Maker can take designs (sent again after it reloads)

export const SHOW_APP_MESSAGE = 'tokenmaker:show-app';
export const SEND_FRAME_MESSAGE = 'tokenmaker:send-frame';
export const FRAME_MESSAGE = 'tokenmaker:frame';
export const FRAME_RECEIVED_MESSAGE = 'tokenmaker:frame-received';
export const READY_MESSAGE = 'tokenmaker:token-maker-ready';

/** True when an app is open inside the site's page (both apps), not on its own page. */
export const inSite = (): boolean => typeof window !== 'undefined' && window.parent !== window;

/** A message from the site's page to this app: same origin, and sent by the page itself (not another frame or window). */
export const fromSitePage = (e: MessageEvent): boolean => e.origin === window.location.origin && inSite() && e.source === window.parent;
