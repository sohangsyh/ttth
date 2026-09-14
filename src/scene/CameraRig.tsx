/**
 * CameraRig.tsx
 * ---------------------------------------------------------------------------
 * Dual camera controller:
 *
 *  - 'cinematic': the camera follows the authored keyframe path for the
 *    current chapter (see chapters.ts -> cameraKeyframes), driven by the
 *    shared timeline clock in timelineStore. Two sub-states:
 *      - Chapter cut in flight (cameraTransition.active): blends from the
 *        pose frozen at cut-time toward the new chapter's LIVE keyframe pose,
 *        using progress eased by GSAP in ChapterTransitionManager.tsx.
 *      - Steady state: exponential damping ("lerp") toward the live keyframe
 *        pose, so keyframe-to-keyframe motion within a chapter never snaps.
 *
 *  - 'free': hands control to the viewer — mouse-look + zoom via OrbitControls,
 *    WASD(+Q/E, Shift-boost) fly movement via useKeyboardControls. This is the
 *    "Director Camera" mode for exploring the scene outside the authored path.
 *
 * CINEMATOGRAPHY: each chapter's `motionProfile` (chapters.ts) supplies a
 * continuous procedural offset — see cameraMotionProfiles.ts — layered on
 * top of the keyframe-interpolated base pose (hover-drift, dutch-chaos,
 * frenetic-collapse, etc). Keyframes may also author a `roll` value for
 * true dutch-angle tilt, applied via camera.rotateZ AFTER lookAt() so it's
 * a genuine roll around the view axis, not a re-aim. The live camera-to-
 * subject distance is written to cameraFocus.ts every frame for TensionFX's
 * DepthOfField to track.
 *
 * WEBXR: while a VR session is active (useXR()'s `session` is set), this
 * component does NOTHING to the camera — neither branch runs, and
 * OrbitControls isn't rendered even in 'free' mode. WebXR's own head
 * tracking owns the camera transform entirely during a session; writing to
 * camera.position/quaternion/fov here would fight it and produce broken,
 * nauseating motion in the headset. Camera control resumes automatically
 * once the session ends (session becomes undefined again).
 *
 * Mount exactly once inside <Canvas>, alongside <TimelineDriver /> and
 * <ChapterTransitionManager />.
 * ---------------------------------------------------------------------------
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useStoryStore } from "../store/store";
import { useTimelineStore } from "../store/timelineStore";
import { useRendererStore } from "../store/rendererStore";
import { getCameraPoseAtTime, getChapterById } from "../data/chapters";
import { useKeyboardControls } from "./useKeyboardControls";
import { cameraTransition } from "./cameraTransition";
import { cameraJolt } from "./chapterEvents";
import { getMotionOffset } from "./cameraMotionProfiles";
import { cameraFocus } from "./cameraFocus";
import { triggerFloorCreak } from "../audio/floorCreak";

/** Higher = camera snaps to the cinematic target faster (less lag/smoothing). */
const CINEMATIC_DAMPING = 2.5;
/** Base fly speed in units/second for the free camera. */
const FREE_FLY_SPEED = 3;
/** Multiplier applied while Shift is held. */
const FREE_FLY_BOOST = 2.5;
/** Seconds between footstep-creak triggers while actively walking in free mode. */
const FOOTSTEP_CREAK_INTERVAL = 0.5;

export function CameraRig() {
  const { camera } = useThree();
  const cameraMode = useStoryStore((state) => state.cameraMode);
  const currentChapter = useStoryStore((state) => state.currentChapter);
  const isPresenting = useXR((state) => state.session !== undefined);

  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const keysRef = useKeyboardControls();

  // Scratch objects reused every frame to avoid per-frame GC pressure.
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3(0, 1.5, 0));
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const moveDelta = useRef(new THREE.Vector3());
  const footstepTimerRef = useRef(0);

  useFrame((_state, delta) => {
    if (isPresenting) return; // WebXR owns the camera entirely during a session — see file header.

    if (cameraMode === "cinematic") {
      const elapsed = useTimelineStore.getState().elapsed;
      const livePose = getCameraPoseAtTime(currentChapter, elapsed);
      if (!livePose) return;

      if (cameraTransition.active) {
        // ---- Chapter-cut in flight: blend from the frozen "from" pose to
        // the chapter's LIVE keyframe pose (see cameraTransition.ts for why
        // "live" rather than frozen matters for a seamless handoff).
        const t = cameraTransition.progress;
        const from = cameraTransition.fromPosition;
        const fromLookAt = cameraTransition.fromLookAt;

        targetPosition.current.set(
          THREE.MathUtils.lerp(from.x, livePose.position.x, t),
          THREE.MathUtils.lerp(from.y, livePose.position.y, t),
          THREE.MathUtils.lerp(from.z, livePose.position.z, t),
        );
        camera.position.copy(targetPosition.current);

        currentLookAt.current.set(
          THREE.MathUtils.lerp(fromLookAt.x, livePose.lookAt.x, t),
          THREE.MathUtils.lerp(fromLookAt.y, livePose.lookAt.y, t),
          THREE.MathUtils.lerp(fromLookAt.z, livePose.lookAt.z, t),
        );

        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = THREE.MathUtils.lerp(cameraTransition.fromFov, livePose.fov, t);
        }

        // Safety backstop in case onComplete fires a tick late.
        if (t >= 1) cameraTransition.active = false;
      } else {
        // ---- Steady state: exponential damping toward the live keyframe pose.
        targetPosition.current.set(livePose.position.x, livePose.position.y, livePose.position.z);
        targetLookAt.current.set(livePose.lookAt.x, livePose.lookAt.y, livePose.lookAt.z);

        // Frame-rate independent exponential damping (same feel at 30fps or 144fps).
        const dampT = 1 - Math.exp(-CINEMATIC_DAMPING * delta);
        camera.position.lerp(targetPosition.current, dampT);
        currentLookAt.current.lerp(targetLookAt.current, dampT);

        if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - livePose.fov) > 0.01) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, livePose.fov, dampT);
        }
      }

      // ---- Per-chapter cinematographic "character" — see
      // cameraMotionProfiles.ts. Applied to BOTH position and lookAt before
      // the final lookAt() call, so the offset reads as a real camera move,
      // not just a wobble layered on top of a static aim.
      const chapterData = getChapterById(currentChapter);
      const chapterDuration = chapterData?.duration ?? 60;
      const motion = getMotionOffset(chapterData?.motionProfile ?? "steady-clinical", elapsed, chapterDuration);
      camera.position.x += motion.position.x;
      camera.position.y += motion.position.y;
      camera.position.z += motion.position.z;
      currentLookAt.current.x += motion.lookAt.x;
      currentLookAt.current.y += motion.lookAt.y;
      currentLookAt.current.z += motion.lookAt.z;

      camera.lookAt(currentLookAt.current);

      // True dutch-angle tilt: rotate around the camera's own view axis
      // AFTER aiming, combining the keyframe-authored `roll` with the
      // motion profile's own procedural roll (Ch4/Ch8's chaos).
      const totalRoll = livePose.roll + motion.roll;
      if (Math.abs(totalRoll) > 0.0001) camera.rotateZ(totalRoll);

      if (camera instanceof THREE.PerspectiveCamera) camera.updateProjectionMatrix();

      // ---- Discrete chapter-enter jolt (see chapterEvents.ts) — a small
      // decaying positional jitter applied AFTER lookAt, so it reads as a
      // physical tremor rather than a re-aim.
      const now = performance.now();
      if (now < cameraJolt.activeUntil) {
        const decay = (cameraJolt.activeUntil - now) / cameraJolt.durationMs;
        const jt = now * 0.001;
        camera.position.x += (Math.sin(jt * 47) + Math.sin(jt * 71)) * cameraJolt.magnitude * decay;
        camera.position.y += Math.sin(jt * 59 + 1.3) * cameraJolt.magnitude * decay * 0.6;
      }

      // Live camera-to-subject distance, for TensionFX's DepthOfField to
      // rack focus onto whatever the camera is actually looking at.
      cameraFocus.distance = camera.position.distanceTo(currentLookAt.current);

      return;
    }

    // ---- 'free' (Director) camera: WASD fly + OrbitControls mouse-look ----
    const keys = keysRef.current;
    const speed = (keys.boost ? FREE_FLY_BOOST : 1) * FREE_FLY_SPEED * delta;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() > 0) forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    moveDelta.current.set(0, 0, 0);
    if (keys.forward) moveDelta.current.add(forward.current);
    if (keys.backward) moveDelta.current.sub(forward.current);
    if (keys.right) moveDelta.current.add(right.current);
    if (keys.left) moveDelta.current.sub(right.current);
    if (keys.up) moveDelta.current.y += 1;
    if (keys.down) moveDelta.current.y -= 1;

    if (moveDelta.current.lengthSq() > 0) {
      moveDelta.current.normalize().multiplyScalar(speed);
      camera.position.add(moveDelta.current);
      orbitRef.current?.target.add(moveDelta.current);

      // Footsteps: throttled floor-creak trigger while actively walking in
      // free/Director mode — see audio/floorCreak.ts. This component only
      // triggers the event; SoundManager.tsx owns how it actually sounds.
      footstepTimerRef.current += delta;
      if (footstepTimerRef.current >= FOOTSTEP_CREAK_INTERVAL) {
        footstepTimerRef.current = 0;
        triggerFloorCreak({ x: camera.position.x, y: 0, z: camera.position.z });
      }
    } else {
      footstepTimerRef.current = FOOTSTEP_CREAK_INTERVAL; // next step creaks immediately, not after a full interval
    }

    orbitRef.current?.update();

    // Director Workbench's FOV slider only applies in free mode — cinematic
    // mode's FOV is fully authored per-keyframe in chapters.ts.
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = useRendererStore.getState().freeFov;
      if (Math.abs(camera.fov - targetFov) > 0.01) {
        const fovT = 1 - Math.exp(-4 * delta);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, fovT);
        camera.updateProjectionMatrix();
      }
    }
  });

  if (cameraMode === "free" && !isPresenting) {
    return (
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.3}
        maxDistance={14}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI - 0.1}
      />
    );
  }

  return null;
}
