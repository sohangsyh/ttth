/**
 * DustParticles.tsx
 * ---------------------------------------------------------------------------
 * Slow-drifting dust motes that loosely follow the camera's forward view so
 * they're always catching light in front of the lantern beam, rather than
 * being a static field the viewer quickly flies past. Built on drei's
 * <Sparkles>, which internally handles the per-particle drift/flicker shader.
 * ---------------------------------------------------------------------------
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const FOLLOW_DISTANCE = 2.5;
const FOLLOW_SMOOTHING_RATE = 1.2; // slow — dust drifts into position, doesn't snap

export function DustParticles() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const forwardDir = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    camera.getWorldDirection(forwardDir.current);
    targetPos.current.copy(camera.position).addScaledVector(forwardDir.current, FOLLOW_DISTANCE);
    const smoothing = 1 - Math.exp(-FOLLOW_SMOOTHING_RATE * delta);
    groupRef.current.position.lerp(targetPos.current, smoothing);
  });

  return (
    <group ref={groupRef}>
      <Sparkles
        count={90}
        scale={[4, 2.5, 4]}
        size={1.4}
        speed={0.15}
        opacity={0.35}
        color="#ffcf9e"
        noise={1}
      />
    </group>
  );
}
