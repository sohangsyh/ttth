/**
 * PlaythroughStatsTracker.tsx
 * ---------------------------------------------------------------------------
 * Samples `heartRate` once a second into playthroughStats.ts. Deliberately
 * NOT sampling every frame — a per-second cadence is more than enough
 * resolution for a session-average stat, and avoids 60x/second writes for
 * no benefit.
 *
 * Mount once inside <Canvas> (see SceneCanvas.tsx).
 * ---------------------------------------------------------------------------
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStoryStore } from "../store/store";
import { recordHeartRateSample } from "./playthroughStats";

const SAMPLE_INTERVAL_SECONDS = 1;

export function PlaythroughStatsTracker() {
  const timeSinceLastSample = useRef(0);

  useFrame((_state, delta) => {
    timeSinceLastSample.current += delta;
    if (timeSinceLastSample.current < SAMPLE_INTERVAL_SECONDS) return;
    timeSinceLastSample.current = 0;
    recordHeartRateSample(useStoryStore.getState().heartRate);
  });

  return null;
}
