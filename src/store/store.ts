/**
 * store.ts
 * ---------------------------------------------------------------------------
 * Global state store for "The Tell-Tale Heart" interactive cinematic web app.
 *
 * Built with Zustand + TypeScript. This store owns:
 *  - Narrative progression (current chapter, 1–8)
 *  - Timeline playback control (play/pause, speed)
 *  - Camera mode (scripted cinematic vs. free-look exploration)
 *  - The "heart rate" tension mechanic that drives audio/visual intensity
 *  - UI visibility (toggled with the 'H' key for an immersive, chrome-free view)
 * ---------------------------------------------------------------------------
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { CHAPTERS, TOTAL_CHAPTERS, getChapterById } from "../data/chapters";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type CameraMode = "cinematic" | "free";

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2;

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

/** Minimum and maximum heart-rate bounds used across the whole story. */
export const HEART_RATE_MIN = 60; // resting bpm, Chapter 1 ("The Eye")
export const HEART_RATE_MAX = 140; // climax bpm, Chapters 7–8

export interface StoryState {
  // ---- Core narrative state -------------------------------------------------
  /** Current chapter number, 1-indexed, clamped to [1, TOTAL_CHAPTERS]. */
  currentChapter: number;

  // ---- Timeline / playback ----------------------------------------------
  /** Whether the chapter timeline (subtitles, camera keyframes, audio) is running. */
  isPlaying: boolean;
  /** Multiplier applied to timeline playback. */
  playbackSpeed: PlaybackSpeed;

  // ---- Camera -------------------------------------------------------------
  /** 'cinematic' follows authored keyframes; 'free' hands control to the user. */
  cameraMode: CameraMode;

  // ---- Tension mechanic ---------------------------------------------------
  /** Current simulated heart rate in bpm, drives pulse audio + visual pulsing. */
  heartRate: number;

  // ---- UI -------------------------------------------------------------------
  /** Whether HUD/subtitle/menu overlays are visible. Toggled by 'H'. */
  uiVisible: boolean;

  // ---- Derived / convenience getters --------------------------------------
  /** Returns the full chapter data object for currentChapter. */
  getCurrentChapterData: () => (typeof CHAPTERS)[number] | undefined;

  // ---- Actions --------------------------------------------------------------
  /** Jump directly to a specific chapter (clamped to valid range). */
  setChapter: (chapter: number) => void;
  /** Advance to the next chapter, if any remain. */
  nextChapter: () => void;
  /** Go back to the previous chapter, if not already at the first. */
  previousChapter: () => void;

  /** Explicitly set play/pause state. */
  setIsPlaying: (playing: boolean) => void;
  /** Flip play/pause state. */
  togglePlay: () => void;

  /** Set timeline playback speed (snapped to nearest supported value). */
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;

  /** Explicitly set camera mode. */
  setCameraMode: (mode: CameraMode) => void;
  /** Flip between 'cinematic' and 'free'. */
  toggleCameraMode: () => void;

  /** Set heart rate directly, clamped to [HEART_RATE_MIN, HEART_RATE_MAX]. */
  setHeartRate: (bpm: number) => void;
  /** Nudge heart rate by a delta (positive or negative), clamped to bounds. */
  adjustHeartRate: (delta: number) => void;
  /**
   * Sync heart rate to whatever is authored for the current chapter's
   * baseline tension level. Useful when jumping chapters via the nav menu.
   */
  syncHeartRateToChapter: (chapter?: number) => void;

  /** Explicitly set UI visibility. */
  setUiVisible: (visible: boolean) => void;
  /** Flip UI visibility — bound to the 'H' key globally. */
  toggleUi: () => void;

  /** Reset the entire experience back to its initial state (e.g. "restart story"). */
  reset: () => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clampChapter = (chapter: number): number =>
  clamp(Math.round(chapter), 1, TOTAL_CHAPTERS);

const clampHeartRate = (bpm: number): number =>
  clamp(bpm, HEART_RATE_MIN, HEART_RATE_MAX);

/** Snap an arbitrary number to the closest supported playback speed. */
const snapToPlaybackSpeed = (speed: number): PlaybackSpeed =>
  PLAYBACK_SPEEDS.reduce((closest, candidate) =>
    Math.abs(candidate - speed) < Math.abs(closest - speed) ? candidate : closest,
  );

const INITIAL_STATE = {
  currentChapter: 1,
  isPlaying: false,
  playbackSpeed: 1 as PlaybackSpeed,
  cameraMode: "cinematic" as CameraMode,
  heartRate: HEART_RATE_MIN,
  uiVisible: true,
};

// ----------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------

export const useStoryStore = create<StoryState>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL_STATE,

    getCurrentChapterData: () => getChapterById(get().currentChapter),

    setChapter: (chapter) => {
      const next = clampChapter(chapter);
      set({ currentChapter: next });
      get().syncHeartRateToChapter(next);
    },

    nextChapter: () => {
      const { currentChapter } = get();
      if (currentChapter < TOTAL_CHAPTERS) {
        get().setChapter(currentChapter + 1);
      }
    },

    previousChapter: () => {
      const { currentChapter } = get();
      if (currentChapter > 1) {
        get().setChapter(currentChapter - 1);
      }
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setPlaybackSpeed: (speed) => set({ playbackSpeed: snapToPlaybackSpeed(speed) }),

    setCameraMode: (mode) => set({ cameraMode: mode }),

    toggleCameraMode: () =>
      set((state) => ({
        cameraMode: state.cameraMode === "cinematic" ? "free" : "cinematic",
      })),

    setHeartRate: (bpm) => set({ heartRate: clampHeartRate(bpm) }),

    adjustHeartRate: (delta) =>
      set((state) => ({ heartRate: clampHeartRate(state.heartRate + delta) })),

    syncHeartRateToChapter: (chapter) => {
      const chapterData = getChapterById(chapter ?? get().currentChapter);
      if (chapterData) {
        set({ heartRate: clampHeartRate(chapterData.baselineHeartRate) });
      }
    },

    setUiVisible: (visible) => set({ uiVisible: visible }),

    toggleUi: () => set((state) => ({ uiVisible: !state.uiVisible })),

    reset: () => set({ ...INITIAL_STATE }),
  })),
);

// ----------------------------------------------------------------------------
// Global keyboard bindings
// ----------------------------------------------------------------------------
// Call this once (e.g. in your root App component's useEffect) to wire up the
// 'H' key -> toggleUi binding, plus a couple of natural companions
// (space -> play/pause, arrows -> chapter nav). Returns a cleanup function.

export function bindStoryKeyboardShortcuts(): () => void {
  const handler = (event: KeyboardEvent) => {
    // Ignore keystrokes typed into inputs/textareas/contenteditable.
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const { toggleUi, togglePlay, nextChapter, previousChapter, toggleCameraMode, setChapter } =
      useStoryStore.getState();

    // Digit keys 1-8 jump straight to that chapter.
    if (event.code.startsWith("Digit") || event.code.startsWith("Numpad")) {
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= TOTAL_CHAPTERS) {
        setChapter(digit);
        return;
      }
    }

    switch (event.key.toLowerCase()) {
      case "h":
        toggleUi();
        break;
      case " ":
        event.preventDefault();
        togglePlay();
        break;
      case "arrowright":
        nextChapter();
        break;
      case "arrowleft":
        previousChapter();
        break;
      case "c":
        toggleCameraMode();
        break;
      default:
        break;
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
