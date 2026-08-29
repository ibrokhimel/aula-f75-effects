/**
 * The original fourteen — unchanged behaviour, moved off the old flat module
 * and onto the shared primitives in ./core.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_GEO, LED_POS, ROWS,
  type AnimationFn, type RGB, frac, hsv,
} from './core';

export const sineWave: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  for (const [led, pos] of LED_POS) {
    const hue = pos.col + t * 0.3;
    const val = 0.5 + 0.5 * Math.sin(pos.col * Math.PI * 4 - t * 4.0);
    colors.set(led, hsv(hue, 1.0, val));
  }
  return colors;
};

export const rain: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  const dropSpeed = 3.0;
  const nDrops = 6;
  for (const [led, pos] of LED_POS) {
    let bestV = 0;
    for (let d = 0; d < nDrops; d++) {
      const dropCol = ((d * 0.618 + t * 0.1) % 1.0 + 1.0) % 1.0;
      const colDist = Math.abs(pos.col - dropCol);
      if (colDist > 0.06) continue;
      const dropY = ((t * dropSpeed + d * 1.7) % 2.0) - 0.5;
      const rowDist = Math.abs(pos.row - dropY);
      if (rowDist < 0.3) {
        const v = Math.max(0, 1 - rowDist / 0.3) * (1 - colDist / 0.06);
        bestV = Math.max(bestV, v);
      }
    }
    if (bestV > 0.05) colors.set(led, hsv(0.55, 0.8, bestV));
  }
  return colors;
};

export const fire: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  for (const [led, pos] of LED_POS) {
    const heat = Math.max(0, 1.0 - pos.row * 0.7);
    const flicker = 0.5 + 0.5 * Math.sin(pos.col * 13.7 + t * 7.0);
    const flicker2 = 0.5 + 0.5 * Math.sin(pos.col * 7.3 - t * 5.0 + pos.row * 3.0);
    const v = heat * (0.4 + 0.6 * flicker * flicker2);
    if (v < 0.05) continue;
    const hue = 0.0 + 0.08 * (1.0 - pos.row);
    colors.set(led, hsv(hue, 1.0 - pos.row * 0.3, Math.min(1.0, v)));
  }
  return colors;
};

export const breathing: AnimationFn = (t) => {
  const v = 0.5 + 0.5 * Math.sin(t * 2.0);
  const color = hsv(t * 0.05, 1.0, v);
  const colors = new Map<number, RGB>();
  for (const led of ALL_LEDS) colors.set(led, color);
  return colors;
};

export const snake: AnimationFn = (t) => {
  const path: number[] = [];
  for (let ri = 0; ri < ROWS.length; ri++) {
    const row = ri % 2 === 0 ? [...ROWS[ri]].reverse() : ROWS[ri];
    path.push(...row);
  }
  const n = path.length;
  const head = Math.floor(t * 16.0) % n;
  const tailLen = 10;
  const hue = (t * 0.08) % 1.0;
  const colors = new Map<number, RGB>();
  for (let offset = 0; offset < tailLen; offset++) {
    const led = path[((head - offset) % n + n) % n];
    colors.set(led, hsv(hue, 1.0, (tailLen - offset) / tailLen));
  }
  return colors;
};

export const rainbow: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  for (const [led, pos] of LED_POS) colors.set(led, hsv(pos.col + t * 0.3));
  return colors;
};

export const waveVertical: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  for (const [led, pos] of LED_POS) {
    const v = 0.5 + 0.5 * Math.sin(pos.row * Math.PI * 3 - t * 3.0);
    colors.set(led, hsv(0.6 + pos.row * 0.15, 0.8, v));
  }
  return colors;
};

export const sparkle: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  const frame = Math.floor(t * 20);
  for (const led of ALL_LEDS) {
    const seed = (led * 7919 + frame * 104729) % 100;
    if (seed < 8) colors.set(led, hsv((led * 0.0618 + t * 0.1) % 1.0, 0.7, 1.0));
  }
  return colors;
};

export const plasma: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const v =
      Math.sin(p.ux * 0.55 + t * 1.1) +
      Math.sin(p.uy * 1.3 - t * 0.8) +
      Math.sin((p.ux + p.uy * 2) * 0.35 + t * 0.6) +
      Math.sin(Math.hypot(p.ux - BOARD_W / 2, p.uy - BOARD_H / 2) * 0.5 - t * 1.4);
    const val = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(v * 1.3));
    colors.set(led, hsv(v / 8 + t * 0.03, 0.95, val));
  }
  return colors;
};

export const aurora: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    // A drifting ridge line the curtain hangs from; three octaves so it never
    // repeats on a visible period.
    const ridge =
      2.5 +
      1.15 * Math.sin(p.ux * 0.33 + t * 0.55) +
      0.6 * Math.sin(p.ux * 0.71 - t * 0.9) +
      0.35 * Math.sin(p.ux * 1.3 + t * 1.4);
    const d = Math.abs(p.uy - ridge);
    const v = Math.max(0, 1 - d / 2.0) ** 2;
    if (v < 0.03) continue;
    const hue = 0.48 + 0.16 * Math.sin(p.ux * 0.26 - t * 0.4) + 0.08 * Math.sin(p.uy * 0.8 + t * 0.2);
    colors.set(led, hsv(hue, 0.9 - 0.3 * v, v));
  }
  return colors;
};

export const ripple: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  // Epicentre wanders on a slow Lissajous so the rings never look canned.
  const ex = BOARD_W / 2 + (BOARD_W / 2 - 2) * Math.sin(t * 0.23);
  const ey = (BOARD_H - 1) / 2 + ((BOARD_H - 1) / 2) * Math.sin(t * 0.31 + 1.1);
  for (const [led, p] of LED_GEO) {
    const d = Math.hypot(p.ux - ex, p.uy - ey);
    const crest = Math.sin(d * 1.05 - t * 5.0);
    if (crest <= 0) continue;
    const v = crest ** 3 * Math.max(0, 1 - d / 16);
    if (v < 0.03) continue;
    colors.set(led, hsv(0.55 + d * 0.012 + 0.1 * Math.sin(t * 0.2), 0.85, v));
  }
  return colors;
};

export const rippleSnap: AnimationFn = (t) => {
  // Discrete drops rather than a standing wave: each one fires, expands hard,
  // and is extinguished by the decay envelope well before it crosses the
  // board. Tuning knobs, in the order you'd want to reach for them:
  const PERIOD = 0.34; // seconds between drops (< LIFE, so they overlap slightly)
  const SPEED = 30; // how fast the ring expands, key units/second
  const LIFE = 0.36; // seconds a drop lasts — smaller = snaps off sooner
  const THICKNESS = 1.0; // ring half-width, key units
  const IN_FLIGHT = 3; // drops kept alive at once (older ones are near-dead)

  const colors = new Map<number, RGB>();
  const newest = Math.floor(t / PERIOD);

  for (let k = newest; k > newest - IN_FLIGHT; k--) {
    const age = t - k * PERIOD;
    if (age < 0) continue;
    // Cubic falloff, not exponential: the drop holds full brightness and then
    // drops off a cliff, so it reads as snapping off rather than fading out.
    const env = Math.exp(-5 * (age / LIFE) ** 3);
    if (env < 0.02) continue;

    // Epicentre and hue hashed off the drop index: deterministic, so the
    // pattern is reproducible frame to frame, but never visibly repeats.
    const ex = frac(Math.sin(k * 127.1) * 43758.5453) * BOARD_W;
    const ey = frac(Math.sin(k * 311.7) * 24634.6345) * (BOARD_H - 1);
    const hue = frac(Math.sin(k * 74.7) * 19349.1337);
    const radius = age * SPEED;

    for (const [led, p] of LED_GEO) {
      const d = Math.hypot(p.ux - ex, p.uy - ey);
      const off = d - radius;
      const ring = Math.exp(-(off * off) / THICKNESS);
      const v = ring * env;
      if (v < 0.03) continue;
      const [r, g, b] = hsv(hue, 0.8, Math.min(1, v));
      const prev = colors.get(led);
      // Overlapping drops add, so two rings crossing flare white.
      colors.set(led, prev
        ? [Math.min(255, prev[0] + r), Math.min(255, prev[1] + g), Math.min(255, prev[2] + b)]
        : [r, g, b]);
    }
  }
  return colors;
};

export const comet: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  const span = BOARD_W + 10;
  const hx = ((t * 13) % span) - 5;
  const hy = (BOARD_H - 1) / 2 + ((BOARD_H - 1) / 2) * Math.sin(t * 0.85);
  const hue = t * 0.07;
  for (const [led, p] of LED_GEO) {
    const behind = hx - p.ux; // > 0 → this key is in the tail
    if (behind < -1.2) continue; // ahead of the head, still dark
    const along = behind < 0 ? -behind * 2.5 : behind * 0.28; // sharp nose, long tail
    const across = p.uy - hy;
    const v = Math.exp(-along) * Math.exp(-(across * across) / 1.1);
    if (v < 0.04) continue;
    const sat = Math.min(1, 0.25 + Math.max(0, behind) * 0.35); // white core, coloured tail
    colors.set(led, hsv(hue + behind * 0.006, sat, Math.min(1, v * 1.15)));
  }
  return colors;
};

export const scanner: AnimationFn = (t) => {
  const colors = new Map<number, RGB>();
  const sx = BOARD_W / 2 + (BOARD_W / 2 - 0.5) * Math.sin(t * 1.5);
  for (const [led, p] of LED_GEO) {
    const d = p.ux - sx;
    const v = Math.exp(-(d * d) / 3.2);
    if (v < 0.04) continue;
    colors.set(led, hsv(0.0, Math.max(0, 1 - v * 0.55), v));
  }
  return colors;
};
