/**
 * Field and wave effects — every key samples one continuous function over the
 * board, so these read as a single surface rather than as moving objects.
 */

import {
  BOARD_H, BOARD_W, BOARD_R, CX, CY, LED_GEO,
  PALETTES, type AnimationFn, type RGB,
  clamp01, fbm, hsv, noise3, sampleP, worley,
} from './core';

/** Two wandering point sources; bright where their wavefronts agree. */
export const interference: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const ax = CX + (CX - 1) * Math.sin(t * 0.37), ay = CY + CY * Math.sin(t * 0.53);
  const bx = CX - (CX - 1) * Math.sin(t * 0.29 + 1), by = CY - CY * Math.sin(t * 0.61 + 2);
  for (const [led, p] of LED_GEO) {
    const d1 = Math.hypot(p.ux - ax, p.uy - ay);
    const d2 = Math.hypot(p.ux - bx, p.uy - by);
    const w = Math.cos(d1 * 1.35 - t * 4) + Math.cos(d2 * 1.35 - t * 4);
    f.set(led, hsv(0.52 + w * 0.07 + t * 0.02, 0.85, clamp01(Math.abs(w) / 2) ** 1.6));
  }
  return f;
};

/** Two line gratings counter-rotating — the beat pattern is the effect. */
export const moire: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const a1 = t * 0.21, a2 = -t * 0.28 + 0.6;
  for (const [led, p] of LED_GEO) {
    const u = p.ux * Math.cos(a1) + p.uy * Math.sin(a1);
    const v = p.ux * Math.cos(a2) + p.uy * Math.sin(a2);
    const g = (0.5 + 0.5 * Math.sin(u * 2.2)) * (0.5 + 0.5 * Math.sin(v * 2.45));
    f.set(led, hsv(0.75 + g * 0.3, 0.9, g ** 1.4));
  }
  return f;
};

/** Three charges summed into a scalar field, lit above the iso-surface. */
export const metaballs: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const balls: Array<[number, number, number]> = [
    [CX + 5.5 * Math.sin(t * 0.61), CY + 1.9 * Math.sin(t * 0.83), 4.2],
    [CX + 6.5 * Math.sin(t * 0.44 + 2.1), CY + 2.1 * Math.cos(t * 0.57), 3.6],
    [CX + 4.0 * Math.cos(t * 0.73 + 1.0), CY + 1.6 * Math.sin(t * 1.02 + 0.4), 3.0],
  ];
  for (const [led, p] of LED_GEO) {
    let fieldv = 0;
    for (const [bx, by, r] of balls) {
      const d2 = (p.ux - bx) ** 2 + (p.uy - by) ** 2 * 3.2; // rows count triple: keys are wide
      fieldv += (r * r) / (d2 + 0.9);
    }
    const v = clamp01((fieldv - 0.75) * 0.8);
    if (v < 0.04) continue;
    f.set(led, sampleP(PALETTES.cyber, fieldv * 0.12 + t * 0.05).map((c) => Math.round(c * v)) as RGB);
  }
  return f;
};

/** Noise-derived direction field; hue is the local flow angle. */
export const flowField: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const a = fbm(p.ux * 0.18, p.uy * 0.4, t * 0.25, 3) * Math.PI * 4;
    const v = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(a * 2 + t * 2));
    f.set(led, hsv(a / (Math.PI * 4) + t * 0.03, 0.85, v));
  }
  return f;
};

/** Domain-warped noise — the warp is what makes it curl rather than blob. */
export const curlSmoke: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const wx = fbm(p.ux * 0.15, p.uy * 0.35, t * 0.2, 2) * 4;
    const wy = fbm(p.ux * 0.15 + 5.2, p.uy * 0.35 + 1.3, t * 0.2, 2) * 4;
    const n = fbm(p.ux * 0.2 + wx, p.uy * 0.45 + wy, t * 0.15, 3);
    f.set(led, sampleP(PALETTES.vapor, n * 0.9 + t * 0.02).map((c) => Math.round(c * (0.25 + 0.75 * n))) as RGB);
  }
  return f;
};

/** Chladni nodal lines — bright where the plate would hold sand. */
export const chladni: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const n = 2 + 1.5 * (0.5 + 0.5 * Math.sin(t * 0.17));
  const m = 3 + 2.0 * (0.5 + 0.5 * Math.sin(t * 0.23 + 1.7));
  for (const [led, p] of LED_GEO) {
    const x = p.ux / BOARD_W, y = p.uy / Math.max(BOARD_H - 1, 1);
    const s = Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y)
            - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
    const v = clamp01(1 - Math.abs(s) * 3.2);
    if (v < 0.05) continue;
    f.set(led, hsv(0.13 + 0.05 * Math.sin(t * 0.3), 0.35, v));
  }
  return f;
};

/** Horizontal and vertical modes beating against each other. */
export const standingWave: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const h = Math.sin(p.ux * 0.62) * Math.cos(t * 2.4);
    const v = Math.sin(p.uy * 1.05) * Math.cos(t * 1.7 + 0.8);
    const a = (h + v) / 2;
    f.set(led, hsv(0.45 + a * 0.22, 0.9, clamp01(Math.abs(a) * 1.4)));
  }
  return f;
};

/**
 * A moving emitter: rings bunch ahead of it and stretch behind.
 *
 * The emitter swings on a sine rather than wrapping modulo the board width,
 * which used to teleport it from one edge to the other mid-flight. Shift is
 * driven by the true radial velocity, so it passes smoothly through zero at
 * each turnaround instead of flipping red/blue on one frame.
 */
export const dopplerRings: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const ph = t * 0.12 * Math.PI * 2;
  const ex = CX + (BOARD_W / 2 + 3) * Math.sin(ph);
  const vel = Math.cos(ph); // -1..1, smooth through the turnarounds
  for (const [led, p] of LED_GEO) {
    const dx = p.ux - ex, dy = (p.uy - CY) * 1.8;
    const d = Math.hypot(dx, dy);
    const radial = (dx / (d + 0.001)) * vel; // +1 dead ahead, -1 dead astern
    const compress = 1 - 0.35 * radial;      // ahead squashed, behind stretched
    const w = Math.sin(d * 1.5 * compress - t * 7);
    const v = clamp01(w) ** 2 * Math.exp(-d / 14);
    if (v < 0.04) continue;
    f.set(led, hsv(0.32 + 0.3 * radial, 0.9, v)); // blue approaching, red receding
  }
  return f;
};

/** Separable sine grid — a lattice of soft bright dots that drifts. */
export const sineGrid: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const a = 0.5 + 0.5 * Math.sin(p.ux * 1.6 - t * 1.4);
    const b = 0.5 + 0.5 * Math.sin(p.uy * 2.4 + t * 1.1);
    const v = (a * b) ** 1.8;
    if (v < 0.04) continue;
    f.set(led, hsv(0.3 + 0.4 * a + t * 0.05, 0.85, v));
  }
  return f;
};

/** Thin-film interference: hue swings hard on small thickness changes. */
export const oilSlick: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const thick = fbm(p.ux * 0.22, p.uy * 0.5, t * 0.12, 3);
    f.set(led, hsv(thick * 3.4 + t * 0.04, 0.75, 0.45 + 0.55 * thick));
  }
  return f;
};

/** Worley borders sharpened into the bright seams you see on a pool floor. */
export const waterCaustics: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const { f1, f2 } = worley(p.ux * 0.34, p.uy * 0.75, t * 0.9);
    const seam = clamp01(1 - (f2 - f1) * 1.6) ** 3;
    const base = 0.12 + 0.2 * (1 - f1);
    const v = clamp01(base + seam);
    f.set(led, [Math.round(30 * v), Math.round(160 * v), Math.round(220 * v)]);
  }
  return f;
};

/** Rising heat: a warm floor with noise-displaced shimmer above it. */
export const heatHaze: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const shimmer = (noise3(p.ux * 0.5, p.uy * 0.3, t * 1.6) - 0.5) * 1.4;
    const h = clamp01(1 - (p.uy + shimmer) / (BOARD_H - 0.5));
    f.set(led, sampleP(PALETTES.ember, h * 0.6).map((c) => Math.round(c * (0.3 + 0.7 * h))) as RGB);
  }
  return f;
};

/** Polar log-stripes — reads as flying into a tunnel. */
export const warpTunnel: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const dx = p.ux - CX, dy = (p.uy - CY) * 2.6;
    const r = Math.max(0.4, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx) / (Math.PI * 2);
    const stripe = 0.5 + 0.5 * Math.sin(Math.log(r) * 6 - t * 5);
    const v = stripe * clamp01(r / 5);
    f.set(led, hsv(ang + t * 0.1, 0.8, v));
  }
  return f;
};

/** Several slow ring sources overlapping, like rain on still water. */
export const ripplePool: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const ex = CX + (CX - 1) * Math.sin(t * (0.19 + k * 0.07) + k * 2.1);
      const ey = CY + CY * Math.cos(t * (0.23 + k * 0.05) + k * 1.3);
      const d = Math.hypot(p.ux - ex, (p.uy - ey) * 2);
      sum += Math.sin(d * 1.1 - t * 3) * Math.exp(-d / 12);
    }
    const v = clamp01(Math.abs(sum) * 0.8);
    f.set(led, hsv(0.53 + sum * 0.05, 0.8, v));
  }
  return f;
};

/** Dipole field lines: two poles, hue by polarity, brightness by gradient. */
export const magnetic: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  const px = CX + 5 * Math.sin(t * 0.4), nx = CX - 5 * Math.sin(t * 0.4);
  for (const [led, p] of LED_GEO) {
    const dp = Math.hypot(p.ux - px, (p.uy - CY) * 2) + 0.6;
    const dn = Math.hypot(p.ux - nx, (p.uy - CY) * 2) + 0.6;
    const pot = 1 / dp - 1 / dn;
    const lines = 0.5 + 0.5 * Math.sin(pot * 26 - t * 2);
    f.set(led, hsv(pot > 0 ? 0.02 : 0.58, 0.9, clamp01(lines ** 2 * (0.35 + 2.5 * Math.abs(pot)))));
  }
  return f;
};

/** Soap film: slow noise driving a wide, saturated hue swing. */
export const soapFilm: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const n = fbm(p.ux * 0.12, p.uy * 0.28, t * 0.08, 4);
    const swirl = Math.sin(n * 8 + t * 0.5);
    f.set(led, hsv(n * 2 + swirl * 0.1 + t * 0.015, 0.55 + 0.35 * n, 0.5 + 0.5 * n));
  }
  return f;
};

/** A slow swell crossing the board, foam picked out on the crest. */
export const tidal: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const surface = 2.6 + 1.4 * Math.sin(p.ux * 0.26 - t * 0.9) + 0.5 * Math.sin(p.ux * 0.6 - t * 1.7);
    const depth = clamp01((p.uy - surface + 2) / 4);
    const foam = clamp01(1 - Math.abs(p.uy - surface) * 1.8) ** 2;
    const base = sampleP(PALETTES.ocean, 0.15 + depth * 0.45);
    f.set(led, [
      Math.min(255, Math.round(base[0] * (0.3 + depth) + foam * 210)),
      Math.min(255, Math.round(base[1] * (0.3 + depth) + foam * 230)),
      Math.min(255, Math.round(base[2] * (0.3 + depth) + foam * 245)),
    ]);
  }
  return f;
};

/** Concentric radial pulse locked to the board centre, palette-cycled. */
export const shockwave: AnimationFn = (t) => {
  const f = new Map<number, RGB>();
  for (const [led, p] of LED_GEO) {
    const d = Math.hypot(p.ux - CX, (p.uy - CY) * 2.4) / BOARD_R;
    const w = Math.sin(d * 9 - t * 4.5);
    const v = clamp01(w) ** 3 * (1 - d * 0.35);
    if (v < 0.04) continue;
    f.set(led, sampleP(PALETTES.sunset, d * 0.5 + t * 0.06).map((c) => Math.round(c * v)) as RGB);
  }
  return f;
};
