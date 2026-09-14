/**
 * ChapterTransitionManager.tsx
 * ---------------------------------------------------------------------------
 * Fires whenever `currentChapter` changes:
 *
 *  1. Snapshots the camera's current LIVE position/facing/FOV as the tween's
 *     "from" pose — so re-jumping chapters mid-transition still starts
 *     cleanly from wherever the camera actually is, not some stale value.
 *  2. Starts a GSAP tween easing `cameraTransition.progress` from 0 to 1.
 *     CameraRig.tsx blends camera.position/lookAt/fov between that frozen
 *     "from" pose and the NEW chapter's LIVE keyframe pose using this
 *     progress value, every frame, inside its own useFrame — see
 *     cameraTransition.ts for why the "to" pose is intentionally NOT frozen.
 *  3. Dispatches the chapter-enter event bus (chapterEvents.ts) for discrete
 *     one-off effects (see the Ch5/Ch8 camera-jolt example registered there).
 *
 * Mount once inside <Canvas>, alongside CameraRig and TimelineDriver.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import { useStoryStore } from "../store/store";
import { cameraTransition, TRANSITION_BASE_DURATION } from "./cameraTransition";
import { dispatchChapterEnter } from "./chapterEvents";

export function ChapterTransitionManager() {
  const { camera } = useThree();
  const currentChapter = useStoryStore((state) => state.currentChapter);

  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const isFirstRun = useRef(true);
  const forwardScratch = useRef(new THREE.Vector3());

  useEffect(() => {
    dispatchChapterEnter(currentChapter);

    // Don't animate INTO the very first chapter on initial mount — there's
    // nowhere meaningful to transition FROM. CameraRig starts at that
    // chapter's own t=0 keyframe pose directly.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    tweenRef.current?.kill();

    // Snapshot wherever the camera ACTUALLY is right now as the tween's start.
    camera.getWorldDirection(forwardScratch.current);
    cameraTransition.fromPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    cameraTransition.fromLookAt = {
      x: camera.position.x + forwardScratch.current.x * 3,
      y: camera.position.y + forwardScratch.current.y * 3,
      z: camera.position.z + forwardScratch.current.z * 3,
    };
    cameraTransition.fromFov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45;
    cameraTransition.progress = 0;
    cameraTransition.active = true;

    // Faster playback -> snappier cuts, so transitions never feel like they're
    // dragging the story down when the viewer has sped things up.
    const playbackSpeed = useStoryStore.getState().playbackSpeed;

    tweenRef.current = gsap.to(cameraTransition, {
      progress: 1,
      duration: TRANSITION_BASE_DURATION / playbackSpeed,
      ease: "power2.inOut",
      onComplete: () => {
        cameraTransition.active = false;
      },
    });

    return () => {
      tweenRef.current?.kill();
    };
    // Only currentChapter should re-trigger this — camera/playbackSpeed are
    // read fresh at fire-time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter]);

  return null;
}
