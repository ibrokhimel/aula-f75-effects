/**
 * Particle reactions — each press spawns short-lived motes with their own
 * trajectories. Offsets are hashed from (press seq, particle index), so the
 * scatter is deterministic and the same keystroke always looks the same.
 */

import {
  BOARD_H, LED_GEO, type Frame, type ReactiveFn,
  addTo, age, hash2Seq, hsv,
} from './core';

const ROW = 2.2;

/** Sprays outward and falls under gravity. */
export const splash: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const N = 9, LIFE = 0.9;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (let k = 0; k < N; k++) {
      const ang = hash2Seq(p.seq, k) * Math.PI * 2;
      const spd = 5 + hash2Seq(p.seq, k + 40) * 6;
      const x = p.ux + Math.cos(ang) * spd * a;
      const y = p.uy + Math.sin(ang) * spd * a * 0.4 + 4 * a * a;
      for (const [led, g] of LED_GEO) {
        const v = env * Math.exp(-((g.ux - x) ** 2) / 0.45 - ((g.uy - y) ** 2) / 0.25);
        if (v < 0.05) continue;
        addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Shoots upward from the key and arcs back down. */
export const fountain: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const N = 7, LIFE = 1.1;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (let k = 0; k < N; k++) {
      const spread = (hash2Seq(p.seq, k) - 0.5) * 5;
      const up = 5 + hash2Seq(p.seq, k + 11) * 3;
      const x = p.ux + spread * a;
      const y = p.uy - up * a + 6 * a * a;
      for (const [led, g] of LED_GEO) {
        const v = env * Math.exp(-((g.ux - x) ** 2) / 0.5 - ((g.uy - y) ** 2) / 0.25);
        if (v < 0.05) continue;
        addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Nearby keys twinkle at random rather than moving. */
export const sparkleBurst: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 0.8;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const frame = Math.floor(t * 22);
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > 5) continue;
      if (hash2Seq(led * 7 + frame, p.seq) > 0.35) continue;
      const v = env * (1 - d / 5);
      if (v < 0.05) continue;
      addTo(f, led, hsv(p.hue + hash2Seq(led, frame) * 0.15, 0.7, Math.min(1, v)));
    }
  }
  return f;
};

/** Embers drift down the board from the pressed key. */
export const emberFall: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const N = 6, LIFE = 1.6;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = (1 - a / LIFE) ** 1.3;
    for (let k = 0; k < N; k++) {
      const drift = (hash2Seq(p.seq, k) - 0.5) * 2.2;
      const x = p.ux + drift * a + Math.sin(t * 2 + k) * 0.3;
      const y = p.uy + (2.5 + hash2Seq(p.seq, k + 5) * 2) * a;
      if (y > BOARD_H) continue;
      for (const [led, g] of LED_GEO) {
        const v = env * Math.exp(-((g.ux - x) ** 2) / 0.4 - ((g.uy - y) ** 2) / 0.22);
        if (v < 0.05) continue;
        addTo(f, led, [255, Math.round(120 * v), Math.round(20 * v)]);
      }
    }
  }
  return f;
};

/** Rises, then bursts into a shell partway up the board. */
export const firework: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const RISE = 0.3, BURST = 0.8;
  for (const p of presses) {
    const a = age(p, t);
    if (a > RISE + BURST) continue;
    if (a < RISE) {
      const y = p.uy - (p.uy + 1) * (a / RISE);
      for (const [led, g] of LED_GEO) {
        const v = Math.exp(-((g.ux - p.ux) ** 2) / 0.4 - ((g.uy - y) ** 2) / 0.3);
        if (v > 0.06) addTo(f, led, hsv(0.11, 0.5, Math.min(1, v)));
      }
      continue;
    }
    const ba = a - RISE;
    const env = 1 - ba / BURST;
    const apex = -1;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - apex) * ROW);
      const v = Math.exp(-((d - ba * 14) ** 2) / 1.6) * env;
      if (v < 0.05) continue;
      addTo(f, led, hsv(p.hue, 0.9, Math.min(1, v)));
    }
  }
  return f;
};

/** Fast straight shards, no gravity — reads as an impact. */
export const shrapnel: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const N = 6, LIFE = 0.55;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = (1 - a / LIFE) ** 0.7;
    for (let k = 0; k < N; k++) {
      const ang = (k / N) * Math.PI * 2 + hash2Seq(p.seq, 0) * 6.283;
      const x = p.ux + Math.cos(ang) * 22 * a;
      const y = p.uy + Math.sin(ang) * 8 * a;
      for (const [led, g] of LED_GEO) {
        const v = env * Math.exp(-((g.ux - x) ** 2) / 0.6 - ((g.uy - y) ** 2) / 0.3);
        if (v < 0.05) continue;
        addTo(f, led, hsv(p.hue, 0.5, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Slow motes that hang around the key and fade. */
export const dust: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const N = 8, LIFE = 2.4;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = (1 - a / LIFE) ** 1.6;
    for (let k = 0; k < N; k++) {
      const ang = hash2Seq(p.seq, k) * Math.PI * 2;
      const x = p.ux + Math.cos(ang) * 2.2 * a + Math.sin(t * 0.8 + k) * 0.4;
      const y = p.uy + Math.sin(ang) * 0.9 * a;
      const tw = 0.5 + 0.5 * Math.sin(t * 5 + k * 2);
      for (const [led, g] of LED_GEO) {
        const v = env * tw * Math.exp(-((g.ux - x) ** 2) / 0.5 - ((g.uy - y) ** 2) / 0.25);
        if (v < 0.04) continue;
        addTo(f, led, hsv(p.hue + 0.1, 0.55, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Droplets run straight down the column below the key. */
export const drip: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 1.3;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const y = p.uy + a * 6;
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.ux - p.ux) > 0.9) continue;
      const v = env * Math.exp(-((g.uy - y) ** 2) / 0.35);
      if (v < 0.05) continue;
      addTo(f, led, hsv(0.55, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** A single mote orbiting the pressed key as it fades. */
export const orbit: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 1.6;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (let k = 0; k < 2; k++) {
      const ang = a * 9 + k * Math.PI;
      const x = p.ux + Math.cos(ang) * 2.4;
      const y = p.uy + Math.sin(ang) * 1.0;
      for (const [led, g] of LED_GEO) {
        const v = env * Math.exp(-((g.ux - x) ** 2) / 0.5 - ((g.uy - y) ** 2) / 0.25);
        if (v < 0.05) continue;
        addTo(f, led, hsv(p.hue + k * 0.4, 0.85, Math.min(1, v)));
      }
    }
    addTo(f, p.led, hsv(p.hue, 0.5, env * 0.5));
  }
  return f;
};
