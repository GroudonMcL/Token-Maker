// Frames sent from Frame Maker on the main page. The main page's shell
// passes on a design Frame Maker sends; it arrives here as a message from the
// same site and is opened like a .framemaker.json file.

import { FRAME_MESSAGE, FRAME_RECEIVED_MESSAGE, fromSitePage, inSite, READY_MESSAGE } from '../../shell/messages';
import { revealSection } from '../layout/reveal';
import { openDesignText } from './designActions';

let listening = false;

/** Opens designs the shell sends, and tells it Token Maker is ready for them. Call once the autosaved token is back. */
export function listenForSentFrames(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('message', (e: MessageEvent) => {
    // Only the site's page passes designs on; not another frame or a window this page opened.
    if (!fromSitePage(e)) return;
    const data = e.data as { type?: unknown; text?: unknown; id?: unknown } | null;
    if (data?.type !== FRAME_MESSAGE || typeof data.text !== 'string') return;
    // Tells the page it arrived, so it isn't sent again after a reload.
    if (typeof data.id === 'number') window.parent.postMessage({ type: FRAME_RECEIVED_MESSAGE, id: data.id }, window.location.origin);
    void openDesignText(data.text).then((ok) => ok && revealSection('frame'));
  });
  if (inSite()) window.parent.postMessage({ type: READY_MESSAGE }, window.location.origin);
}
