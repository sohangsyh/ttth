/**
 * SoundManager.tsx
 * ---------------------------------------------------------------------------
 * Ambient atmosphere and positional sound effects, layered on top of the
 * existing HeartbeatAudio.tsx (which owns the heartbeat specifically — this
 * file deliberately doesn't touch it, just shares its listener-sync utility
 * and its lookahead-scheduler technique).
 *
 * Layers:
 *  - Wind + room tone: a continuous, non-positional ambient bed. Volume
 *    tracks BOTH tension (heartRate) and an explicit Chapter 7/8 max-out,
 *    same dual-driver approach as heartbeatSynth.ts's heartRateToGain.
 *  - Pocket watch: positional (anchored near the bed), a constant, steady
 *    tick — deliberately NOT scaled by tension, as a grounding contrast to
 *    the racing heartbeat.
 *  - Police footsteps: positional (anchored near the room's entry), silent
 *    before Chapter 6, present from Chapter 6 ("The Arrival") onward.
 *  - Floorboard creaks: positional one-shots, triggered externally via
 *    audio/floorCreak.ts's pub/sub (from CameraRig.tsx while walking in
 *    free-cam mode, and from Floorboards.tsx on click) rather than owned
 *    here — this file just plays whatever position it's told, when it's told.
 *
 * Chapter 6 state sync: subscribes to chapterEvents.ts's onChapterEnter and,
 * on entering Chapter 6, nudges `heartRate` down slightly — "I smiled — for
 * what had I to fear?" — layered ON TOP of whatever setChapter's own
 * baseline sync already applied, not fighting it.
 *
 * Autoplay: does NOT re-implement the unlock flow — ui/StartExperienceOverlay.tsx
 * is the authoritative gesture-driven unlock, called before this component
 * (or even SceneCanvas) ever mounts. `unlockAudioContextOnFirstGesture` here
 * is only a defensive fallback in case that resume() call ever fails.
 *
 * Mount once inside <Canvas> (see SceneCanvas.tsx). Renders nothing visual.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStoryStore } from "../store/store";
import {
  getAudioContext,
  unlockAudioContextOnFirstGesture,
  syncListenerToCamera,
  type CompatAudioListener,
} from "./audioContext";
import {
  createNoiseBuffer,
  createWindLayer,
  createRoomToneLayer,
  scheduleWatchTick,
  scheduleFootstepThud,
  scheduleCreakBurst,
  chapterAmbientBoost,
  policeFootstepIntensity,
  type AmbientLayer,
} from "./ambientSynth";
import { onFloorCreak } from "./floorCreak";
import { onChapterEnter } from "../scene/chapterEvents";
import { getMasterAudioBus } from "./masterBus";

/** Near the bed/nightstand — see Room.tsx / Props.tsx for the matching visual placement. */
const WATCH_POSITION: [number, number, number] = [1.1, 0.6, -1.7];
/** Near the room's entry/doorway, where the officers arrive from in Ch.6. */
const FOOTSTEP_POSITION: [number, number, number] = [0, 0, 2.4];

const WATCH_TICK_INTERVAL_SECONDS = 1; // a steady one-tick-per-second pocket watch
const FOOTSTEP_INTERVAL_SECONDS = 0.55;
const SCHEDULE_LOOKAHEAD_SECONDS = 0.12;
const AMBIENT_GAIN_TIME_CONSTANT = 1.2; // slow, cinematic fades rather than snappy ones
const FOOTSTEP_GAIN_TIME_CONSTANT = 1.5;

export function SoundManager() {
  const { camera } = useThree();

  const forwardScratch = useRef(new THREE.Vector3());
  const upScratch = useRef(new THREE.Vector3());

  const ambientGainRef = useRef<GainNode | null>(null);
  const windRef = useRef<AmbientLayer | null>(null);
  const roomToneRef = useRef<AmbientLayer | null>(null);

  const watchPannerRef = useRef<PannerNode | null>(null);
  const nextWatchTickRef = useRef<number | null>(null);
  const watchTickCountRef = useRef(0);

  const footstepPannerRef = useRef<PannerNode | null>(null);
  const footstepGainRef = useRef<GainNode | null>(null);
  const nextFootstepRef = useRef<number | null>(null);

  const noiseBufferRef = useRef<AudioBuffer | null>(null);

  // ---- One-time audio graph setup -----------------------------------------
  useEffect(() => {
    const ctx = getAudioContext();
    if (!ctx) return; // Web Audio API unsupported in this environment

    unlockAudioContextOnFirstGesture(ctx); // defensive fallback only — see file header

    const noiseBuffer = createNoiseBuffer(ctx, 2);
    noiseBufferRef.current = noiseBuffer;

    // --- Ambient bed: wind + room tone, both feeding one shared gain so
    // there's a single value to ramp based on tension/chapter each frame.
    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(getMasterAudioBus(ctx));
    ambientGainRef.current = ambientGain;

    const wind = createWindLayer(ctx, ambientGain, noiseBuffer);
    wind.gain.gain.value = 0.5; // relative balance within the bed
    windRef.current = wind;

    const roomTone = createRoomToneLayer(ctx, ambientGain);
    roomTone.gain.gain.value = 0.6;
    roomToneRef.current = roomTone;

    // --- Pocket watch: fixed position, always-on, own direct connection
    // (deliberately NOT routed through ambientGain — its volume stays
    // constant regardless of tension; see the file header).
    const watchPanner = ctx.createPanner();
    watchPanner.panningModel = "HRTF";
    watchPanner.distanceModel = "inverse";
    watchPanner.refDistance = 0.5;
    watchPanner.rolloffFactor = 1.5;
    watchPanner.maxDistance = 10;
    watchPanner.positionX.value = WATCH_POSITION[0];
    watchPanner.positionY.value = WATCH_POSITION[1];
    watchPanner.positionZ.value = WATCH_POSITION[2];
    watchPanner.connect(getMasterAudioBus(ctx));
    watchPannerRef.current = watchPanner;

    // --- Police footsteps: fixed position, gain ramped in from Ch.6 onward.
    const footstepGain = ctx.createGain();
    footstepGain.gain.value = 0;
    const footstepPanner = ctx.createPanner();
    footstepPanner.panningModel = "HRTF";
    footstepPanner.distanceModel = "inverse";
    footstepPanner.refDistance = 1;
    footstepPanner.rolloffFactor = 1.2;
    footstepPanner.maxDistance = 12;
    footstepPanner.positionX.value = FOOTSTEP_POSITION[0];
    footstepPanner.positionY.value = FOOTSTEP_POSITION[1];
    footstepPanner.positionZ.value = FOOTSTEP_POSITION[2];
    footstepPanner.connect(footstepGain);
    footstepGain.connect(getMasterAudioBus(ctx));
    footstepPannerRef.current = footstepPanner;
    footstepGainRef.current = footstepGain;

    // --- Chapter 6 ("The Arrival"): a brief false calm as the officers
    // arrive, layered ON TOP of setChapter's own baseline heart-rate sync.
    const unsubscribeChapterSix = onChapterEnter((chapterId) => {
      if (chapterId === 6) {
        useStoryStore.getState().adjustHeartRate(-8);
      }
    });

    // --- Floorboard creaks: one-shot, positional, created fresh per event
    // since (unlike the watch/footsteps) each creak can come from a
    // different position — see floorCreak.ts.
    const unsubscribeCreak = onFloorCreak((position) => {
      if (!noiseBufferRef.current) return;
      const panner = ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 0.4;
      panner.rolloffFactor = 2;
      panner.maxDistance = 8;
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
      panner.connect(getMasterAudioBus(ctx));
      scheduleCreakBurst(ctx, panner, ctx.currentTime + 0.01, noiseBufferRef.current);
      window.setTimeout(() => panner.disconnect(), 500); // outlives the burst's own envelope
    });

    return () => {
      unsubscribeChapterSix();
      unsubscribeCreak();
      wind.stop();
      roomTone.stop();
      ambientGain.disconnect();
      watchPanner.disconnect();
      footstepPanner.disconnect();
      footstepGain.disconnect();
    };
  }, []);

  // ---- Per-frame: listener sync, gain ramps, and the two discrete schedulers
  useFrame(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    syncListenerToCamera(
      ctx.listener as unknown as CompatAudioListener,
      camera,
      forwardScratch.current,
      upScratch.current,
    );

    const { heartRate, currentChapter } = useStoryStore.getState();
    const tension = (heartRate - 60) / (140 - 60);

    // Ambient bed: tension-driven AND an explicit Ch.7/8 max-out, whichever is higher.
    if (ambientGainRef.current) {
      const target = Math.max(tension, chapterAmbientBoost(currentChapter)) * 0.32; // 0.32 = overall bed ceiling — kept below the heartbeat's resting level (see heartbeatSynth.ts) so wind/room-tone reads as background, not foreground
      ambientGainRef.current.gain.setTargetAtTime(target, ctx.currentTime, AMBIENT_GAIN_TIME_CONSTANT);
    }

    // Police footsteps presence: silent before Ch.6, present from Ch.6 on.
    if (footstepGainRef.current) {
      const target = policeFootstepIntensity(currentChapter) * 0.6;
      footstepGainRef.current.gain.setTargetAtTime(target, ctx.currentTime, FOOTSTEP_GAIN_TIME_CONSTANT);
    }

    // Watch: constant steady ticking throughout the ENTIRE story, not gated by chapter.
    if (watchPannerRef.current) {
      if (nextWatchTickRef.current === null) nextWatchTickRef.current = ctx.currentTime + 0.1;
      let nextTick = nextWatchTickRef.current;
      while (nextTick < ctx.currentTime + SCHEDULE_LOOKAHEAD_SECONDS) {
        const accent = watchTickCountRef.current % 2 === 0;
        scheduleWatchTick(ctx, watchPannerRef.current, nextTick, accent);
        watchTickCountRef.current += 1;
        nextTick += WATCH_TICK_INTERVAL_SECONDS;
      }
      nextWatchTickRef.current = nextTick;
    }

    // Footstep rhythm: only actually scheduled from Ch.6 on (inaudible until
    // the gain ramp above catches up, but no point running the scheduler earlier).
    if (footstepPannerRef.current && currentChapter >= 6) {
      if (nextFootstepRef.current === null) nextFootstepRef.current = ctx.currentTime + 0.1;
      let nextStep = nextFootstepRef.current;
      while (nextStep < ctx.currentTime + SCHEDULE_LOOKAHEAD_SECONDS) {
        scheduleFootstepThud(ctx, footstepPannerRef.current, nextStep, 1);
        nextStep += FOOTSTEP_INTERVAL_SECONDS;
      }
      nextFootstepRef.current = nextStep;
    } else {
      // Reset rather than let it sit stale — prevents a burst of "catch-up"
      // footsteps if the viewer scrubs back before Ch.6 and forward again later.
      nextFootstepRef.current = null;
    }
  });

  return null;
}
