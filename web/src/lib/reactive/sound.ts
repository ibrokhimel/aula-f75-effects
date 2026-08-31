/**
 * Sound — audio state and analysis for the Sound effect family.
 *
 * The effects themselves live in sound-effects.ts; this module owns the
 * state they read and the DSP every capture host runs through. The desktop
 * app feeds it system loopback audio from a hidden capture window (never
 * the microphone); the web playground feeds it from a screen share with
 * audio. Nobody pushing means silence, and silence renders a dark board.
 */

import { clamp01, frac } from './core';

/** Analyser size every host must use, so band maths agree everywhere. */
export const AUDIO_FFT_SIZE = 2048;
/** Log-spaced display bins — one per stretch of board columns. */
export const SPECTRUM_BINS = 20;

export interface AudioSample {
  /**
   * Overall loudness. Nominally 0..1, but a hot mix can exceed 1 — the push
   * stage's auto-gain normalises it before anything renders.
   */
  level: number;
  /** Band energies, 0..1. */
  bass: number;
  mid: number;
  treble: number;
  /** SPECTRUM_BINS log-spaced bins, 0..1 each. */
  spectrum: number[];
  /** Spectral centroid 0..1 — where the energy sits: bassy low, bright high. */
  centroid: number;
}

/**
 * Turn one analyser readout into a sample. Shared by every capture host so
 * the desktop window and the browser path can never disagree about what
 * "bass" means. `freq` is getByteFrequencyData output, `time` is
 * getByteTimeDomainData output, both from an AUDIO_FFT_SIZE analyser.
 */
export function analyzeAudio(
  freq: Uint8Array, time: Uint8Array, sampleRate: number,
): AudioSample {
  // RMS of the waveform reads as loudness far better than a spectrum mean.
  let sq = 0;
  for (let i = 0; i < time.length; i++) {
    const v = (time[i] - 128) / 128;
    sq += v * v;
  }
  // Music RMS rarely passes ~0.3; scaled up but deliberately left unclamped
  // so the auto-gain downstream can see how hot the signal really is.
  const level = Math.sqrt(sq / time.length) * 3.2;

  const hz = sampleRate / AUDIO_FFT_SIZE; // width of one FFT bin
  const band = (lo: number, hi: number) => {
    const a = Math.max(1, Math.round(lo / hz));
    const b = Math.min(freq.length - 1, Math.round(hi / hz));
    if (b < a) return 0;
    let sum = 0;
    for (let i = a; i <= b; i++) sum += freq[i];
    return clamp01((sum / ((b - a + 1) * 255)) * 1.35);
  };

  const spectrum: number[] = [];
  for (let s = 0; s < SPECTRUM_BINS; s++) {
    const lo = 45 * Math.pow(11000 / 45, s / SPECTRUM_BINS);
    const hi = 45 * Math.pow(11000 / 45, (s + 1) / SPECTRUM_BINS);
    spectrum.push(band(lo, hi));
  }

  // Where on the spectrum the energy sits — the "colour" of the sound. It
  // moves with the music's timbre even when the volume never moves at all.
  let weighted = 0, energy = 0;
  for (let i = 0; i < SPECTRUM_BINS; i++) {
    weighted += (i / (SPECTRUM_BINS - 1)) * spectrum[i];
    energy += spectrum[i];
  }

  return {
    level,
    bass: band(30, 250),
    mid: band(250, 2000),
    treble: band(2000, 9000),
    spectrum,
    centroid: energy > 1e-4 ? weighted / energy : 0.5,
  };
}

// ── Audio state ─────────────────────────────────────────────────────────
// Effects are pure in (t, state); the state only moves when a host pushes.
// The clock is injectable the same way ReactiveEngine's is, so tests can
// freeze it and the effects stay deterministic under a fixed state.

let nowMs: () => number = () => Date.now();
export function setSoundClock(fn: (() => number) | null): void {
  nowMs = fn ?? (() => Date.now());
}
/** The module clock, for sound-effects.ts — not part of any host API. */
export const soundNow = () => nowMs();

/** Shared state read by sound-effects.ts. Hosts write via pushAudioSample. */
export const SOUND_STATE = {
  // Fast-attack, slow-release envelopes — flicker-free brightness. All of
  // these are post-auto-gain: normalised against `ref`, not absolute.
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  spectrum: new Array<number>(SPECTRUM_BINS).fill(0),
  /** Slow rolling loudness reference the auto-gain divides by. */
  ref: 0.3,
  /** Slow level average; the fast-minus-slow difference drives `pulse`. */
  slowLevel: 0,
  /** Transient punch 0..1 — stays lively even when the volume is pegged. */
  pulse: 0,
  /** Smoothed spectral centroid 0..1. */
  centroid: 0.5,
  /** Falling peak marker for the VU meter. */
  peak: 0,
  /** Integrated hue drift — loud music spins the rainbow faster. */
  hue: 0,
  /** Rolling bass baseline the beat detector compares against. */
  bassAvg: 0,
  /** Previous normalised bass sample — a sharp rise is a kick's onset. */
  lastBass: 0,
  /** Wall-clock ms of recent beats, oldest first. */
  beats: [] as number[],
  beatCount: 0,
  /** Recent loudness, one entry per push, newest last — the waveform. */
  history: [] as number[],
  /** Centroid history parallel to `history`, for the flowing effects. */
  hues: [] as number[],
  lastAt: -Infinity,
};

const S = SOUND_STATE;

export function resetSound(): void {
  S.level = S.bass = S.mid = S.treble = 0;
  S.spectrum.fill(0);
  S.ref = 0.3;
  S.slowLevel = S.pulse = 0;
  S.centroid = 0.5;
  S.peak = S.hue = S.bassAvg = S.lastBass = 0;
  S.beats = [];
  S.beatCount = 0;
  S.history = [];
  S.hues = [];
  S.lastAt = -Infinity;
}

/** Feed one sample. Hosts call this at roughly 30 Hz while capturing. */
export function pushAudioSample(s: AudioSample): void {
  const t = nowMs();

  // Auto-gain: normalise against a slow rolling loudness reference, so a
  // pegged system volume still leaves headroom for dips and quiet listening
  // still fills the range. The reference rises instantly with the loudest
  // thing heard and decays back over ~20 seconds.
  S.ref = Math.max(s.level, S.ref * 0.999, 0.3);
  const g = 1 / S.ref;
  const level = clamp01(s.level * g);

  const rel = 0.82; // release per push — ~150 ms half-life at 30 Hz
  S.level = Math.max(level, S.level * rel);
  S.bass = Math.max(clamp01(s.bass * g), S.bass * rel);
  S.mid = Math.max(clamp01(s.mid * g), S.mid * rel);
  S.treble = Math.max(clamp01(s.treble * g), S.treble * rel);
  for (let i = 0; i < SPECTRUM_BINS; i++) {
    S.spectrum[i] = Math.max(clamp01((s.spectrum[i] ?? 0) * g), S.spectrum[i] * rel);
  }
  S.peak = S.level >= S.peak ? S.level : Math.max(0, S.peak - 0.012);
  S.hue = frac(S.hue + 0.002 + S.level * 0.01);

  // Transient punch: the fast level against its own slow average. Constant
  // loudness settles to 0; every swell and kick spikes it.
  S.slowLevel = S.slowLevel * 0.94 + level * 0.06;
  S.pulse = Math.max(clamp01((level - S.slowLevel) * 3), S.pulse * 0.8);
  S.centroid = S.centroid * 0.85 + clamp01(s.centroid) * 0.15;

  // A beat is bass punching clear of its rolling average — or, in music
  // whose bass never leaves that average far behind, a sharp onset rise.
  const nb = clamp01(s.bass * g);
  const rise = nb - S.lastBass;
  S.lastBass = nb;
  const prevAvg = S.bassAvg;
  S.bassAvg = S.bassAvg * 0.96 + nb * 0.04;
  const last = S.beats.length ? S.beats[S.beats.length - 1] : -Infinity;
  if (nb > 0.14 && t - last > 240 && (rise > 0.07 || nb > prevAvg * 1.4)) {
    S.beats.push(t);
    S.beatCount++;
    if (S.beats.length > 12) S.beats.shift();
  }

  S.history.push(S.level);
  S.hues.push(S.centroid);
  if (S.history.length > 180) { S.history.shift(); S.hues.shift(); }
  S.lastAt = t;
}

/** 1 while samples flow, fading to 0 within a second of the host stopping. */
export function audioAlive(): number {
  const dt = nowMs() - S.lastAt;
  return dt < 250 ? 1 : clamp01(1 - (dt - 250) / 750);
}

// ── Browser capture ─────────────────────────────────────────────────────
// The web playground's path: a screen share with "share audio" ticked. The
// desktop app never calls this — its hidden capture window feeds
// pushAudioSample over IPC with real system loopback instead.

/**
 * Ask the browser for audio and start pushing samples. Resolves to a stop
 * function. Rejects if the user declines or the share carries no audio.
 */
export async function startBrowserCapture(): Promise<() => void> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true, // Chromium refuses audio-only display capture
  });
  for (const track of stream.getVideoTracks()) track.stop();
  if (stream.getAudioTracks().length === 0) {
    throw new Error('The share had no audio — tick "share audio" in the picker');
  }
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = AUDIO_FFT_SIZE;
  analyser.smoothingTimeConstant = 0.5;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const freq = new Uint8Array(analyser.frequencyBinCount);
  const time = new Uint8Array(analyser.fftSize);
  const timer = setInterval(() => {
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(time);
    pushAudioSample(analyzeAudio(freq, time, ctx.sampleRate));
  }, 33);
  return () => {
    clearInterval(timer);
    for (const track of stream.getTracks()) track.stop();
    void ctx.close();
    resetSound();
  };
}
