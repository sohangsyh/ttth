/**
 * cameraMotionProfiles.ts
 * ---------------------------------------------------------------------------
 * Each chapter has a distinct cinematographic "character" beyond its
 * authored keyframe path — Chapter 1 should feel like an agonizing hand-
 * hover, Chapter 4 like handheld chaos, Chapter 7 like a locked-off shot
 * where only the SHADOWS move. This module supplies that character as a
 * small procedural offset (position + lookAt + roll) that CameraRig.tsx
 * layers ON TOP of the keyframe-interpolated base pose every frame —
 * exactly the same "compute an offset, apply it once at the shared tail"
 * pattern already used for cameraJolt.ts, just continuous instead of a
 * one-shot event.
 *
 * Pure functions, no React/Three.js imports — easy to reason about and unit
 * test in isolation from the render loop.
 * ---------------------------------------------------------------------------
 */

export type MotionProfile =
  | "hover-drift" // Ch1: agonizingly slow, tiny sway — a hand hovering in the dark
  | "clockwork-sweep" // Ch2: repetitive, measured lateral sweeps
  | "panic-snap" // Ch3: tremor that spikes sharply then holds tense
  | "dutch-chaos" // Ch4: violent handheld shake + rolling dutch angle
  | "top-down-still" // Ch5: deliberately near-motionless — the plank animation carries the scene
  | "steady-clinical" // Ch6: calm, barely-perceptible sway — forced composure
  | "locked-breathing" // Ch7: camera locked off; only a faint vertical "breath"
  | "frenetic-collapse"; // Ch8: frenetic shake that hard-settles near the chapter's end

export interface MotionOffset {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  /** Camera roll in radians, applied around the view axis AFTER lookAt (true dutch-angle tilt). */
  roll: number;
}

const ZERO_OFFSET: MotionOffset = {
  position: { x: 0, y: 0, z: 0 },
  lookAt: { x: 0, y: 0, z: 0 },
  roll: 0,
};

function hoverDrift(t: number): MotionOffset {
  const s = t * 0.15; // very slow cycle
  return {
    position: { x: Math.sin(s) * 0.015, y: Math.sin(s * 1.3 + 1) * 0.01, z: Math.cos(s * 0.7) * 0.01 },
    lookAt: { x: Math.sin(s * 0.9) * 0.012, y: 0, z: 0 },
    roll: 0,
  };
}

function clockworkSweep(t: number): MotionOffset {
  const cycleSeconds = 6;
  const phase = ((t % cycleSeconds) / cycleSeconds) * Math.PI * 2;
  const sweep = Math.sin(phase) * 0.05;
  return {
    position: { x: sweep, y: 0, z: 0 },
    lookAt: { x: sweep * 1.4, y: 0, z: 0 },
    roll: 0,
  };
}

function panicSnap(t: number): MotionOffset {
  // Tremor is strongest in the chapter's first ~20s (the "startled" beat is
  // authored into the keyframes themselves), then holds a low residual shake.
  const tremor = 0.15 + Math.max(0, 1 - t / 20) * 0.85;
  const jitter = tremor * 0.045;
  return {
    position: {
      x: (Math.sin(t * 37) + Math.sin(t * 53)) * jitter,
      y: Math.sin(t * 41) * jitter * 0.6,
      z: 0,
    },
    lookAt: { x: Math.sin(t * 47) * jitter * 1.3, y: 0, z: 0 },
    roll: Math.sin(t * 29) * tremor * 0.02,
  };
}

function dutchChaos(t: number): MotionOffset {
  const amp = 0.07;
  return {
    position: {
      x: Math.sin(t * 6.1) * amp,
      y: Math.sin(t * 8.3 + 2) * amp * 0.6,
      z: Math.sin(t * 5.2) * amp * 0.5,
    },
    lookAt: { x: Math.sin(t * 7.4) * amp * 1.2, y: Math.sin(t * 6.7) * amp * 0.5, z: 0 },
    roll: Math.sin(t * 3.3) * 0.16 + Math.sin(t * 9.1) * 0.05,
  };
}

function steadyClinical(t: number): MotionOffset {
  const s = t * 0.08;
  return {
    position: { x: Math.sin(s) * 0.008, y: 0, z: 0 },
    lookAt: ZERO_OFFSET.lookAt,
    roll: 0,
  };
}

function lockedBreathing(t: number): MotionOffset {
  const breath = Math.sin(t * 0.35) * 0.006;
  return {
    position: { x: 0, y: breath, z: 0 },
    lookAt: ZERO_OFFSET.lookAt,
    roll: 0,
  };
}

function freneticCollapse(t: number, chapterDuration: number): MotionOffset {
  // Frenetic through ~85% of the chapter, then decays to a dead stop —
  // matches the brief's "frenetic movement ending in a dead stop" beat.
  const settleStart = chapterDuration * 0.85;
  const intensity = t < settleStart ? 1 : Math.max(0, 1 - (t - settleStart) / Math.max(chapterDuration - settleStart, 0.001));
  const amp = 0.1 * intensity;
  return {
    position: {
      x: (Math.sin(t * 11) + Math.sin(t * 17)) * amp,
      y: Math.sin(t * 13) * amp * 0.7,
      z: Math.sin(t * 9) * amp * 0.5,
    },
    lookAt: { x: Math.sin(t * 15) * amp * 1.3, y: Math.sin(t * 12) * amp * 0.6, z: 0 },
    roll: Math.sin(t * 6) * 0.12 * intensity,
  };
}

export function getMotionOffset(profile: MotionProfile, elapsed: number, chapterDuration: number): MotionOffset {
  switch (profile) {
    case "hover-drift":
      return hoverDrift(elapsed);
    case "clockwork-sweep":
      return clockworkSweep(elapsed);
    case "panic-snap":
      return panicSnap(elapsed);
    case "dutch-chaos":
      return dutchChaos(elapsed);
    case "top-down-still":
      return ZERO_OFFSET; // deliberate — see the profile's doc comment above
    case "steady-clinical":
      return steadyClinical(elapsed);
    case "locked-breathing":
      return lockedBreathing(elapsed);
    case "frenetic-collapse":
      return freneticCollapse(elapsed, chapterDuration);
    default:
      return ZERO_OFFSET;
  }
}
