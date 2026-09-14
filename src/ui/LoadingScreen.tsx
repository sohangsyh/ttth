/**
 * LoadingScreen.tsx
 * ---------------------------------------------------------------------------
 * Full-screen preloader shown until the WebGL renderer exists (see
 * SceneCanvas's `onReady` prop) — covers Three.js's own init time, plus
 * anything a future <Suspense> fallback further down (e.g. drei's
 * useGLTF/useTexture, once real assets replace today's primitive geometry)
 * would otherwise show as a blank canvas for.
 *
 * Self-contained lifecycle: pass `ready`; once true it fades out, then
 * fully unmounts after the transition finishes rather than lingering as an
 * invisible (if inert) layer.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";

const FADE_DURATION_MS = 600;

export function LoadingScreen({ ready }: { ready: boolean }) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const timeoutId = window.setTimeout(() => setMounted(false), FADE_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [ready]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#05040a] transition-opacity ease-out ${
        ready ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-3 w-3">
        <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/60" />
        <span className="absolute inset-0 rounded-full bg-amber-300" />
      </div>
      <div className="text-center">
        <p className="font-serif text-lg italic tracking-wide text-stone-100/90">The Tell-Tale Heart</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">Lighting the lantern…</p>
      </div>
    </div>
  );
}
