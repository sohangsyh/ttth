/**
 * MasterVolumeSync.tsx
 * ---------------------------------------------------------------------------
 * Applies the Director Workbench's master volume slider (persisted in
 * rendererStore) to the shared audio bus. Mirrors ExposureSync.tsx's
 * pattern for the visual side.
 *
 * Uses useFrame rather than a useEffect keyed on `masterVolume` because the
 * AudioContext may not exist yet the instant this mounts (it's created
 * lazily, on first use, elsewhere) — polling each frame and only writing
 * when the bus's actual gain has drifted from the target is cheap and
 * naturally self-corrects once the context does exist.
 * ---------------------------------------------------------------------------
 */

import { useFrame } from "@react-three/fiber";
import { getAudioContext } from "../audio/audioContext";
import { getMasterAudioBus } from "../audio/masterBus";
import { useRendererStore } from "../store/rendererStore";

export function MasterVolumeSync() {
  useFrame(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const masterVolume = useRendererStore.getState().masterVolume;
    const bus = getMasterAudioBus(ctx);
    if (Math.abs(bus.gain.value - masterVolume) > 0.001) {
      bus.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.15);
    }
  });

  return null;
}
