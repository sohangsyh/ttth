/**
 * useMediaCapture.ts
 * ---------------------------------------------------------------------------
 * React-facing wrapper around mediaCapture.ts — exposes recording/snapshot
 * state (isRecording, elapsed seconds, a brief "flash" flag for shutter
 * feedback) for DirectorWorkbench.tsx's Capture section.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRendererStore } from "../store/rendererStore";
import { useStoryStore } from "../store/store";
import { getAudioContext } from "../audio/audioContext";
import { downloadBlob, pickSupportedMimeType, startCanvasRecording, captureHighResSnapshot } from "./mediaCapture";
import type { RecordingHandle } from "./mediaCapture";

function chapterFilenamePart(): string {
  return String(useStoryStore.getState().currentChapter).padStart(2, "0");
}

export function useMediaCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [flash, setFlash] = useState(false);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);

  const handleRef = useRef<RecordingHandle | null>(null);
  const intervalRef = useRef<number | null>(null);

  const recordingSupported = pickSupportedMimeType() !== null;

  const triggerFlash = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
  }, []);

  const startRecording = useCallback(() => {
    if (!recordingSupported || handleRef.current) return;
    const canvas = useRendererStore.getState().canvasElement;
    if (!canvas) return;

    const handle = startCanvasRecording(canvas, getAudioContext(), (blob) => {
      downloadBlob(blob, `tell-tale-heart-ch${chapterFilenamePart()}-${Date.now()}.webm`);
    });
    if (!handle) return;

    handleRef.current = handle;
    setIsRecording(true);
    setRecordingSeconds(0);
    intervalRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
  }, [recordingSupported]);

  const stopRecording = useCallback(() => {
    handleRef.current?.recorder.stop();
    handleRef.current = null;
    setIsRecording(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const takeSnapshot = useCallback(async () => {
    const { canvasElement, glRenderer } = useRendererStore.getState();
    if (!canvasElement || !glRenderer || isCapturingSnapshot) return;

    setIsCapturingSnapshot(true);
    try {
      const blob = await captureHighResSnapshot(canvasElement, glRenderer, 2);
      if (blob) {
        downloadBlob(blob, `tell-tale-heart-ch${chapterFilenamePart()}-${Date.now()}.png`);
        triggerFlash();
      }
    } finally {
      setIsCapturingSnapshot(false);
    }
  }, [isCapturingSnapshot, triggerFlash]);

  // Stop cleanly if the component unmounts mid-recording.
  useEffect(
    () => () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      handleRef.current?.recorder.stop();
    },
    [],
  );

  return {
    recordingSupported,
    isRecording,
    recordingSeconds,
    isCapturingSnapshot,
    flash,
    startRecording,
    stopRecording,
    takeSnapshot,
  };
}
