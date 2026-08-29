/**
 * AULA F75 — shared primitives for the animation library.
 *
 * Everything here is pure and deterministic: an animation is a function of
 * elapsed seconds only, so the same `t` always yields the same frame. That
 * keeps effects reproducible between the preview canvas and the keyboard, and
 * it means no generator has to carry state across frames.
 */

import { KB_ROWS } from '../protocol';

export type RGB = [number, number, number];
export type Frame = Map<number, RGB>;
export type AnimationFn = (t: number) => Frame;

// ── Index-space layout ──────────────────────────────────────────────────
// Every row normalised to 0..1 regardless of how many keys it holds. Skews
// anything radial, but it is exactly what row/column sweeps want.

export type LedPos = { row: number; col: number };
export const LED_POS = new Map<number, LedPos>();
export const ALL_LEDS: number[] = [];
export const ROWS: number[][] = [];
/** Key label to LED index, e.g. LED_BY_NAME.get('W'). First match wins, so
 *  duplicated labels (Ctrl, Alt) resolve to the left-hand key. */
export const LED_BY_NAME = new Map<string, number>();

for (const kbRow of KB_ROWS) {
  const row: number[] = [];
  for (const entry of kbRow) {
    if (Array.isArray(entry)) {
      const [label, idx] = entry as [string, number, number];
      row.push(idx);
      ALL_LEDS.push(idx);
      if (!LED_BY_NAME.has(label)) LED_BY_NAME.set(label, idx);
    }
  }
  ROWS.push(row);
}

const N_ROWS = ROWS.length;
for (let ri = 0; ri < N_ROWS; ri++) {
  const row = ROWS[ri];
  for (let ci = 0; ci < row.length; ci++) {
    LED_POS.set(row[ci], {
      row: ri / Math.max(N_ROWS - 1, 1),
      col: ci / Math.max(row.length - 1, 1),
    });
  }
}

// ── Physical geometry ───────────────────────────────────────────────────
// ux/uy are in key units (1u = one 1x1 key, rows 1u apart), so plain hypot()
// over them is a true physical distance and radial effects land where the eye
// expects. x/y are the same thing normalised to 0..1.

export interface LedGeo { x: number; y: number; ux: number; uy: number }

function buildGeometry() {
  const rows: Array<Array<[number, number]>> = [];
  let width = 0;
  for (const kbRow of KB_ROWS) {
    let cursor = 0;
    const acc: Array<[number, number]> = [];
    for (const entry of kbRow) {
      if (Array.isArray(entry)) {
        const [, idx, w] = entry;
        acc.push([idx, cursor + w / 2]);
        cursor += w;
      } else {
        cursor += entry; // spacer
      }
    }
    width = Math.max(width, cursor);
    rows.push(acc);
  }
  const height = rows.length;
  const geo = new Map<number, LedGeo>();
  for (let ri = 0; ri < height; ri++) {
    for (const [idx, cx] of rows[ri]) {
      geo.set(idx, { ux: cx, uy: ri, x: cx / width, y: ri / Math.max(height - 1, 1) });
    }
  }
  return { geo, width, height };
}

const built = buildGeometry();
export const LED_GEO = built.geo;
export const BOARD_W = built.width;
export const BOARD_H = built.height;
export const CX = BOARD_W / 2;
export const CY = (BOARD_H - 1) / 2;
/** Centre-to-corner distance — normalises radial falloffs to 0..1. */
export const BOARD_R = Math.hypot(CX, CY);

/** LEDs ordered left-to-right, and a serpentine row walk for chase effects. */
export const LEDS_BY_X = [...LED_GEO.keys()].sort((a, b) => {
  const pa = LED_GEO.get(a)!, pb = LED_GEO.get(b)!;
  return pa.ux - pb.ux || pa.uy - pb.uy;
});
export const SNAKE_PATH: number[] = ROWS.flatMap((row, ri) =>
  ri % 2 === 0 ? [...row].reverse() : row,
);

// ── Colour ──────────────────────────────────────────────────────────────

export function hsv(h: number, s = 1.0, v = 1.0): RGB {
  h = ((h % 1.0) + 1.0) % 1.0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = tt; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = tt; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = tt; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** Ordered so NaN falls through to 0 rather than propagating into a palette
 *  index and returning undefined. */
export const clamp01 = (x: number) => (x > 0 ? (x > 1 ? 1 : x) : 0);
export const frac = (x: number) => x - Math.floor(x);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Hermite ramp: 0 at `a`, 1 at `b`, eased in between. */
export function smoothstep(a: number, b: number, x: number) {
  const u = clamp01((x - a) / (b - a || 1e-6));
  return u * u * (3 - 2 * u);
}

export function scale(c: RGB, k: number): RGB {
  return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
}

export function mix(a: RGB, b: RGB, x: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * x),
    Math.round(a[1] + (b[1] - a[1]) * x),
    Math.round(a[2] + (b[2] - a[2]) * x),
  ];
}

/** Additive blend — overlapping sources flare toward white. */
export function add(frame: Frame, led: number, c: RGB) {
  const prev = frame.get(led);
  if (!prev) { frame.set(led, c); return; }
  frame.set(led, [
    prev[0] + c[0] > 255 ? 255 : prev[0] + c[0],
    prev[1] + c[1] > 255 ? 255 : prev[1] + c[1],
    prev[2] + c[2] > 255 ? 255 : prev[2] + c[2],
  ]);
}

/** Keep whichever contribution is brighter — avoids additive white-out. */
export function maxBlend(frame: Frame, led: number, c: RGB) {
  const prev = frame.get(led);
  if (!prev) { frame.set(led, c); return; }
  if (c[0] + c[1] + c[2] > prev[0] + prev[1] + prev[2]) frame.set(led, c);
}

/** Paint every key one colour. */
export function fill(c: RGB): Frame {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, c);
  return f;
}

// ── Palettes ────────────────────────────────────────────────────────────
// Evenly spaced stops. sampleP wraps (use it like a hue); rampP clamps (use it
// for heat/depth, where both ends are meaningful).

export type Palette = RGB[];

export const PALETTES: Record<string, Palette> = {
  fire: [[0, 0, 0], [120, 12, 0], [220, 60, 0], [255, 150, 10], [255, 240, 180]],
  lava: [[20, 0, 0], [140, 0, 12], [255, 40, 0], [255, 140, 0], [255, 90, 20]],
  ocean: [[0, 4, 40], [0, 40, 120], [0, 120, 190], [40, 200, 210], [200, 250, 255]],
  ice: [[6, 10, 40], [20, 70, 150], [90, 170, 230], [190, 235, 255], [255, 255, 255]],
  forest: [[2, 20, 4], [10, 70, 16], [40, 130, 30], [120, 190, 50], [225, 240, 150]],
  sunset: [[24, 6, 60], [120, 20, 90], [225, 60, 70], [255, 140, 40], [255, 220, 120]],
  cyber: [[10, 0, 30], [120, 0, 200], [255, 0, 140], [0, 220, 255], [255, 255, 255]],
  candy: [[255, 120, 190], [255, 200, 120], [150, 240, 200], [140, 170, 255], [230, 150, 255]],
  toxic: [[0, 16, 0], [40, 140, 0], [160, 235, 0], [225, 255, 90], [255, 255, 220]],
  ember: [[8, 0, 0], [70, 8, 0], [170, 40, 0], [255, 110, 20], [255, 190, 90]],
  mono: [[0, 0, 0], [64, 64, 64], [128, 128, 128], [200, 200, 200], [255, 255, 255]],
  vapor: [[70, 20, 130], [200, 60, 190], [255, 120, 200], [120, 230, 255], [255, 240, 200]],
};

export function sampleP(pal: Palette, p: number): RGB {
  const n = pal.length;
  const u = frac(p) * n;
  const i = Math.floor(u);
  return mix(pal[i % n], pal[(i + 1) % n], u - i);
}

export function rampP(pal: Palette, p: number): RGB {
  const u = clamp01(p) * (pal.length - 1);
  const i = Math.min(pal.length - 2, Math.floor(u));
  return mix(pal[i], pal[i + 1], u - i);
}

// ── Deterministic noise ─────────────────────────────────────────────────

export function hash1(n: number) {
  return frac(Math.sin(n * 127.1) * 43758.5453);
}
export function hash2(x: number, y: number) {
  return frac(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
}
export function hash3(x: number, y: number, z: number) {
  return frac(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
}

const fade = (x: number) => x * x * (3 - 2 * x);

export function noise2(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi), v = fade(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const n = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  const z0 = lerp(lerp(n(0, 0, 0), n(1, 0, 0), u), lerp(n(0, 1, 0), n(1, 1, 0), u), v);
  const z1 = lerp(lerp(n(0, 0, 1), n(1, 0, 1), u), lerp(n(0, 1, 1), n(1, 1, 1), u), v);
  return lerp(z0, z1, w);
}

/** Fractal Brownian motion — stacked octaves of noise3, normalised to 0..1. */
export function fbm(x: number, y: number, z: number, octaves = 3) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3(x, y, z);
    norm += amp;
    x *= 2.02; y *= 2.02; z *= 2.02; amp *= 0.5;
  }
  return sum / norm;
}

/**
 * Distance to the nearest of N cell points (Worley / cellular noise). Returns
 * { f1, f2, id } so callers can shade cells, draw their borders (f2 - f1), or
 * colour each cell by its id.
 */
export function worley(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 1e9, f2 = 1e9, id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy;
      const px = cx + 0.5 + 0.45 * Math.sin(z + hash2(cx, cy) * 6.283);
      const py = cy + 0.5 + 0.45 * Math.cos(z + hash2(cy, cx) * 6.283);
      const d = Math.hypot(x - px, y - py);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(cx, cy); }
      else if (d < f2) { f2 = d; }
    }
  }
  return { f1, f2, id };
}
