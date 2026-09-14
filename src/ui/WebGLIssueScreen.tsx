/**
 * WebGLIssueScreen.tsx
 * ---------------------------------------------------------------------------
 * One shared fallback screen for the three distinct failure modes that can
 * keep the 3D experience from running:
 *  - WebGL unsupported (detected upfront via utils/webgl.ts, before mount)
 *  - A render-time crash caught by SceneErrorBoundary.tsx
 *  - GPU-driver-level context loss (`webglcontextlost`, handled in
 *    SceneCanvas.tsx — NOT catchable by a React error boundary, since it's
 *    a DOM event, not a thrown JS error)
 *
 * Same visual language as LoadingScreen/StartExperienceOverlay: dark bg,
 * serif italic title, amber accent — so a failure state doesn't look like
 * a different, broken app.
 * ---------------------------------------------------------------------------
 */

interface WebGLIssueScreenProps {
  title: string;
  message: string;
  /** Shown as a button; omit for the "permanently unsupported" case where reloading won't help. */
  onRetry?: () => void;
  retryLabel?: string;
}

export function WebGLIssueScreen({ title, message, onRetry, retryLabel = "Reload" }: WebGLIssueScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#05040a] px-6 text-center">
      <div className="max-w-sm">
        <p className="font-serif text-xl italic tracking-wide text-stone-100/90">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-sm border border-amber-200/30 bg-amber-300/10 px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-amber-100 transition-colors hover:bg-amber-300/20"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
