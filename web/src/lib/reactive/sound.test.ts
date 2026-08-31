import { afterEach, describe, expect, it } from 'vitest';
import {
  AUDIO_FFT_SIZE, SPECTRUM_BINS, analyzeAudio, pushAudioSample, resetSound,
  setSoundClock, type AudioSample,
} from './sound';
import { REACTIVE } from './index';
import { ALL_LEDS } from '../animations';

const VALID = new Set(ALL_LEDS);
const SOUND = Object.entries(REACTIVE).filter(([, e]) => e.category === 'Sound');

const sample = (over: Partial<AudioSample> = {}): AudioSample => ({
  level: 0.6,
  bass: 0.5,
  mid: 0.4,
  treble: 0.3,
  spectrum: new Array(SPECTRUM_BINS).fill(0.5),
  centroid: 0.5,
  ...over,
});

/** Pin the module clock, feed samples at 30 Hz, and leave it pinned. */
function feed(count: number, s: AudioSample = sample(), fromMs = 0): number {
  let now = fromMs;
  setSoundClock(() => now);
  for (let i = 0; i < count; i++) {
    now = fromMs + i * 33;
    pushAudioSample(s);
  }
  return now;
}

afterEach(() => {
  resetSound();
  setSoundClock(null);
});

describe('analyzeAudio', () => {
  it('reads silence as zeros', () => {
    const freq = new Uint8Array(AUDIO_FFT_SIZE / 2);
    const time = new Uint8Array(AUDIO_FFT_SIZE).fill(128); // flat waveform
    const s = analyzeAudio(freq, time, 48000);
    expect(s.level).toBe(0);
    expect(s.bass).toBe(0);
    expect(s.spectrum).toHaveLength(SPECTRUM_BINS);
    expect(Math.max(...s.spectrum)).toBe(0);
  });

  it('reads a loud full-spectrum signal as loud everywhere', () => {
    const freq = new Uint8Array(AUDIO_FFT_SIZE / 2).fill(220);
    const time = new Uint8Array(AUDIO_FFT_SIZE);
    for (let i = 0; i < time.length; i++) time[i] = i % 2 ? 40 : 216;
    const s = analyzeAudio(freq, time, 48000);
    // Level is deliberately unclamped — the auto-gain needs to see how hot
    // the signal really is.
    expect(s.level).toBeGreaterThanOrEqual(1);
    expect(s.bass).toBeGreaterThan(0.8);
    expect(s.treble).toBeGreaterThan(0.8);
    expect(Math.min(...s.spectrum)).toBeGreaterThan(0.8);
    expect(s.centroid).toBeGreaterThan(0);
    expect(s.centroid).toBeLessThan(1);
  });

  it('auto-gain keeps headroom when the volume is pegged', () => {
    let now = 0;
    setSoundClock(() => now);
    // A hot signal parks the reference at its own loudness…
    for (let i = 0; i < 40; i++) { now = i * 33; pushAudioSample(sample({ level: 2 })); }
    const pegged = REACTIVE.sndvu.fn(1, []).size;
    // …so a merely-loud stretch reads as a visible dip, not more full-scale.
    for (let i = 40; i < 60; i++) { now = i * 33; pushAudioSample(sample({ level: 1.2 })); }
    const dipped = REACTIVE.sndvu.fn(2, []).size;
    expect(pegged).toBeGreaterThan(0);
    expect(dipped).toBeLessThan(pegged);
  });
});

describe('sound effects', () => {
  it('every Sound effect is dark when nothing has ever pushed audio', () => {
    for (const [id, def] of SOUND) {
      for (const t of [0, 1.7, 42]) {
        expect(def.fn(t, []).size, `${id} lit with no audio`).toBe(0);
      }
    }
  });

  it('every Sound effect lights up under loud audio and renders valid frames', () => {
    feed(60);
    // A kick right at the end, so beat-driven effects have a fresh beat.
    pushAudioSample(sample({ bass: 0.95 }));
    for (const [id, def] of SOUND) {
      let lit = 0;
      for (const t of [0.21, 1.03, 2.4]) {
        const frame = def.fn(t, []);
        lit += frame.size;
        for (const [led, rgb] of frame) {
          expect(VALID.has(led), `${id} lit unknown LED ${led}`).toBe(true);
          for (const c of rgb) {
            expect(Number.isInteger(c), `${id} non-integer channel`).toBe(true);
            expect(c).toBeGreaterThanOrEqual(0);
            expect(c).toBeLessThanOrEqual(255);
          }
        }
      }
      expect(lit, `${id} never lit under loud audio`).toBeGreaterThan(0);
    }
  });

  it('is deterministic under a pinned clock and fixed state', () => {
    feed(30);
    for (const [id, def] of SOUND) {
      const a = def.fn(1.1, []);
      const b = def.fn(1.1, []);
      expect([...a.entries()], id).toEqual([...b.entries()]);
    }
  });

  it('fades back to dark once samples stop arriving', () => {
    const last = feed(30);
    setSoundClock(() => last + 5000); // five silent seconds later
    for (const [id, def] of SOUND) {
      expect(def.fn(9, []).size, `${id} still lit after capture stopped`).toBe(0);
    }
  });

  it('detects beats from bass punching above its rolling average', () => {
    // A quiet stretch teaches the baseline, then a kick lands.
    feed(40, sample({ bass: 0.1 }));
    let now = 40 * 33;
    setSoundClock(() => now);
    pushAudioSample(sample({ bass: 0.9 }));
    const flash = REACTIVE.sndbeat;
    const frame = flash.fn(0.5, []);
    expect(frame.size, 'beat flash missed the kick').toBeGreaterThan(0);
    // Every key carries the same flash colour.
    const first = [...frame.values()][0];
    for (const rgb of frame.values()) expect(rgb).toEqual(first);
  });
});
