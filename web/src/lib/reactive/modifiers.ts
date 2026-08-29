/**
 * Modifier effects — Shift, Ctrl and Alt change what a press *does*.
 *
 * Every press carries the modifier bits that were down when it was struck,
 * so these read the same keystroke two ways. The family's defining
 * property: hit one key plain and then hit it with Shift down, and the
 * board answers differently both times.
 */

import {
  ALL_LEDS, LED_GEO, MOD_ALT, MOD_CTRL, MOD_SHIFT,
  type Frame, type Press, type ReactiveFn,
  ROW_SCALE, activeMods, addTo, age, blob, clamp01, classOf, hsv, isHeld,
  latest, maxTo, segment,
} from './core';

/** Number of modifiers on a press, 0..3. */
const modCount = (p: Press) =>
  (p.mods & MOD_SHIFT ? 1 : 0) + (p.mods & MOD_CTRL ? 1 : 0) + (p.mods & MOD_ALT ? 1 : 0);

/**
 * Hue offset per combination. Deliberately spread far apart so that Shift,
 * Ctrl and Alt are told apart at a glance rather than by shade.
 */
const modHue = (mods: number) =>
  (mods & MOD_SHIFT ? 0.12 : 0) + (mods & MOD_CTRL ? 0.34 : 0) + (mods & MOD_ALT ? 0.56 : 0);

/** The plain press is blue; each modifier walks the hue somewhere else. */
export const modTint: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 2.2);
    if (v < 0.04) continue;
    maxTo(f, p.led, hsv(0.6 + modHue(p.mods), 0.9, Math.min(1, v)));
    if (p.mods) blob(f, p.ux, p.uy, 1.3, 0.6 + modHue(p.mods), v * 0.55);
  }
  return f;
};

/** Shift makes it bigger: the same key throws a far wider halo. */
export const shiftBloom: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    const big = (p.mods & MOD_SHIFT) !== 0;
    const env = Math.exp(-a * (big ? 1.5 : 3.5));
    if (env < 0.04) continue;
    blob(f, p.ux, p.uy, big ? 2.6 + a * 2.2 : 0.75, big ? 0.14 : 0.58, env,
      big ? 0.75 : 0.9);
    maxTo(f, p.led, hsv(big ? 0.14 : 0.58, big ? 0.3 : 0.9, Math.min(1, env)));
  }
  return f;
};

/** Hold Ctrl and the board stops moving — let go and it catches up. */
export const ctrlFreeze: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  // Freeze the clock at the moment Ctrl went down. The effect stays a pure
  // function of (t, presses); it just stops reading the real t.
  let frozenAt: number | null = null;
  for (const p of presses) {
    if (!isHeld(p, t) || !(p.mods & MOD_CTRL)) continue;
    frozenAt = frozenAt === null ? p.t : Math.min(frozenAt, p.t);
  }
  const tt = frozenAt ?? t;
  for (const p of presses) {
    if (p.t > tt) continue;
    const v = Math.exp(-Math.max(0, tt - p.t) * 1.6);
    if (v < 0.04) continue;
    blob(f, p.ux, p.uy, 1.1, p.hue, v * 0.8);
    maxTo(f, p.led, hsv(p.hue, 0.85, Math.min(1, v)));
  }
  if (frozenAt !== null) {
    // A cold rim so the frozen state reads as deliberate, not as a stall.
    const shimmer = 0.5 + 0.5 * Math.sin(t * 3);
    for (const led of ALL_LEDS) addTo(f, led, hsv(0.55, 0.9, 0.05 + shimmer * 0.05));
  }
  return f;
};

/** Alt turns the board inside out: everything lights except the key. */
export const altInvert: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const inverted = (activeMods(presses, t) & MOD_ALT) !== 0;
  if (inverted) for (const led of ALL_LEDS) f.set(led, hsv(0.75, 0.7, 0.55));
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 3);
    if (v < 0.04) continue;
    if (p.mods & MOD_ALT) {
      // Carve a hole instead of adding light.
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
        const cut = v * Math.exp(-(d * d) / 1.6);
        if (cut < 0.05) continue;
        const c = f.get(led) ?? [0, 0, 0];
        const k = 1 - Math.min(1, cut);
        f.set(led, [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]);
      }
    } else {
      maxTo(f, p.led, hsv(0.75, 0.9, Math.min(1, v)));
    }
  }
  return f;
};

/** One ring per modifier held — the combination is countable at a glance. */
export const modStack: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const env = Math.exp(-age(p, t) * 2);
    if (env < 0.04) continue;
    maxTo(f, p.led, hsv(0.5, 0.9, Math.min(1, env)));
    const bits = [MOD_SHIFT, MOD_CTRL, MOD_ALT].filter((m) => p.mods & m);
    bits.forEach((m, i) => {
      const r = 1.6 + i * 1.5;
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
        const v = env * Math.exp(-((d - r) ** 2) / 0.9);
        if (v < 0.05) continue;
        addTo(f, led, hsv(0.5 + modHue(m), 0.9, Math.min(1, v)));
      }
    });
  }
  return f;
};

/** Shift is a shout: capitals blow out white, lower case stays quiet. */
export const shout: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const loud = (p.mods & MOD_SHIFT) !== 0;
    const env = Math.exp(-age(p, t) * (loud ? 1.8 : 4));
    if (env < 0.04) continue;
    maxTo(f, p.led, hsv(0.1, loud ? 0.05 : 0.85, Math.min(1, loud ? env : env * 0.45)));
    if (!loud) continue;
    // A shout carries: the whole board picks up a wash of it.
    for (const led of ALL_LEDS) addTo(f, led, hsv(0.1, 0.2, Math.min(1, env * 0.22)));
  }
  return f;
};

/** Draws the shortcut: a line from the modifier key to the key it modified. */
export const modLink: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = clamp01(1 - age(p, t) / 2);
    if (v < 0.05) continue;
    maxTo(f, p.led, hsv(0.3 + modHue(p.mods), 0.85, Math.min(1, v)));
    if (!p.mods || classOf(p) === 'mod') continue;
    // Anchor on the modifier keys actually down at the time of the press.
    for (const m of presses) {
      if (m.seq >= p.seq || classOf(m) !== 'mod') continue;
      if (!isHeld(m, p.t)) continue;
      segment(f, m.ux, m.uy, p.ux, p.uy, 0.3 + modHue(p.mods), v * 0.7, 0.5);
      maxTo(f, m.led, hsv(0.3 + modHue(p.mods), 0.4, Math.min(1, v)));
    }
  }
  return f;
};

/** Each modifier multiplies the blast — three at once is very loud. */
export const amplify: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const n = modCount(p);
    const a = age(p, t);
    const life = 0.9 + n * 0.5;
    if (a > life) continue;
    const env = (1 - a / life) * (0.35 + n * 0.22);
    const r = a * (7 + n * 9);
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW_SCALE);
      const v = env * Math.exp(-((d - r) ** 2) / (1.4 + n * 1.6));
      if (v < 0.05) continue;
      addTo(f, led, hsv(0.02 + n * 0.09, 0.9 - n * 0.15, Math.min(1, v)));
    }
    maxTo(f, p.led, hsv(0.02 + n * 0.09, 0.5, Math.min(1, env)));
  }
  const last = latest(presses);
  if (last) {
    const v = Math.exp(-age(last, t) * 6);
    if (v > 0.05) maxTo(f, last.led, hsv(0.05, 0.3, Math.min(1, v)));
  }
  return f;
};
