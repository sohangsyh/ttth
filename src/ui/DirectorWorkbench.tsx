/**
 * DirectorWorkbench.tsx
 * ---------------------------------------------------------------------------
 * Top-right, toggleable panel giving the viewer manual control over the
 * camera mode, post-processing parameters, master volume, and media
 * capture (PNG snapshot + WebM recording).
 *
 * Self-contained: owns its own open/closed state (separate from the global
 * `uiVisible` — see UIOverlay.tsx, which nests this inside the same
 * uiVisible-gated wrapper as the control bar so 'H' hides both together).
 * ---------------------------------------------------------------------------
 */

import { useState, type ReactNode } from "react";
import {
  SlidersHorizontal,
  X,
  Film,
  Move,
  Sun,
  Aperture,
  Sparkles,
  Focus,
  Camera,
  Zap,
  Volume2,
  VolumeX,
  Circle,
  Square,
} from "lucide-react";
import { useStoryStore } from "../store/store";
import { useRendererStore, EXPOSURE_EV_RANGE, FREE_FOV_RANGE } from "../store/rendererStore";
import { useMediaCapture } from "../media/useMediaCapture";

// ----------------------------------------------------------------------------
// Small reusable pieces (only used within this panel)
// ----------------------------------------------------------------------------

function SliderRow({
  icon,
  label,
  valueLabel,
  disabled,
  ...inputProps
}: {
  icon: ReactNode;
  label: string;
  valueLabel: string;
  disabled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="mb-1.5 flex items-center justify-between text-xs text-stone-300/80">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-stone-100/90">{valueLabel}</span>
      </div>
      <input
        type="range"
        disabled={disabled}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-stone-100/15 accent-amber-300
          disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-300
          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-amber-300"
        {...inputProps}
      />
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  icon,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-1 disabled:opacity-40"
    >
      <span className="flex items-center gap-1.5 text-xs text-stone-300/80">
        {icon}
        {label}
      </span>
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          checked ? "bg-amber-300/80" : "bg-stone-100/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-black transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function formatRecordingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export function DirectorWorkbench() {
  const [open, setOpen] = useState(false);

  const cameraMode = useStoryStore((state) => state.cameraMode);
  const setCameraMode = useStoryStore((state) => state.setCameraMode);

  const exposureEV = useRendererStore((state) => state.exposureEV);
  const setExposureEV = useRendererStore((state) => state.setExposureEV);
  const freeFov = useRendererStore((state) => state.freeFov);
  const setFreeFov = useRendererStore((state) => state.setFreeFov);
  const filmGrainEnabled = useRendererStore((state) => state.filmGrainEnabled);
  const toggleFilmGrain = useRendererStore((state) => state.toggleFilmGrain);
  const depthOfFieldEnabled = useRendererStore((state) => state.depthOfFieldEnabled);
  const toggleDepthOfField = useRendererStore((state) => state.toggleDepthOfField);
  const performanceMode = useRendererStore((state) => state.performanceMode);
  const togglePerformanceMode = useRendererStore((state) => state.togglePerformanceMode);
  const masterVolume = useRendererStore((state) => state.masterVolume);
  const setMasterVolume = useRendererStore((state) => state.setMasterVolume);

  const {
    recordingSupported,
    isRecording,
    recordingSeconds,
    isCapturingSnapshot,
    flash,
    startRecording,
    stopRecording,
    takeSnapshot,
  } = useMediaCapture();

  return (
    <>
      {/* Camera "shutter" flash feedback for the snapshot button. */}
      <div
        className={`pointer-events-none fixed inset-0 z-[60] bg-white transition-opacity duration-150 ${
          flash ? "opacity-80" : "opacity-0"
        }`}
      />

      {/* Recording indicator — visible even if the panel itself is closed. */}
      {isRecording && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-sm border border-red-400/30 bg-black/70 px-2.5 py-1 text-[11px] text-red-300 backdrop-blur-md sm:top-6">
          <Circle size={8} className="animate-pulse fill-current" />
          REC {formatRecordingTime(recordingSeconds)}
        </div>
      )}

      <div className="pointer-events-auto fixed right-4 top-4 z-40 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle Director Workbench"
          aria-expanded={open}
          className={`flex h-10 w-10 items-center justify-center rounded-sm border border-amber-100/10 bg-black/60 text-stone-200 backdrop-blur-md transition-colors hover:text-amber-200 ${
            open ? "border-amber-200/30 text-amber-200" : ""
          }`}
        >
          {open ? <X size={17} /> : <SlidersHorizontal size={17} />}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-sm border border-amber-100/10 bg-black/80 p-4 backdrop-blur-md">
            <h2 className="mb-3 font-serif text-sm italic text-stone-100/90">Director Workbench</h2>

            {/* Camera mode */}
            <div className="mb-4">
              <div className="mb-1.5 text-xs text-stone-300/80">Camera</div>
              <div className="flex overflow-hidden rounded-sm border border-stone-100/10">
                <button
                  type="button"
                  onClick={() => setCameraMode("cinematic")}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs transition-colors ${
                    cameraMode === "cinematic"
                      ? "bg-amber-300/90 text-black"
                      : "bg-transparent text-stone-300/70 hover:bg-stone-100/10"
                  }`}
                >
                  <Film size={13} /> Cinematic
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode("free")}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs transition-colors ${
                    cameraMode === "free"
                      ? "bg-amber-300/90 text-black"
                      : "bg-transparent text-stone-300/70 hover:bg-stone-100/10"
                  }`}
                >
                  <Move size={13} /> Free Cam
                </button>
              </div>
              {cameraMode === "free" && (
                <p className="mt-1.5 text-[11px] leading-snug text-stone-400/80">
                  WASD to move, Q/E for down/up, Shift to sprint, mouse to look around.
                </p>
              )}
            </div>

            <div className="my-3 h-px bg-stone-100/10" />

            {/* Post-processing sliders */}
            <div className="space-y-4">
              <SliderRow
                icon={<Sun size={13} />}
                label="Exposure"
                valueLabel={`${exposureEV > 0 ? "+" : ""}${exposureEV.toFixed(1)} EV`}
                min={EXPOSURE_EV_RANGE.min}
                max={EXPOSURE_EV_RANGE.max}
                step={0.1}
                value={exposureEV}
                onChange={(e) => setExposureEV(Number(e.target.value))}
              />

              <SliderRow
                icon={<Aperture size={13} />}
                label="Field of View"
                valueLabel={`${Math.round(freeFov)}°`}
                disabled={cameraMode !== "free"}
                min={FREE_FOV_RANGE.min}
                max={FREE_FOV_RANGE.max}
                step={1}
                value={freeFov}
                onChange={(e) => setFreeFov(Number(e.target.value))}
              />
              {cameraMode !== "free" && (
                <p className="-mt-2.5 text-[11px] leading-snug text-stone-400/80">
                  Field of view is authored per keyframe in Cinematic mode — switch to Free Cam to adjust it.
                </p>
              )}

              <SliderRow
                icon={masterVolume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                label="Volume"
                valueLabel={`${Math.round(masterVolume * 100)}%`}
                min={0}
                max={1}
                step={0.01}
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
              />
            </div>

            <div className="my-3 h-px bg-stone-100/10" />

            {/* Performance */}
            <ToggleSwitch
              checked={performanceMode}
              onChange={togglePerformanceMode}
              icon={<Zap size={13} />}
              label="Performance Mode"
            />
            {performanceMode && (
              <p className="-mt-0.5 mb-1 text-[11px] leading-snug text-stone-400/80">
                Disables Depth of Field and Chromatic Aberration for smoother playback.
              </p>
            )}

            <div className="my-3 h-px bg-stone-100/10" />

            {/* Effect toggles */}
            <div className="space-y-1">
              <ToggleSwitch
                checked={filmGrainEnabled}
                onChange={toggleFilmGrain}
                icon={<Sparkles size={13} />}
                label="Film Grain"
              />
              <ToggleSwitch
                checked={depthOfFieldEnabled && !performanceMode}
                onChange={toggleDepthOfField}
                disabled={performanceMode}
                icon={<Focus size={13} />}
                label="Depth of Field"
              />
            </div>

            <div className="my-3 h-px bg-stone-100/10" />

            {/* Capture: high-res snapshot + WebM recording */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={isCapturingSnapshot}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-amber-200/30 bg-amber-300/10 py-2 text-xs text-amber-100 transition-colors hover:bg-amber-300/20 disabled:opacity-50"
              >
                <Camera size={14} />
                {isCapturingSnapshot ? "Capturing…" : "Capture Snapshot (2x)"}
              </button>

              {recordingSupported && (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex w-full items-center justify-center gap-2 rounded-sm border py-2 text-xs transition-colors ${
                    isRecording
                      ? "border-red-400/40 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                      : "border-amber-200/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                  }`}
                >
                  {isRecording ? <Square size={12} className="fill-current" /> : <Circle size={12} />}
                  {isRecording ? `Stop Recording (${formatRecordingTime(recordingSeconds)})` : "Record Scene (.webm)"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
