/**
 * ModelLoader.tsx
 * ---------------------------------------------------------------------------
 * Core asset-loading utility: a Draco-compressed GLTF hook built on Three.js'
 * own `useLoader` + `GLTFLoader` + `DRACOLoader` (as requested), rather than
 * drei's `useGLTF` convenience wrapper — this is the more explicit,
 * lower-level approach so the Draco wiring is fully visible and tunable.
 *
 * `useDracoGLTF` also does two things automatically for EVERY asset loaded
 * through it, so it's impossible to forget them per-component:
 *   1. Builds `nodes`/`materials` lookup maps (the familiar gltfjsx-style
 *      ergonomics) by traversing the loaded scene once.
 *   2. Enables `castShadow`/`receiveShadow` on every mesh, and nudges every
 *      MeshStandardMaterial toward a matte, aged-wood look — see
 *      `tuneMaterialForGloom` below.
 *
 * Both `useLoader` and Suspense/Error-Boundary integration are inherited
 * for free: a missing/broken .glb THROWS (not a graceful null, unlike
 * HeartbeatAudio's audio-buffer loader) — callers MUST wrap usage in both
 * a <Suspense> and a <ModelErrorBoundary> (see ModelErrorBoundary.tsx) to
 * degrade to primitive-geometry fallbacks instead of crashing the scene.
 * ---------------------------------------------------------------------------
 */

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, DRACOLoader, type GLTF } from "three-stdlib";

// ----------------------------------------------------------------------------
// Draco decoder — one shared loader instance, not one per component/hook call.
// ----------------------------------------------------------------------------

/**
 * Google's hosted decoder — works with zero setup. For production/offline
 * use, self-host instead: copy the files from
 * `node_modules/three/examples/jsm/libs/draco/` into `public/draco/` and
 * point this at `/draco/`.
 */
export const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

let sharedDracoLoader: DRACOLoader | null = null;

function getDracoLoader(): DRACOLoader {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  }
  return sharedDracoLoader;
}

// ----------------------------------------------------------------------------
// Material tuning — "aged, gloomy sheen"
// ----------------------------------------------------------------------------

/**
 * Nudges a material toward a matte, aged-wood look WITHOUT discarding any
 * authored roughness/metalness MAPS — Three multiplies map-sampled values by
 * these scalars, so an artist-baked texture's spatial variation is fully
 * preserved; this only shifts the baseline.
 */
function tuneMaterialForGloom(material: THREE.Material): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  material.roughness = THREE.MathUtils.clamp(material.roughness * 1.15 + 0.1, 0, 1);
  material.metalness = THREE.MathUtils.clamp(material.metalness * 0.5, 0, 1);
  material.envMapIntensity = 0.4; // keep reflections subdued in the gloom
}

// ----------------------------------------------------------------------------
// Scene processing: shadows + material tuning + nodes/materials maps
// ----------------------------------------------------------------------------

export interface ProcessedGLTF {
  nodes: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.Material>;
}

function processScene(scene: THREE.Object3D): ProcessedGLTF {
  const nodes: Record<string, THREE.Object3D> = {};
  const materials: Record<string, THREE.Material> = {};

  scene.traverse((child) => {
    if (child.name) nodes[child.name] = child;

    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material: THREE.Material) => {
        if (material.name && !(material.name in materials)) materials[material.name] = material;
        tuneMaterialForGloom(material);
      });
    }
  });

  return { nodes, materials };
}

// ----------------------------------------------------------------------------
// The hook
// ----------------------------------------------------------------------------

export type GLTFResult<NodeName extends string = string, MaterialName extends string = string> = GLTF & {
  nodes: Record<NodeName, THREE.Object3D>;
  materials: Record<MaterialName, THREE.Material>;
};

/**
 * Loads a Draco-compressed .glb/.gltf via THREE's useLoader, with shadows +
 * material tuning applied automatically. SUSPENDS while loading and THROWS
 * on failure — wrap call sites in <Suspense> + <ModelErrorBoundary>.
 *
 * NOTE on reuse: `useLoader` caches by [Loader, url], so calling this with
 * the SAME url from multiple components returns the SAME scene graph — do
 * not mount the resulting `.scene` (or a shared node) via <primitive> in
 * more than one place at once; `.clone()` first if you need multiple
 * instances of the same asset.
 */
export function useDracoGLTF<NodeName extends string = string, MaterialName extends string = string>(
  url: string,
): GLTFResult<NodeName, MaterialName> {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  }) as GLTF;

  const { nodes, materials } = useMemo(() => processScene(gltf.scene), [gltf.scene]);

  return { ...gltf, nodes, materials } as GLTFResult<NodeName, MaterialName>;
}

// ----------------------------------------------------------------------------
// Asset registry + optional early preloading
// ----------------------------------------------------------------------------

export const ASSET_URLS = {
  room: "/models/bedroom-environment.glb",
  floorboards: "/models/floorboards.glb",
  props: "/models/props.glb",
} as const;

/**
 * Warms R3F's loader cache for all scene assets ahead of time — call once,
 * early (e.g. alongside the App-level preloader), so fetching starts before
 * BedroomScene's components even mount, rather than waiting for each one to
 * request its own asset in turn.
 */
export function preloadSceneAssets(): void {
  Object.values(ASSET_URLS).forEach((url) => {
    useLoader.preload(GLTFLoader, url, (loader) => {
      (loader as GLTFLoader).setDRACOLoader(getDracoLoader());
    });
  });
}
