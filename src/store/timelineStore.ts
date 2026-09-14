/**
 * timelineStore.ts
 * ---------------------------------------------------------------------------
 * Holds `elapsed` — seconds elapsed within the *current* chapter's timeline.
 *
 * This is intentionally a separate Zustand store from `useStoryStore`.
 * `elapsed` changes up to 60x/second while playing; if it lived in
 * useStoryStore, every React component subscribed to that store (HUD,
 * subtitle overlay, chapter menu, etc.) would re-render every frame.
 *
 * Instead, R3F scene components read this store *non-reactively* — via
 * `useTimelineStore.getState().elapsed` inside their own `useFrame`
 * callback — which costs nothing beyond a plain object read. Only
 * `TimelineDriver` (see TimelineDriver.tsx) ever calls `setElapsed`.
 * ---------------------------------------------------------------------------
 */

import { create } from "zustand";

interface TimelineState {
  /** Seconds elapsed since the current chapter started playing. */
  elapsed: number;
  setElapsed: (seconds: number) => void;
  resetElapsed: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  elapsed: 0,
  setElapsed: (seconds) => set({ elapsed: seconds }),
  resetElapsed: () => set({ elapsed: 0 }),
}));
