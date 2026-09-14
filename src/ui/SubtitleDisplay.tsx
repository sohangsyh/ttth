/**
 * SubtitleDisplay.tsx
 * ---------------------------------------------------------------------------
 * Bottom-center subtitle box, styled like a period film's intertitle card.
 *
 * Design note: subtitles stay visible even when `uiVisible` is false (the
 * 'H' key hides the control bar / workbench "chrome", not the dialogue
 * itself) — flip that by wrapping this in the same uiVisible check as
 * ControlBar if you'd rather they hide together.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useActiveSubtitle } from "../hooks/useActiveSubtitle";

export function SubtitleDisplay() {
  const cue = useActiveSubtitle();
  const [visible, setVisible] = useState(false);

  // Re-trigger the fade/rise transition every time the cue changes.
  useEffect(() => {
    setVisible(false);
    const frameId = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, [cue?.id]);

  if (!cue) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-30 flex justify-center px-6 sm:bottom-32">
      <p
        className={`max-w-2xl rounded-sm border border-amber-100/10 bg-black/70 px-5 py-3 text-center font-serif text-[1.05rem] leading-snug tracking-wide text-stone-100/95 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
        }`}
      >
        {cue.text}
      </p>
    </div>
  );
}
