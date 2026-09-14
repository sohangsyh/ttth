/**
 * TensionFX.tsx
 * ---------------------------------------------------------------------------
 * Post-processing stack that visually communicates the narrator's rising
 * panic. Supersedes the earlier PostFX.tsx (that file is now unused/removed
 * — mounting two <EffectComposer> instances side by side would double up
 * full-screen passes and fight over the same effects).
 *
 * All effect parameters are mutated imperatively on refs inside useFrame,
 * NOT passed as changing React props — postprocessing effect instances are
 * plain imperative objects under a thin R3F wrapper, and animating them
 * through React's reconciler every frame would be both slower and less
 * frame-accurate than just setting `.darkness`/`.offset`/`.saturation`
 * directly, the same way CameraRig/LanternLight already treat THREE objects.
 *
 * Effects:
 *  - ChromaticAberration: RGB-split scaled by `heartRate`, with a small
 *    extra kick synced to each heartbeat (see getHeartbeatPulse). Skipped
 *    entirely in Performance Mode.
 *  - Vignette: darkens with overall tension AND pulses in sync with the
 *    REAL scheduled heartbeat audio timing (heartbeatClock.ts, written by
 *    HeartbeatAudio.tsx) — not a separately re-derived visual timer.
 *  - HueSaturation + BrightnessContrast: baseline desaturation/contrast
 *    that grows with tension, PLUS a momentary desaturation flash — synced
 *    to the same heartbeat pulse — active only during Chapters 7 & 8.
 *  - DepthOfField + Noise (film grain): DoF's focus point now tracks the
 *    LIVE camera-to-subject distance (cameraFocus.ts, written every frame
 *    by CameraRig.tsx) via the underlying effect's `worldFocusDistance`
 *    setter — real world units, confirmed against postprocessing's own
 *    type declarations rather than guessed. Both still gated by their
 *    Director Workbench toggles; DoF is additionally forced off by
 *    Performance Mode.
 *  - Chapter 8 climax flash: a brief brightness/color-push spike on entry —
 *    see climaxFlash.ts for why this reuses existing effects rather than
 *    adding an unverified new one.
 *
 * WEBXR: the entire EffectComposer is skipped while presenting. Screen-space
 * post-processing stacks like this one aren't generally built for stereo/
 * multiview rendering, and VR needs a much more consistent frame time than
 * flat-screen viewing tolerates — disabling the heaviest part of the render
 * pipeline in the headset is the conservative, safe choice here rather than
 * risking broken or doubled-up effects across the two eyes.
 * ---------------------------------------------------------------------------
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import {
  EffectComposer,
  ChromaticAberration,
  DepthOfField,
  Vignette,
  Noise,
  HueSaturation,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useStoryStore } from "../store/store";
import { useRendererStore } from "../store/rendererStore";
import { getAudioContext } from "../audio/audioContext";
import { getHeartbeatPulse } from "../audio/heartbeatClock";
import { cameraFocus } from "./cameraFocus";
import { getClimaxFlashAmount } from "./climaxFlash";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const mapLinear = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
};

const FEAR_CHAPTERS = new Set([7, 8]);

/**
 * @react-three/postprocessing's wrapper components declare their ref type
 * as `typeof <EffectClass>` (the constructor) rather than an instance —
 * a known upstream type-declaration mismatch (the ref you actually GET at
 * runtime is a real instance with `.offset`/`.darkness`/etc.). `any` refs
 * here are a deliberate, narrow workaround for that mismatch, not a general
 * escape hatch — everything else in this file stays strictly typed.
 */
type EffectInstanceRef = React.MutableRefObject<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function TensionFX() {
  const filmGrainEnabled = useRendererStore((state) => state.filmGrainEnabled);
  const depthOfFieldEnabled = useRendererStore((state) => state.depthOfFieldEnabled);
  const performanceMode = useRendererStore((state) => state.performanceMode);
  const isPresenting = useXR((state) => state.session !== undefined);

  const chromaticAberrationRef: EffectInstanceRef = useRef(null);
  const vignetteRef: EffectInstanceRef = useRef(null);
  const hueSaturationRef: EffectInstanceRef = useRef(null);
  const brightnessContrastRef: EffectInstanceRef = useRef(null);
  const depthOfFieldRef: EffectInstanceRef = useRef(null);

  useFrame(() => {
    if (isPresenting) return; // EffectComposer isn't even mounted below while presenting — nothing to update.

    const { heartRate, currentChapter } = useStoryStore.getState();
    const tension = (heartRate - 60) / (140 - 60); // 0..1

    const audioCtx = getAudioContext();
    const pulse = audioCtx ? getHeartbeatPulse(audioCtx.currentTime) : 0; // 0..1, spikes right on each beat
    const climax = getClimaxFlashAmount(); // 0..1, decays after Ch8 entry

    // ---- Depth of field: focus point tracks the LIVE camera-to-subject
    // distance (see cameraFocus.ts), written every frame by CameraRig.tsx.
    if (depthOfFieldRef.current) {
      depthOfFieldRef.current.worldFocusDistance = cameraFocus.distance;
    }

    // ---- Chromatic aberration: heart-rate baseline + a small per-beat kick.
    if (chromaticAberrationRef.current) {
      const baseOffset = mapLinear(heartRate, 60, 140, 0.0006, 0.0032);
      const offset = baseOffset * (1 + pulse * 0.4) * (1 + climax * 1.5);
      chromaticAberrationRef.current.offset.set(offset, offset);
    }

    // ---- Vignette: tension-scaled darkness, pulsing with the real heartbeat,
    // briefly RELAXED during Ch8's blinding flash (a flash washes OUT the
    // frame — tightening the vignette further would fight that).
    if (vignetteRef.current) {
      const baseDarkness = mapLinear(tension, 0, 1, 0.85, 1.15);
      vignetteRef.current.darkness = Math.max(0, baseDarkness + pulse * 0.12 - climax * 0.6);
    }

    // ---- Fear shift: heavy contrast + momentary desaturation, Ch.7/8 only.
    const fear = FEAR_CHAPTERS.has(currentChapter) ? 1 : 0;

    if (brightnessContrastRef.current) {
      brightnessContrastRef.current.contrast = mapLinear(tension, 0, 1, 0, 0.1) + fear * 0.18;
      brightnessContrastRef.current.brightness = climax * 0.7; // the "blinding strobe" itself
    }
    if (hueSaturationRef.current) {
      const restingDesaturation = -tension * 0.15 - fear * 0.1;
      const beatFlash = fear * pulse * 0.55; // brief near-grayscale dip right on each thump
      // Climax pushes hue toward red/sepia while ALSO pulling saturation back
      // up out of the resting desaturation — an approximation of the
      // brief's "blood-red/sepia glitch overlay", see climaxFlash.ts's caveat.
      hueSaturationRef.current.hue = climax * 0.35;
      hueSaturationRef.current.saturation = clamp(restingDesaturation - beatFlash + climax * 0.4, -1, 1);
    }
  });

  if (isPresenting) return null;

  return (
    <EffectComposer multisampling={performanceMode ? 0 : 4}>
      <>
        {depthOfFieldEnabled && !performanceMode && (
          <DepthOfField ref={depthOfFieldRef} focalLength={0.045} bokehScale={3} height={480} />
        )}

        {!performanceMode && (
          <ChromaticAberration ref={chromaticAberrationRef} radialModulation={false} modulationOffset={0} />
        )}

        <Vignette ref={vignetteRef} eskil={false} offset={0.25} darkness={0.9} blendFunction={BlendFunction.NORMAL} />

        <BrightnessContrast ref={brightnessContrastRef} contrast={0} brightness={0} />
        <HueSaturation ref={hueSaturationRef} hue={0} saturation={0} />

        {filmGrainEnabled && <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />}
      </>
    </EffectComposer>
  );
}
