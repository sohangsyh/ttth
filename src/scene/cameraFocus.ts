/**
 * cameraFocus.ts
 * ---------------------------------------------------------------------------
 * Shared, plain mutable signal — same pattern as cameraTransition.ts.
 * CameraRig.tsx writes the live distance from the camera to whatever point
 * it's currently looking at (its own `currentLookAt` ref) every frame;
 * TensionFX.tsx reads it to keep DepthOfField's focus point locked onto the
 * actual narrative subject instead of a fixed, chapter-agnostic distance.
 * ---------------------------------------------------------------------------
 */

export const cameraFocus = {
  /** World-space distance from the camera to its current look-at target. */
  distance: 2,
};
