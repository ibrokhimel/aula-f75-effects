/**
 * Single-key reactions: the pressed key itself lights, and nothing spreads.
 * The cheapest family, and the one most people actually leave switched on.
 */

import {
  type Frame, type ReactiveFn, type RGB,
  addTo, age, clamp01, dim, envelope, floor, heldFor, hsv, isHeld,
  ALL_LEDS, hashSeq, maxTo, sinceUp,
} from './core';

/** Key lights on press and fades out over ~0.9s. */
export const fadeOut: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = envelope(p, t, 0.9);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(p.hue, 0.85, v));
  }
  return f;
};

/** Lit only while held — the most literal reading of "reactive". */
export const whileHeld: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) if (isHeld(p, t)) maxTo(f, p.led, hsv(p.hue, 0.9, 1));
  return f;
};

/** Hue keeps cycling for as long as the trail lasts. */
export const hueCycle: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = envelope(p, t, 1.4);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(p.hue + age(p, t) * 0.6, 0.9, v));
  }
  return f;
};

/** Three quick blinks, then out. */
export const blink: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 0.75) continue;
    const on = Math.floor(a / 0.125) % 2 === 0;
    if (!on) continue;
    maxTo(f, p.led, hsv(p.hue, 0.8, 1 - a / 0.75));
  }
  return f;
};

/** Swells in, then out — softer than a hard flash. */
export const pulse: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 1.1) continue;
    maxTo(f, p.led, hsv(p.hue, 0.85, Math.sin((a / 1.1) * Math.PI) ** 0.8));
  }
  return f;
};

/** White at the instant of contact, cooling into its own colour as it dies. */
export const whiteHot: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = envelope(p, t, 1.0);
    if (v < 0.03) continue;
    // Saturation climbs as brightness falls: white core, coloured embers.
    maxTo(f, p.led, hsv(p.hue, clamp01(1 - v) * 0.95, v));
  }
  return f;
};

/** A hard, bright flash with almost no tail. Good for fast typists. */
export const spark: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 11);
    if (v < 0.04) continue;
    maxTo(f, p.led, [255, Math.round(230 * v), Math.round(140 * v)]);
  }
  return f;
};

/** Charges the longer you hold, then discharges when you let go. */
export const chargeHold: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const charge = clamp01(heldFor(p, t) / 1.2);
    const v = isHeld(p, t) ? charge : charge * Math.exp(-sinceUp(p, t) * 3.5);
    if (v < 0.03) continue;
    // Hue walks toward white-hot the longer it is held.
    maxTo(f, p.led, hsv(0.08 + charge * 0.12, 1 - charge * 0.7, v));
  }
  return f;
};

/** The whole board is lit and presses punch holes in it. */
export const inverted: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  floor(f, hsv(t * 0.03, 0.6, 0.5));
  for (const p of presses) {
    const v = envelope(p, t, 0.7);
    if (v < 0.03) continue;
    const base = hsv(t * 0.03, 0.6, 0.5);
    f.set(p.led, dim(base, 1 - v));
  }
  return f;
};

/** Each key keeps the colour of the last press for as long as it lasts. */
export const stamp: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = clamp01(1 - age(p, t) / 5);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(p.hue, 0.9, v ** 0.5));
  }
  return f;
};

/** Two overlapping presses add toward white; a chord flares. */
export const additive: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = envelope(p, t, 1.1);
    if (v < 0.03) continue;
    addTo(f, p.led, hsv(p.hue, 1, v * 0.8));
  }
  return f;
};

/** Random per-press colour from a fixed arcade palette rather than a hue wheel. */
export const confettiKey: ReactiveFn = (t, presses) => {
  const PAL: RGB[] = [
    [255, 60, 60], [255, 180, 0], [80, 255, 90],
    [0, 190, 255], [190, 80, 255], [255, 255, 255],
  ];
  const f: Frame = new Map();
  for (const p of presses) {
    const v = envelope(p, t, 0.8);
    if (v < 0.03) continue;
    maxTo(f, p.led, dim(PAL[Math.floor(hashSeq(p.seq) * PAL.length) % PAL.length], v));
  }
  return f;
};

/** Idle keys breathe faintly; pressing one snaps it to full. */
export const breathBase: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.4));
  for (const led of ALL_LEDS) f.set(led, hsv(0.6, 0.8, idle));
  for (const p of presses) {
    const v = envelope(p, t, 1.0);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(0.6 - v * 0.25, 0.8, Math.max(idle, v)));
  }
  return f;
};
