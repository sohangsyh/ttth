/**
 * SceneErrorBoundary.tsx
 * ---------------------------------------------------------------------------
 * Wraps <SceneCanvas> at the App level. Catches any render-time exception
 * anywhere in the 3D subsystem — a bug in a shader uniform, a bad GLTF
 * parse that ModelErrorBoundary didn't anticipate, a THREE.js internal
 * error — and shows WebGLIssueScreen instead of a blank white screen or a
 * fully broken app shell.
 *
 * Distinct from scene/models/ModelErrorBoundary.tsx, which catches failures
 * for ONE specific asset (Room/Floorboards/Props) and degrades to primitive
 * geometry. This is the outermost safety net for everything else.
 * ---------------------------------------------------------------------------
 */

import { Component, type ReactNode } from "react";
import { WebGLIssueScreen } from "../ui/WebGLIssueScreen";

interface SceneErrorBoundaryProps {
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error("[SceneErrorBoundary] The 3D scene crashed:", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <WebGLIssueScreen
          title="Something went wrong"
          message="The scene ran into an error it couldn't recover from. Reloading usually fixes it."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
