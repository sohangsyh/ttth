/**
 * Room.tsx
 * ---------------------------------------------------------------------------
 * The static bedroom environment — walls, floor base, bed, and the old man
 * lying in it — loaded as one combined GLTF asset (these pieces don't move
 * independently, unlike the floorboards, so there's no benefit to splitting
 * them into separate files or separate draw calls).
 *
 * `RoomFallback` is the original primitive-geometry version from the
 * pre-asset-pipeline BedroomScene.tsx, kept as the <ModelErrorBoundary>
 * fallback so the scene still reads correctly if bedroom-environment.glb
 * is missing or fails to load.
 * ---------------------------------------------------------------------------
 */

import { useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import { useDracoGLTF, ASSET_URLS } from "./ModelLoader";
import { disposeObject3D } from "./disposeObject3D";

// ----------------------------------------------------------------------------
// GLTF version
// ----------------------------------------------------------------------------

export function Room() {
  const { scene } = useDracoGLTF(ASSET_URLS.room);

  useEffect(() => {
    // Room renders the WHOLE loaded scene as one <primitive> (unlike
    // Floorboards, which plucks individual nodes out), so it exclusively
    // owns every mesh under `scene` — safe to dispose on ITS OWN unmount.
    return () => {
      disposeObject3D(scene);
      useLoader.clear(GLTFLoader, ASSET_URLS.room); // so a future remount re-fetches instead of reusing disposed resources
    };
  }, [scene]);

  // Shadows + material tuning were already applied once inside useDracoGLTF.
  return <primitive object={scene} />;
}

// ----------------------------------------------------------------------------
// Primitive fallback (used if bedroom-environment.glb fails to load)
// ----------------------------------------------------------------------------

const ROOM_WIDTH = 6;
const ROOM_DEPTH = 6;

export function RoomFallback() {
  return (
    <group>
      {/* Back + side walls */}
      <mesh position={[0, 1.5, -3]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 3, 0.1]} />
        <meshStandardMaterial color="#120d14" roughness={1} />
      </mesh>
      <mesh position={[-ROOM_WIDTH / 2, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[ROOM_DEPTH, 3, 0.1]} />
        <meshStandardMaterial color="#150f18" roughness={1} />
      </mesh>

      {/* Bed */}
      <group position={[0, 0, -1.6]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.5, 2.1]} />
          <meshStandardMaterial color="#1c1410" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.18, 1.95]} />
          <meshStandardMaterial color="#3d3226" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.7, -0.8]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.14, 0.4]} />
          <meshStandardMaterial color="#4a4030" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.72, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.16, 1.3]} />
          <meshStandardMaterial color="#241b28" roughness={0.85} />
        </mesh>
      </group>

      {/* Old man figure — primitive placeholder */}
      <group position={[0, 0.78, -1.7]} rotation={[0, 0.15, 0]}>
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.16, 0.55, 4, 8]} />
          <meshStandardMaterial color="#5a4a42" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.08, -0.42]} castShadow receiveShadow>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshStandardMaterial color="#8c7566" roughness={0.85} />
        </mesh>
        {/* The vulture-eye detail */}
        <mesh position={[0.05, 0.09, -0.5]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#cfe8ff" emissive="#4a7a9c" emissiveIntensity={0.15} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
