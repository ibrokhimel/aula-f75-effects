/**
 * Intensity effects — how hard you are going, as a single dial.
 *
 * Everything here reads `rate` (presses per second) and `accel` (whether
 * that rate is climbing), and drives the whole board from it. The family's
 * defining property: the same keys typed quickly look different from the
 * same keys typed slowly.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_GEO,
  type Frame, type Press, type ReactiveFn,
  accel, addTo, age, blob, clamp01, hash2Seq, hsv, maxTo, rate,
} from './core';

/** Presses per second that counts as flat out. */
const REDLINE = 9;

/** Current effort, 0..1. */
const effort = (presses: readonly Press[], t: number) =>
  clamp01(rate(presses, t, 1.6) / REDLINE);

/** Marks recent presses so a quiet board still answers a single keystroke. */
function marks(f: Frame, presses: readonly Press[],
               t: number, hue: number, sat = 0.5) {
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(hue, sat, Math.min(1, v)));
  }
}

/** A speedometer: the bar runs further right the faster you type. */
export const wpm: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  for (const [led, g] of LED_GEO) {
    const u = g.ux / BOARD_W;
    f.set(led, u <= e
      // Green through amber to red along the bar itself, so the reading is
      // legible from its colour as well as its length.
      ? hsv(0.33 - u * 0.33, 0.9, 0.25 + e * 0.6)
      : [2, 2, 5]);
  }
  marks(f, presses, t, 0.15, 0.25);
  return f;
};

/** The board heats up as you speed up, and cools when you ease off. */
export const redline: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  const flicker = e > 0.75 ? 0.85 + 0.15 * Math.sin(t * 28) : 1;
  for (const led of ALL_LEDS) {
    f.set(led, hsv(0.62 - e * 0.62, 0.9 - e * 0.35, (0.05 + e * 0.75) * flicker));
  }
  marks(f, presses, t, 0.1, 0.2);
  return f;
};

/** Discrete gears. Crossing into the next one is meant to be felt. */
export const gearShift: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  const gear = Math.min(4, Math.floor(e * 5));
  const hue = [0.6, 0.45, 0.3, 0.12, 0.0][gear];
  for (const led of ALL_LEDS) f.set(led, hsv(hue, 0.9, 0.06));
  // One lit band per gear, stacked from the bottom of the board.
  for (const [led, g] of LED_GEO) {
    const row = Math.round(g.uy);
    if (row < BOARD_H - 1 - gear) continue;
    f.set(led, hsv(hue, 0.9, 0.25 + gear * 0.15));
  }
  marks(f, presses, t, hue, 0.2);
  return f;
};

/** Past the threshold the board tips over into something else entirely. */
export const turbo: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  const on = clamp01((e - 0.55) / 0.45);
  for (const [led, g] of LED_GEO) {
    const base = 0.04 + e * 0.2;
    // Below the threshold this is a slow drift; above it, streaks tear
    // across the board at speed.
    const streak = on > 0
      ? Math.exp(-((((g.ux / BOARD_W) * 3 + t * (1 + on * 5) + g.uy * 0.13) % 1) ** 2) / 0.02)
      : 0;
    f.set(led, hsv(0.55 - on * 0.5, 0.9 - on * 0.4, clamp01(base + streak * on * 0.9)));
  }
  marks(f, presses, t, 0.05, 0.2);
  return f;
};

/** One wave, whose speed is entirely up to you. */
export const throttle: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  // Phase is integrated from a rate that is itself constant within a frame,
  // so the wave changes speed without ever jumping position.
  const phase = t * (0.3 + e * 5);
  for (const [led, g] of LED_GEO) {
    const w = 0.5 + 0.5 * Math.sin((g.ux / BOARD_W) * 6.28 - phase);
    f.set(led, hsv(0.5 - e * 0.45, 0.85, 0.04 + w * (0.1 + e * 0.8)));
  }
  marks(f, presses, t, 0.5 - e * 0.45, 0.25);
  return f;
};

/** Speeding up runs warm; easing off runs cold. Steady is neutral. */
export const acceleration: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const a = clamp01(accel(presses, t, 3) / 4 * 0.5 + 0.5);
  const e = effort(presses, t);
  for (const [led, g] of LED_GEO) {
    // A gradient that leans the way you are heading: forward when
    // accelerating, backward when slowing.
    const u = g.ux / BOARD_W;
    const lean = clamp01(1 - Math.abs(u - a) * 1.8);
    f.set(led, hsv(0.55 - a * 0.5, 0.9, 0.04 + lean * (0.12 + e * 0.7)));
  }
  marks(f, presses, t, 0.55 - a * 0.5, 0.25);
  return f;
};

/** Straight brightness: the board is as loud as you are. */
export const pressure: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  const breathe = 0.9 + 0.1 * Math.sin(t * (1 + e * 8));
  for (const led of ALL_LEDS) f.set(led, hsv(0.72 - e * 0.2, 0.85, (0.03 + e * 0.8) * breathe));
  marks(f, presses, t, 0.72 - e * 0.2, 0.2);
  return f;
};

/** Calm at a stroll; at speed the board starts throwing lightning. */
export const stormFront: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  for (const [led, g] of LED_GEO) {
    const cloud = 0.5 + 0.5 * Math.sin(g.ux * 0.5 + t * 0.6 + g.uy);
    f.set(led, hsv(0.62, 0.7, 0.03 + cloud * (0.06 + e * 0.18)));
  }
  if (e > 0.35) {
    // Strikes on a fixed schedule seeded by which interval we are in, so
    // they are deterministic but not periodic-looking.
    const slot = Math.floor(t * 4);
    const chance = hash2Seq(slot, 7);
    if (chance < (e - 0.35) * 1.4) {
      const x = hash2Seq(slot, 11) * BOARD_W;
      const flash = 1 - (t * 4 - slot);
      for (const [led, g] of LED_GEO) {
        const v = flash * Math.exp(-((g.ux - x) ** 2) / 1.2);
        if (v < 0.05) continue;
        addTo(f, led, hsv(0.6, 0.15, Math.min(1, v)));
      }
    }
  }
  marks(f, presses, t, 0.6, 0.2);
  return f;
};

/** Each press blooms, and the faster you go the wider each bloom opens. */
export const bloomRate: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const e = effort(presses, t);
  for (const p of presses) {
    const a = age(p, t);
    const life = 1.4 - e * 0.7;
    if (a > life) continue;
    const env = (1 - a / life) * (0.5 + e * 0.5);
    blob(f, p.ux, p.uy, 0.7 + e * 2.4 + a * 2, 0.5 - e * 0.45, env);
  }
  return f;
};
