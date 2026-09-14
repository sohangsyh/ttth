/**
 * BedroomScene.tsx
 * ---------------------------------------------------------------------------
 * Assembles the room from three independently-loaded GLTF assets (see
 * scene/models/). Each asset gets its OWN <ModelErrorBoundary> so a single
 * missing/broken .glb degrades just that piece to primitive geometry
 * without taking the other two down with it — but all three share ONE
 * <Suspense> boundary, so the viewer sees a single unified loading overlay
 * (<AssetLoadingFallback>) rather than three independent flickers.
 * ---------------------------------------------------------------------------
 */

import { Suspense } from "react";
import { ModelErrorBoundary } from "./models/ModelErrorBoundary";
import { AssetLoadingFallback } from "./models/AssetLoadingFallback";
import { Room, RoomFallback } from "./models/Room";
import { Floorboards, FloorboardsFallback } from "./models/Floorboards";
import { Props, PropsFallback } from "./models/Props";

export function BedroomScene() {
  return (
    <Suspense fallback={<AssetLoadingFallback />}>
      <ModelErrorBoundary label="Room" fallback={<RoomFallback />}>
        <Room />
      </ModelErrorBoundary>

      <ModelErrorBoundary label="Floorboards" fallback={<FloorboardsFallback />}>
        <Floorboards />
      </ModelErrorBoundary>

      <ModelErrorBoundary label="Props" fallback={<PropsFallback />}>
        <Props />
      </ModelErrorBoundary>
    </Suspense>
  );
}
