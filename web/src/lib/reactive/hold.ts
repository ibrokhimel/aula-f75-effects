/**
 * Hold effects — driven by how long a key stays down, not by the instant it
 * went down.
 *
 * Every one of these keeps building while `isHeld` is true and does something
 * with the accumulated charge on release. A tap therefore reads as a small
 * version of a long hold rather than as a separate event, which is what makes
 * the family feel continuous under the fingers.
 */

import {
  ALL_LEDS, LED_GEO, type Frame, type ReactiveFn,
  addTo, charge, clamp01, envelope, heldFor, hsv, isHeld, maxTo, sinceUp,
} from './core';

const ROW = 2.4;

/** Steady while down, long tail after. The plain one. */
export const sustain: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const v = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 1.4);
    if (v < 0.03) continue;
    maxTo(f, p.led, hsv(p.hue, 0.85, v));
  }
  return f;
};

/** A ring that grows outward for as long as you hold, then snaps away. */
export const growRing: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const r = heldFor(p, t) * 6;
    const out = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 4);
    if (out < 0.04 || r > 22) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - r) ** 2) / 1.6) * out;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Charges while held; releasing fires a ripple as strong as the charge. */
export const chargeBurst: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.4);
    if (isHeld(p, t)) {
      // Tighten and brighten as it winds up, so the release is telegraphed.
      const halo = 0.5 + c * 1.8;
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        const v = c * Math.exp(-(d * d) / halo);
        if (v < 0.04) continue;
        addTo(f, led, hsv(0.08 + c * 0.1, 1 - c * 0.5, Math.min(1, v)));
      }
      continue;
    }
    const a = sinceUp(p, t);
    if (a > 1.0) continue;
    const r = a * (10 + c * 26);
    const env = (1 - a) * c;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - r) ** 2) / (1.4 + c * 3)) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(0.08 + c * 0.1, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Throbs faster the longer you hold it. */
export const holdPulse: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.5);
    const env = envelope(p, t, 0.6);
    if (env < 0.03) continue;
    const rate = 3 + c * 14;
    const v = env * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(heldFor(p, t) * rate)));
    maxTo(f, p.led, hsv(p.hue, 0.85, v));
  }
  return f;
};

/** The key heats through red, orange, then white the longer it is down. */
export const heatBuild: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.2);
    const env = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 2);
    if (env < 0.03 || c < 0.02) continue;
    // Saturation falls away as it heats, so it whites out at full charge.
    maxTo(f, p.led, hsv(0.02 + c * 0.12, 1 - c * 0.9, env * (0.3 + c * 0.7)));
    if (c > 0.4) {
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        const v = env * (c - 0.4) * Math.exp(-(d * d) / 2.2);
        if (v < 0.04) continue;
        addTo(f, led, hsv(0.04, 0.9, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** A bar across the board that fills for as long as you keep holding. */
export const meter: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = presses.filter((p) => isHeld(p, t));
  const level = held.length
    ? Math.max(...held.map((p) => charge(p, t, 2.0)))
    : 0;
  for (const [led, g] of LED_GEO) {
    const lit = g.ux / 16 <= level;
    f.set(led, lit ? hsv(0.33 - level * 0.33, 0.9, 0.2 + level * 0.7) : [3, 3, 7]);
  }
  for (const p of held) maxTo(f, p.led, [255, 255, 255]);
  return f;
};

/** A mote orbiting the key, speeding up as the hold lengthens. */
export const spin: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.0);
    const env = envelope(p, t, 0.8);
    if (env < 0.03) continue;
    const ang = heldFor(p, t) * (4 + c * 18);
    const rad = 1.4 + c * 1.6;
    const x = p.ux + Math.cos(ang) * rad;
    const y = p.uy + Math.sin(ang) * rad * 0.42;
    for (const [led, g] of LED_GEO) {
      const v = env * Math.exp(-((g.ux - x) ** 2) / 0.5 - ((g.uy - y) ** 2) / 0.25);
      if (v < 0.05) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
    addTo(f, p.led, hsv(p.hue, 0.4, env * 0.4));
  }
  return f;
};

/** A flame that climbs the board above the key while you hold it. */
export const flame: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.8);
    const env = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3);
    if (env < 0.03) continue;
    const reach = 0.6 + c * 4.5;
    for (const [led, g] of LED_GEO) {
      const up = p.uy - g.uy;
      if (up < -0.6 || up > reach) continue;
      const flick = 0.6 + 0.4 * Math.sin(t * 9 + g.ux * 3 + up * 2);
      const taper = 1 - up / (reach + 0.4);
      const v = env * taper * flick * Math.exp(-((g.ux - p.ux) ** 2) / (0.5 + up * 0.35));
      if (v < 0.05) continue;
      // Hotter at the base: hue slides from white-yellow up into deep red.
      addTo(f, led, hsv(0.02 + taper * 0.09, clamp01(1.15 - taper), Math.min(1, v)));
    }
  }
  return f;
};

/** Emits a fresh ripple at a steady rate for as long as the key is down. */
export const emitter: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const PERIOD = 0.3, SPEED = 11, LIFE = 0.9;
  for (const p of presses) {
    const stop = p.release ?? t;
    // One ring per PERIOD of hold; rings outlive the hold by LIFE.
    for (let k = 0; k * PERIOD <= stop - p.t + 0.001; k++) {
      const born = p.t + k * PERIOD;
      const a = t - born;
      if (a < 0 || a > LIFE) continue;
      const env = 1 - a / LIFE;
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        const v = Math.exp(-((d - a * SPEED) ** 2) / 1.4) * env;
        if (v < 0.05) continue;
        addTo(f, led, hsv(p.hue + k * 0.04, 0.85, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** Builds toward a threshold; hold past it and the whole board goes off. */
export const overload: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [2, 2, 5]);
  for (const p of presses) {
    const held = heldFor(p, t);
    const c = clamp01(held / 1.6);
    if (held >= 1.6) {
      // Past the threshold the board flashes for a moment, then settles.
      const flash = Math.exp(-Math.max(0, t - (p.t + 1.6)) * 3);
      if (flash > 0.03) {
        for (const led of ALL_LEDS) addTo(f, led, hsv(0.08, 0.2, Math.min(1, flash)));
      }
      continue;
    }
    const env = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 5);
    // Warning flicker gets frantic as the threshold approaches.
    const warn = c > 0.6 ? 0.5 + 0.5 * Math.sin(t * (10 + c * 40)) : 1;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = env * c * warn * Math.exp(-(d * d) / (1 + c * 4));
      if (v < 0.04) continue;
      addTo(f, led, hsv(0.02 + c * 0.08, 1 - c * 0.4, Math.min(1, v)));
    }
  }
  return f;
};

/** Held keys stay lit; the pattern you build persists until you let go. */
export const anchor: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    if (isHeld(p, t)) {
      const c = charge(p, t, 1.2);
      maxTo(f, p.led, hsv(p.hue, 0.9 - c * 0.5, 0.5 + c * 0.5));
    } else {
      const v = Math.exp(-sinceUp(p, t) * 2.5);
      if (v > 0.04) maxTo(f, p.led, hsv(p.hue, 0.9, v * 0.6));
    }
  }
  return f;
};
