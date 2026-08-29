/**
 * Whole-board reactions — the press changes the state of everything, not just
 * the key. These are the ones that read well from across a desk.
 */

import {
  ALL_LEDS, BOARD_W, LED_GEO, type Frame, type ReactiveFn,
  addTo, age, clamp01, hsv, latest, maxTo,
} from './core';

const ROW = 2.4;

/** Recently-used keys glow; the map cools if you stop typing. */
export const heatmap: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const heat = new Map<number, number>();
  for (const p of presses) {
    const a = age(p, t);
    // Neighbours warm too, so the map reads as regions rather than dots.
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > 3) continue;
      const c = Math.exp(-d * 0.9) * Math.exp(-a / 3.5);
      heat.set(led, (heat.get(led) ?? 0) + c);
    }
  }
  for (const led of ALL_LEDS) {
    const h = clamp01((heat.get(led) ?? 0) * 0.55);
    const v = 0.04 + h * 0.96;
    f.set(led, hsv(0.62 - h * 0.62, 0.9, v));
  }
  return f;
};

/** Every press flashes the whole board. Loud, and surprisingly readable. */
export const globalFlash: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  let v = 0, hue = 0;
  for (const p of presses) {
    const k = Math.exp(-age(p, t) * 6);
    if (k > v) { v = k; hue = p.hue; }
  }
  const c = hsv(hue, 0.8, clamp01(0.05 + v));
  for (const led of ALL_LEDS) f.set(led, c);
  return f;
};

/** The board's hue advances a step with every keystroke. */
export const hueStep: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const n = presses.length;
  const last = latest(presses);
  const boost = last ? Math.exp(-age(last, t) * 5) : 0;
  const c = hsv(n * 0.07 + t * 0.01, 0.85, 0.35 + boost * 0.65);
  for (const led of ALL_LEDS) f.set(led, c);
  return f;
};

/** A board-wide shockwave, so the ring keeps going past the edges. */
export const shockwave: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 22, LIFE = 1.1;
  for (const led of ALL_LEDS) f.set(led, [2, 2, 6]);
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = (1 - a / LIFE) ** 1.4;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - a * SPEED) ** 2) / 5) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.75, Math.min(1, v)));
    }
  }
  return f;
};

/** Whole board takes the colour of the last key you hit. */
export const colourPick: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const last = latest(presses);
  const hue = last ? last.hue : 0.6;
  const v = last ? clamp01(0.35 + Math.exp(-age(last, t) * 3) * 0.65) : 0.2;
  for (const led of ALL_LEDS) f.set(led, hsv(hue, 0.85, v));
  return f;
};

/** Colour bleeds outward from each press and lingers, like ink in water. */
export const ink: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [3, 3, 8]);
  for (const p of presses) {
    const a = age(p, t);
    const r = Math.sqrt(a) * 7;          // spreads fast then slows
    const env = clamp01(1 - a / 5) ** 1.5;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > r) continue;
      const v = env * (1 - d / (r + 0.01)) ** 0.6;
      if (v < 0.03) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v * 0.8)));
    }
  }
  return f;
};

/** The board is lit and slowly goes dark; typing keeps it alive. */
export const keepAlive: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const last = latest(presses);
  const idle = last ? t - last.t : 99;
  // Global level decays over ~4s of not typing.
  const level = clamp01(1 - idle / 4);
  for (const [led, g] of LED_GEO) {
    f.set(led, hsv(0.33 * level + 0.02, 0.9, 0.03 + level * 0.55 * (0.75 + 0.25 * Math.sin(g.ux * 0.4 - t * 2))));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 4);
    if (v > 0.04) maxTo(f, p.led, hsv(0.33 * level + 0.02, 0.4, Math.min(1, v)));
  }
  return f;
};

/** Brightness and hue track how fast you are typing. */
export const tempo: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  // Presses in the last two seconds, as a rough keys-per-second.
  const recent = presses.filter((p) => t - p.t < 2).length / 2;
  const speed = clamp01(recent / 8);
  for (const [led, g] of LED_GEO) {
    const wave = 0.5 + 0.5 * Math.sin(g.ux * 0.35 - t * (1 + speed * 6));
    f.set(led, hsv(0.55 - speed * 0.55, 0.9, 0.06 + (0.15 + speed * 0.7) * wave));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 7);
    if (v > 0.05) maxTo(f, p.led, hsv(0.55 - speed * 0.55, 0.3, Math.min(1, v)));
  }
  return f;
};

/** A background gradient that bends toward wherever you last pressed. */
export const gravityWell: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const last = latest(presses);
  const cx = last ? last.ux : BOARD_W / 2;
  const cy = last ? last.uy : 2.5;
  const pull = last ? Math.exp(-age(last, t) * 1.2) : 0;
  for (const [led, g] of LED_GEO) {
    const d = Math.hypot(g.ux - cx, (g.uy - cy) * ROW);
    const bend = pull * Math.exp(-d / 6);
    f.set(led, hsv(0.6 + bend * 0.35 + t * 0.02, 0.85, 0.1 + bend * 0.85));
  }
  return f;
};

/** Keys darken as you use them and slowly recover — an inverse heat map. */
export const wearOut: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const worn = new Map<number, number>();
  for (const p of presses) {
    const w = Math.exp(-age(p, t) / 2.5);
    worn.set(p.led, (worn.get(p.led) ?? 0) + w);
  }
  for (const led of ALL_LEDS) {
    const w = clamp01(worn.get(led) ?? 0);
    f.set(led, hsv(0.08 + t * 0.01, 0.7, 0.75 * (1 - w)));
  }
  return f;
};
