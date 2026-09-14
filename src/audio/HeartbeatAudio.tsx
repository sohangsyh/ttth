/**
 * HeartbeatAudio.tsx
 * ---------------------------------------------------------------------------
 * Spatialized heartbeat audio engine.
 *
 * - Dynamic tempo & volume: both driven directly by useStoryStore's
 *   `heartRate` (60-140bpm) — tempo via the beat scheduler's interval, and
 *   volume via a gain node that also gets an extra boost as `currentChapter`
 *   climbs toward 7/8 (see heartRateToGain in heartbeatSynth.ts).
 * - Spatial anchoring: a single native PannerNode is anchored at
 *   `anchorPosition` (default [0, -1, 0] — directly beneath the floorboards),
 *   and the AudioListener's position/orientation is synced to the R3F
 *   camera every frame — so in BOTH cinematic and free-fly Director mode,
 *   the heartbeat pans and attenuates like a real sound source in the room.
 * - Fallback / synthesis: attempts to fetch + decode `audioUrl` once on
 *   mount. If that fails for ANY reason (no file present, 404, unsupported
 *   codec, ...) it transparently falls back to the procedural lub-dub
 *   synthesizer in heartbeatSynth.ts — no prop needs to change between the
 *   two cases, and the fallback is silent/automatic.
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
  tryLoadAudioBuffer,
  unlockAudioContextOnFirstGesture,
  syncListenerToCamera,
  type CompatAudioListener,
} from "./audioContext";
import { getMasterAudioBus } from "./masterBus";
import { bpmToBeatInterval, heartRateToGain, heartRateToPlaybackRate, scheduleLubDub } from "./heartbeatSynth";
import { heartbeatClock } from "./heartbeatClock";

export interface HeartbeatAudioProps {
  /** URL of an optional pre-recorded "thump-thump" one-shot/loop. Missing or broken -> synth fallback. */
  audioUrl?: string;
  /** World position the heartbeat is spatially anchored to — beneath the floorboards by default. */
  anchorPosition?: [number, number, number];
}

/** How far ahead of "now" we schedule audio events — the standard Web Audio lookahead-scheduler pattern. */
const SCHEDULE_LOOKAHEAD_SECONDS = 0.12;
/** Time constant (seconds) for gain ramps, so tempo/volume shifts never click or pop. */
const GAIN_SMOOTHING_TIME_CONSTANT = 0.4;

export function HeartbeatAudio({
  audioUrl = "/audio/heartbeat-loop.mp3",
  anchorPosition = [0, -1, 0],
}: HeartbeatAudioProps) {
  const { camera } = useThree();

  // Plain refs kept in sync via a manual store subscription (not useStoryStore(selector))
  // so this component never re-renders on heartRate's frequent updates — the
  // audio graph is mutated directly inside useFrame instead.
  const heartRateRef = useRef(useStoryStore.getState().heartRate);
  const chapterRef = useRef(useStoryStore.getState().currentChapter);
  const isPlayingRef = useRef(useStoryStore.getState().isPlaying);

  const pannerRef = useRef<PannerNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const nextBeatTimeRef = useRef<number | null>(null);

  const forwardScratch = useRef(new THREE.Vector3());
  const upScratch = useRef(new THREE.Vector3());

  useEffect(
    () =>
      useStoryStore.subscribe((state) => {
        heartRateRef.current = state.heartRate;
        chapterRef.current = state.currentChapter;
        isPlayingRef.current = state.isPlaying;
      }),
    [],
  );

  // ---- One-time audio graph setup: panner -> master gain -> destination ----
  useEffect(() => {
    const ctx = getAudioContext();
    if (!ctx) return; // Web Audio API unsupported in this environment

    unlockAudioContextOnFirstGesture(ctx);

    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 2; // was 1 — at the typical ~4-5 unit camera distance from the anchor, refDistance=1 attenuated the heartbeat too aggressively against the (non-positional, un-attenuated) ambient bed
    panner.rolloffFactor = 0.8; // was 1.2 — same reasoning; a gentler falloff keeps the heartbeat audible without losing spatialization entirely
    panner.maxDistance = 20;
    panner.coneInnerAngle = 360; // omnidirectional — a heartbeat has no "facing"
    panner.positionX.value = anchorPosition[0];
    panner.positionY.value = anchorPosition[1];
    panner.positionZ.value = anchorPosition[2];

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0; // ramped up once isPlaying + heartRate are known

    panner.connect(masterGain);
    masterGain.connect(getMasterAudioBus(ctx));

    pannerRef.current = panner;
    masterGainRef.current = masterGain;
    nextBeatTimeRef.current = null;

    let cancelled = false;
    tryLoadAudioBuffer(ctx, audioUrl).then((buffer) => {
      if (!cancelled) bufferRef.current = buffer; // null => procedural synth fallback stays active
    });

    return () => {
      cancelled = true;
      panner.disconnect();
      masterGain.disconnect();
      pannerRef.current = null;
      masterGainRef.current = null;
    };
    // anchorPosition is treated as fixed for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // ---- Per-frame: sync listener pose to the camera, run the beat scheduler ----
  useFrame(() => {
    const ctx = getAudioContext();
    const panner = pannerRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !panner || !masterGain) return;

    syncListenerToCamera(ctx.listener as unknown as CompatAudioListener, camera, forwardScratch.current, upScratch.current);

    // Smoothly ramp toward the target gain so heartRate/chapter changes never click.
    const targetGain = isPlayingRef.current ? heartRateToGain(heartRateRef.current, chapterRef.current) : 0;
    masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, GAIN_SMOOTHING_TIME_CONSTANT);

    if (!isPlayingRef.current) return;

    // Lookahead scheduler: queue every beat due within the next
    // SCHEDULE_LOOKAHEAD_SECONDS, each at its precise AudioContext-clock time.
    // (Worked on a local variable, not the ref directly, so TS can narrow
    // it past `null` inside the loop without an implicit-any self-reference.)
    let nextBeat = nextBeatTimeRef.current ?? ctx.currentTime + 0.05;

    while (nextBeat < ctx.currentTime + SCHEDULE_LOOKAHEAD_SECONDS) {
      const bpm = heartRateRef.current;
      const chapterId = chapterRef.current;
      const gain = heartRateToGain(bpm, chapterId);
      const beatTime = nextBeat;
      const beatInterval = bpmToBeatInterval(bpm);

      const buffer = bufferRef.current;
      if (buffer) {
        playBufferedThump(ctx, panner, buffer, beatTime, bpm, gain);
      } else {
        scheduleLubDub(ctx, panner, beatTime, bpm, gain);
      }

      // Let TensionFX (and anything else visual) sync to the REAL scheduled
      // beat time rather than re-deriving its own, inevitably-drifting timer.
      heartbeatClock.lastBeatTime = beatTime;
      heartbeatClock.beatInterval = beatInterval;

      nextBeat = beatTime + beatInterval;
    }

    nextBeatTimeRef.current = nextBeat;
  });

  return null;
}

/** Plays one shot of the external "thump-thump" buffer, sped/pitched by heartRate. */
function playBufferedThump(
  ctx: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  time: number,
  bpm: number,
  gain: number,
): void {
  const source = ctx.createBufferSource();
  const beatGain = ctx.createGain();

  source.buffer = buffer;
  source.playbackRate.value = heartRateToPlaybackRate(bpm);
  beatGain.gain.value = gain;

  source.connect(beatGain);
  beatGain.connect(destination);

  source.start(time);
  source.onended = () => {
    source.disconnect();
    beatGain.disconnect();
  };
}
