/**
 * Hold effects built on charge-and-discharge, plus the oscillators whose rate
 * or depth is driven by how long you have been holding.
 *
 * The discharge ones all read the charge at the moment of release, so a short
 * hold gives a small pop and a long one gives the full event — the wind-up is
 * the tell.
 */

import {
  ALL_LEDS, LED_GEO, NEIGHBOURS, type Frame, type ReactiveFn,
  addTo, charge, clamp01, hash2Seq, heldFor, hsv, isHeld, maxTo, sinceUp,
} from './core';

const ROW = 2.4;

/** Bolts arc out to nearby keys once the charge is high enough. */
export const chargeLightning: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.5);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 6);
    if (live < 0.04) continue;
    maxTo(f, p.led, hsv(0.6, 1 - c * 0.9, live * (0.3 + c * 0.7)));
    if (c < 0.35) continue;
    // Bolt endpoints re-roll a few times a second, so the arcs flicker.
    const tick = Math.floor(t * 9);
    const arcs = 1 + Math.floor(c * 3);
    for (let k = 0; k < arcs; k++) {
      const ang = hash2Seq(p.seq + tick, k) * Math.PI * 2;
      const len = 2 + hash2Seq(p.seq + tick, k + 30) * c * 9;
      for (let s = 0; s <= 10; s++) {
        const u = s / 10;
        const jitter = (hash2Seq(p.seq + tick + s, k) - 0.5) * 1.4 * u;
        const x = p.ux + Math.cos(ang) * len * u + jitter;
        const y = p.uy + (Math.sin(ang) * len * u) / ROW + jitter * 0.3;
        for (const [led, g] of LED_GEO) {
          const v = live * c * Math.exp(-((g.ux - x) ** 2) / 0.35 - ((g.uy - y) ** 2) / 0.18);
          if (v < 0.07) continue;
          addTo(f, led, hsv(0.6, 0.35, Math.min(1, v)));
        }
      }
    }
  }
  return f;
};

/** Winds up quietly, then whites out the whole board on release. */
export const chargeNova: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.6);
    if (isHeld(p, t)) {
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        const v = c * Math.exp(-(d * d) / (0.8 + c * 2));
        if (v < 0.04) continue;
        addTo(f, led, hsv(0.15, 1 - c * 0.6, Math.min(1, v)));
      }
      continue;
    }
    const a = sinceUp(p, t);
    const flash = c * Math.exp(-a * 4);
    if (flash < 0.03) continue;
    for (const led of ALL_LEDS) addTo(f, led, hsv(0.14, 0.25, Math.min(1, flash)));
  }
  return f;
};

/** Release sends the charge hopping outward across the key matrix. */
export const chargeChain: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const STEP = 0.05;
  for (const p of presses) {
    const c = charge(p, t, 1.4);
    if (isHeld(p, t)) {
      maxTo(f, p.led, hsv(0.45, 0.9, 0.25 + c * 0.75));
      continue;
    }
    const a = sinceUp(p, t);
    const reach = Math.floor(a / STEP);
    const depth = Math.floor(2 + c * 12);
    if (reach > depth + 4) continue;
    let front = [p.led];
    const seen = new Set(front);
    for (let d = 0; d <= Math.min(reach, depth); d++) {
      if (d === reach) {
        const v = c * clamp01(1 - d / (depth + 1));
        if (v > 0.04) for (const led of front) maxTo(f, led, hsv(0.45, 0.85, Math.min(1, v)));
      }
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

/** Compresses inward while held, then kicks back out. */
export const chargeRecoil: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.5);
    if (isHeld(p, t)) {
      const r = 5 * (1 - c);   // ring closes in as it charges
      for (const [led, g] of LED_GEO) {
        const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
        const v = (0.3 + c * 0.7) * Math.exp(-((d - r) ** 2) / 1.2);
        if (v < 0.04) continue;
        addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
      }
      continue;
    }
    const a = sinceUp(p, t);
    if (a > 0.9) continue;
    const r = a * (12 + c * 22);
    const env = c * (1 - a / 0.9);
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - r) ** 2) / 1.6) * env;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** Pulls the board's light inward, then lets it snap back. */
export const chargeImplode: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [4, 4, 10]);
  for (const p of presses) {
    const c = charge(p, t, 1.8);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3.5);
    if (live < 0.04) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      // A moving shell: everything outside it is dragged toward the key.
      const shell = 12 * (1 - c);
      const v = live * clamp01(1 - Math.abs(d - shell) / (2.5 - c * 1.6)) * (0.3 + c * 0.7);
      if (v < 0.04) continue;
      addTo(f, led, hsv(0.72, 0.85, Math.min(1, v)));
    }
    maxTo(f, p.led, hsv(0.72, 1 - c, live * c));
  }
  return f;
};

/** Strobes, and the rate climbs with the hold. */
export const holdStrobe: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.4);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 4);
    if (live < 0.04) continue;
    const rate = 2 + c * 22;
    const on = Math.sin(heldFor(p, t) * rate) > 0;
    if (!on) continue;
    maxTo(f, p.led, hsv(p.hue, 0.7, live));
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = live * c * Math.exp(-(d * d) / 3);
      if (v < 0.05) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** The lit point wobbles, and the wobble widens with the hold. */
export const holdWobble: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.0);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3);
    if (live < 0.04) continue;
    const amp = 0.3 + c * 3.2;
    const x = p.ux + Math.sin(t * 7) * amp;
    const y = p.uy + Math.cos(t * 5.3) * amp * 0.35;
    for (const [led, g] of LED_GEO) {
      const v = live * Math.exp(-((g.ux - x) ** 2) / 0.6 - ((g.uy - y) ** 2) / 0.3);
      if (v < 0.05) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Hue sweeps up and down like a siren, faster as it winds up. */
export const holdSiren: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.0);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3);
    if (live < 0.04) continue;
    const hue = 0.5 + 0.5 * Math.sin(heldFor(p, t) * (2 + c * 9));
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = live * Math.exp(-(d * d) / (1.2 + c * 5));
      if (v < 0.05) continue;
      addTo(f, led, hsv(hue, 0.95, Math.min(1, v)));
    }
  }
  return f;
};

/** Amplitude tremolo that gets deeper the longer you hold. */
export const holdTremolo: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.2);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3);
    if (live < 0.04) continue;
    const depth = c * 0.9;
    const trem = 1 - depth + depth * (0.5 + 0.5 * Math.sin(t * 11));
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      const v = live * trem * Math.exp(-(d * d) / (1 + c * 4));
      if (v < 0.05) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Hue vibrato around the press colour, widening with the hold. */
export const holdVibrato: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.2);
    const live = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3);
    if (live < 0.04) continue;
    const hue = p.hue + Math.sin(t * 13) * c * 0.22;
    maxTo(f, p.led, hsv(hue, 0.9, live));
    for (const n of NEIGHBOURS.get(p.led) ?? []) {
      maxTo(f, n, hsv(hue, 0.9, live * (0.2 + c * 0.5)));
    }
  }
  return f;
};
