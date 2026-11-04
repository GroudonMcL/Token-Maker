// Colour choices for ready-made designs: a design names a few colour slots
// (its band colour, its highlights…), each owning some of its layers by
// name. Picking a colour for a slot moves every colour in those layers by
// the same step round the colour wheel, in vividness and in lightness, so
// the design keeps its shading: black stays black, white stays white, and
// the lit and shaded ends of a gradient stay lit and shaded. Photo textures
// in those layers are turned by the same hue. Shadows are left alone.

import type { Effect, FrameProject, Layer } from './types';

export interface ColourSlot {
  id: string;
  /** Shown beside its colour picker ("Band colour"). */
  name: string;
  /** The colour the design was made in; picking it again gives the design unchanged. */
  default: string;
  /** Names of the layers it recolours (and everything inside them, for a group). */
  layers: readonly string[];
}

/** The colours chosen for a design's slots, by slot id. */
export type ColourChoices = Record<string, string>;

const HEX = /^#[0-9a-f]{6}$/i;
export const isHexColour = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

type Hsl = [number, number, number];
function toHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function toHex([h, s, l]: Hsl): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Moves a colour by the step from `from` to `to`. */
export function shiftColour(colour: string, from: string, to: string): string {
  const [h0, s0, l0] = toHsl(from);
  const [h1, s1, l1] = toHsl(to);
  const [h, s, l] = toHsl(colour);
  // A grey colour has no hue of its own: it takes the new one.
  const hue = s < 0.04 ? h1 : h + (h1 - h0);
  // From a nearly grey colour, vividness is added; otherwise scaled.
  const sat = s0 < 0.15 ? s + (s1 - s0) * (s < 0.04 ? 0.5 : 1) : s * (s1 / s0);
  // Lightness is stretched so 0 and 1 stay put and the slot's colour lands on the new one.
  const light = l <= l0 ? (l0 === 0 ? l : (l * l1) / l0) : l0 === 1 ? l : 1 - ((1 - l) * (1 - l1)) / (1 - l0);
  return toHex([((hue % 360) + 360) % 360, Math.max(0, Math.min(1, sat)), Math.max(0, Math.min(1, light))]);
}

function shiftValue(v: unknown, from: string, to: string): unknown {
  if (isHexColour(v)) return shiftColour(v, from, to);
  if (Array.isArray(v)) return v.map((x) => shiftValue(x, from, to));
  if (v && typeof v === 'object') {
    if ((v as Effect).kind === 'shadow') return v;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'id' || k === 'name' ? x : shiftValue(x, from, to)]));
  }
  return v;
}

/** The hue and vividness step for a photo texture, as an Adjust effect. */
function photoTurn(from: string, to: string): Effect | null {
  const [h0, s0] = toHsl(from);
  const [h1, s1] = toHsl(to);
  const hue = ((((h1 - h0) % 360) + 540) % 360) - 180;
  const saturation = s0 < 0.04 ? 0 : Math.max(-1, Math.min(1, s1 / s0 - 1));
  if (Math.abs(hue) < 0.5 && Math.abs(saturation) < 0.01) return null;
  return { kind: 'adjust', on: true, hue: Math.round(hue), saturation, brightness: 0, contrast: 0 };
}

function recolourLayer(layer: Layer, from: string, to: string): Layer {
  const shifted = shiftValue(layer, from, to) as Layer;
  const usesPhoto = JSON.stringify(layer).includes('"kind":"picture"');
  const turn = usesPhoto ? photoTurn(from, to) : null;
  return turn ? { ...shifted, effects: [turn, ...shifted.effects] } : shifted;
}

function walk(layers: Layer[], owner: (name: string) => ColourSlot | undefined, choices: ColourChoices): Layer[] {
  return layers.map((layer) => {
    const slot = owner(layer.name);
    const to = slot && choices[slot.id];
    if (slot && to && to.toLowerCase() !== slot.default.toLowerCase()) return recolourLayer(layer, slot.default, to);
    if (layer.type === 'group') return { ...layer, children: walk(layer.children, owner, choices) };
    return layer;
  });
}

/** The design in the chosen colours (slots left out keep their own). */
export function recolourProject(project: FrameProject, slots: readonly ColourSlot[], choices: ColourChoices): FrameProject {
  if (!slots.length) return project;
  const owner = (name: string) => slots.find((s) => s.layers.includes(name));
  return { ...project, layers: walk(project.layers, owner, choices) };
}

/** Only the choices that name a slot and hold a colour. */
export function cleanChoices(raw: unknown, slots: readonly ColourSlot[]): ColourChoices {
  const out: ColourChoices = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const s of slots) {
    const v = (raw as Record<string, unknown>)[s.id];
    if (isHexColour(v)) out[s.id] = v.toLowerCase();
  }
  return out;
}
