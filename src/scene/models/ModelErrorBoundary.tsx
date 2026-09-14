/**
 * ModelErrorBoundary.tsx
 * ---------------------------------------------------------------------------
 * Catches errors thrown by `useDracoGLTF` (missing file, bad Draco decode,
 * network failure, ...) and renders `fallback` instead of taking down the
 * rest of the scene. Error Boundaries MUST be class components — there is
 * still no hook equivalent in React.
 *
 * Usage:
 *   <ModelErrorBoundary fallback={<RoomFallback />}>
 *     <Room />
 *   </ModelErrorBoundary>
 * ---------------------------------------------------------------------------
 */

import { Component, type ReactNode } from "react";

interface ModelErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Optional label used in the dev-console warning, to identify which asset failed. */
  label?: string;
}

interface ModelErrorBoundaryState {
  hasError: boolean;
}

export class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  state: ModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(
      `[ModelErrorBoundary]${this.props.label ? ` (${this.props.label})` : ""} falling back to primitive geometry:`,
      error,
    );
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
