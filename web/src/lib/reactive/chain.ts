/**
 * Chain effects — these read the *order* of your keystrokes, not just where
 * they landed, so they only make sense while you are actually typing.
 */

import {
  LED_GEO, type Frame, type Press, type ReactiveFn,
  addTo, age, clamp01, hsv, maxTo,
} from './core';

const ROW = 2.4;

/** Presses in order, newest first. */
function ordered(presses: readonly Press[]): Press[] {
  return [...presses].sort((a, b) => b.seq - a.seq);
}

/** Draws a line between each consecutive pair of keypresses. */
export const link: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = ordered(presses);
  for (let i = 0; i + 1 < seq.length && i < 8; i++) {
    const a = seq[i], b = seq[i + 1];
    const fade = clamp01(1 - age(a, t) / 2.5) * (1 - i / 8);
    if (fade < 0.04) continue;
    for (const [led, g] of LED_GEO) {
      // Distance from the key to the segment a-b, in scaled board units.
      const vx = b.ux - a.ux, vy = (b.uy - a.uy) * ROW;
      const wx = g.ux - a.ux, wy = (g.uy - a.uy) * ROW;
      const len2 = vx * vx + vy * vy;
      const u = len2 > 0 ? clamp01((wx * vx + wy * vy) / len2) : 0;
      const d = Math.hypot(wx - vx * u, wy - vy * u);
      const v = fade * Math.exp(-(d * d) / 0.7);
      if (v < 0.04) continue;
      addTo(f, led, hsv(a.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** Recent presses stay lit like stars, dimming with age. */
export const constellation: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = clamp01(1 - age(p, t) / 4) ** 0.7;
    if (v < 0.04) continue;
    const tw = 0.75 + 0.25 * Math.sin(t * 4 + p.seq);
    maxTo(f, p.led, hsv(0.62, 0.4, Math.min(1, v * tw)));
  }
  return f;
};

/** A comet that walks the keys in the order you hit them. */
export const trail: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = ordered(presses).slice(0, 12);
  seq.forEach((p, i) => {
    // Fades both with position in the trail and with wall-clock age, so a
    // pause dims the whole tail rather than freezing it.
    const v = clamp01(1 - i / 12) ** 1.6 * clamp01(1 - age(p, t) / 3);
    if (v < 0.04) return;
    maxTo(f, p.led, hsv(0.45 + v * 0.25, 0.85, Math.min(1, v)));
  });
  return f;
};

/** Every press replays as a fading echo a beat later. */
export const echo: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    for (let k = 0; k < 4; k++) {
      const ea = a - k * 0.28;
      if (ea < 0 || ea > 0.35) continue;
      const v = (1 - ea / 0.35) * (1 - k * 0.22);
      if (v < 0.04) continue;
      addTo(f, p.led, hsv(p.hue + k * 0.06, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** The board reads as a run of typing: a bar grows while you keep going. */
export const combo: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  // A run is unbroken while gaps stay under 0.9s.
  const seq = ordered(presses);
  let run = 0, last = t;
  for (const p of seq) {
    if (last - p.t > 0.9) break;
    run++; last = p.t;
  }
  const level = clamp01(run / 14);
  for (const [led, g] of LED_GEO) {
    const lit = g.ux / 16 <= level;
    f.set(led, lit
      ? hsv(0.33 - level * 0.33, 0.9, 0.25 + level * 0.6)
      : [3, 3, 6]);
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 6);
    if (v > 0.05) maxTo(f, p.led, hsv(0.33 - level * 0.33, 0.2, Math.min(1, v)));
  }
  return f;
};

/** Each press hands its colour to the next one, so a phrase fades as a ramp. */
export const relay: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = ordered(presses);
  seq.forEach((p, i) => {
    const v = clamp01(1 - age(p, t) / 2.2);
    if (v < 0.04) return;
    // Hue comes from position in the run, not from the key, so consecutive
    // presses form a gradient rather than a scatter of unrelated colours.
    maxTo(f, p.led, hsv(0.0 + i * 0.045, 0.9, Math.min(1, v)));
  });
  return f;
};
