/**
 * UIOverlay.tsx
 * ---------------------------------------------------------------------------
 * Root DOM overlay sitting on top of <SceneCanvas>. Mount both once at the
 * app root:
 *
 *   <SceneCanvas />
 *   <UIOverlay />
 *
 * This component is where the app's global keyboard shortcuts actually get
 * activated (bindStoryKeyboardShortcuts is *defined* in store.ts, but
 * something has to call it — this is that something):
 *   - Space  -> play / pause
 *   - C      -> toggle camera mode (cinematic / free)
 *   - H      -> toggle UI visibility (control bar + workbench "chrome")
 *   - 1–8    -> jump directly to that chapter
 *   - ←/→    -> previous / next chapter
 *
 * Design note: `uiVisible` hides the control bar and the workbench toggle
 * for an immersive, chrome-free view, but NOT the subtitles (dialogue is
 * content, not chrome) and not the small "reveal UI" button in the corner,
 * which exists so a mouse-only viewer isn't stuck with no way back once the
 * chrome is hidden.
 * ---------------------------------------------------------------------------
 */

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useStoryStore, bindStoryKeyboardShortcuts } from "../store/store";
import { ControlBar } from "./ControlBar";
import { SubtitleDisplay } from "./SubtitleDisplay";
import { DirectorWorkbench } from "./DirectorWorkbench";
import { VRToggleButton } from "./VRToggleButton";

function RevealUiButton() {
  const uiVisible = useStoryStore((state) => state.uiVisible);
  const toggleUi = useStoryStore((state) => state.toggleUi);

  return (
    <button
      type="button"
      onClick={toggleUi}
      aria-label={uiVisible ? "Hide UI" : "Show UI"}
      title={uiVisible ? "Hide UI (H)" : "Show UI (H)"}
      className="pointer-events-auto fixed bottom-4 left-4 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-stone-100/10 bg-black/50 text-stone-400/70 backdrop-blur-md transition-colors hover:text-amber-200"
    >
      {uiVisible ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}

export function UIOverlay() {
  const uiVisible = useStoryStore((state) => state.uiVisible);

  useEffect(() => bindStoryKeyboardShortcuts(), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none font-sans">
      <SubtitleDisplay />

      <div
        className={`transition-opacity duration-500 ${
          uiVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ControlBar />
        <DirectorWorkbench />
        <VRToggleButton />
      </div>

      <RevealUiButton />
    </div>
  );
}

export default UIOverlay;
