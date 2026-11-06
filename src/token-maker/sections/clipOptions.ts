// The Keep inside choices (v14: several at once), shared by the Effects and Decor tabs.

import type { ClipTarget } from '../document/types';

/** What an effect or decoration can be kept inside, in the order they are offered. */
export const CLIP_OPTIONS: { value: ClipTarget; label: string }[] = [
  { value: 'token', label: 'Token' },
  { value: 'frame', label: 'Frame' },
  { value: 'background', label: 'Background' },
  { value: 'art', label: 'Art' },
  { value: 'popOut', label: 'Pop-out' },
  { value: 'outside', label: 'Outside' },
];

const PART: Record<ClipTarget, string> = {
  token: 'inside the token’s outline',
  frame: 'where the frame is',
  background: 'in the frame’s opening, up to the frame',
  art: 'on the art in the opening, not its see-through parts',
  popOut: 'on the parts of the art popping out',
  outside: 'outside the token',
};

/** `clip` with `t` chosen or not, kept in the order the buttons are in. */
export const toggleClip = (clip: readonly ClipTarget[], t: ClipTarget): ClipTarget[] =>
  CLIP_OPTIONS.map((o) => o.value).filter((v) => (v === t ? !clip.includes(t) : clip.includes(v)));

/** The hint under the Keep inside buttons. */
export function clipHint(clip: readonly ClipTarget[]): string {
  if (!clip.length) return 'It can reach anywhere.';
  const parts = clip.map((c) => PART[c]);
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
  return `Only drawn ${list}.`;
}
