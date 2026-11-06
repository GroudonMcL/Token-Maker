// The Keep inside choice (v13), shared by the Effects and Decor tabs.

import type { ClipTarget } from '../document/types';

/** What an effect or decoration can be kept inside (v13). */
export const CLIP_OPTIONS: { value: ClipTarget; label: string }[] = [
  { value: 'none', label: 'Nothing' },
  { value: 'token', label: 'Token' },
  { value: 'frame', label: 'Frame' },
  { value: 'background', label: 'Background' },
  { value: 'art', label: 'Art' },
];

/** The hint under the Keep inside buttons. */
export const clipHint = (c: ClipTarget) =>
  c === 'none'
    ? 'It can reach anywhere.'
    : c === 'token'
      ? 'Nothing outside the token’s outline is drawn.'
      : c === 'frame'
        ? 'Only drawn where the frame is.'
        : c === 'background'
          ? 'Only drawn inside the frame’s opening, where the background is.'
          : 'Only drawn on the art itself, not its see-through parts.';

