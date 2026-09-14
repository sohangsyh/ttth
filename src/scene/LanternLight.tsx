/**
 * LanternLight.tsx
 * ---------------------------------------------------------------------------
 * The narrator's dark lantern: a warm, flickering, shadow-casting SpotLight
 * that sweeps via real raycasting against the room geometry — the beam
 * actually stops where the pointer's ray hits a surface (or camera-forward,
 * as a fallback when nothing's hit), rather than aiming at an extrapolated
 * point floating in open space. Rendered volumetrically via drei's
 * <SpotLight> so the beam itself is visible through the room's fog.
 *
 * CHIAROSCURO: this is deliberately the scene's ONLY meaningful light
 * source most of the time (ambientLight in SceneCanvas.tsx is barely above
 * zero) — everything not in the beam should read as true velvet-black, per
 * the brief's Rembrandt/Caravaggio reference. Chapter 6 is the one
 * exception, where WindowLight.tsx introduces harsh directional bars and
 * this lantern intentionally dims to a secondary role (see its `intensity`
 * lighting-profile value below).
 *
 * Each chapter supplies a LightingProfile (chapters.ts) read here every
 * frame: beam angle (narrow/piercing vs wide/flood), color temperature
 * (cold/warm/harsh), a baseline intensity multiplier, and a `violence`
 * value that layers extra guttering amplitude and, above ~0.7, occasional
 * probabilistic strobe bursts (Ch4's struggle, Ch8's dropped lantern) on
 * top of the normal heartbeat-linked flicker.
 *
 * WEBXR: while presenting, aims from screen-center (gaze direction) instead
 * of the desktop mouse pointer, which is meaningless inside a headset.
 * ---------------------------------------------------------------------------
 */

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { SpotLight } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import type { SpotLight as SpotLightImpl } from "three";
import { useStoryStore } from "../store/store";
import { useRendererStore } from "../store/rendererStore";
import { getChapterById, type LightingProfile } from "../data/chapters";
import { lanternFlare } from "./lanternInteraction";

/** Baseline (non-flickering) spotlight intensity, before a chapter's lighting.intensity multiplier. */
const FLICKER_BASE_INTENSITY = 3.2;
/** How much the flicker can swing intensity up/down from the base, before violence scaling. */
const FLICKER_AMPLITUDE = 0.6;
/** Fallback aim distance (world units) used only when the raycast hits nothing — e.g. looking through an open doorway. */
const FALLBACK_AIM_DISTANCE = 3.5;
/** Higher = the aim point catches up to the raycast hit faster. */
const AIM_SMOOTHING_RATE = 8;

const DEFAULT_LIGHTING: LightingProfile = { beamAngle: 0.5, colorTemp: "warm", intensity: 1, violence: 0 };

const COLOR_TEMP_HEX: Record<LightingProfile["colorTemp"], string> = {
  cold: "#a9c4e8", // pale blue-white — Ch1's "cold blue shadows"
  warm: "#ffb37a", // the default amber lantern glow
  harsh: "#f4ecd8", // bright, near-white — Ch6's morning harshness / Ch8's blinding strobe
};

export function LanternLight() {
  const { camera, pointer, raycaster, scene } = useThree();
  const heartRate = useStoryStore((state) => state.heartRate);
  const currentChapter = useStoryStore((state) => state.currentChapter);
  const isPresenting = useXR((state) => state.session !== undefined);
  // In VR there's no mouse — `pointer` would just be whatever the desktop
  // cursor last was (often (0,0) if it never moved), which happens to BE
  // the correct "look straight ahead" value anyway, so this is really just
  // making that intentional rather than accidental, and documenting it.
  const gazePointer = useRef(new THREE.Vector2(0, 0)).current;
  // Read once at mount, not subscribed reactively: resizing a shadow map
  // that's already rendering mid-session means disposing and recreating its
  // render target, which is disproportionate complexity for a setting that
  // in practice gets decided once per session (auto-detected on mobile, or
  // toggled early in the Workbench) rather than flipped repeatedly.
  // Cinematic default is high-resolution (2048) per the chiaroscuro brief's
  // "sharp, long shadows" requirement; Performance Mode halves it.
  const performanceModeAtMount = useRef(useRendererStore.getState().performanceMode).current;
  const shadowMapSize = performanceModeAtMount ? 1024 : 2048;

  const lighting = getChapterById(currentChapter)?.lighting ?? DEFAULT_LIGHTING;

  // Grabbed via ref callback so we can attach + mutate light.target below —
  // drei's <SpotLight> forwards its ref to the underlying THREE.SpotLight.
  const [light, setLight] = useState<SpotLightImpl | null>(null);

  const forwardDir = useRef(new THREE.Vector3());
  const hitPoint = useRef(new THREE.Vector3(0, 1.4, -2));
  const aimPoint = useRef(new THREE.Vector3(0, 1.4, -2));
  const flickerSeed = useMemo(() => Math.random() * 1000, []);

  useFrame(({ clock }, delta) => {
    // --- Where the lantern is aimed: cast a real ray from the pointer
    // through the camera (reusing R3F's own shared raycaster — the same one
    // it uses for pointer events, so this adds no extra allocation) and use
    // the first surface it hits. This is what lets the beam sweep across
    // real walls/floor/bed and stop AT them instead of passing through.
    raycaster.setFromCamera(isPresenting ? gazePointer : pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const surfaceHit = hits.find((hit) => (hit.object as THREE.Object3D & { isMesh?: boolean }).isMesh);

    if (surfaceHit) {
      hitPoint.current.copy(surfaceHit.point);
    } else {
      // Nothing hit (e.g. pointer off-canvas, or looking into open space) —
      // fall back to a fixed-distance point along the same ray.
      camera.getWorldDirection(forwardDir.current);
      hitPoint.current.copy(camera.position).addScaledVector(forwardDir.current, FALLBACK_AIM_DISTANCE);
    }

    if (!light) return;

    light.position.copy(camera.position);

    const smoothing = 1 - Math.exp(-AIM_SMOOTHING_RATE * delta);
    aimPoint.current.lerp(hitPoint.current, smoothing);
    light.target.position.copy(aimPoint.current);
    light.target.updateMatrixWorld();

    // --- Per-chapter beam shape + color, applied every frame (cheap enough
    // not to warrant a mount-only optimization, and lets a chapter cut
    // change the lantern's character immediately).
    light.angle = lighting.beamAngle;
    light.color.set(COLOR_TEMP_HEX[lighting.colorTemp]);

    // --- Flicker: two sine waves at different frequencies ("guttering")
    // plus a small random jitter, sped up as heartRate climbs so the light
    // feels physically tied to the narrator's rising panic. `violence`
    // (chapters.ts) widens the swing further for the chapter's own character.
    const flickerSpeed = THREE.MathUtils.mapLinear(heartRate, 60, 140, 1, 3.2);
    const t = clock.elapsedTime * flickerSpeed + flickerSeed;
    const amplitude = FLICKER_AMPLITUDE * (1 + lighting.violence * 1.5);
    let flicker = Math.sin(t * 9.1) * 0.35 + Math.sin(t * 21.7) * 0.15 + (Math.random() - 0.5) * 0.2;

    // --- Strobe: above ~0.7 violence (the struggle in Ch4, the dropped
    // lantern in Ch8), occasionally punch to near-blackout or a blinding
    // spike instead of the smooth guttering curve above.
    if (lighting.violence > 0.7 && Math.random() < lighting.violence * 0.02) {
      flicker = Math.random() < 0.5 ? -2.5 : 3.5;
    }

    // --- Interactive flare: clicking the lantern (see InteractiveScene.tsx)
    // adds a brief decaying boost on top of the flicker, rather than a
    // second system fighting this one for control of `.intensity`.
    const now = performance.now();
    const flareRemaining = lanternFlare.activeUntil - now;
    const flareBoost = flareRemaining > 0 ? lanternFlare.magnitude * (flareRemaining / lanternFlare.durationMs) : 0;

    const baseIntensity = FLICKER_BASE_INTENSITY * lighting.intensity;
    light.intensity = Math.max(0, baseIntensity + flicker * amplitude + flareBoost);
  });

  return (
    <group>
      <SpotLight
        ref={setLight}
        castShadow
        color={COLOR_TEMP_HEX[lighting.colorTemp]}
        angle={lighting.beamAngle}
        penumbra={0.55}
        attenuation={10}
        anglePower={5}
        distance={9}
        decay={1.5}
        intensity={FLICKER_BASE_INTENSITY * lighting.intensity}
        volumetric
        opacity={0.35}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0005}
        shadow-camera-near={0.2}
        shadow-camera-far={10}
      />
      {/* light.target must exist in the scene graph for THREE to honor it. */}
      {light && <primitive object={light.target} />}
    </group>
  );
}
