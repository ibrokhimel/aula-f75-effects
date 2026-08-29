/**
 * Natural phenomena — fire, water, weather, growth. Mostly noise fields shaped
 * by a vertical gradient, because gravity is what makes them read as real.
 */

import {
  BOARD_H, BOARD_W, CX, CY, LED_GEO,
  PALETTES, type AnimationFn, type RGB,
  add, clamp01, fbm, frac, hash1, hsv, maxBlend, noise3, rampP, sampleP, worley,
} from './core';

/** Height above the bottom row, 0..1 — the cooling axis for anything hot. */
const up = (uy: number) => (BOARD_H - 1 - uy) / Math.max(BOARD_H - 1, 1);

/** Scrolling noise minus a linear cooling ramp: the standard fire recipe. */
export const fireStorm: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const n = fbm(p.ux * 0.42, p.uy * 0.6 + t * 2.4, t * 0.4, 3);
    const heat = clamp01(n * 2.0 - up(p.uy) * 1.35);
    if (heat < 0.03) continue;
    f.set(led, rampP(PALETTES.fire, heat));
  }
  return f;
};

/** One low, wide, slow flame — warm enough to leave running. */
export const campfire: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const centre = Math.exp(-((p.ux - CX) ** 2) / 34);
    const n = fbm(p.ux * 0.28, p.uy * 0.45 + t * 1.1, t * 0.22, 3);
    const heat = clamp01((0.35 + n * 0.85) * centre * 1.5 - up(p.uy) * 0.85);
    if (heat < 0.03) continue;
    f.set(led, rampP(PALETTES.ember, heat));
  }
  return f;
};

/** Slow buoyant blobs — the vertical squeeze is what sells the wax. */
export const lavaLamp: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const blobs: Array<[number, number, number]> = [
    [CX + 5 * Math.sin(t * 0.17), CY + 2.2 * Math.sin(t * 0.21 + 1), 4.6],
    [CX - 6 * Math.sin(t * 0.13 + 2), CY - 2.0 * Math.sin(t * 0.19), 3.9],
    [CX + 3 * Math.cos(t * 0.11 + 1.4), CY + 1.8 * Math.cos(t * 0.26), 3.2],
  ];
  for (const [led, p] of LED_GEO) {
    let fieldv = 0;
    for (const [bx, by, r] of blobs) fieldv += (r * r) / ((p.ux - bx) ** 2 + (p.uy - by) ** 2 * 3.4 + 1.0);
    const v = clamp01((fieldv - 0.7) * 0.85);
    f.set(led, rampP(PALETTES.lava, Math.min(1, 0.12 + v)));
  }
  return f;
};

/** Depth gradient with caustic seams drifting across the shallows. */
export const oceanDepth: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const depth = p.uy / Math.max(BOARD_H - 1, 1);
    const { f1, f2 } = worley(p.ux * 0.3, p.uy * 0.7, t * 0.7);
    const seam = clamp01(1 - (f2 - f1) * 1.7) ** 3 * (1 - depth);
    const base = rampP(PALETTES.ocean, 0.85 - depth * 0.7);
    f.set(led, [
      Math.min(255, base[0] + Math.round(seam * 120)),
      Math.min(255, base[1] + Math.round(seam * 180)),
      Math.min(255, base[2] + Math.round(seam * 160)),
    ]);
  }
  return f;
};

/** Dark cloud base, occasional forked flash that briefly blows out the board. */
export const thunderstorm: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const strike = Math.floor(t / 1.7);
  const sAge = t - strike * 1.7;
  // Two quick flashes per strike, second dimmer — reads as a real discharge.
  const flash = hash1(strike) > 0.45
    ? Math.exp(-sAge * 26) + 0.55 * Math.exp(-Math.abs(sAge - 0.12) * 34)
    : 0;
  const boltX = hash1(strike + 7) * BOARD_W;
  for (const [led, p] of LED_GEO) {
    const cloud = fbm(p.ux * 0.24, p.uy * 0.5, t * 0.3, 3);
    const base = 0.05 + 0.14 * cloud * (1 - up(p.uy) * 0.4);
    // The bolt itself: a jagged near-vertical channel offset by noise.
    const jag = boltX + (noise3(p.uy * 1.4, strike, 0) - 0.5) * 4;
    const bolt = flash * Math.exp(-((p.ux - jag) ** 2) / 1.2);
    const v = clamp01(base + flash * 0.35 + bolt);
    // `flash` peaks slightly above 1 where the two discharge pulses overlap,
    // so the warm channels have to be clamped rather than just rounded.
    f.set(led, [
      Math.min(255, Math.round(180 * v * (0.5 + flash))),
      Math.min(255, Math.round(195 * v * (0.55 + flash))),
      Math.round(255 * v),
    ]);
  }
  return f;
};

/** Flakes drifting down with a lateral sway; slow on purpose. */
export const snowfall: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const N = 24;
  for (let k = 0; k < N; k++) {
    const fall = 0.13 + hash1(k) * 0.1;
    const y = frac(hash1(k + 3) + t * fall) * (BOARD_H + 1) - 0.5;
    const x = hash1(k + 17) * BOARD_W + Math.sin(t * (0.5 + hash1(k) * 0.6) + k) * 1.1;
    const v0 = 0.4 + 0.6 * hash1(k + 29);
    for (const [led, p] of LED_GEO) {
      const v = v0 * Math.exp(-((p.ux - x) ** 2) / 0.4 - ((p.uy - y) ** 2) / 0.25);
      if (v < 0.04) continue;
      add(f, led, [Math.round(225 * v), Math.round(238 * v), Math.round(255 * v)]);
    }
  }
  return f;
};

/** Same idea, driven sideways and dense enough to wash out the board. */
export const blizzard: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const N = 44, SLOPE = 0.55;
  for (let k = 0; k < N; k++) {
    const span = BOARD_W + 8;
    const x = frac(hash1(k) + t * (0.5 + hash1(k + 5) * 0.35)) * span - 4;
    const y = frac(hash1(k + 11) + t * 0.4) * (BOARD_H + 1) - 0.5;
    for (const [led, p] of LED_GEO) {
      const along = x - p.ux;
      const across = (p.uy - y) - along * SLOPE;
      const v = 0.85 * Math.exp(-Math.abs(along) * 1.1 - (across * across) / 0.3);
      if (v < 0.05) continue;
      add(f, led, [Math.round(200 * v), Math.round(215 * v), Math.round(240 * v)]);
    }
  }
  return f;
};

/** Leaves tumbling — the wobble term is what stops them looking like rain. */
export const autumnLeaves: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const N = 14;
  for (let k = 0; k < N; k++) {
    const fall = 0.16 + hash1(k) * 0.12;
    const y = frac(hash1(k + 7) + t * fall) * (BOARD_H + 1) - 0.5;
    const x = hash1(k + 19) * BOARD_W + Math.sin(t * (1.1 + hash1(k) * 0.9) + k * 2) * 1.8;
    // Leaves flip edge-on as they tumble, so brightness dips periodically.
    const flip = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.4 + hash1(k + 2)) + k));
    for (const [led, p] of LED_GEO) {
      const v = flip * Math.exp(-((p.ux - x) ** 2) / 0.5 - ((p.uy - y) ** 2) / 0.3);
      if (v < 0.05) continue;
      add(f, led, sampleP(PALETTES.sunset, 0.55 + hash1(k + 41) * 0.3).map((c) => Math.round(c * Math.min(1, v))) as RGB);
    }
  }
  return f;
};

/** Petals opening outward from scattered centres, then closing again. */
export const springBloom: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const N = 5, CYCLE = 3.4;
  for (let k = 0; k < N; k++) {
    const phase = frac(t / CYCLE + hash1(k));
    const grow = Math.sin(phase * Math.PI); // open then close
    const bx = hash1(k + 5) * BOARD_W, by = hash1(k + 13) * (BOARD_H - 1);
    const petals = 5 + Math.floor(hash1(k + 21) * 3);
    const hue = 0.85 + hash1(k + 31) * 0.25;
    for (const [led, p] of LED_GEO) {
      const dx = p.ux - bx, dy = (p.uy - by) * 2.2;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const edge = 3.4 * grow * (0.65 + 0.35 * Math.cos(a * petals));
      const v = clamp01(1 - Math.abs(d - edge * 0.7) / 1.6) ** 2 * grow;
      if (v < 0.04) continue;
      add(f, led, hsv(hue, 0.7, Math.min(1, v)));
    }
  }
  return f;
};

/** Dappled light through leaves — worley cells, slowly breathing. */
export const forestCanopy: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { f1 } = worley(p.ux * 0.26, p.uy * 0.6, t * 0.25);
    const light = clamp01(1 - f1 * 1.15) ** 1.6;
    f.set(led, rampP(PALETTES.forest, 0.15 + light * 0.8));
  }
  return f;
};

/** Flat harsh light with a shimmer band that wobbles along the horizon. */
export const desertMirage: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const horizon = CY + 0.6 * Math.sin(p.ux * 0.4 + t * 1.8) + 0.3 * Math.sin(p.ux * 0.9 - t * 2.6);
    const band = Math.exp(-((p.uy - horizon) ** 2) / 1.1);
    const sky = clamp01(0.25 + up(p.uy) * 0.45);
    const v = clamp01(sky * 0.6 + band * 0.8);
    f.set(led, [Math.round(255 * v), Math.round((150 + 90 * band) * v), Math.round((40 + 60 * band) * v)]);
  }
  return f;
};

/** Cold, dim, and slow — cloud shadows crossing a pale wash. */
export const moonlight: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const cloud = fbm(p.ux * 0.16 - t * 0.09, p.uy * 0.34, t * 0.05, 3);
    const v = clamp01(0.55 - cloud * 0.45) * 0.75;
    f.set(led, [Math.round(150 * v), Math.round(178 * v), Math.round(230 * v)]);
  }
  return f;
};

/** Near-black, with soft blooms that swell and die where nothing was. */
export const bioluminescence: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const PERIOD = 0.7, LIFE = 2.6;
  const newest = Math.floor(t / PERIOD);
  for (let k = newest; k > newest - 5; k--) {
    const age = t - k * PERIOD;
    if (age < 0 || age > LIFE) continue;
    const env = Math.sin((age / LIFE) * Math.PI) ** 1.5;
    const bx = hash1(k) * BOARD_W, by = hash1(k + 9) * (BOARD_H - 1);
    const r = 1.2 + age * 1.1;
    const hue = 0.45 + hash1(k + 23) * 0.2;
    for (const [led, p] of LED_GEO) {
      const d = Math.hypot(p.ux - bx, (p.uy - by) * 2.2);
      const v = env * Math.exp(-(d * d) / (r * r * 1.8));
      if (v < 0.03) continue;
      add(f, led, hsv(hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Cell-shaded polyps, each on its own pulse phase and hue. */
export const coralReef: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { f1, id } = worley(p.ux * 0.28, p.uy * 0.62, t * 0.12);
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6 + id * 12.6));
    const v = clamp01(1 - f1 * 1.05) ** 1.4 * pulse;
    if (v < 0.04) continue;
    f.set(led, hsv(0.88 + id * 0.35, 0.8, v));
  }
  return f;
};

/** A glowing crater that periodically throws a plume up the board. */
export const volcano: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const ERUPT = 4.2;
  const e = Math.floor(t / ERUPT);
  // max(0, ...) matters: t - e*ERUPT can land a hair below zero from float
  // rounding, and a negative base to a fractional power is NaN, not a small
  // negative number. That NaN would poison the whole frame.
  const age = Math.max(0, t - e * ERUPT);
  const blast = age < 1.6 ? Math.sin((age / 1.6) * Math.PI) ** 1.2 : 0;
  for (const [led, p] of LED_GEO) {
    const glow = Math.exp(-((p.ux - CX) ** 2) / 26) * (1 - up(p.uy) * 0.75);
    const n = fbm(p.ux * 0.35, p.uy * 0.5 + t * 2.8, t * 0.5, 3);
    const plume = blast * Math.exp(-((p.ux - CX) ** 2) / (5 + age * 14)) * n * (0.4 + up(p.uy));
    const heat = clamp01(glow * 0.9 + plume * 1.6);
    if (heat < 0.03) continue;
    f.set(led, rampP(PALETTES.lava, heat));
  }
  return f;
};

/** Crystal facets: worley borders, sharpened, growing on a slow pulse. */
export const iceCrystals: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const grow = 0.55 + 0.45 * Math.sin(t * 0.5);
  for (const [led, p] of LED_GEO) {
    const { f1, f2 } = worley(p.ux * 0.32, p.uy * 0.7, t * 0.06);
    const edge = clamp01(1 - (f2 - f1) * (2.6 - grow)) ** 2.5;
    const body = clamp01(1 - f1 * 1.4) * 0.22;
    const v = clamp01(edge + body);
    if (v < 0.04) continue;
    f.set(led, rampP(PALETTES.ice, 0.25 + v * 0.75));
  }
  return f;
};

/**
 * A whole day on a 24-second loop: night, dawn, noon, dusk, night again.
 *
 * The arc is a half-sine rather than a ramp, so the sun is below the board at
 * both ends of the cycle and the loop point is invisible. The earlier version
 * ramped straight to full daylight and then cut back to night — a 117x
 * brightness jump on one frame.
 */
export const sunrise: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const CYCLE = 24;
  const phase = frac(t / CYCLE);
  const arc = Math.sin(phase * Math.PI); // 0 at both ends, 1 at noon
  const sunY = (BOARD_H + 1.5) - arc * (BOARD_H + 3);
  const sunX = CX + (phase - 0.5) * BOARD_W * 0.8; // east to west
  for (const [led, p] of LED_GEO) {
    const sky = clamp01(arc * 1.4 - up(p.uy) * 0.35);
    const base = rampP(PALETTES.sunset, sky);
    const d = Math.hypot(p.ux - sunX, (p.uy - sunY) * 1.9);
    const disc = clamp01(1 - d / 3.2) ** 1.6;
    f.set(led, [
      Math.min(255, Math.round(base[0] * 0.7 + disc * 255)),
      Math.min(255, Math.round(base[1] * 0.7 + disc * 200)),
      Math.min(255, Math.round(base[2] * 0.7 + disc * 90)),
    ]);
  }
  return f;
};

/** Wind combing a field of grass — a shear wave over a green base. */
export const meadowWind: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const gust = fbm(p.ux * 0.2 - t * 0.7, p.uy * 0.3, t * 0.3, 2);
    const blade = 0.5 + 0.5 * Math.sin(p.ux * 2.4 + gust * 6);
    const v = clamp01(0.25 + blade * 0.5 + gust * 0.4);
    maxBlend(f, led, rampP(PALETTES.forest, v));
  }
  return f;
};
