/**
 * xr.ts
 * ---------------------------------------------------------------------------
 * The WebXR session store (from @react-three/xr v6's `createXRStore` API —
 * a plain zustand vanilla store under the hood, so it's usable both inside
 * the Canvas/XR tree via `useXR()` and from plain DOM components outside it
 * via zustand's generic `useStore(xrStore, selector)`).
 *
 * `hasWebXRSupport` is async (the real `navigator.xr.isSessionSupported`
 * call is a Promise) — unlike utils/webgl.ts's synchronous check.
 * ---------------------------------------------------------------------------
 */

import { createXRStore } from "@react-three/xr";

export const xrStore = createXRStore();

/** Feature-detects immersive-vr support. Resolves false in any environment without the WebXR API at all. */
export async function hasWebXRSupport(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("xr" in navigator)) return false;
  try {
    return await (navigator as Navigator & { xr: XRSystem }).xr.isSessionSupported("immersive-vr");
  } catch {
    return false;
  }
}
