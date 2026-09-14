/**
 * SceneCanvas.tsx
 * ---------------------------------------------------------------------------
 * The 3D stage for "The Tell-Tale Heart" interactive film. Mount this once
 * anywhere in the app; it reads all the playback/camera/tension state it
 * needs directly from useStoryStore, so no props are required beyond the
 * optional `onReady`/`onContextLost`/`onContextRestored` callbacks.
 *
 * Composition:
 *   Canvas (renderer: ACES filmic tone mapping, soft shadows, capped pixel ratio)
 *     └─ XR (see scene/xr.ts)     — WebXR session wrapper; CameraRig,
 *                                     LanternLight, and TensionFX all check
 *                                     useXR()'s presenting state and yield
 *                                     control / disable themselves in VR —
 *                                     see each file for why
 *     └─ TimelineDriver            — advances the per-chapter clock
 *     └─ ChapterTransitionManager  — GSAP camera-cut easing + chapter events
 *     └─ CameraRig                 — cinematic keyframe follow-cam <-> free Director cam
 *     └─ LanternLight              — flickering volumetric spotlight, casts shadows
 *     └─ DustParticles             — drifting motes catching the lantern beam
 *     └─ BedroomScene              — Draco/GLTF room assets (Room/Floorboards/Props),
 *                                     each with its own primitive-geometry fallback
 *     └─ InteractiveScene          — clickable lantern/bed hotspots (floorboards
 *                                     own their own click handling, see Floorboards.tsx)
 *     └─ HeartbeatAudio             — spatialized heartbeat (see audio/)
 *     └─ SoundManager              — ambient wind/room-tone/watch/footsteps/
 *                                     creaks (see audio/SoundManager.tsx)
 *     └─ TensionFX                 — heart-rate/heartbeat-synced chromatic
 *                                     aberration, pulsing vignette, Ch7/8 fear
 *                                     desaturation, DoF, film grain
 *
 * PERFORMANCE: pixel ratio is capped via the `dpr` prop below (never
 * requesting more than devicePixelRatio actually provides, and capped at 2
 * regardless — a 3x/4x phone panel rendering the full post-processing stack
 * at native resolution is the single biggest mobile GPU cost in this app).
 * `dpr` additionally drops to a flat 1 under Performance Mode. Shadow map
 * resolution follows the same performanceMode signal — see LanternLight.tsx.
 *
 * CONTEXT LOSS: `webglcontextlost`/`webglcontextrestored` are DOM events on
 * the canvas element, not thrown JS errors — a React error boundary
 * (SceneErrorBoundary.tsx) CANNOT catch them. They're handled directly here
 * instead, via `onContextLost`/`onContextRestored` callback props.
 *
 * Peer dependencies assumed: three, @react-three/fiber ^8, @react-three/drei
 * ^9, @react-three/postprocessing ^2, postprocessing ^6, zustand ^4, gsap ^3.
 * ---------------------------------------------------------------------------
 */

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import * as THREE from "three";
import { TimelineDriver } from "./TimelineDriver";
import { ChapterTransitionManager } from "./ChapterTransitionManager";
import { CameraRig } from "./CameraRig";
import { LanternLight } from "./LanternLight";
import { WindowLight } from "./WindowLight";
import { DustParticles } from "./DustParticles";
import { BedroomScene } from "./BedroomScene";
import { InteractiveScene } from "./InteractiveScene";
import { TensionFX } from "./TensionFX";
import { ExposureSync } from "./ExposureSync";
import { MasterVolumeSync } from "./MasterVolumeSync";
import { PlaythroughStatsTracker } from "./PlaythroughStatsTracker";
import { HeartbeatAudio } from "../audio/HeartbeatAudio";
import { SoundManager } from "../audio/SoundManager";
import { useRendererStore } from "../store/rendererStore";
import { xrStore } from "./xr";

export interface SceneCanvasProps {
  /** Called once, right after the WebGL renderer/canvas exists — used to dismiss the App-level preloader. */
  onReady?: () => void;
  /** Called if the GPU driver drops the WebGL context (driver crash/reset, tab backgrounded on some mobile browsers, ...). */
  onContextLost?: () => void;
  /** Called if the browser successfully restores a previously-lost context. */
  onContextRestored?: () => void;
}

/** Mounted once inside the Canvas purely to wire the context-loss DOM events — see file header. */
function ContextLossWatcher({
  onContextLost,
  onContextRestored,
}: Pick<SceneCanvasProps, "onContextLost" | "onContextRestored">) {
  useEffect(() => {
    const canvas = useRendererStore.getState().canvasElement;
    if (!canvas) return;

    const handleLost = (event: Event) => {
      event.preventDefault(); // required to allow the browser to attempt restoration at all
      onContextLost?.();
    };
    const handleRestored = () => onContextRestored?.();

    canvas.addEventListener("webglcontextlost", handleLost, false);
    canvas.addEventListener("webglcontextrestored", handleRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [onContextLost, onContextRestored]);

  return null;
}

export function SceneCanvas({ onReady, onContextLost, onContextRestored }: SceneCanvasProps) {
  const performanceMode = useRendererStore((state) => state.performanceMode);

  return (
    <Canvas
      shadows
      // [1, 2]: never below native 1x, never above 2x even on 3x/4x mobile
      // panels — the classic "devicePixelRatio capped at 2" mobile-GPU fix.
      // Performance Mode flattens it to a straight 1 for the heaviest devices.
      dpr={performanceMode ? 1 : [1, 2]}
      // Prevents mobile browsers from intercepting touch drags as page
      // scroll/zoom gestures before they reach R3F's pointer-event handlers
      // — without this, taps still mostly work but drags (e.g. OrbitControls
      // in free-cam mode) fight the browser's native touch scrolling.
      style={{ touchAction: "none" }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        // Required for the Director Workbench's PNG snapshot button — without
        // this, some browsers clear the WebGL buffer before toBlob() can read it.
        preserveDrawingBuffer: true,
      }}
      camera={{ position: [0, 1.6, 4], fov: 45, near: 0.05, far: 50 }}
      onCreated={({ scene, gl }) => {
        // Volumetric-fog approximation: exponential-squared falloff reads
        // more "thick air" than linear THREE.Fog, and pairs well with the
        // lantern's own volumetric cone from LanternLight.
        scene.fog = new THREE.FogExp2("#05040a", 0.12);
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        // Hand the live canvas element to the Director Workbench for
        // snapshots AND to ContextLossWatcher below for its event listeners.
        useRendererStore.getState().setCanvasElement(gl.domElement);
        useRendererStore.getState().setGLRenderer(gl);
        onReady?.();
      }}
    >
      <Suspense fallback={null}>
        <XR store={xrStore}>
          {/* Very low ambient — almost all visible light should come from the lantern. */}
          <ambientLight intensity={0.05} color="#1a1530" />

          <ContextLossWatcher onContextLost={onContextLost} onContextRestored={onContextRestored} />
          <TimelineDriver />
          <ChapterTransitionManager />
          <CameraRig />
          <ExposureSync />
          <MasterVolumeSync />
          <PlaythroughStatsTracker />
          <LanternLight />
          <WindowLight />
          <DustParticles />
          <BedroomScene />
          <InteractiveScene />
          <HeartbeatAudio anchorPosition={[0, -1, 0]} />
          <SoundManager />
          <TensionFX />
        </XR>
      </Suspense>
    </Canvas>
  );
}

export default SceneCanvas;
