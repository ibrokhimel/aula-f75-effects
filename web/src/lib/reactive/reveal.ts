/**
 * Reveal effects — an animation runs underneath and presses act as a mask.
 *
 * These reuse the animation library directly rather than reimplementing the
 * patterns, so a fix to plasma or fire lands here too.
 */

import { ANIMATIONS, type AnimationFn } from '../animations';
import {
  ALL_LEDS, LED_GEO, type Frame, type ReactiveFn, type RGB,
  age, clamp01, dim, envelope, hsv, latest, maxTo,
} from './core';

const ROW = 2.4;

/** Only keys you have touched show the animation underneath. */
function revealer(anim: AnimationFn, radius: number, life: number): ReactiveFn {
  return (t, presses) => {
    const under = anim(t);
    const f: Frame = new Map();
    for (const p of presses) {
      const env = envelope(p, t, life);
      if (env < 0.03) continue;
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        if (d > radius) continue;
        const k = env * clamp01(1 - d / radius) ** 0.8;
        const c = under.get(led);
        if (!c || k < 0.03) continue;
        maxTo(f, led, dim(c, k));
      }
    }
    return f;
  };
}

export const revealPlasma = revealer(ANIMATIONS.plasma.fn, 4.5, 1.6);
export const revealFire = revealer(ANIMATIONS.fire.fn, 4.0, 1.4);
export const revealRainbow = revealer(ANIMATIONS.rainbow.fn, 5.0, 1.8);
export const revealAurora = revealer(ANIMATIONS.aurora.fn, 5.5, 2.2);
export const revealMatrix = revealer(ANIMATIONS.matrixrain.fn, 4.0, 1.5);

/** Inverse mask: the animation plays everywhere except where you type. */
export const eraser: ReactiveFn = (t, presses) => {
  const under = ANIMATIONS.plasma.fn(t);
  const f: Frame = new Map();
  for (const led of ALL_LEDS) {
    const c = under.get(led);
    if (c) f.set(led, c);
  }
  for (const p of presses) {
    const env = envelope(p, t, 1.2);
    if (env < 0.03) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > 3) continue;
      const cut = env * clamp01(1 - d / 3);
      const c = f.get(led);
      if (c) f.set(led, dim(c, 1 - cut));
    }
  }
  return f;
};

/** A pool of light that follows the last key you hit. */
export const spotlight: ReactiveFn = (t, presses) => {
  const under = ANIMATIONS.rainbow.fn(t);
  const f: Frame = new Map();
  const last = latest(presses);
  if (!last) return f;
  // Ease toward the newest press instead of snapping, so it glides.
  const settle = clamp01(age(last, t) * 4);
  const prev = presses.length > 1
    ? presses.reduce((a, b) => (b.seq > a.seq || a === last ? (b !== last ? b : a) : a))
    : last;
  const cx = prev.ux + (last.ux - prev.ux) * settle;
  const cy = prev.uy + (last.uy - prev.uy) * settle;
  for (const [led, g] of LED_GEO) {
    const d = Math.hypot(g.ux - cx, (g.uy - cy) * ROW);
    const k = clamp01(1 - d / 5) ** 1.4;
    const c = under.get(led);
    if (c && k > 0.03) f.set(led, dim(c, k));
  }
  return f;
};

/** The board is dark and each press burns a lasting hole of colour. */
export const burnIn: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [4, 2, 8]);
  for (const p of presses) {
    const a = age(p, t);
    const v = clamp01(1 - a / 5) ** 0.6;
    if (v < 0.03) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > 2.2) continue;
      const k = v * clamp01(1 - d / 2.2);
      // Cools from white through amber as it ages, like a real burn.
      maxTo(f, led, hsv(0.08, clamp01(a / 2), Math.min(1, k)) as RGB);
    }
  }
  return f;
};
