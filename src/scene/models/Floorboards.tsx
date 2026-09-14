/**
 * Floorboards.tsx
 * ---------------------------------------------------------------------------
 * The floor: mostly static planks, plus a handful of "liftable" ones that
 * pry open for Chapter 5 ("The Concealment") and Chapter 8 ("The
 * Confession") — see getPlankLiftAmount below for the authored timing.
 *
 * Two independent triggers, combined via max():
 *   1. Timeline-driven: automatic, tied to (currentChapter, elapsed).
 *   2. Click-driven: clicking a liftable plank toggles a manual override,
 *      animated with a GSAP tween (not the timeline's own procedural easing)
 *      — so a viewer can pry the floor open themselves at any point in the
 *      story, not just during the two authored beats. Clicking a plank
 *      while in Chapter 7 ("The Rising Sound") also forces the story
 *      straight to Chapter 8 ("The Confession") — the climax trigger.
 *
 * `AnimatedPlank` is the shared "behavior" wrapper — it owns the animation/
 * interactivity and accepts whatever visual content as children, which is
 * what lets the GLTF version (real named mesh nodes) and `FloorboardsFallback`
 * (primitive boxes) share EXACTLY the same lift logic with zero duplication.
 *
 * IMPORTANT: unlike Room.tsx, this component does NOT render the loaded
 * scene as a whole — it plucks individual named plank nodes out of it and
 * re-parents each one under its own AnimatedPlank group. If your exported
 * floorboards.glb uses different node names than `Plank_00`..`Plank_15`,
 * update PLANK_NODE_NAMES to match.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import gsap from "gsap";
import { useStoryStore } from "../../store/store";
import { useTimelineStore } from "../../store/timelineStore";
import { triggerFloorCreak } from "../../audio/floorCreak";
import { useDracoGLTF, ASSET_URLS } from "./ModelLoader";
import { disposeObject3D } from "./disposeObject3D";

const PLANK_COUNT = 16;
const ROOM_WIDTH = 6;
const ROOM_DEPTH = 6;
const PLANK_WIDTH = ROOM_DEPTH / PLANK_COUNT;
const PLANK_THICKNESS = 0.08;

/** Indices that pry open for the concealment / confession beats. Matches node names Plank_00..Plank_15 in the GLTF. */
const LIFTABLE_PLANK_INDICES = [6, 7, 8, 9];

const PLANK_NODE_NAMES = Array.from({ length: PLANK_COUNT }, (_, i) => `Plank_${String(i).padStart(2, "0")}`);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 0..1 "how lifted are the loose planks right now", from the timeline alone:
 *  - Chapter 5: pried up ~15-19s, replaced ~24-33s.
 *  - Chapter 8: torn up ~13-18s and left open.
 */
function getPlankLiftAmount(chapterId: number, elapsed: number): number {
  if (chapterId === 5) {
    const risingIn = smoothstep(15, 19, elapsed);
    const loweringOut = 1 - smoothstep(24, 33, elapsed);
    return Math.min(risingIn, loweringOut);
  }
  if (chapterId === 8) {
    return smoothstep(13, 18, elapsed);
  }
  return 0;
}

// ----------------------------------------------------------------------------
// Shared behavior wrapper
// ----------------------------------------------------------------------------

interface AnimatedPlankProps {
  plankIndex: number;
  liftable: boolean;
  children: React.ReactNode;
}

/** Per-plank deterministic jitter so lifted planks don't all move in unison. */
function plankSeed(index: number): number {
  return Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1;
}

function AnimatedPlank({ plankIndex, liftable, children }: AnimatedPlankProps) {
  const groupRef = useRef<THREE.Group>(null);
  const manualOpenRef = useRef(false);
  // Plain object GSAP tweens directly via property assignment — same pattern
  // as cameraTransition.ts, kept per-plank-instance so all 16 planks animate independently.
  const manualState = useRef({ progress: 0 }).current;
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const seed = useRef(plankSeed(plankIndex)).current;

  useEffect(() => () => void tweenRef.current?.kill(), []);

  useFrame(() => {
    if (!liftable || !groupRef.current) return;

    const { currentChapter } = useStoryStore.getState();
    const { elapsed } = useTimelineStore.getState();
    const timelineLift = getPlankLiftAmount(currentChapter, elapsed);

    const lift = Math.max(timelineLift, manualState.progress);

    groupRef.current.position.y = lift * (0.3 + seed * 0.15);
    groupRef.current.position.x = lift * seed * 0.25;
    groupRef.current.rotation.z = lift * (0.15 + seed * 0.2) * (plankIndex % 2 === 0 ? 1 : -1);
  });

  if (!liftable) return <group>{children}</group>;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    // Chapter 7 ("The Rising Sound") -> prying at the floor forces the
    // climax: jump straight to Chapter 8 ("The Confession"). Only matters
    // once — after this, currentChapter is 8, so subsequent clicks just
    // toggle the lift normally like any other chapter.
    if (useStoryStore.getState().currentChapter === 7) {
      useStoryStore.getState().setChapter(8);
    }

    triggerFloorCreak({ x: event.point.x, y: event.point.y, z: event.point.z });

    manualOpenRef.current = !manualOpenRef.current;

    tweenRef.current?.kill();
    tweenRef.current = gsap.to(manualState, {
      progress: manualOpenRef.current ? 1 : 0,
      duration: 0.6,
      ease: "power2.out",
    });
  };
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer"; // no-op on touch devices, harmless
  };
  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
  };

  return (
    <group ref={groupRef} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      {children}
    </group>
  );
}

// ----------------------------------------------------------------------------
// GLTF version
// ----------------------------------------------------------------------------

export function Floorboards() {
  const { nodes } = useDracoGLTF(ASSET_URLS.floorboards);

  useEffect(() => {
    // Dispose the ACTUAL plank nodes we rendered — NOT the original loaded
    // root, which by unmount time has no children left (each plank was
    // reparented under its own AnimatedPlank group; three.js's `.add()`
    // removes from the previous parent, so the root's children list is
    // empty by now). See disposeObject3D.ts's header for why this matters.
    return () => {
      PLANK_NODE_NAMES.forEach((name) => {
        const node = nodes[name];
        if (node) disposeObject3D(node);
      });
      useLoader.clear(GLTFLoader, ASSET_URLS.floorboards);
    };
  }, [nodes]);

  return (
    <group>
      {PLANK_NODE_NAMES.map((nodeName, index) => {
        const node = nodes[nodeName];
        if (!node) return null; // node-name mismatch in the source asset — skip rather than crash
        return (
          <AnimatedPlank key={nodeName} plankIndex={index} liftable={LIFTABLE_PLANK_INDICES.includes(index)}>
            <primitive object={node} />
          </AnimatedPlank>
        );
      })}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Primitive fallback (used if floorboards.glb fails to load)
// ----------------------------------------------------------------------------

export function FloorboardsFallback() {
  return (
    <group>
      {Array.from({ length: PLANK_COUNT }, (_, index) => {
        const z = -ROOM_DEPTH / 2 + index * PLANK_WIDTH + PLANK_WIDTH / 2;
        return (
          <AnimatedPlank key={index} plankIndex={index} liftable={LIFTABLE_PLANK_INDICES.includes(index)}>
            <mesh position={[0, PLANK_THICKNESS / 2, z]} receiveShadow castShadow={LIFTABLE_PLANK_INDICES.includes(index)}>
              <boxGeometry args={[ROOM_WIDTH, PLANK_THICKNESS, PLANK_WIDTH * 0.94]} />
              <meshStandardMaterial color="#2a1c12" roughness={0.9} metalness={0.05} />
            </mesh>
          </AnimatedPlank>
        );
      })}
      {/* Sub-floor cavity, visible once planks lift. */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.3, ROOM_DEPTH]} />
        <meshStandardMaterial color="#08060a" roughness={1} />
      </mesh>
    </group>
  );
}
