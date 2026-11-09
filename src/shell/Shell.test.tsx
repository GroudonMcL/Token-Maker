import { act, render } from '@testing-library/react';
import { FRAME_MESSAGE, FRAME_RECEIVED_MESSAGE, READY_MESSAGE, SEND_FRAME_MESSAGE } from './messages';
import { Shell } from './Shell';

/** Both apps' frames, with Token Maker's postMessage recorded. */
function setup() {
  localStorage.setItem('token-studio:app', 'frame-maker');
  render(<Shell />);
  const [tokenMaker, frameMaker] = [...document.querySelectorAll('iframe')].map((f) => f.contentWindow!);
  const posted = vi.spyOn(tokenMaker!, 'postMessage').mockImplementation(() => {});
  const send = (source: Window, data: unknown, origin = window.location.origin) =>
    act(() => void window.dispatchEvent(new MessageEvent('message', { data, origin, source })));
  const frames = () => posted.mock.calls.map(([msg]) => msg as { type: string; text: string; id: number }).filter((m) => m.type === FRAME_MESSAGE);
  return { tokenMaker: tokenMaker!, frameMaker: frameMaker!, send, frames };
}

describe('the site page passing designs from Frame Maker to Token Maker', () => {
  afterEach(() => localStorage.clear());

  it('waits until Token Maker is ready, and sends a design again if Token Maker reloads before it arrives', () => {
    const { tokenMaker, frameMaker, send, frames } = setup();
    send(frameMaker, { type: SEND_FRAME_MESSAGE, text: 'design 1' });
    expect(frames()).toEqual([]);

    send(tokenMaker, { type: READY_MESSAGE });
    expect(frames().map((m) => m.text)).toEqual(['design 1']);
    const { id } = frames()[0]!;

    // Token Maker reloads before it took the design: the new page gets it.
    send(tokenMaker, { type: READY_MESSAGE });
    expect(frames().map((m) => m.text)).toEqual(['design 1', 'design 1']);

    // Once it says the design arrived, a later reload doesn't send it again.
    send(tokenMaker, { type: FRAME_RECEIVED_MESSAGE, id });
    send(tokenMaker, { type: READY_MESSAGE });
    send(frameMaker, { type: SEND_FRAME_MESSAGE, text: 'design 2' });
    expect(frames().map((m) => m.text)).toEqual(['design 1', 'design 1', 'design 2']);
  });

  it('ignores designs from other windows, other sites and Token Maker itself', () => {
    const { tokenMaker, frameMaker, send, frames } = setup();
    send(tokenMaker, { type: READY_MESSAGE });
    send(window, { type: SEND_FRAME_MESSAGE, text: 'from the page itself' });
    send(tokenMaker, { type: SEND_FRAME_MESSAGE, text: 'from Token Maker' });
    send(frameMaker, { type: SEND_FRAME_MESSAGE, text: 'from another site' }, 'https://elsewhere.example');
    expect(frames()).toEqual([]);
  });
});
