/**
 * Sound — effects driven by what the PC is playing, not by the keys.
 *
 * These are ordinary ReactiveFns so the whole pipeline (engine, panel,
 * desktop host, preview) treats them like any other reactive effect; they
 * simply ignore presses and read the audio state pushed into this module by
 * whichever host is capturing. The desktop app feeds it system loopback
 * audio from a hidden capture window (never the microphone); the web
 * playground feeds it from a screen share with audio. Nobody pushing means
 * silence, and silence renders a dark board.
 */

import { CX, CY } from '../animations';
import {
  LED_GEO, clamp01, frac, hsv, hash2Seq, distToXY,
  type Frame, type ReactiveFn,
} from './core';

/** Analyser size every host must use, so band maths agree everywhere. */
export const AUDIO_FFT_SIZE = 2048;
/** Log-spaced display bins — one per stretch of board columns. */
export const SPECTRUM_BINS = 20;

export interface AudioSample {
  /** Overall loudness, 0..1. */
  level: number;
  /** Band energies, 0..1. */
  bass: number;
  mid: number;
  treble: number;
  /** SPECTRUM_BINS log-spaced bins, 0..1 each. */
  spectrum: number[];
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
  // Music RMS rarely passes ~0.3, so scale that range up to a usable 0..1.
  const level = clamp01(Math.sqrt(sq / time.length) * 3.2);

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

  return {
    level,
    bass: band(30, 250),
    mid: band(250, 2000),
    treble: band(2000, 9000),
    spectrum,
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

const S = {
  // Fast-attack, slow-release envelopes — flicker-free brightness.
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  spectrum: new Array<number>(SPECTRUM_BINS).fill(0),
  /** Falling peak marker for the VU meter. */
  peak: 0,
  /** Integrated hue drift — loud music spins the rainbow faster. */
  hue: 0,
  /** Rolling bass baseline the beat detector compares against. */
  bassAvg: 0,
  /** Previous raw bass sample — a sharp rise is a kick's onset. */
  lastBass: 0,
  /** Wall-clock ms of recent beats, oldest first. */
  beats: [] as number[],
  beatCount: 0,
  /** Recent loudness, one entry per push, newest last — the waveform. */
  history: [] as number[],
  lastAt: -Infinity,
};

export function resetSound(): void {
  S.level = S.bass = S.mid = S.treble = 0;
  S.spectrum.fill(0);
  S.peak = S.hue = S.bassAvg = S.lastBass = 0;
  S.beats = [];
  S.beatCount = 0;
  S.history = [];
  S.lastAt = -Infinity;
}

/** Feed one sample. Hosts call this at roughly 30 Hz while capturing. */
export function pushAudioSample(s: AudioSample): void {
  const t = nowMs();
  const rel = 0.82; // release per push — ~150 ms half-life at 30 Hz
  S.level = Math.max(clamp01(s.level), S.level * rel);
  S.bass = Math.max(clamp01(s.bass), S.bass * rel);
  S.mid = Math.max(clamp01(s.mid), S.mid * rel);
  S.treble = Math.max(clamp01(s.treble), S.treble * rel);
  for (let i = 0; i < SPECTRUM_BINS; i++) {
    S.spectrum[i] = Math.max(clamp01(s.spectrum[i] ?? 0), S.spectrum[i] * rel);
  }
  S.peak = S.level >= S.peak ? S.level : Math.max(0, S.peak - 0.012);
  S.hue = frac(S.hue + 0.002 + S.level * 0.01);

  // A beat is bass punching clear of its rolling average — or, in music
  // whose bass never leaves that average far behind, a sharp onset rise.
  const rise = s.bass - S.lastBass;
  S.lastBass = s.bass;
  const prevAvg = S.bassAvg;
  S.bassAvg = S.bassAvg * 0.96 + s.bass * 0.04;
  const last = S.beats.length ? S.beats[S.beats.length - 1] : -Infinity;
  if (s.bass > 0.14 && t - last > 240 && (rise > 0.07 || s.bass > prevAvg * 1.4)) {
    S.beats.push(t);
    S.beatCount++;
    if (S.beats.length > 12) S.beats.shift();
  }

  S.history.push(S.level);
  if (S.history.length > 180) S.history.shift();
  S.lastAt = t;
}

/** 1 while samples flow, fading to 0 within a second of the host stopping. */
function alive(): number {
  const dt = nowMs() - S.lastAt;
  return dt < 250 ? 1 : clamp01(1 - (dt - 250) / 750);
}

// ── Effects ─────────────────────────────────────────────────────────────

/** Corner distance normalises radial falloffs to roughly 0..1. */
const MAXD = distToXY(0, 0, CX, CY);

/** An EQ: each column is a bin, filling bottom-up, green through red. */
const spectrumBars: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  for (const [led, g] of LED_GEO) {
    const bin = Math.min(SPECTRUM_BINS - 1, Math.floor(g.x * SPECTRUM_BINS));
    const e = S.spectrum[bin] * k;
    const fill = 1 - g.y; // 0 at the bottom row, 1 at the Fn row
    if (fill > e || e < 0.03) continue;
    const tip = e - fill < 0.18;
    f.set(led, hsv(0.36 - fill * 0.36, tip ? 0.5 : 1, tip ? 1 : 0.35 + fill * 0.6));
  }
  return f;
};

/** One horizontal loudness bar, green into red, with a falling peak dot. */
const vuMeter: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const lvl = S.level * k;
  for (const [led, g] of LED_GEO) {
    if (Math.abs(g.x - S.peak * k) < 0.025 && S.peak > 0.02) {
      f.set(led, hsv(0, 0, 0.9)); // the peak marker rides above the bar
    } else if (g.x <= lvl) {
      f.set(led, hsv(0.36 * (1 - g.x), 1, clamp01(0.35 + 0.65 * (1 - g.x / Math.max(lvl, 0.01)))));
    }
  }
  return f;
};

/** The board breathes with the bass — a warm core that swells from centre. */
const bassPulse: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const b = S.bass * k;
  if (b < 0.02) return f;
  const radius = 0.25 + b * 0.95;
  for (const [led, g] of LED_GEO) {
    const dn = distToXY(g.ux, g.uy, CX, CY) / MAXD;
    if (dn > radius) continue;
    const v = b * (1 - (dn / radius) * 0.7);
    if (v < 0.04) continue;
    f.set(led, hsv(0.99 + b * 0.06, 0.95, clamp01(v)));
  }
  return f;
};

/** Every detected beat flashes the whole board a fresh colour. */
const beatFlash: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const last = S.beats.length ? S.beats[S.beats.length - 1] : -Infinity;
  const env = Math.exp(-((nowMs() - last) / 1000) * 7);
  const v = clamp01(Math.max(env, S.level * 0.08) * k);
  if (v < 0.03) return f;
  const c = hsv(frac(S.beatCount * 0.137), 0.85, v);
  for (const led of LED_GEO.keys()) f.set(led, c);
  return f;
};

/** Each beat throws a ring out from the middle of the board. */
const beatRipples: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const t = nowMs();
  for (let i = 0; i < S.beats.length; i++) {
    const ageS = (t - S.beats[i]) / 1000;
    if (ageS > 1.2) continue;
    const r = ageS * 14;
    const amp = Math.exp(-ageS * 2.2) * k;
    const hue = hash2Seq(S.beatCount - (S.beats.length - 1 - i), 3.7);
    for (const [led, g] of LED_GEO) {
      const d = distToXY(g.ux, g.uy, CX, CY);
      const v = amp * Math.exp(-((d - r) * (d - r)) / 0.9);
      if (v < 0.05) continue;
      const prev = f.get(led);
      const c = hsv(hue, 0.85, clamp01(v));
      if (!prev || c[0] + c[1] + c[2] > prev[0] + prev[1] + prev[2]) f.set(led, c);
    }
  }
  return f;
};

/** Loudness history scrolls across the board as a centred waveform. */
const waveform: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0 || S.history.length === 0) return f;
  for (const [led, g] of LED_GEO) {
    const back = Math.round((1 - g.x) * 90); // ~3s of history across the board
    const idx = S.history.length - 1 - back;
    const amp = (idx >= 0 ? S.history[idx] : 0) * k;
    const dy = Math.abs(g.y - 0.5) * 2; // 0 at centre rows, 1 at edges
    if (dy > amp || amp < 0.04) continue;
    const edge = amp - dy < 0.2; // brightest along the envelope itself
    f.set(led, hsv(0.52 - amp * 0.4, 0.9, edge ? 0.9 : 0.35));
  }
  return f;
};

/** Flames climb from the bottom row, fed by bass, flickering on treble. */
const soundFire: ReactiveFn = (t) => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const heat = clamp01(S.bass * 0.9 + S.level * 0.35) * k;
  if (heat < 0.03) return f;
  for (const [led, g] of LED_GEO) {
    const flick = hash2Seq(led, Math.floor(t * (10 + S.treble * 8)));
    const h = heat * (0.65 + 0.5 * flick);
    const fill = 1 - g.y;
    if (fill > h) continue;
    const temp = 1 - fill / Math.max(h, 0.01); // 1 at the base of the flame
    f.set(led, hsv(temp * 0.12, 1 - temp * 0.25, 0.3 + temp * 0.7));
  }
  return f;
};

/** A rainbow across the board that spins and brightens with loudness. */
const loudRainbow: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const v = clamp01((0.1 + S.level * 0.9) * k);
  if (v < 0.03) return f;
  for (const [led, g] of LED_GEO) {
    f.set(led, hsv(frac(S.hue + g.x * 0.3), 0.9, v));
  }
  return f;
};

/** Left third is bass, middle is mids, right is treble — a giant crossover. */
const bandZones: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  for (const [led, g] of LED_GEO) {
    const [e, hue] = g.x < 1 / 3
      ? [S.bass, 0.0] : g.x < 2 / 3 ? [S.mid, 0.35] : [S.treble, 0.6];
    const v = clamp01(e * k);
    if (v < 0.04) continue;
    f.set(led, hsv(hue, 0.9, v));
  }
  return f;
};

/** Random keys twinkle; hi-hats and cymbals drive how many and how hard. */
const trebleSparkle: ReactiveFn = (t) => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const slot = Math.floor(t * 14);
  const density = (0.02 + S.treble * 0.45) * k;
  for (const led of LED_GEO.keys()) {
    const r = hash2Seq(led, slot);
    if (r > density) continue;
    const v = clamp01((0.35 + S.treble * 0.65) * k);
    f.set(led, hsv(hash2Seq(slot + 11.3, led), 0.7, v));
  }
  return f;
};

/** A disc from the centre whose size is the volume — cool quiet, hot loud. */
const centerBurst: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const lvl = S.level * k;
  const radius = lvl * 1.1;
  if (radius < 0.03) return f;
  for (const [led, g] of LED_GEO) {
    const dn = distToXY(g.ux, g.uy, CX, CY) / MAXD;
    if (dn > radius) continue;
    const edge = clamp01((radius - dn) / 0.12);
    f.set(led, hsv(0.62 - lvl * 0.62, 0.95, clamp01(edge * (1 - dn * 0.35))));
  }
  return f;
};

export const SOUND_FNS = {
  spectrumBars, vuMeter, bassPulse, beatFlash, beatRipples, waveform,
  soundFire, loudRainbow, bandZones, trebleSparkle, centerBurst,
};

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
