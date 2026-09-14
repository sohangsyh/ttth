/**
 * experienceStore.ts
 * ---------------------------------------------------------------------------
 * Tracks whether the viewer has clicked past the "Enter the Room" gate
 * (see ui/StartExperienceOverlay.tsx). This is small and changes exactly
 * once per session, and the UI genuinely needs to re-render when it flips
 * (App.tsx swaps the gate for the actual experience) — a normal reactive
 * Zustand store is the right tool here, unlike the high-frequency
 * "plain mutable object" signals used elsewhere in scene/ and audio/.
 * ---------------------------------------------------------------------------
 */

import { create } from "zustand";

interface ExperienceState {
  /** True once the viewer has clicked the Start Experience button. */
  started: boolean;
  setStarted: () => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  started: false,
  setStarted: () => set({ started: true }),
}));
