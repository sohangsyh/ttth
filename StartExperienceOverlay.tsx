/**
 * StartExperienceOverlay.tsx
 * ---------------------------------------------------------------------------
 * The "Enter the Room" gate shown before anything else mounts. Three jobs:
 *
 *  1. Legally/technically unlock audio: browsers require a REAL synchronous
 *     user gesture to start an AudioContext, and Safari/iOS in particular
 *     wants `.resume()` called directly inside the click handler itself —
 *     not merely "eventually after some click happened", which is what the
 *     passive `unlockAudioContextOnFirstGesture` listener (audioContext.ts)
 *     provides as a fallback. This button is the AUTHORITATIVE unlock path;
 *     that passive listener just covers the case where this gate is somehow
 *     bypassed.
 *  2. Set the tone before dropping the viewer into the story.
 *  3. Offer "Continue from Chapter N" (+ a compact chapter grid) if
 *     progressStore.ts shows the viewer has been here before — storyStore's
 *     `currentChapter` always starts fresh at 1 on reload (it's NOT
 *     persisted, see progressStore.ts's header for why), so resuming is
 *     this screen explicitly calling `setChapter()` before entering.
 *
 * App.tsx renders ONLY this overlay until `started` flips true — the heavy
 * SceneCanvas bundle isn't even lazy-imported until after this click, so
 * nothing audio/WebGL-related is created before the viewer has consented
 * and a valid gesture exists.
 * ---------------------------------------------------------------------------
 */

import { getAudioContext } from "../audio/audioContext";
import { useExperienceStore } from "../store/experienceStore";
import { useProgressStore } from "../store/progressStore";
import { useStoryStore } from "../store/store";
import { CHAPTERS } from "../data/chapters";

function enter(startChapter?: number) {
  // Must happen synchronously inside the click handler, not in a .then() or
  // a later effect — that's what makes this the reliable unlock path rather
  // than a best-effort one.
  const ctx = getAudioContext();
  ctx?.resume().catch(() => {
    /* Ignore — the passive gesture listener in audioContext.ts will retry. */
  });
  if (startChapter) useStoryStore.getState().setChapter(startChapter);
  useExperienceStore.getState().setStarted();
}

export function StartExperienceOverlay() {
  const furthestUnlockedChapter = useProgressStore((state) => state.furthestUnlockedChapter);
  const storyCompleted = useProgressStore((state) => state.storyCompleted);
  const hasProgress = furthestUnlockedChapter > 1 || storyCompleted;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-[#05040a] px-6 py-12 text-center">
      <div className="max-w-sm">
        <p className="font-serif text-2xl italic tracking-wide text-stone-100/95">The Tell-Tale Heart</p>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">
          An interactive telling of Poe's story, with spatial sound throughout — headphones recommended.
        </p>
      </div>

      {hasProgress ? (
        <>
          <button
            type="button"
            onClick={() => enter(storyCompleted ? 1 : furthestUnlockedChapter)}
            className="rounded-sm border border-amber-200/30 bg-amber-300/10 px-8 py-3 text-sm uppercase tracking-[0.2em] text-amber-100 transition-colors hover:bg-amber-300/20"
          >
            {storyCompleted ? "Read Again" : `Continue — Chapter ${furthestUnlockedChapter}`}
          </button>

          {!storyCompleted && (
            <button
              type="button"
              onClick={() => enter(1)}
              className="text-[11px] uppercase tracking-[0.15em] text-stone-500 underline-offset-4 hover:text-stone-300 hover:underline"
            >
              Start from the Beginning
            </button>
          )}

          <div className="w-full max-w-xs">
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-stone-600">Jump to a chapter</p>
            <div className="grid grid-cols-4 gap-1.5">
              {CHAPTERS.map((chapter) => {
                const unlocked = chapter.id <= furthestUnlockedChapter || storyCompleted;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => enter(chapter.id)}
                    title={unlocked ? chapter.title : "Not yet reached"}
                    className={`rounded-sm border py-2 text-xs tabular-nums transition-colors ${
                      unlocked
                        ? "border-stone-100/15 text-stone-300 hover:border-amber-200/40 hover:text-amber-200"
                        : "cursor-not-allowed border-stone-100/5 text-stone-700"
                    }`}
                  >
                    {chapter.id}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => enter()}
          className="rounded-sm border border-amber-200/30 bg-amber-300/10 px-8 py-3 text-sm uppercase tracking-[0.2em] text-amber-100 transition-colors hover:bg-amber-300/20"
        >
          Enter the Room
        </button>
      )}

      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-600">Sound will begin after you enter</p>
    </div>
  );
}
