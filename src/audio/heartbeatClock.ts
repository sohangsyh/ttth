/**
 * heartbeatClock.ts
 * ---------------------------------------------------------------------------
 * Shared, plain mutable signal — same pattern as scene/cameraTransition.ts
 * and scene/chapterEvents.ts's cameraJolt: nothing needs to subscribe to
 * this reactively, so a Zustand store would be pure overhead.
 *
 * Written by HeartbeatAudio.tsx every time it schedules a beat. Read by
 * TensionFX.tsx every frame so the vignette/chromatic-aberration/desaturation
 * pulses lock to the ACTUAL scheduled audio timing rather than a separately
 * re-derived (and inevitably slightly out of phase) visual-only timer.
 * ---------------------------------------------------------------------------
 */

export interface HeartbeatClockState {
  /** AudioContext time (seconds) of the most recently scheduled beat's "lub". */
  lastBeatTime: number;
  /** Seconds between that beat and the next, at the moment it was scheduled. */
  beatInterval: number;
}

export const heartbeatClock: HeartbeatClockState = {
  lastBeatTime: 0,
  beatInterval: 1,
};

/**
 * 0..1 pulse envelope for the current instant: 1 right as a beat lands,
 * decaying exponentially toward the next one. `audioCurrentTime` should be
 * the SAME AudioContext clock HeartbeatAudio schedules against.
 */
export function getHeartbeatPulse(audioCurrentTime: number, decayRate = 6): number {
  const phase = (audioCurrentTime - heartbeatClock.lastBeatTime) / heartbeatClock.beatInterval;
  if (!Number.isFinite(phase) || phase < 0) return 0;
  return Math.exp(-phase * decayRate);
}
