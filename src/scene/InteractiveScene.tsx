/**
 * InteractiveScene.tsx
 * ---------------------------------------------------------------------------
 * The interaction layer for objects that AREN'T already interactive on their
 * own — the floorboards handle their own click/lift logic directly in
 * scene/models/Floorboards.tsx (that coupling is intentional: the plank
 * mesh needs a ref for its own transform animation regardless, so splitting
 * "clickable" from "animatable" there would just add indirection). This
 * file covers the lantern and the bed, which have no other reason to own
 * pointer handlers themselves.
 *
 * RAYCASTING NOTE: this deliberately does NOT instantiate a second
 * `new THREE.Raycaster()` — R3F's <Canvas> already runs one internally and
 * dispatches onClick/onPointerOver/onPointerOut to whichever mesh it hits,
 * respecting proper depth ordering. Using those per-mesh handlers here IS
 * the "Three.js raycasting" this requirement asks for; reimplementing a
 * second, parallel raycast loop would just duplicate (and could desync
 * from) the one R3F already runs every pointer event.
 *
 * MOBILE TOUCH: R3F's pointer events are backed by the browser's unified
 * Pointer Events API, so onClick/onPointerOver/onPointerOut already fire
 * correctly for touch input with no extra coordinate mapping needed. The
 * one real gotcha is that mobile browsers can intercept touch gestures for
 * scrolling/zooming before they ever reach the canvas — see the
 * `touchAction: 'none'` style added to the <Canvas> in SceneCanvas.tsx,
 * which is what actually fixes that, not anything in this file.
 *
 * Hotspots are invisible-but-raycastable: `visible={false}` would make
 * three.js skip them entirely during raycasting, so instead they use a
 * fully transparent material (opacity 0) to stay hit-testable while
 * rendering nothing.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { triggerLanternFlare } from "./lanternInteraction";
import { triggerCameraJolt } from "./chapterEvents";

interface HotspotProps {
  position: [number, number, number];
  size: [number, number, number];
  onActivate: () => void;
  label: string;
}

function Hotspot({ position, size, onActivate, label }: HotspotProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onActivate();
  };
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer"; // no visible effect on touch devices, harmless
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  return (
    <mesh
      name={`hotspot-${label}`}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      // A faint hover glow so mouse users get feedback that something is
      // clickable — real geometry stays fully invisible otherwise.
      renderOrder={1}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial
        transparent
        opacity={hovered ? 0.06 : 0}
        color="#ffd9a0"
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function InteractiveScene() {
  return (
    <group>
      {/* The lantern prop sits at [1.4, 0.55, -1.9] on the nightstand — see Props.tsx. */}
      <Hotspot
        label="lantern"
        position={[1.4, 0.55, -1.9]}
        size={[0.22, 0.3, 0.22]}
        onActivate={() => triggerLanternFlare()}
      />

      {/* Roughly covers the bed frame + mattress volume — see Room.tsx's RoomFallback bed group. */}
      <Hotspot
        label="bed"
        position={[0, 0.55, -1.6]}
        size={[1.3, 0.6, 2.1]}
        onActivate={() => triggerCameraJolt(0.02, 300)}
      />
    </group>
  );
}
