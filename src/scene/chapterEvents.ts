/**
 * chapterEvents.ts
 * ---------------------------------------------------------------------------
 * A tiny event bus for discrete, ONE-OFF "a chapter just began" side effects
 * — sound stingers, brief camera jolts, analytics, etc.
 *
 * This is deliberately separate from BedroomScene's floorboard-lift, which
 * is a CONTINUOUS animation driven by (chapterId, elapsed) and needs no
 * wiring here at all — it already reacts to the shared stores directly.
 * This bus is for effects that should fire exactly once, right as a chapter
 * starts, regardless of where the timeline scrubber lands afterward.
 *
 * `dispatchChapterEnter` is called by ChapterTransitionManager.tsx whenever
 * `currentChapter` changes.
 * ---------------------------------------------------------------------------
 */

type ChapterEnterHandler = (chapterId: number) => void;

const handlers = new Set<ChapterEnterHandler>();

/** Registers a handler to run whenever a chapter begins. Returns an unsubscribe function. */
export function onChapterEnter(handler: ChapterEnterHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function dispatchChapterEnter(chapterId: number): void {
  handlers.forEach((handler) => handler(chapterId));
}

// ----------------------------------------------------------------------------
// Story completion — a ONE-OFF signal for "Chapter 8 just finished playing",
// separate from progressStore.ts's PERSISTED `storyCompleted` flag. That
// flag should stay true forever once earned (it drives StartExperienceOverlay's
// "Read Again" wording on a LATER visit); this event should fire exactly once
// per actual completion and NOT re-trigger the completion screen on every
// page reload just because the persisted flag happens to already be true.
// ----------------------------------------------------------------------------

type StoryCompleteHandler = () => void;

const completeHandlers = new Set<StoryCompleteHandler>();

export function onStoryComplete(handler: StoryCompleteHandler): () => void {
  completeHandlers.add(handler);
  return () => completeHandlers.delete(handler);
}

export function dispatchStoryComplete(): void {
  completeHandlers.forEach((handler) => handler());
}

// ----------------------------------------------------------------------------
// Camera jolt — a brief decaying positional jitter, reusable from anywhere.
// Used automatically on Chapters 5 & 8 (the floorboard-prying beats) below,
// and also triggered on-demand by InteractiveScene.tsx (e.g. clicking the bed).
// ----------------------------------------------------------------------------

/** Default jolt decay duration, in milliseconds. */
export const CAMERA_JOLT_DURATION_MS = 450;

/**
 * Shared, plain (non-reactive) signal: CameraRig reads this every frame and
 * folds a small decaying positional jitter into the SAME place it already
 * writes camera.position — deliberately not a second system independently
 * mutating the camera, which would risk the two fighting each other.
 */
export const cameraJolt = {
  /** performance.now() timestamp after which the jolt has fully decayed. */
  activeUntil: 0,
  magnitude: 0,
  /** Decay duration for the CURRENTLY active jolt (may differ per trigger). */
  durationMs: CAMERA_JOLT_DURATION_MS,
};

/** Triggers a camera jolt. Callable from any component — see InteractiveScene.tsx. */
export function triggerCameraJolt(magnitude = 0.035, durationMs = CAMERA_JOLT_DURATION_MS): void {
  cameraJolt.activeUntil = performance.now() + durationMs;
  cameraJolt.magnitude = magnitude;
  cameraJolt.durationMs = durationMs;
}

onChapterEnter((chapterId) => {
  if (chapterId === 5 || chapterId === 8) {
    triggerCameraJolt();
  }
});
