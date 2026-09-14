/**
 * ExposureSync.tsx
 * ---------------------------------------------------------------------------
 * Applies the Director Workbench's exposure slider to the live renderer.
 * Renderer `gl` props are only read at Canvas creation, so exposure changes
 * after mount need to be pushed onto `gl.toneMappingExposure` directly.
 * ---------------------------------------------------------------------------
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useRendererStore, evToExposureMultiplier } from "../store/rendererStore";

export function ExposureSync() {
  const gl = useThree((state) => state.gl);
  const exposureEV = useRendererStore((state) => state.exposureEV);

  useEffect(() => {
    gl.toneMappingExposure = evToExposureMultiplier(exposureEV);
  }, [gl, exposureEV]);

  return null;
}
