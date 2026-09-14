/**
 * webgl.ts
 * ---------------------------------------------------------------------------
 * Feature-detects WebGL support BEFORE attempting to mount the r3f Canvas —
 * catching this upfront avoids ever letting <Canvas> itself throw partway
 * through initialization on unsupported devices.
 * ---------------------------------------------------------------------------
 */

export function hasWebGLSupport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return Boolean(context);
  } catch {
    return false; // some browsers throw rather than return null for a blocked/unsupported context
  }
}
