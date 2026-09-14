/**
 * page.tsx (Next.js App Router variant of ../src/App.tsx)
 * ---------------------------------------------------------------------------
 * Full parity with the current src/App.tsx — WebGL detection, the Start
 * Experience gate, SceneErrorBoundary, context-loss recovery, and the
 * completion screen are all included here too, not just the original
 * bare-bones version. Next.js-specific differences:
 *  - "use client" — this whole tree touches WebGL/canvas/window, none of
 *    which exist during server rendering.
 *  - next/dynamic with { ssr: false } replaces React.lazy/Suspense for the
 *    code-split — Next's dynamic() already refuses to render this on the
 *    server, which React.lazy alone does not guarantee under SSR.
 *
 * LOCATION: this file lives OUTSIDE src/ (in nextjs-variant/) specifically
 * so the Vite project's own `tsc -b` build does NOT pick it up — it imports
 * `next/dynamic`, which isn't (and shouldn't be) a dependency of the Vite
 * project. Drop this at app/page.tsx in an actual Next.js project, copy
 * this repo's src/ tree in alongside it, and adjust the relative import
 * paths below (currently `../src/...`, assuming this file sits at the Next
 * project's root next to src/ — change to match wherever you place it,
 * e.g. `../../src/...` if nested under `app/`).
 * ---------------------------------------------------------------------------
 */

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { UIOverlay } from "../src/ui/UIOverlay";
import { LoadingScreen } from "../src/ui/LoadingScreen";
import { StartExperienceOverlay } from "../src/ui/StartExperienceOverlay";
import { WebGLIssueScreen } from "../src/ui/WebGLIssueScreen";
import { CompletionScreen } from "../src/ui/CompletionScreen";
import { SceneErrorBoundary } from "../src/scene/SceneErrorBoundary";
import { onStoryComplete } from "../src/scene/chapterEvents";
import { useExperienceStore } from "../src/store/experienceStore";
import { useRendererStore } from "../src/store/rendererStore";
import { hasWebGLSupport } from "../src/utils/webgl";

const SceneCanvas = dynamic(() => import("../src/scene/SceneCanvas"), { ssr: false });

function looksLikeALowPowerDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallViewport = window.matchMedia?.("(max-width: 820px)").matches ?? false;
  const fewCores = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
  return (coarsePointer && smallViewport) || fewCores;
}

export default function Page() {
  const started = useExperienceStore((state) => state.started);
  const [webglSupported] = useState(hasWebGLSupport);
  const [canvasReady, setCanvasReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    if (looksLikeALowPowerDevice()) {
      useRendererStore.getState().setPerformanceMode(true);
    }
  }, []);

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
      <div className="absolute inset-0">
        <SceneErrorBoundary>
          <SceneCanvas
            onReady={() => setCanvasReady(true)}
            onContextLost={() => setContextLost(true)}
            onContextRestored={() => setContextLost(false)}
          />
        </SceneErrorBoundary>
      </div>

      <UIOverlay />

      <LoadingScreen ready={canvasReady} />

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
