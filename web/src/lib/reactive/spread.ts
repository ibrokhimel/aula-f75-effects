/**
 * Spread effects — light propagates key to key across the matrix rather than
 * through continuous space, so it follows the actual key grid and stops at
 * the edges of each row.
 */

import {
  ALL_LEDS, NEIGHBOURS, NEIGHBOURS8, type Frame, type ReactiveFn,
  age, clamp01, envelope, hsv, maxTo,
} from './core';

/** Immediate neighbours glow at a fraction of the pressed key. */
export const neighbourGlow: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = envelope(p, t, 0.8);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(p.hue, 0.85, v));
    for (const n of NEIGHBOURS8.get(p.led) ?? []) {
      maxTo(f, n, hsv(p.hue, 0.85, v * 0.35));
    }
  }
  return f;
};

/** A 3x3 block pulses around the key. */
export const blockPulse: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 0.7) continue;
    const v = Math.sin((a / 0.7) * Math.PI) ** 0.7;
    maxTo(f, p.led, hsv(p.hue, 0.8, v));
    for (const n of NEIGHBOURS8.get(p.led) ?? []) maxTo(f, n, hsv(p.hue, 0.8, v * 0.55));
  }
  return f;
};

/**
 * Breadth-first flood across the key graph: one ring of neighbours per step,
 * which follows the matrix rather than physical distance.
 */
export const flood: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const STEP = 0.055, DEPTH = 7;
  for (const p of presses) {
    const a = age(p, t);
    const reach = Math.floor(a / STEP);
    if (reach > DEPTH + 3) continue;
    let front = [p.led];
    const seen = new Set(front);
    for (let d = 0; d <= Math.min(reach, DEPTH); d++) {
      const v = clamp01(1 - a / 1.3) * clamp01(1 - d / (DEPTH + 1));
      if (v > 0.03) for (const led of front) maxTo(f, led, hsv(p.hue + d * 0.02, 0.85, v));
      const next: number[] = [];
      for (const led of front) {
        for (const n of NEIGHBOURS.get(led) ?? []) {
          if (seen.has(n)) continue;
          seen.add(n); next.push(n);
        }
      }
      front = next;
      if (!front.length) break;
    }
  }
  return f;
};

/** Only the expanding ring of the flood is lit — a matrix-space ripple. */
export const gridRipple: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const STEP = 0.06, DEPTH = 9;
  for (const p of presses) {
    const a = age(p, t);
    const reach = Math.floor(a / STEP);
    if (reach > DEPTH) continue;
    let front = [p.led];
    const seen = new Set(front);
    for (let d = 0; d < reach; d++) {
      const next: number[] = [];
      for (const led of front) {
        for (const n of NEIGHBOURS.get(led) ?? []) {
          if (seen.has(n)) continue;
          seen.add(n); next.push(n);
        }
      }
      front = next;
      if (!front.length) break;
    }
    const v = clamp01(1 - reach / DEPTH);
    if (v > 0.03) for (const led of front) maxTo(f, led, hsv(p.hue, 0.85, v));
  }
  return f;
};

/** Colour infects neighbours and keeps spreading — slow, and it takes over. */
export const infect: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [3, 4, 9]);
  const STEP = 0.13;
  for (const p of presses) {
    const a = age(p, t);
    const reach = Math.floor(a / STEP);
    let front = [p.led];
    const seen = new Set(front);
    for (let d = 0; d <= Math.min(reach, 12); d++) {
      const v = clamp01(1 - a / 5.5) * 0.85;
      if (v > 0.03) for (const led of front) maxTo(f, led, hsv(p.hue, 0.75, v));
      const next: number[] = [];
      for (const led of front) {
        for (const n of NEIGHBOURS.get(led) ?? []) {
          if (seen.has(n)) continue;
          seen.add(n); next.push(n);
        }
      }
      front = next;
      if (!front.length) break;
    }
  }
  return f;
};

/** Neighbours jitter in brightness — the key rattles its surroundings. */
export const quake: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const frame = Math.floor(t * 30);
  for (const p of presses) {
    const v = envelope(p, t, 0.5);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(p.hue, 0.6, v));
    for (const n of NEIGHBOURS8.get(p.led) ?? []) {
      // Deterministic per (key, frame) so the shake is reproducible.
      const j = ((n * 31 + frame * 17) % 7) / 7;
      maxTo(f, n, hsv(p.hue, 0.7, v * (0.2 + j * 0.6)));
    }
  }
  return f;
};
