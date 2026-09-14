/**
 * mediaCapture.ts
 * ---------------------------------------------------------------------------
 * Pure capture logic — no React. Two capabilities:
 *
 *  - startCanvasRecording: wires the WebGL canvas's own captureStream() to
 *    MediaRecorder, combined with an audio tap off the shared master bus
 *    (audio/masterBus.ts) so the exported .webm has sound, not just video.
 *  - captureHighResSnapshot: temporarily boosts the renderer's pixel ratio
 *    beyond whatever it's currently running at for live viewing, captures a
 *    PNG, then restores the original ratio.
 *
 * UI hiding: deliberately NOT implemented, because it isn't needed. Both
 * capture paths read directly from the <canvas> element's own drawing
 * buffer via captureStream()/toBlob() — the DOM UI overlay (control bar,
 * subtitles, Director Workbench) is a SEPARATE compositing layer that was
 * never part of the canvas's pixel data in the first place. There's nothing
 * to hide.
 * ---------------------------------------------------------------------------
 */

import type { WebGLRenderer } from "three";
import { getMasterAudioBus } from "../audio/masterBus";

// ----------------------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const PREFERRED_VIDEO_MIME_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

/** Returns the best supported recording MIME type, or null if MediaRecorder itself (or any of these) isn't supported. */
export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return PREFERRED_VIDEO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

// ----------------------------------------------------------------------------
// Recording
// ----------------------------------------------------------------------------

export interface RecordingHandle {
  recorder: MediaRecorder;
  /** Disconnects the audio tap — call once the recorder has FULLY stopped (after its own onstop fires). */
  cleanup: () => void;
}

/**
 * Starts recording the canvas (+ audio, if an AudioContext is available) to
 * a MediaRecorder. `onSaved` fires once, with the assembled Blob, when
 * `.stop()` is later called on the returned recorder. Returns null if
 * MediaRecorder/webm isn't supported in this browser at all.
 */
export function startCanvasRecording(
  canvas: HTMLCanvasElement,
  audioCtx: AudioContext | null,
  onSaved: (blob: Blob) => void,
  fps = 30,
): RecordingHandle | null {
  const mimeType = pickSupportedMimeType();
  if (!mimeType) return null;

  const videoStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(
    fps,
  );

  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let combinedStream = videoStream;

  if (audioCtx) {
    audioDestination = audioCtx.createMediaStreamDestination();
    getMasterAudioBus(audioCtx).connect(audioDestination);
    combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
  }

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const cleanup = () => {
    audioDestination?.disconnect();
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    onSaved(blob);
    cleanup();
  };

  // A dataavailable timeslice means a forced/crashed stop still keeps
  // whatever was captured up to that point, rather than losing everything.
  recorder.start(250);

  return { recorder, cleanup };
}

// ----------------------------------------------------------------------------
// High-res snapshot
// ----------------------------------------------------------------------------

/**
 * Temporarily renders at `multiplier`x the current pixel ratio, captures a
 * PNG, then restores the original ratio. Resolves the PNG Blob on success.
 *
 * CAVEAT: this manipulates the THREE.WebGLRenderer's pixel ratio directly,
 * outside of react-three-fiber's own `dpr`-driven resize handling. This is
 * safe for the base renderer (verified against THREE's own setPixelRatio/
 * setSize behavior), but @react-three/postprocessing's EffectComposer
 * (TensionFX.tsx) manages its own render-target sizing, and its exact
 * behavior under a MANUAL mid-session pixel-ratio bump like this hasn't
 * been empirically verified in a live browser. If snapshots come out at
 * the wrong resolution or visibly soft, that composer resize interaction
 * is the first place to look.
 */
export async function captureHighResSnapshot(
  canvas: HTMLCanvasElement,
  renderer: WebGLRenderer,
  multiplier = 2,
): Promise<Blob | null> {
  const originalPixelRatio = renderer.getPixelRatio();
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;

  renderer.setPixelRatio(originalPixelRatio * multiplier);
  renderer.setSize(cssWidth, cssHeight, false); // false: resize the drawing buffer only, leave CSS size untouched

  // Two rAF ticks: one for the next r3f frame to actually render at the new
  // resolution, one more so that frame has definitely been presented to the
  // canvas before toBlob() reads it.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

  renderer.setPixelRatio(originalPixelRatio);
  renderer.setSize(cssWidth, cssHeight, false);

  return blob;
}
