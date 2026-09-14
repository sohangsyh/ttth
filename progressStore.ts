/**
 * progressStore.ts
 * ---------------------------------------------------------------------------
 * Durable save progress — persisted to localStorage via zustand's `persist`
 * middleware, separate from useStoryStore on purpose: storyStore holds LIVE
 * playback state (currentChapter as "where the timeline currently is",
 * isPlaying, cameraMode, ...) that shouldn't just resume as-is on reload —
 * you don't want the app to silently start auto-playing mid-scene the
 * instant someone reopens the tab. This store holds only the durable
 * subset worth remembering across sessions.
 *
 * "Unlocked" here means "previously reached", used for Continue/chapter-
 * select UX (see StartExperienceOverlay.tsx) — it does NOT gate navigation.
 * This app has always let the viewer freely jump to any chapter (digit
 * keys, the scrubber, ...), and turning that into a hard progression lock
 * would fight the Director-tool philosophy the rest of the app is built
 * around. This store just remembers how far someone has gotten, for their
 * own convenience on return visits.
 * ---------------------------------------------------------------------------
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useStoryStore } from "./store";
import { TOTAL_CHAPTERS } from "../data/chapters";

interface ProgressState {
  /** Highest chapter number ever reached, 1..TOTAL_CHAPTERS. */
  furthestUnlockedChapter: number;
  /** True once Chapter 8 has played to completion (see TimelineDriver.tsx). */
  storyCompleted: boolean;

  markChapterReached: (chapterId: number) => void;
  markStoryCompleted: () => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      furthestUnlockedChapter: 1,
      storyCompleted: false,

      markChapterReached: (chapterId) =>
        set((state) => ({
          furthestUnlockedChapter: Math.max(state.furthestUnlockedChapter, Math.min(chapterId, TOTAL_CHAPTERS)),
        })),
      markStoryCompleted: () => set({ storyCompleted: true }),
      resetProgress: () => set({ furthestUnlockedChapter: 1, storyCompleted: false }),
    }),
    { name: "tell-tale-heart-progress" },
  ),
);

// Keep progress in sync with the live story automatically — subscribed once
// here at module scope (useStoryStore is a stable singleton) rather than
// requiring some mounted component to remember to wire this up.
useStoryStore.subscribe((state, prevState) => {
  if (state.currentChapter !== prevState.currentChapter) {
    useProgressStore.getState().markChapterReached(state.currentChapter);
  }
});
