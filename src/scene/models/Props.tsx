/**
 * Props.tsx
 * ---------------------------------------------------------------------------
 * Small set-dressing items, each shown only for the chapter range where it
 * makes narrative sense — e.g. the police-related prop only appears from
 * Chapter 6 ("The Arrival") onward. Visibility is data-driven via
 * PROP_PLACEMENTS, so adding another prop is a one-line addition rather
 * than new branching logic.
 * ---------------------------------------------------------------------------
 */

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import { useStoryStore } from "../../store/store";
import { useDracoGLTF, ASSET_URLS } from "./ModelLoader";
import { disposeObject3D } from "./disposeObject3D";

interface PropPlacement {
  /** Node name in props.glb (GLTF version) / key into the fallback map below. */
  id: "Lantern" | "TreasureChest" | "PoliceHat";
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Inclusive chapter range this prop is visible for. */
  visibleFrom: number;
  visibleUntil: number;
}

const PROP_PLACEMENTS: PropPlacement[] = [
  // Set dressing on the nightstand — separate from the actual light-casting
  // SpotLight in LanternLight.tsx, which tracks the camera; this is just the
  // resting prop, visible for the whole story.
  { id: "Lantern", position: [1.4, 0.55, -1.9], visibleFrom: 1, visibleUntil: 8 },

  // "I showed them his treasures, secure, undisturbed." — Chapter 6.
  { id: "TreasureChest", position: [-1.8, 0, -2.4], rotation: [0, 0.3, 0], visibleFrom: 1, visibleUntil: 8 },

  // The investigating officers' arrival — Chapter 6 ("The Arrival") onward.
  { id: "PoliceHat", position: [0.6, 0.62, 0.9], rotation: [0, -0.4, 0], visibleFrom: 6, visibleUntil: 8 },
];

function useVisiblePlacements(): PropPlacement[] {
  const currentChapter = useStoryStore((state) => state.currentChapter);
  return PROP_PLACEMENTS.filter((p) => currentChapter >= p.visibleFrom && currentChapter <= p.visibleUntil);
}

// ----------------------------------------------------------------------------
// GLTF version
// ----------------------------------------------------------------------------

export function Props() {
  const { nodes } = useDracoGLTF(ASSET_URLS.props);
  const visible = useVisiblePlacements();

  useEffect(() => {
    // Same reasoning as Floorboards.tsx: dispose the specific nodes we
    // actually used, not the (possibly already-empty) original root.
    return () => {
      PROP_PLACEMENTS.forEach((placement) => {
        const node = nodes[placement.id];
        if (node) disposeObject3D(node);
      });
      useLoader.clear(GLTFLoader, ASSET_URLS.props);
    };
  }, [nodes]);

  return (
    <group>
      {visible.map((placement) => {
        const node = nodes[placement.id];
        if (!node) return null; // node-name mismatch in the source asset — skip rather than crash
        return (
          <group key={placement.id} position={placement.position} rotation={placement.rotation}>
            <primitive object={node} />
          </group>
        );
      })}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Primitive fallback (used if props.glb fails to load)
// ----------------------------------------------------------------------------

const FALLBACK_GEOMETRY: Record<PropPlacement["id"], ReactNode> = {
  Lantern: (
    <group>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.14, 8]} />
        <meshStandardMaterial color="#3a2f1f" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.11, 0]} castShadow>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#ffdca6" emissive="#c98a4b" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
    </group>
  ),
  TreasureChest: (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.5, 0.32, 0.34]} />
      <meshStandardMaterial color="#2b2016" roughness={0.75} metalness={0.15} />
    </mesh>
  ),
  PoliceHat: (
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.12, 0.14, 0.08, 12]} />
      <meshStandardMaterial color="#14161c" roughness={0.5} metalness={0.1} />
    </mesh>
  ),
};

export function PropsFallback() {
  const visible = useVisiblePlacements();

  return (
    <group>
      {visible.map((placement) => (
        <group key={placement.id} position={placement.position} rotation={placement.rotation}>
          {FALLBACK_GEOMETRY[placement.id]}
        </group>
      ))}
    </group>
  );
}
