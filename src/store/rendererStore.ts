/**
 * rendererStore.ts
 * ---------------------------------------------------------------------------
 * Render/post-processing/audio settings exposed to the Director Workbench
 * panel. Persisted to localStorage via zustand's `persist` middleware —
 * this is exactly the kind of "graphics quality + preferences" data
 * requirement 1 asks to survive a reload, unlike storyStore's live
 * playback state (see progressStore.ts for why that's a separate store).
 *
 * `canvasElement` and `glRenderer` are live, non-serializable object
 * references — `partialize` below excludes them from what actually gets
 * written to localStorage; they're re-populated fresh by SceneCanvas on
 * every mount regardless.
 *
 * Unlike timelineStore.ts, these values change rarely (a user dragging a
 * slider a few times a session, not 60x/second), so a plain reactive
 * Zustand store — read via the normal `useRendererStore(selector)` hook —
 * is the right tool here; there's no re-render cost to worry about.
 *
 * Consumed by:
 *  - SceneCanvas.tsx    -> stores the live canvas element + renderer for
 *                          snapshotting, applies tone-mapping exposure
 *  - CameraRig.tsx      -> applies `freeFov` while cameraMode === 'free'
 *  - TensionFX.tsx      -> toggles Noise/DepthOfField/ChromaticAberration,
 *                          and `performanceMode` forces the two heaviest
 *                          effects (DoF, chromatic aberration) off regardless
 *                          of their individual toggles
 *  - scene/MasterVolumeSync.tsx -> applies `masterVolume` to the shared
 *                          audio master bus (audio/masterBus.ts)
 *  - media/mediaCapture.ts      -> uses `glRenderer` to temporarily boost
 *                          pixel ratio for high-res PNG snapshots
 * ---------------------------------------------------------------------------
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WebGLRenderer } from "three";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const EXPOSURE_EV_RANGE = { min: -2, max: 2 } as const;
export const FREE_FOV_RANGE = { min: 24, max: 90 } as const;

interface RendererState {
  /** Exposure compensation in photographic stops (EV). 0 = neutral. */
  exposureEV: number;
  /** Field of view (degrees) used ONLY while cameraMode === 'free'; cinematic mode is keyframe-authored. */
  freeFov: number;
  filmGrainEnabled: boolean;
  depthOfFieldEnabled: boolean;
  /** When true, TensionFX skips DepthOfField and ChromaticAberration entirely, regardless of their own toggles. */
  performanceMode: boolean;
  /** Master audio volume, 0..1 — applied to audio/masterBus.ts, everything routes through it. */
  masterVolume: number;
  /** The live WebGL canvas element, set once by SceneCanvas on mount — used for PNG snapshots. */
  canvasElement: HTMLCanvasElement | null;
  /** The live THREE.WebGLRenderer, set once by SceneCanvas on mount — used to temporarily boost resolution for high-res snapshots. */
  glRenderer: WebGLRenderer | null;

  setExposureEV: (ev: number) => void;
  setFreeFov: (fov: number) => void;
  setFilmGrainEnabled: (enabled: boolean) => void;
  setDepthOfFieldEnabled: (enabled: boolean) => void;
  setPerformanceMode: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  toggleFilmGrain: () => void;
  toggleDepthOfField: () => void;
  togglePerformanceMode: () => void;
  setCanvasElement: (el: HTMLCanvasElement | null) => void;
  setGLRenderer: (renderer: WebGLRenderer | null) => void;
}

export const useRendererStore = create<RendererState>()(
  persist(
    (set) => ({
      exposureEV: 0,
      freeFov: 50,
      filmGrainEnabled: true,
      depthOfFieldEnabled: true,
      performanceMode: false,
      masterVolume: 0.8,
      canvasElement: null,
      glRenderer: null,

      setExposureEV: (ev) => set({ exposureEV: clamp(ev, EXPOSURE_EV_RANGE.min, EXPOSURE_EV_RANGE.max) }),
      setFreeFov: (fov) => set({ freeFov: clamp(fov, FREE_FOV_RANGE.min, FREE_FOV_RANGE.max) }),
      setFilmGrainEnabled: (enabled) => set({ filmGrainEnabled: enabled }),
      setDepthOfFieldEnabled: (enabled) => set({ depthOfFieldEnabled: enabled }),
      setPerformanceMode: (enabled) => set({ performanceMode: enabled }),
      setMasterVolume: (volume) => set({ masterVolume: clamp(volume, 0, 1) }),
      toggleFilmGrain: () => set((state) => ({ filmGrainEnabled: !state.filmGrainEnabled })),
      toggleDepthOfField: () => set((state) => ({ depthOfFieldEnabled: !state.depthOfFieldEnabled })),
      togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode })),
      setCanvasElement: (el) => set({ canvasElement: el }),
      setGLRenderer: (renderer) => set({ glRenderer: renderer }),
    }),
    {
      name: "tell-tale-heart-renderer-prefs",
      // Only persist genuine preferences — never the live DOM/WebGL object
      // references, which aren't serializable and are re-populated fresh
      // by SceneCanvas on every mount anyway.
      partialize: (state) => ({
        exposureEV: state.exposureEV,
        freeFov: state.freeFov,
        filmGrainEnabled: state.filmGrainEnabled,
        depthOfFieldEnabled: state.depthOfFieldEnabled,
        performanceMode: state.performanceMode,
        masterVolume: state.masterVolume,
      }),
    },
  ),
);

/** Converts EV stops to a THREE.js `toneMappingExposure` multiplier (each +1 EV doubles exposure). */
export function evToExposureMultiplier(ev: number): number {
  return Math.pow(2, ev);
}
