/**
 * WindowLight.tsx
 * ---------------------------------------------------------------------------
 * Chapter 6 ("The Arrival") is the one chapter where the brief calls for a
 * SECOND real light source, not just a lantern tuning: "sharp morning light
 * pierces through window blinds, introducing stark white-and-gray
 * geometric light bars." Everywhere else in the story, the lantern is
 * deliberately the only meaningful light (see LanternLight.tsx's header) —
 * this component only renders anything at all during Chapter 6.
 *
 * Implementation: five parallel, non-shadow-casting volumetric SpotLights
 * (same drei <SpotLight volumetric> technique as the lantern, so the bars
 * are actually visible as light shafts through the room's fog) angled
 * downward from a "window" on the side wall, offset along Y to read as
 * light falling through horizontal blind slats. `castShadow` is
 * deliberately false on all five — five real-time shadow-casting lights
 * would be a meaningful GPU cost for a single chapter's set dressing;
 * the lantern remains the only shadow-casting source.
 *
 * AIMING: drei's <SpotLight> forwards unrecognized props straight through
 * to the underlying native `<spotLight>` JSX element (its prop type is
 * `JSX.IntrinsicElements['spotLight'] & {...}`), so R3F's standard
 * dash-prop drilling (`target-position`) reaches the real THREE.SpotLight's
 * `.target.position` the same way it would on a plain `<spotLight>` —
 * confirmed against the installed package's own type declarations, not
 * assumed.
 * ---------------------------------------------------------------------------
 */

import { SpotLight } from "@react-three/drei";
import { useStoryStore } from "../store/store";

const WINDOW_CHAPTER = 6;
const BAR_COUNT = 5;
const WALL_X = -3; // matches ROOM_WIDTH/2 in Room.tsx's primitive fallback
const WINDOW_Z = 1;

export function WindowLight() {
  const currentChapter = useStoryStore((state) => state.currentChapter);
  if (currentChapter !== WINDOW_CHAPTER) return null;

  return (
    <group>
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const y = 1.0 + i * 0.35; // stepped vertically, one bar per "slat gap"
        return (
          <SpotLight
            key={i}
            castShadow={false}
            position={[WALL_X, y, WINDOW_Z]}
            target-position={[WALL_X + 5.5, y - 1.4, WINDOW_Z]}
            color="#eef2f7"
            angle={0.05}
            penumbra={0.3}
            attenuation={14}
            anglePower={6}
            distance={7}
            intensity={1.6}
            volumetric
            opacity={0.22}
          />
        );
      })}
    </group>
  );
}
