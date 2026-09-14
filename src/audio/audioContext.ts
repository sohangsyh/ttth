/**
 * audioContext.ts
 * ---------------------------------------------------------------------------
 * Lazily creates a single, shared AudioContext for the whole app (there's
 * never a reason for more than one here), and handles the "must resume
 * after a real user gesture" autoplay restriction that all major browsers
 * enforce on the Web Audio API.
 * ---------------------------------------------------------------------------
 */

import type * as THREE from "three";

let sharedContext: AudioContext | null = null;

/** Returns the shared AudioContext, creating it on first call. SSR-safe — returns null on the server. */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedContext) return sharedContext;

  const AudioContextCtor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null; // Web Audio API unsupported in this environment
  sharedContext = new AudioContextCtor();
  return sharedContext;
}

/**
 * Browsers block audio playback until a genuine user gesture occurs. This
 * attaches one-time listeners that resume the context on the first
 * pointer/key/touch interaction, then remove themselves.
 */
export function unlockAudioContextOnFirstGesture(ctx: AudioContext): void {
  if (typeof window === "undefined" || ctx.state !== "suspended") return;

  const resume = () => {
    ctx.resume().catch(() => {
      /* Ignore — if this attempt fails, the next gesture will retry. */
    });
  };

  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });
  window.addEventListener("touchstart", resume, { once: true });
}

/**
 * Attempts to fetch + decode an audio file. Resolves to `null` on ANY
 * failure — missing file (404), network error, unsupported codec, corrupt
 * data — so callers can transparently fall back to procedural synthesis
 * without special-casing the error type.
 */
export async function tryLoadAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Shared AudioListener <-> R3F camera sync
// ----------------------------------------------------------------------------
// Both HeartbeatAudio.tsx and SoundManager.tsx need the listener positioned
// at the camera every frame for their PannerNodes to spatialize correctly.
// Extracted here once both needed it, rather than each keeping its own copy.

/** Minimal shape covering both the modern AudioParam-based listener API and the deprecated method-based one. */
export interface CompatAudioListener {
  positionX?: AudioParam;
  positionY?: AudioParam;
  positionZ?: AudioParam;
  forwardX?: AudioParam;
  forwardY?: AudioParam;
  forwardZ?: AudioParam;
  upX?: AudioParam;
  upY?: AudioParam;
  upZ?: AudioParam;
  setPosition?: (x: number, y: number, z: number) => void;
  setOrientation?: (x: number, y: number, z: number, upX: number, upY: number, upZ: number) => void;
}

/** Copies the R3F camera's world position/orientation onto the AudioListener, handling both listener API generations. */
export function syncListenerToCamera(
  listener: CompatAudioListener,
  camera: THREE.Camera,
  forwardScratch: THREE.Vector3,
  upScratch: THREE.Vector3,
): void {
  camera.getWorldDirection(forwardScratch);
  upScratch.set(0, 1, 0).applyQuaternion(camera.quaternion);

  if (listener.positionX && listener.positionY && listener.positionZ) {
    listener.positionX.value = camera.position.x;
    listener.positionY.value = camera.position.y;
    listener.positionZ.value = camera.position.z;
    listener.forwardX!.value = forwardScratch.x;
    listener.forwardY!.value = forwardScratch.y;
    listener.forwardZ!.value = forwardScratch.z;
    listener.upX!.value = upScratch.x;
    listener.upY!.value = upScratch.y;
    listener.upZ!.value = upScratch.z;
  } else if (listener.setPosition) {
    // Deprecated method-based API, kept for older browser engines.
    listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
    listener.setOrientation?.(forwardScratch.x, forwardScratch.y, forwardScratch.z, upScratch.x, upScratch.y, upScratch.z);
  }
}
