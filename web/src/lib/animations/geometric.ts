/**
 * Geometric patterns — polar and grid constructions.
 *
 * The board is roughly 19u wide by 6u tall, so a mathematically round circle
 * is a small dot in the middle. Radial effects here scale the row axis by
 * 2-3x, which turns those circles into wide ellipses that actually fill it.
 */

import {
  BOARD_H, BOARD_W, BOARD_R, CX, CY, LED_GEO,
  PALETTES, type AnimationFn, type RGB,
  add, clamp01, frac, hsv, maxBlend, sampleP, worley,
} from './core';

const TAU = Math.PI * 2;
/** Row-stretched polar coordinates about the board centre. */
function polar(ux: number, uy: number, squash = 2.6) {
  const dx = ux - CX, dy = (uy - CY) * squash;
  return { d: Math.hypot(dx, dy), a: Math.atan2(dy, dx) };
}

export const spiral: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const ARMS = 3;
  for (const [led, p] of LED_GEO) {
    const { d, a } = polar(p.ux, p.uy);
    const v = 0.5 + 0.5 * Math.sin(a * ARMS + d * 0.85 - t * 3);
    f.set(led, hsv(0.6 + d * 0.02 + t * 0.04, 0.9, v ** 1.8));
  }
  return f;
};

/** Two spirals wound opposite ways; the crossings beat against each other. */
export const doubleSpiral: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { d, a } = polar(p.ux, p.uy);
    const cw = 0.5 + 0.5 * Math.sin(a * 2 + d * 0.9 - t * 2.4);
    const ccw = 0.5 + 0.5 * Math.sin(-a * 2 + d * 0.9 - t * 1.9);
    f.set(led, [Math.round(255 * cw ** 2), Math.round(40 * cw * ccw), Math.round(255 * ccw ** 2)]);
  }
  return f;
};

/** A dot tracing a Lissajous curve, with a decaying trail behind it. */
export const lissajous: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const TRAIL = 26;
  for (let s = 0; s < TRAIL; s++) {
    const ts = t - s * 0.035;
    const x = CX + (CX - 1) * Math.sin(ts * 1.7);
    const y = CY + CY * Math.sin(ts * 2.3 + 1.1);
    const v0 = (1 - s / TRAIL) ** 2;
    for (const [led, p] of LED_GEO) {
      const v = v0 * Math.exp(-((p.ux - x) ** 2) / 0.55 - ((p.uy - y) ** 2) / 0.25);
      if (v < 0.04) continue;
      add(f, led, hsv(0.45 + t * 0.05, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Checkerboard whose two colours trade brightness. */
export const checkerPulse: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const beat = 0.5 + 0.5 * Math.sin(t * 3);
  for (const [led, p] of LED_GEO) {
    const cell = (Math.floor(p.ux / 2) + Math.floor(p.uy)) % 2 === 0;
    const v = cell ? beat : 1 - beat;
    f.set(led, hsv(cell ? 0.55 + t * 0.03 : 0.05 + t * 0.03, 0.9, 0.15 + 0.85 * v));
  }
  return f;
};

export const expandingRings: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { d } = polar(p.ux, p.uy);
    const v = clamp01(Math.sin(d * 1.1 - t * 4)) ** 3;
    if (v < 0.04) continue;
    f.set(led, sampleP(PALETTES.cyber, d * 0.05 + t * 0.08).map((c) => Math.round(c * v)) as RGB);
  }
  return f;
};

/** A bar grating rotating about the centre. */
export const rotatingBars: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const ang = t * 0.7;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (const [led, p] of LED_GEO) {
    const u = (p.ux - CX) * ca + (p.uy - CY) * 2.6 * sa;
    const v = 0.5 + 0.5 * Math.sin(u * 1.15 - t * 3);
    f.set(led, hsv(0.08 + t * 0.05, 0.95, v ** 2.2));
  }
  return f;
};

/** Cell interiors lit, borders left dark — reads as a honeycomb. */
export const hexCells: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    // Skewing x by half a row turns square worley cells into a hex-ish lattice.
    const { f1, f2, id } = worley(p.ux * 0.36 + p.uy * 0.18, p.uy * 0.72, t * 0.15);
    const border = clamp01(1 - (f2 - f1) * 2.2);
    const v = clamp01(1 - f1 * 1.1) * (1 - border * 0.85);
    if (v < 0.04) continue;
    f.set(led, hsv(0.12 + id * 0.08 + t * 0.03, 0.9, v));
  }
  return f;
};

/** Flat-shaded voronoi: each cell holds one hue, keyed off its own id. */
export const voronoiCells: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { f1, f2, id } = worley(p.ux * 0.3, p.uy * 0.66, t * 0.3);
    const border = clamp01(1 - (f2 - f1) * 3.0) ** 2;
    f.set(led, hsv(id + t * 0.04, 0.85, clamp01(0.75 - f1 * 0.3 + border * 0.6)));
  }
  return f;
};

/** Repeating diagonal bands sliding across the board. */
export const diagonalWipe: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const u = p.ux * 0.45 + p.uy * 0.9 - t * 3.2;
    const band = frac(u / 5);
    const v = clamp01(1 - Math.abs(band - 0.5) * 2.4) ** 1.5;
    if (v < 0.04) continue;
    f.set(led, sampleP(PALETTES.vapor, Math.floor(u / 5) * 0.17).map((c) => Math.round(c * v)) as RGB);
  }
  return f;
};

/** A plus-shaped reticle drifting on a Lissajous path. */
export const crosshair: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const x = CX + (CX - 2) * Math.sin(t * 0.63);
  const y = CY + CY * Math.sin(t * 0.91 + 0.7);
  for (const [led, p] of LED_GEO) {
    const vx = Math.exp(-((p.ux - x) ** 2) / 0.5);
    const vy = Math.exp(-((p.uy - y) ** 2) / 0.18);
    const v = clamp01(Math.max(vx, vy) * (0.35 + 0.65 * Math.max(vx, vy)));
    if (v < 0.05) continue;
    f.set(led, hsv(0.33, 0.9, v));
  }
  return f;
};

/** Angular sectors spinning — the classic pinwheel. */
export const pinwheel: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const BLADES = 6;
  for (const [led, p] of LED_GEO) {
    const { d, a } = polar(p.ux, p.uy);
    const sector = frac((a / TAU) * BLADES + t * 0.6);
    const v = clamp01(1 - Math.abs(sector - 0.5) * 2) ** 1.4 * clamp01(1 - d / (BOARD_R * 3.2));
    if (v < 0.04) continue;
    f.set(led, hsv(Math.floor((a / TAU) * BLADES + t * 0.6) / BLADES + t * 0.05, 0.9, v));
  }
  return f;
};

/** Plasma folded into a mirrored wedge, so both halves always agree. */
export const kaleidoscope: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const SEGMENTS = 6;
  for (const [led, p] of LED_GEO) {
    const { d, a } = polar(p.ux, p.uy);
    // Fold the angle into one wedge and mirror it: classic kaleidoscope trick.
    const wedge = Math.abs(frac((a + Math.PI) / TAU * SEGMENTS) - 0.5) * 2;
    const v = 0.5 + 0.5 * Math.sin(wedge * 7 + d * 0.7 - t * 2.2);
    f.set(led, hsv(wedge * 0.5 + d * 0.03 + t * 0.06, 0.9, v ** 1.5));
  }
  return f;
};

/** Radial spokes that pulse outward from the centre in bursts. */
export const starburst: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const SPOKES = 12;
  const burst = frac(t * 0.7);
  for (const [led, p] of LED_GEO) {
    const { d, a } = polar(p.ux, p.uy);
    const spoke = clamp01(Math.cos(a * SPOKES) * 1.6);
    const front = clamp01(1 - Math.abs(d - burst * BOARD_R * 3.4) / 3.5);
    const v = spoke * front * (1 - burst * 0.55);
    if (v < 0.04) continue;
    f.set(led, hsv(0.14 - burst * 0.12, 0.85, v));
  }
  return f;
};

/** Nested rectangles scaling outward — a Chebyshev-distance zoom. */
export const boxZoom: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    // Chebyshev distance gives square contours where hypot would give circles.
    const d = Math.max(Math.abs(p.ux - CX) * 0.55, Math.abs(p.uy - CY) * 1.7);
    const v = clamp01(Math.sin(d * 2.4 - t * 3.4)) ** 3;
    if (v < 0.04) continue;
    f.set(led, hsv(0.72 + d * 0.04 + t * 0.03, 0.85, v));
  }
  return f;
};

/** Two counter-phase strands with rungs where they cross. */
export const dnaHelix: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const phase = p.ux * 0.55 - t * 2.4;
    const yA = CY + (CY - 0.2) * Math.sin(phase);
    const yB = CY - (CY - 0.2) * Math.sin(phase);
    const a = Math.exp(-((p.uy - yA) ** 2) / 0.3);
    const b = Math.exp(-((p.uy - yB) ** 2) / 0.3);
    // Rungs appear only where the strands are near their crossing point.
    const rung = Math.exp(-(Math.sin(phase) ** 2) * 8) * clamp01(1 - Math.abs(p.uy - CY) / (CY + 0.5)) * 0.55;
    if (a > 0.05) add(f, led, hsv(0.55, 0.9, Math.min(1, a)));
    if (b > 0.05) add(f, led, hsv(0.02, 0.9, Math.min(1, b)));
    if (rung > 0.04) add(f, led, hsv(0.15, 0.4, Math.min(1, rung)));
  }
  return f;
};

/** Radial and angular harmonics multiplied — a slowly turning mandala. */
export const mandala: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { d, a } = polar(p.ux, p.uy);
    const radial = 0.5 + 0.5 * Math.cos(d * 1.3 - t * 1.2);
    const angular = 0.5 + 0.5 * Math.cos(a * 8 + t * 0.5);
    const v = (radial * angular) ** 1.3;
    if (v < 0.04) continue;
    f.set(led, sampleP(PALETTES.candy, a / TAU + d * 0.03 + t * 0.03).map((c) => Math.round(c * v)) as RGB);
  }
  return f;
};

/** A row scan and a column scan crossing; the intersection flares. */
export const gridScan: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  // Triangle, not frac: a sawtooth would teleport the scan line from one edge
  // to the other on every wrap. Bouncing keeps it continuous.
  const tri = (x: number) => Math.abs(frac(x) * 2 - 1);
  const sx = tri(t * 0.16) * BOARD_W;
  const sy = tri(t * 0.105) * BOARD_H;
  for (const [led, p] of LED_GEO) {
    const vx = Math.exp(-((p.ux - sx) ** 2) / 1.4);
    const vy = Math.exp(-((p.uy - sy) ** 2) / 0.35);
    const v = clamp01(vx * 0.75 + vy * 0.75 + vx * vy * 1.6);
    if (v < 0.04) continue;
    maxBlend(f, led, hsv(0.45 - vx * vy * 0.3, 0.85, v));
  }
  return f;
};
