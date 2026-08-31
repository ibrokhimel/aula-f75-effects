/**
 * Sound — the effects. Ordinary ReactiveFns, so the whole pipeline treats
 * them like any other reactive effect; they simply ignore presses and read
 * the audio state that sound.ts maintains. Everything here is post-auto-gain:
 * `S.level` at 1 means "as loud as this listening session gets", not an
 * absolute volume, and `S.centroid` gives a colour that follows the music's
 * timbre rather than its loudness — the cure for a board stuck on red.
 */

import { CX, CY } from '../animations';
import {
  LED_GEO, ROW_SCALE, clamp01, frac, hsv, hash2Seq, distToXY,
  type Frame, type ReactiveFn,
} from './core';
import { SOUND_STATE as S, SPECTRUM_BINS, audioAlive as alive, soundNow } from './sound';

/** Corner distance normalises radial falloffs to roughly 0..1. */
const MAXD = distToXY(0, 0, CX, CY);
const LEDS = [...LED_GEO.keys()];

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
    // Warm family, but wandering — never the same red for a whole song.
    f.set(led, hsv(frac(0.95 + S.hue * 0.12 + b * 0.05), 0.95, clamp01(v)));
  }
  return f;
};

/** Every detected beat flashes the whole board a fresh colour. */
const beatFlash: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const last = S.beats.length ? S.beats[S.beats.length - 1] : -Infinity;
  const env = Math.exp(-((soundNow() - last) / 1000) * 7);
  const v = clamp01(Math.max(env, S.level * 0.08) * k);
  if (v < 0.03) return f;
  const c = hsv(frac(S.beatCount * 0.137), 0.85, v);
  for (const led of LEDS) f.set(led, c);
  return f;
};

/** Each beat throws a ring out from the middle of the board. */
const beatRipples: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const t = soundNow();
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
  for (const led of LEDS) {
    const r = hash2Seq(led, slot);
    if (r > density) continue;
    const v = clamp01((0.35 + S.treble * 0.65) * k);
    f.set(led, hsv(hash2Seq(slot + 11.3, led), 0.7, v));
  }
  return f;
};

/** A disc from the centre sized by volume, coloured by the sound itself. */
const centerBurst: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const lvl = S.level * k;
  const radius = lvl * 1.1;
  if (radius < 0.03) return f;
  // Timbre picks the colour — bassy warm, bright cool — with a slow drift,
  // so a loud song shifts shade instead of parking on red.
  const hue = frac(S.centroid * 0.62 + S.hue * 0.15);
  for (const [led, g] of LED_GEO) {
    const dn = distToXY(g.ux, g.uy, CX, CY) / MAXD;
    if (dn > radius) continue;
    const edge = clamp01((radius - dn) / 0.12);
    f.set(led, hsv(hue, 0.95, clamp01(edge * (1 - dn * 0.35))));
  }
  return f;
};

/** A colour wheel around the centre, spun by loudness, kicked by beats. */
const discoSpin: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const spin = S.hue * 2 + S.beatCount * 0.13;
  const v = clamp01((0.3 + 0.7 * Math.max(S.pulse, S.level * 0.55)) * k);
  if (v < 0.04) return f;
  for (const [led, g] of LED_GEO) {
    const ang = Math.atan2((g.uy - CY) * ROW_SCALE, g.ux - CX) / (2 * Math.PI);
    f.set(led, hsv(frac(ang + spin), 0.9, v));
  }
  return f;
};

/** A hard white flash on every kick, over a dim timbre-coloured floor. */
const kickStrobe: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const last = S.beats.length ? S.beats[S.beats.length - 1] : -Infinity;
  if ((soundNow() - last) / 1000 < 0.1) {
    const c = hsv(0, 0, k);
    for (const led of LEDS) f.set(led, c);
    return f;
  }
  const v = clamp01((0.06 + 0.24 * S.level) * k);
  if (v < 0.03) return f;
  const c = hsv(frac(S.centroid * 0.6 + S.hue * 0.1), 0.85, v);
  for (const led of LEDS) f.set(led, c);
  return f;
};

/** The sound's colour and loudness flow across the board like lava. */
const spectrumFlow: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0 || S.history.length === 0) return f;
  for (const [led, g] of LED_GEO) {
    const back = Math.round((1 - g.x) * 90);
    const idx = S.history.length - 1 - back;
    if (idx < 0) continue;
    const v = clamp01(S.history[idx] * k);
    if (v < 0.04) continue;
    f.set(led, hsv(frac(S.hues[idx] * 0.7 + 0.95), 0.9, v));
  }
  return f;
};

/** Bass owns the bottom rows, treble the top, mids the middle — each stripe
 *  filling outward from the board's centre line by its own energy. */
const duet: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  for (const [led, g] of LED_GEO) {
    const [e, hue] = g.y > 0.66
      ? [S.bass, 0.02] : g.y < 0.33 ? [S.treble, 0.58] : [S.mid, 0.33];
    const w = Math.abs(g.x - 0.5) * 2; // 0 at centre, 1 at the edges
    if (w > e * k || e < 0.04) continue;
    f.set(led, hsv(frac(hue + S.hue * 0.06), 0.95, clamp01((0.4 + 0.6 * e) * k)));
  }
  return f;
};

/** Every beat scatters a handful of coloured keys that burn out fast. */
const beatConfetti: ReactiveFn = () => {
  const f: Frame = new Map();
  const k = alive();
  if (k <= 0) return f;
  const t = soundNow();
  for (let i = 0; i < S.beats.length; i++) {
    const ageS = (t - S.beats[i]) / 1000;
    if (ageS > 0.9) continue;
    const seq = S.beatCount - (S.beats.length - 1 - i);
    const fade = Math.exp(-ageS * 4) * k;
    if (fade < 0.04) continue;
    for (let j = 0; j < 14; j++) {
      const led = LEDS[Math.floor(hash2Seq(seq * 7.7, j * 3.1) * LEDS.length) % LEDS.length];
      const prev = f.get(led);
      const c = hsv(hash2Seq(j + 0.5, seq), 0.85, clamp01(fade));
      if (!prev || c[0] + c[1] + c[2] > prev[0] + prev[1] + prev[2]) f.set(led, c);
    }
  }
  return f;
};

export const SOUND_FNS = {
  spectrumBars, vuMeter, bassPulse, beatFlash, beatRipples, waveform,
  soundFire, loudRainbow, bandZones, trebleSparkle, centerBurst,
  discoSpin, kickStrobe, spectrumFlow, duet, beatConfetti,
};
