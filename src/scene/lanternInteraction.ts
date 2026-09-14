/**
 * lanternInteraction.ts
 * ---------------------------------------------------------------------------
 * Shared, plain mutable signal — same pattern as chapterEvents.ts's
 * cameraJolt. Clicking the lantern (see InteractiveScene.tsx) shouldn't
 * fight LanternLight.tsx for control of `light.intensity` (which it already
 * writes every frame for the flicker effect), so this just exposes a
 * decaying "flare" amount that LanternLight folds additively into its own
 * existing per-frame intensity calculation.
 * ---------------------------------------------------------------------------
 */

export const LANTERN_FLARE_DURATION_MS = 350;

export const lanternFlare = {
  /** performance.now() timestamp after which the flare has fully decayed. */
  activeUntil: 0,
  /** Peak additive intensity at the instant of the flare. */
  magnitude: 0,
  /** Decay duration for the CURRENTLY active flare (may differ per trigger). */
  durationMs: LANTERN_FLARE_DURATION_MS,
};

/** Triggers a brief lantern brightness flare — called on lantern click. */
export function triggerLanternFlare(magnitude = 2.5, durationMs = LANTERN_FLARE_DURATION_MS): void {
  lanternFlare.activeUntil = performance.now() + durationMs;
  lanternFlare.magnitude = magnitude;
  lanternFlare.durationMs = durationMs;
}
