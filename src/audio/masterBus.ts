/**
 * masterBus.ts
 * ---------------------------------------------------------------------------
 * A single shared GainNode that EVERY audio source in the app routes
 * through on its way to `ctx.destination` — HeartbeatAudio.tsx and
 * SoundManager.tsx both connect here instead of connecting to
 * `ctx.destination` directly.
 *
 * Two things this unlocks, which weren't possible with each source
 * connecting straight to the destination:
 *  1. One place to apply `masterVolume` (see MasterVolumeSync.tsx) instead
 *     of threading a volume multiplier through every individual layer.
 *  2. A single tap point for MediaRecorder: media/mediaCapture.ts connects
 *     this bus to a `MediaStreamAudioDestinationNode` while recording, which
 *     is what lets the exported .webm include ALL audio (heartbeat, wind,
 *     watch, footsteps, creaks) without each source needing its own
 *     recording-specific wiring.
 * ---------------------------------------------------------------------------
 */

let bus: GainNode | null = null;
let busContext: AudioContext | null = null;

/** Returns the shared master bus for the given AudioContext, creating it on first call. */
export function getMasterAudioBus(ctx: AudioContext): GainNode {
  if (bus && busContext === ctx) return bus;
  bus = ctx.createGain();
  bus.gain.value = 0.8; // MasterVolumeSync overwrites this immediately on mount
  bus.connect(ctx.destination);
  busContext = ctx;
  return bus;
}
