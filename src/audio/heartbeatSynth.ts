/**
 * heartbeatSynth.ts
 * ---------------------------------------------------------------------------
 * Pure Web Audio building blocks for the heartbeat: heartRate -> tempo/gain/
 * playback-rate mapping helpers, plus a procedural "lub-DUB" thump
 * synthesizer used whenever no external audio file is available (see
 * `tryLoadAudioBuffer` in audioContext.ts).
 *
 * Framework-agnostic — no React or Three.js imports — so it's reusable
 * outside the 3D scene if ever needed.
 * ---------------------------------------------------------------------------
 */

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const mapLinear = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
};

export const HEART_RATE_RANGE = { min: 60, max: 140 } as const;

/** Seconds between successive heartbeats (one "beat" = one lub+dub pair). */
export function bpmToBeatInterval(bpm: number): number {
  return 60 / clamp(bpm, 30, 220);
}

/**
 * Overall loudness for the heartbeat mix. Scales with `heartRate` directly,
 * PLUS an extra multiplier as the chapter itself climbs toward 7/8 — so the
 * mix reads as "the story is closing in", not just "heart rate happens to
 * be numerically high".
 */
export function heartRateToGain(bpm: number, chapterId: number): number {
  const base = mapLinear(bpm, HEART_RATE_RANGE.min, HEART_RATE_RANGE.max, 0.3, 0.75);
  const chapterBoost = mapLinear(clamp(chapterId, 1, 8), 1, 8, 0.75, 1.6);
  return clamp(base * chapterBoost, 0, 1);
}

/** Playback rate for a real audio-buffer thump — speeds up (and subtly raises pitch) the sample with tension. */
export function heartRateToPlaybackRate(bpm: number): number {
  return mapLinear(bpm, HEART_RATE_RANGE.min, HEART_RATE_RANGE.max, 0.85, 1.6);
}

export interface ThumpOptions {
  /** AudioContext clock time (seconds) at which the thump should begin. */
  time: number;
  /** Fundamental frequency of the thump in Hz. */
  frequency: number;
  /** Peak envelope gain, 0..1. */
  peakGain: number;
  /** Total duration of the thump in seconds. */
  duration: number;
  /** Lowpass cutoff in Hz — lower = more "muffled through the chest wall". */
  muffleCutoff: number;
}

/**
 * Schedules one procedural thud: a sine oscillator with a fast pitch-drop
 * envelope (gives it a percussive "thock" rather than a pure tone), a fast-
 * attack/exponential-decay amplitude envelope, and a lowpass filter for the
 * muffled, felt-more-than-heard quality of a real heartbeat.
 */
export function scheduleThump(
  ctx: AudioContext,
  destination: AudioNode,
  { time, frequency, peakGain, duration, muffleCutoff }: ThumpOptions,
): void {
  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency * 1.5, time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(frequency * 0.55, 1), time + duration);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(muffleCutoff, time);
  filter.Q.value = 0.7;

  const safePeak = Math.max(peakGain, 0.0001);
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(safePeak, time + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);

  oscillator.start(time);
  oscillator.stop(time + duration + 0.05);
  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
}

/**
 * Schedules a full "lub-DUB" pair. The gap between lub and dub compresses
 * slightly as heart rate rises, mirroring how systole shortens under
 * physiological stress.
 */
export function scheduleLubDub(
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  bpm: number,
  gain: number,
): void {
  const gapSeconds = mapLinear(bpm, HEART_RATE_RANGE.min, HEART_RATE_RANGE.max, 0.26, 0.16);

  // "Lub" — the louder, lower first heart sound (S1).
  scheduleThump(ctx, destination, {
    time,
    frequency: 52,
    peakGain: gain,
    duration: 0.16,
    muffleCutoff: 220,
  });

  // "Dub" — the softer, slightly higher second heart sound (S2).
  scheduleThump(ctx, destination, {
    time: time + gapSeconds,
    frequency: 68,
    peakGain: gain * 0.6,
    duration: 0.12,
    muffleCutoff: 260,
  });
}
