/**
 * AssetLoadingFallback.tsx
 * ---------------------------------------------------------------------------
 * The <Suspense fallback={...}> shown while Room/Floorboards/Props are
 * fetching+decoding their .glb files. Rendered via drei's <Html fullscreen>
 * because this Suspense boundary lives INSIDE <Canvas> — you can't render
 * arbitrary Tailwind/DOM markup directly in the R3F tree otherwise.
 *
 * Uses drei's `useProgress`, which taps THREE.DefaultLoadingManager — since
 * `useDracoGLTF` loads through THREE's own GLTFLoader, this reflects REAL
 * bytes-loaded progress across all in-flight assets with no extra plumbing.
 *
 * This is distinct from (and shows AFTER) App.tsx's <LoadingScreen>, which
 * only covers the JS-bundle-load + WebGL-init phase, before any GLTF fetch
 * has even started.
 * ---------------------------------------------------------------------------
 */

import { Html, useProgress } from "@react-three/drei";

export function AssetLoadingFallback() {
  const { progress, item, loaded, total } = useProgress();

  return (
    <Html fullscreen>
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#05040a]">
        <div className="h-2 w-56 overflow-hidden rounded-full bg-stone-100/10">
          <div
            className="h-full rounded-full bg-amber-300/90 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
        <div className="text-center">
          <p className="font-serif text-base italic tracking-wide text-stone-100/90">Furnishing the room…</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
            {total > 0 ? `${loaded}/${total} assets` : "preparing"} · {Math.round(progress)}%
          </p>
          {item && <p className="mt-1 truncate text-[10px] text-stone-600">{item}</p>}
        </div>
      </div>
    </Html>
  );
}
