/**
 * useKeyboardControls.ts
 * ---------------------------------------------------------------------------
 * WASD (+ Q/E for down/up, Shift to boost) input for the free "Director"
 * camera. Exposes a mutable ref rather than React state so CameraRig can
 * poll it inside useFrame every frame without triggering re-renders.
 *
 * Deliberately does NOT bind arrow keys or Space — those are reserved
 * globally for chapter navigation and play/pause (see
 * `bindStoryKeyboardShortcuts` in store.ts) and would otherwise fight with
 * free-camera movement.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";

export interface FreeCamKeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Held via Shift — multiplies fly speed. */
  boost: boolean;
}

type MovementKey = keyof Omit<FreeCamKeyState, "boost">;

const KEY_MAP: Record<string, MovementKey> = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  KeyE: "up",
  KeyQ: "down",
};

const isTypingTarget = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement &&
  (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

export function useKeyboardControls() {
  const keysRef = useRef<FreeCamKeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      keysRef.current.boost = event.shiftKey;
      const mapped = KEY_MAP[event.code];
      if (mapped) keysRef.current[mapped] = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.boost = event.shiftKey;
      const mapped = KEY_MAP[event.code];
      if (mapped) keysRef.current[mapped] = false;
    };

    // Guard against a stuck key if the window loses focus mid-press.
    const onBlur = () => {
      keysRef.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        boost: false,
      };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keysRef;
}
