// The blend mode choices, shared by the Effects and Lighting tabs.

import type { BlendMode } from '../document/types';

export const BLENDS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply (darken)' },
  { value: 'screen', label: 'Screen (lighten)' },
  { value: 'overlay', label: 'Overlay (contrast)' },
  { value: 'soft-light', label: 'Soft light' },
];
