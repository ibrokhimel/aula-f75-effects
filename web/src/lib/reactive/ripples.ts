/**
 * Ripples — rings expanding from the key you pressed.
 *
 * Rows are 1u apart while the board is 16u wide, so an unscaled circle is a
 * three-key smear. Every ring here scales the row axis (ROW) to keep the
 * wavefront looking round on the physical board.
 */

import {
  LED_GEO, type Frame, type ReactiveFn,
  addTo, age, clamp01, hsv, maxTo,
} from './core';

const ROW = 2.4;

/** Single expanding ring per press. */
export const ripple: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 13, LIFE = 1.0;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const r = a * SPEED;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - r) ** 2) / 1.4) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Three rings per press, staggered — a stone with a bigger splash. */
export const rippleTriple: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 12, LIFE = 1.3;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    for (let k = 0; k < 3; k++) {
      const ka = a - k * 0.13;
      if (ka < 0) continue;
      const env = (1 - a / LIFE) * (1 - k * 0.25);
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        const v = Math.exp(-((d - ka * SPEED) ** 2) / 1.1) * env;
        if (v < 0.04) continue;
        addTo(f, led, hsv(p.hue + k * 0.05, 0.85, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Chebyshev distance, so the wavefront is a square. */
export const rippleSquare: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 11, LIFE = 1.0;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (const [led, g] of LED_GEO) {
      const d = Math.max(Math.abs(g.ux - p.ux), Math.abs(g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - a * SPEED) ** 2) / 1.0) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** Manhattan distance — a diamond front. */
export const rippleDiamond: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 12, LIFE = 1.0;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (const [led, g] of LED_GEO) {
      const d = Math.abs(g.ux - p.ux) + Math.abs(g.uy - p.uy) * ROW;
      const v = Math.exp(-((d - a * SPEED) ** 2) / 1.4) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** Hue mapped to radius, so each ring is a small rainbow. */
export const rippleRainbow: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 12, LIFE = 1.2;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - a * SPEED) ** 2) / 2.2) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(d * 0.06 + p.hue, 0.95, Math.min(1, v)));
    }
  }
  return f;
};

/** Starts wide and converges onto the key — reads as the board answering. */
export const rippleInward: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 0.85, START = 11;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const r = START * (1 - a / LIFE);
    const env = a / LIFE; // brightens as it closes in
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - r) ** 2) / 1.3) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.9, Math.min(1, v)));
    }
  }
  return f;
};

/** One slow, wide swell rather than a thin ring. */
export const rippleSwell: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 6, LIFE = 2.2;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = (1 - a / LIFE) ** 1.5;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - a * SPEED) ** 2) / 9) * env;
      if (v < 0.03) continue;
      addTo(f, led, hsv(p.hue, 0.7, Math.min(1, v)));
    }
  }
  return f;
};

/**
 * Rings summed as signed waves rather than added as light, so two presses
 * genuinely interfere — crests reinforce and troughs cancel.
 */
export const rippleInterference: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 1.6;
  for (const [led, g] of LED_GEO) {
    let sum = 0;
    for (const p of presses) {
      const a = age(p, t);
      if (a > LIFE) continue;
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      sum += Math.sin(d * 0.9 - a * 11) * Math.exp(-d / 9) * (1 - a / LIFE);
    }
    const v = clamp01(Math.abs(sum));
    if (v < 0.05) continue;
    maxTo(f, led, hsv(0.55 + sum * 0.12, 0.85, v));
  }
  return f;
};

/** A ring that bounces off the board edges once. */
export const rippleEcho: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 12, LIFE = 1.8;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const r = a * SPEED;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      // The echo is the ring reflected about the far edge of the board.
      const back = Math.abs(2 * 16 - d - r);
      const v = Math.exp(-((d - r) ** 2) / 1.4) * env
              + Math.exp(-(back ** 2) / 2.0) * env * 0.5;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};
