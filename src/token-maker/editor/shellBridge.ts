// Frames sent from Frame Maker on the main page. The main page's shell
// passes on a design Frame Maker sends; it arrives here as a message from the
// same site and is opened like a .framemaker.json file.

import { revealSection } from '../layout/reveal';
import { openDesignText } from './designActions';

/** The message the main page's shell sends with a design. */
export const FRAME_MESSAGE = 'tokenmaker:frame';
/** The message telling the shell Token Maker can take designs. */
export const READY_MESSAGE = 'tokenmaker:token-maker-ready';

let listening = false;

/** Opens designs the shell sends, and tells it Token Maker is ready for them. Call once the autosaved token is back. */
export function listenForSentFrames(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    const data = e.data as { type?: unknown; text?: unknown } | null;
    if (data?.type !== FRAME_MESSAGE || typeof data.text !== 'string') return;
    void openDesignText(data.text).then((ok) => ok && revealSection('frame'));
  });
  if (window.parent !== window) window.parent.postMessage({ type: READY_MESSAGE }, window.location.origin);
}
