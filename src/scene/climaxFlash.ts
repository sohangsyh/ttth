/**
 * climaxFlash.ts
 * ---------------------------------------------------------------------------
 * Shared, plain mutable signal — same pattern as chapterEvents.ts's
 * cameraJolt. Chapter 8's entry triggers a brief decaying flash (brightness
 * spike + a push away from neutral color), approximating the brief's
 * "blood-red/sepia glitch overlay... blinding strobe effect from the
 * dropped lantern" beat using TensionFX's EXISTING, already-verified
 * BrightnessContrast/HueSaturation/Vignette effects rather than introducing
 * an unverified additional postprocessing effect (e.g. a dedicated Glitch
 * component) sight-unseen. Read every frame by TensionFX.tsx.
 *
 * NOTE: exact hue-rotation values here are a best-effort approximation —
 * I can't render/see this app in this environment, so the specific "how
 * red does it actually look" is tuned by formula, not by eye. Treat the
 * magnitude constants below as a starting point to adjust visually.
 * ---------------------------------------------------------------------------
 */

import { onChapterEnter } from "./chapterEvents";

export const CLIMAX_FLASH_DURATION_MS = 900;

export const climaxFlash = {
  /** performance.now() timestamp after which the flash has fully decayed. */
  activeUntil: 0,
};

onChapterEnter((chapterId) => {
  if (chapterId === 8) {
    climaxFlash.activeUntil = performance.now() + CLIMAX_FLASH_DURATION_MS;
  }
});

/** 1 right as the flash triggers, decaying to 0 — read this directly rather than re-deriving the math at each call site. */
export function getClimaxFlashAmount(): number {
  const remaining = climaxFlash.activeUntil - performance.now();
  return remaining > 0 ? remaining / CLIMAX_FLASH_DURATION_MS : 0;
}
