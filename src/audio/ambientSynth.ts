/**
 * ambientSynth.ts
 * ---------------------------------------------------------------------------
 * Pure Web Audio building blocks for SoundManager.tsx's ambient layers.
 * Framework-agnostic — no React/Three.js imports — mirroring the shape of
 * heartbeatSynth.ts.
 * ---------------------------------------------------------------------------
 */

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const mapLinear = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
};

// ----------------------------------------------------------------------------
// Chapter-driven intensity mapping
// ----------------------------------------------------------------------------

/** 0..1: how "maxed out" the ambient bed (wind + room tone) should be — full during Ch.7/8. */
export function chapterAmbientBoost(chapterId: number): number {
  if (chapterId >= 7) return 1;
  return mapLinear(chapterId, 1, 6, 0.3, 0.6);
}

/** 0..1: police-footstep presence — silent before Ch.6, present from Ch.6 onward (through the climax). */
export function policeFootstepIntensity(chapterId: number): number {
  return chapterId >= 6 ? 1 : 0;
}

// ----------------------------------------------------------------------------
// Shared noise buffer
// ----------------------------------------------------------------------------

/** Generates a short white-noise buffer used by both the wind layer and creak bursts. */
export function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ----------------------------------------------------------------------------
// Continuous ambient layers
// ----------------------------------------------------------------------------

export interface AmbientLayer {
  /** Ramp this to control the layer's volume — already connected to `destination`. */
  gain: GainNode;
  /** Stops oscillators/sources and disconnects every node this layer created. */
  stop: () => void;
}

/**
 * Filtered, slowly-modulated noise loop — a low "wind howling" bed. The LFO
 * sweeping the lowpass cutoff gives it a gusting character rather than a
 * flat hiss.
 */
export function createWindLayer(ctx: AudioContext, destination: AudioNode, noiseBuffer: AudioBuffer): AmbientLayer {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;
  filter.Q.value = 0.7;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07; // one gust cycle roughly every 14s
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 220; // cutoff sweep range in Hz
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0; // ramped in by SoundManager

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  source.start();
  lfo.start();

  return {
    gain,
    stop: () => {
      source.stop();
      lfo.stop();
      source.disconnect();
      filter.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      gain.disconnect();
    },
  };
}

/**
 * Two barely-detuned low sine oscillators beating against each other — an
 * "ominous room tone" drone rather than a pure, sterile tone.
 */
export function createRoomToneLayer(ctx: AudioContext, destination: AudioNode): AmbientLayer {
  const gain = ctx.createGain();
  gain.gain.value = 0;

  const oscA = ctx.createOscillator();
  oscA.type = "sine";
  oscA.frequency.value = 45;

  const oscB = ctx.createOscillator();
  oscB.type = "sine";
  oscB.frequency.value = 45.6; // slight detune -> slow, uneasy beating

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 180;

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  oscA.start();
  oscB.start();

  return {
    gain,
    stop: () => {
      oscA.stop();
      oscB.stop();
      oscA.disconnect();
      oscB.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}

// ----------------------------------------------------------------------------
// Discrete one-shot sounds
// ----------------------------------------------------------------------------

/** A single pocket-watch tick — short, high, dry. `accent` gives every other tick (the "tock") a touch more weight. */
export function scheduleWatchTick(ctx: AudioContext, destination: AudioNode, time: number, accent: boolean): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.value = accent ? 1900 : 1500;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;

  const envelope = ctx.createGain();
  const peak = accent ? 0.05 : 0.032;
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(peak, time + 0.002);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);

  oscillator.start(time);
  oscillator.stop(time + 0.04);
  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
}

/** A single dull footstep thud — low, brief, muffled (as if heard through a floor/wall). */
export function scheduleFootstepThud(ctx: AudioContext, destination: AudioNode, time: number, gainScale: number): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(120, time);
  oscillator.frequency.exponentialRampToValueAtTime(58, time + 0.12);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;

  const envelope = ctx.createGain();
  const peak = Math.max(0.35 * gainScale, 0.0001);
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(peak, time + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);

  oscillator.start(time);
  oscillator.stop(time + 0.2);
  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
}

/** A single floorboard creak — filtered noise with a downward-sweeping bandpass, like a stressed board settling. */
export function scheduleCreakBurst(ctx: AudioContext, destination: AudioNode, time: number, noiseBuffer: AudioBuffer): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 6;
  filter.frequency.setValueAtTime(1200, time);
  filter.frequency.exponentialRampToValueAtTime(300, time + 0.35);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.exponentialRampToValueAtTime(0.4, time + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);

  source.start(time);
  source.stop(time + 0.4);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
}
