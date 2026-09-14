/**
 * floorCreak.ts
 * ---------------------------------------------------------------------------
 * Tiny event bus — same shape as scene/chapterEvents.ts — for triggering a
 * one-shot creak sound at a given position. Callers throttle themselves
 * (this module doesn't de-dupe rapid triggers); SoundManager.tsx just plays
 * whatever it's told, when it's told.
 *
 * Triggered from:
 *  - CameraRig.tsx, periodically while WASD-moving in free/Director mode
 *    (simulating footsteps creaking the floor as the viewer walks).
 *  - scene/models/Floorboards.tsx, when a plank is clicked.
 * ---------------------------------------------------------------------------
 */

export interface CreakPosition {
  x: number;
  y: number;
  z: number;
}

type CreakHandler = (position: CreakPosition) => void;

const handlers = new Set<CreakHandler>();

/** Registers a handler to run whenever a creak is triggered. Returns an unsubscribe function. */
export function onFloorCreak(handler: CreakHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function triggerFloorCreak(position: CreakPosition): void {
  handlers.forEach((handler) => handler(position));
}
