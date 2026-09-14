/**
 * cameraTransition.ts
 * ---------------------------------------------------------------------------
 * Shared, plain mutable object — deliberately NOT a Zustand store. Nothing
 * ever needs to subscribe to this reactively: GSAP tweens `progress` via
 * direct property assignment (see ChapterTransitionManager.tsx), and
 * CameraRig.tsx reads it inside its own useFrame every tick. A store's
 * pub/sub machinery would be pure overhead here.
 *
 * The "to" pose is deliberately NOT frozen at transition start — CameraRig
 * re-evaluates the new chapter's LIVE keyframe pose (via getCameraPoseAtTime)
 * every frame and blends toward THAT using `progress` as the blend weight.
 * That's what makes the handoff back to normal keyframe-following seamless
 * once the tween finishes: by construction, the blended pose at progress=1
 * already equals wherever continuous following would put the camera anyway.
 * ---------------------------------------------------------------------------
 */

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface CameraTransitionState {
  /** True while a GSAP chapter-cut transition is in flight. */
  active: boolean;
  /** Eased 0..1 progress through the transition — mutated directly by GSAP. */
  progress: number;
  /** Camera pose frozen at the instant the transition began. */
  fromPosition: Vec3Like;
  fromLookAt: Vec3Like;
  fromFov: number;
}

export const cameraTransition: CameraTransitionState = {
  active: false,
  progress: 0,
  fromPosition: { x: 0, y: 1.6, z: 4 },
  fromLookAt: { x: 0, y: 1.5, z: 0 },
  fromFov: 45,
};

/** Chapter-cut transition duration (seconds) at 1x playback speed. */
export const TRANSITION_BASE_DURATION = 1.3;
