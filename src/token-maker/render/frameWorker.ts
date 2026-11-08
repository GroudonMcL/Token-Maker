// Sends Frame Maker designs to be drawn at the editor's big view size in a
// Web Worker (frame.worker.ts), one at a time. Only the newest waiting job is
// kept: a design picked and then another picked straight after only draws
// the second. Where workers or OffscreenCanvas aren't available (tests,
// old browsers), frameWorkerReady() is false and the renderer draws the
// frame itself, as before.

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { FrameProject } from '../frameMaker/project/types';
import type { FrameGeometry } from './frameKit';

// The messages to and from the worker (kept here, so code that only draws doesn't pull in the worker's font files).
export type FrameWorkerRequest = { id: number; project: FrameProject; g: FrameGeometry; size: number };
export type FrameWorkerResponse = { id: number; bitmap: ImageBitmap } | { id: number; failed: string };

/** Goes up whenever a frame arrives from the worker (or the worker gives up), so the preview redraws. */
const versionStore = createStore(() => ({ version: 0 }));
export const useFrameWorkerVersion = () => useStore(versionStore, (s) => s.version);
const bump = () => versionStore.setState((s) => ({ version: s.version + 1 }));

interface Job {
  id: number;
  key: string;
  project: FrameProject;
  g: FrameGeometry;
  size: number;
  done: (frame: ImageBitmap) => void;
}

let worker: Worker | null | undefined;
let nextId = 1;
let running: Job | null = null;
let waiting: Job | null = null;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker =
      typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined'
        ? null
        : new Worker(new URL('./frame.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }
  if (worker) {
    worker.onmessage = (e: MessageEvent<FrameWorkerResponse>) => finish(e.data);
    worker.onerror = () => giveUp();
  }
  return worker;
}

/** The worker couldn't start or failed: the renderer draws frames itself from now on. */
function giveUp() {
  worker?.terminate();
  worker = null;
  running = waiting = null;
  bump();
}

/** Whether designs can be drawn in the worker. */
export const frameWorkerReady = () => getWorker() !== null;

/** Whether the frame with this key is being drawn or waiting to be. */
export const framePending = (key: string) => running?.key === key || waiting?.key === key;

/**
 * Asks for `project` drawn on band `g` on a `size`×`size` canvas (origin at
 * the centre, as drawFrameDesign draws it). `done` gets the picture, then the
 * preview is told to redraw. Asking again for the same key does nothing.
 */
export function requestDesignFrame(key: string, project: FrameProject, g: FrameGeometry, size: number, done: (frame: ImageBitmap) => void): void {
  if (framePending(key)) return;
  waiting = { id: nextId++, key, project, g, size, done };
  pump();
}

function pump() {
  if (running || !waiting) return;
  const w = getWorker();
  if (!w) return;
  const job = (running = waiting);
  waiting = null;
  try {
    w.postMessage({ id: job.id, project: job.project, g: job.g, size: job.size } satisfies FrameWorkerRequest);
  } catch {
    // The design couldn't be sent (it isn't plain data): draw frames here instead.
    giveUp();
  }
}

function finish(msg: FrameWorkerResponse) {
  const job = running;
  if (!job || job.id !== msg.id) return;
  running = null;
  if ('bitmap' in msg) job.done(msg.bitmap);
  else return giveUp();
  bump();
  pump();
}
