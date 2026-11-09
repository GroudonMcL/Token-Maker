// Sending the design to Token Maker on the main page. Frame Maker runs in
// a frame of the main page; the shell passes the design on to Token
// Maker and switches to it.

import { SEND_FRAME_MESSAGE } from '../../shell/messages';
import type { FrameProject } from '../project/types';
import { projectTextWithPreview } from './files';

export { inSite } from '../../shell/messages';

/** Sends the design, with its preview, to Token Maker. */
export async function sendToTokenMaker(project: FrameProject): Promise<void> {
  const text = await projectTextWithPreview(project);
  window.parent.postMessage({ type: SEND_FRAME_MESSAGE, text, name: project.name }, window.location.origin);
}
