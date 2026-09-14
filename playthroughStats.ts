/**
 * playthroughStats.ts
 * ---------------------------------------------------------------------------
 * Shared, plain mutable object — same pattern as cameraTransition.ts and
 * chapterEvents.ts's cameraJolt. Written by PlaythroughStatsTracker.tsx
 * (mounted inside Canvas, sampling heartRate periodically), read ONCE by
 * CompletionScreen.tsx (DOM, outside Canvas) at the moment the story
 * completes — a one-time read at a rare event doesn't need Zustand's
 * subscription machinery.
 *
 * "Average heart rate spike" (the completion screen's headline stat) is
 * read as: the average of all periodic heartRate samples taken across the
 * whole session, alongside the single highest value reached (`peak`).
 * True spike-detection (identifying individual local maxima) would need a
 * more involved algorithm for marginal narrative value here — the running
 * average already tells the story ("your heart averaged 94 bpm — this
 * wasn't a calm read"), and `peak` covers the "spike" framing directly.
 * ---------------------------------------------------------------------------
 */

export interface PlaythroughStats {
  /** performance.now() timestamp when the session/tracker started, or null before the first sample. */
  startedAt: number | null;
  heartRateSum: number;
  sampleCount: number;
  peakHeartRate: number;
}

export const playthroughStats: PlaythroughStats = {
  startedAt: null,
  heartRateSum: 0,
  sampleCount: 0,
  peakHeartRate: 60,
};

export function recordHeartRateSample(heartRate: number): void {
  if (playthroughStats.startedAt === null) {
    playthroughStats.startedAt = performance.now();
  }
  playthroughStats.heartRateSum += heartRate;
  playthroughStats.sampleCount += 1;
  playthroughStats.peakHeartRate = Math.max(playthroughStats.peakHeartRate, heartRate);
}

export function resetPlaythroughStats(): void {
  playthroughStats.startedAt = null;
  playthroughStats.heartRateSum = 0;
  playthroughStats.sampleCount = 0;
  playthroughStats.peakHeartRate = 60;
}

export interface PlaythroughSummary {
  elapsedSeconds: number;
  averageHeartRate: number;
  peakHeartRate: number;
}

/** Snapshots the current stats into a display-ready summary. Safe to call at any time, not just on completion. */
export function getPlaythroughSummary(): PlaythroughSummary {
  const elapsedSeconds = playthroughStats.startedAt
    ? Math.round((performance.now() - playthroughStats.startedAt) / 1000)
    : 0;
  const averageHeartRate =
    playthroughStats.sampleCount > 0 ? Math.round(playthroughStats.heartRateSum / playthroughStats.sampleCount) : 60;

  return { elapsedSeconds, averageHeartRate, peakHeartRate: Math.round(playthroughStats.peakHeartRate) };
}
