/**
 * App.tsx
 * ---------------------------------------------------------------------------
 * Root integration: composes the 3D scene, the audio engine, and the DOM UI
 * overlay into one full-screen layout, plus a preloader that covers both
 * the r3f bundle's lazy-load and Three.js's own WebGL init.
 *
 * SEQUENCING: <StartExperienceOverlay> renders FIRST and ALONE — nothing
 * else (not even the SceneCanvas lazy-import) mounts until the viewer clicks
 * it. That click is what reliably unlocks the AudioContext (see
 * StartExperienceOverlay.tsx for why it has to be a real, synchronous user
 * gesture), and delaying the heavy bundle/asset fetches until after explicit
 * consent is generally better behavior than starting them speculatively.
 *
 * WHERE THE OTHER REQUIREMENTS ACTUALLY LIVE (and why they aren't here):
 *
 *  - GSAP chapter-cut camera transitions + discrete per-chapter scene events
 *    (the Ch.5/Ch.8 floorboard beats, Ch.6 audio cues) need direct access to
 *    the r3f camera and render loop via useThree/useFrame, which only exist
 *    INSIDE <Canvas>. They live in scene/ChapterTransitionManager.tsx +
 *    scene/chapterEvents.ts + audio/SoundManager.tsx, all mounted by
 *    SceneCanvas.tsx. This file doesn't touch the camera or audio graph at
 *    all — that's deliberate, not an omission.
 *
 *  - Playback auto-advance (isPlaying + playbackSpeed -> chapter progression)
 *    is already fully handled by scene/TimelineDriver.tsx, also mounted
 *    inside SceneCanvas. This file does NOT run a second timer — a second
 *    clock would race the first and double-advance chapters.
 *
 *  - The floorboard lift itself (Ch.5/Ch.8) is a CONTINUOUS animation driven
 *    by (currentChapter, elapsed) inside scene/models/Floorboards.tsx — it
 *    already reacts to the shared stores with no orchestration needed here.
 *
 * This file's actual job: WebGL support detection, the start gate, full-
 * screen layout + z-index stacking, the preloader lifecycle, and the outer
 * safety nets (SceneErrorBoundary for render crashes, context-loss recovery).
 * ---------------------------------------------------------------------------
 */

import { Suspense, lazy, useEffect, useState } from "react";
import { UIOverlay } from "./ui/UIOverlay";
import { LoadingScreen } from "./ui/LoadingScreen";
import { StartExperienceOverlay } from "./ui/StartExperienceOverlay";
import { WebGLIssueScreen } from "./ui/WebGLIssueScreen";
import { CompletionScreen } from "./ui/CompletionScreen";
import { SceneErrorBoundary } from "./scene/SceneErrorBoundary";
import { onStoryComplete } from "./scene/chapterEvents";
import { useExperienceStore } from "./store/experienceStore";
import { useRendererStore } from "./store/rendererStore";
import { hasWebGLSupport } from "./utils/webgl";

// Code-split the entire three.js / react-three-fiber bundle — by far the
// heaviest part of the app, and not needed until the canvas actually mounts.
const SceneCanvas = lazy(() => import("./scene/SceneCanvas"));

/** Touch-primary, small-viewport heuristic — a reasonable one-time default for Performance Mode, not a hard rule. */
function looksLikeALowPowerDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallViewport = window.matchMedia?.("(max-width: 820px)").matches ?? false;
  const fewCores = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
  return (coarsePointer && smallViewport) || fewCores;
}

export function App() {
  const started = useExperienceStore((state) => state.started);

  // Computed once, lazily — cheap, but no reason to re-run it every render.
  const [webglSupported] = useState(hasWebGLSupport);

  // Rendered UNCONDITIONALLY below (not nested inside the Suspense boundary),
  // so a single LoadingScreen instance covers BOTH phases: the lazy chunk
  // downloading above, and Three.js's own init once it starts — it only
  // fades out once SceneCanvas's onCreated actually fires.
  const [canvasReady, setCanvasReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // One-time Performance Mode default for touch-primary/small/low-core
  // devices — set BEFORE the user has touched the Workbench toggle, which
  // still overrides this freely afterward (see rendererStore.ts).
  useEffect(() => {
    if (looksLikeALowPowerDevice()) {
      useRendererStore.getState().setPerformanceMode(true);
    }
  }, []);

  // Shows CompletionScreen exactly once per actual Chapter-8 completion —
  // see chapterEvents.ts's onStoryComplete for why this is a one-off event
  // rather than driven by progressStore's persisted (durable) flag.
  useEffect(() => onStoryComplete(() => setShowCompletion(true)), []);

  if (!webglSupported) {
    return (
      <WebGLIssueScreen
        title="WebGL isn't available"
        message="This experience needs WebGL, which your current browser or device doesn't support (or it's been disabled). Try a recent version of Chrome, Firefox, Safari, or Edge."
      />
    );
  }

  if (!started) {
    return <StartExperienceOverlay />;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05040a]">
      {/* 3D layer — WebGL canvas, fills the viewport behind everything else.
          No z-index here: DOM order alone puts it beneath the UI/preloader
          below, and UIOverlay's own internal z-30/40/60 values (control bar,
          workbench, snapshot flash) need to compare directly against
          LoadingScreen's z-50 in ONE shared stacking context — wrapping
          either sibling in its own z-index here would trap those values
          inside a nested context instead. */}
      <div className="absolute inset-0">
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <SceneCanvas
              onReady={() => setCanvasReady(true)}
              onContextLost={() => setContextLost(true)}
              onContextRestored={() => setContextLost(false)}
            />
          </Suspense>
        </SceneErrorBoundary>
      </div>

      {/* DOM UI layer — control bar, subtitles, Director Workbench. Paints
          above the canvas via DOM order; UIOverlay's own root is
          pointer-events-none, re-enabling pointer events only on its
          interactive pieces, so it never blocks free-camera mouse-look on
          the canvas beneath it. */}
      <UIOverlay />

      {/* Preloader — fades out once the canvas is ready. */}
      <LoadingScreen ready={canvasReady} />

      {/* Context loss: some browsers restore automatically (contextLost
          flips back to false on its own via onContextRestored); if not,
          the reload button is the most reliable recovery in practice. */}
      {contextLost && (
        <WebGLIssueScreen
          title="Rendering interrupted"
          message="The graphics context was lost — this can happen if the GPU driver reset or the tab was backgrounded for a long time. Attempting to recover automatically; reload if this doesn't clear on its own."
          onRetry={() => window.location.reload()}
          retryLabel="Reload"
        />
      )}

      {showCompletion && <CompletionScreen onDismiss={() => setShowCompletion(false)} />}
    </div>
  );
}

export default App;
