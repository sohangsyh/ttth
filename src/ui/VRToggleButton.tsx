/**
 * VRToggleButton.tsx
 * ---------------------------------------------------------------------------
 * The "Enter VR" / "Exit VR" button. Lives in the DOM UI layer, OUTSIDE the
 * Canvas/<XR> tree — so it can't use @react-three/xr's `useXR()` hook, which
 * reads from React context provided by <XR> (see SceneCanvas.tsx). Instead
 * it binds directly to `xrStore` (a plain zustand vanilla store under the
 * hood) via zustand's generic `useStore(store, selector)`, which works from
 * anywhere regardless of the React tree it's called in.
 *
 * Hidden entirely on devices/browsers without WebXR immersive-vr support —
 * `navigator.xr.isSessionSupported` is async, so this starts hidden and
 * reveals itself only if the check resolves true.
 *
 * KNOWN LIMITATION: this button (and the rest of UIOverlay — control bar,
 * subtitles, Director Workbench) is flat 2D DOM content. Once an immersive
 * session starts, the headset's WebXR compositor renders directly from the
 * Canvas and does NOT show the surrounding page DOM at all — so none of
 * that UI is visible inside the headset. This button remains usable for
 * EXITING VR from outside the headset (e.g. on the companion desktop view,
 * or before entering), but building actual in-VR UI (via drei's <Html/> in
 * world-space, or a mesh-based interface) is a separate, larger effort not
 * included here.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { Glasses } from "lucide-react";
import { xrStore, hasWebXRSupport } from "../scene/xr";

export function VRToggleButton() {
  const [supported, setSupported] = useState(false);
  const session = useStore(xrStore, (state) => state.session);

  useEffect(() => {
    let cancelled = false;
    hasWebXRSupport().then((result) => {
      if (!cancelled) setSupported(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!supported) return null;

  const handleClick = () => {
    if (session) {
      session.end();
    } else {
      xrStore.enterVR();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={session ? "Exit VR" : "Enter VR"}
      title={session ? "Exit VR" : "Enter VR"}
      className="pointer-events-auto fixed left-4 top-4 z-40 flex items-center gap-1.5 rounded-sm border border-amber-200/30 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.15em] text-amber-100 backdrop-blur-md transition-colors hover:bg-amber-300/20 sm:left-6 sm:top-6"
    >
      <Glasses size={14} />
      {session ? "Exit VR" : "Enter VR"}
    </button>
  );
}
