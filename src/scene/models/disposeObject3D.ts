/**
 * disposeObject3D.ts
 * ---------------------------------------------------------------------------
 * Recursively disposes every mesh's geometry, material(s), and any textures
 * referenced by those materials under a given root Object3D.
 *
 * IMPORTANT — this is NOT automatic just because a component unmounts.
 * `useDracoGLTF` caches loaded GLTFs by URL (via R3F's `useLoader` cache),
 * so calling this on a component's own unmount is only safe when you're
 * disposing the SPECIFIC nodes that component owns and rendered — NOT a
 * stale reference to the original loaded root once its children have been
 * reparented elsewhere (see Floorboards.tsx, which plucks individual named
 * nodes out of the loaded scene: by unmount time, the original root may
 * have no children left, since three.js's `.add()` reparents rather than
 * copies — disposing the ORIGINAL root there would silently dispose
 * nothing). Always dispose the actual nodes you rendered.
 *
 * Pair this with `useLoader.clear(GLTFLoader, url)` (see Room/Floorboards/
 * Props.tsx) so a future remount re-fetches and re-parses instead of
 * returning the now-disposed cached result.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";

function disposeMaterial(material: THREE.Material): void {
  // Dispose any texture referenced by ANY property on the material (map,
  // normalMap, roughnessMap, envMap, ...) without hardcoding every possible
  // slot name — MeshStandardMaterial alone has a dozen texture slots.
  Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material && disposeMaterial(material));
    }
  });
}
