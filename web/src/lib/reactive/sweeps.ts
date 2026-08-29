/**
 * Directional reactions — the press picks a direction and light travels.
 * These read best while typing prose, because each key throws light along a
 * different axis and the board never settles.
 */

import {
  BOARD_W, COL_OF, LED_GEO, ROW_OF,
  type Frame, type ReactiveFn,
  addTo, age, clamp01, hsv, maxTo,
} from './core';

/** The pressed key's physical row lights, brightest at the key. */
export const rowFlash: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 0.9) continue;
    const env = 1 - a / 0.9;
    for (const led of ROW_OF.get(p.led) ?? []) {
      const g = LED_GEO.get(led)!;
      const v = env * Math.exp(-Math.abs(g.ux - p.ux) / 5);
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, v));
    }
  }
  return f;
};

/** The pressed key's matrix column lights top to bottom. */
export const colFlash: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 0.8) continue;
    const env = 1 - a / 0.8;
    for (const led of COL_OF.get(p.led) ?? []) addTo(f, led, hsv(p.hue, 0.85, env));
  }
  return f;
};

/** Row and column together — a plus centred on the key. */
export const crossFlash: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const a = age(p, t);
    if (a > 0.85) continue;
    const env = 1 - a / 0.85;
    for (const led of ROW_OF.get(p.led) ?? []) {
      const g = LED_GEO.get(led)!;
      addTo(f, led, hsv(p.hue, 0.8, env * Math.exp(-Math.abs(g.ux - p.ux) / 6)));
    }
    for (const led of COL_OF.get(p.led) ?? []) addTo(f, led, hsv(p.hue, 0.8, env * 0.8));
  }
  return f;
};

function horizontal(dir: 1 | -1, speed: number, life: number): ReactiveFn {
  return (t, presses) => {
    const f: Frame = new Map();
    for (const p of presses) {
      const a = age(p, t);
      if (a > life) continue;
      const env = 1 - a / life;
      const head = p.ux + dir * a * speed;
      for (const [led, g] of LED_GEO) {
        // Only light keys the wave has already reached, on the correct side.
        if (dir > 0 ? g.ux < p.ux - 0.5 : g.ux > p.ux + 0.5) continue;
        const v = env * Math.exp(-((g.ux - head) ** 2) / 2.0)
                * Math.exp(-Math.abs(g.uy - p.uy) * 0.55);
        if (v < 0.04) continue;
        addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
      }
    }
    return f;
  };
}

export const sweepRight = horizontal(1, 16, 1.1);
export const sweepLeft = horizontal(-1, 16, 1.1);

/** Light travels both ways along the row from the key. */
export const sweepSplit: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 15, LIFE = 1.0;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    for (const [led, g] of LED_GEO) {
      const d = Math.abs(g.ux - p.ux);
      const v = env * Math.exp(-((d - a * SPEED) ** 2) / 2.0)
              * Math.exp(-Math.abs(g.uy - p.uy) * 0.6);
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** A wave running up the board from the pressed row. */
export const sweepUp: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 7, LIFE = 1.0;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const head = p.uy - a * SPEED;
    for (const [led, g] of LED_GEO) {
      const v = env * Math.exp(-((g.uy - head) ** 2) / 0.5)
              * Math.exp(-Math.abs(g.ux - p.ux) / 7);
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** Diagonal wavefront, direction hashed per press. */
export const sweepDiagonal: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const SPEED = 13, LIFE = 1.0;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const s = p.hue > 0.5 ? 1 : -1;
    for (const [led, g] of LED_GEO) {
      const proj = (g.ux - p.ux) * 0.8 + (g.uy - p.uy) * s * 2.2;
      const v = env * Math.exp(-((proj - a * SPEED) ** 2) / 2.4);
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** A hard beam fired to the nearer edge, leaving a fading track. */
export const laser: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 0.7;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    const dir = p.ux > BOARD_W / 2 ? 1 : -1;
    const reach = a * 34;
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.uy - p.uy) > 0.4) continue;
      const along = (g.ux - p.ux) * dir;
      if (along < -0.3 || along > reach) continue;
      const v = env * clamp01(1 - along / 22);
      if (v < 0.04) continue;
      maxTo(f, led, hsv(p.hue, 0.35, Math.min(1, v)));
    }
  }
  return f;
};

/** Out to the edge and back again. */
export const boomerang: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 1.5;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    const env = 1 - a / LIFE;
    // Triangle in time: outbound for the first half, home for the second.
    const phase = a / LIFE;
    const d = (phase < 0.5 ? phase : 1 - phase) * 2 * 15;
    const dir = p.ux > BOARD_W / 2 ? -1 : 1;
    const head = p.ux + dir * d;
    for (const [led, g] of LED_GEO) {
      const v = env * Math.exp(-((g.ux - head) ** 2) / 1.6)
              * Math.exp(-Math.abs(g.uy - p.uy) * 0.7);
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.9, Math.min(1, v)));
    }
  }
  return f;
};

/** The row lights instantly, then drains away from the key. */
export const rowDrain: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const LIFE = 1.1;
  for (const p of presses) {
    const a = age(p, t);
    if (a > LIFE) continue;
    for (const led of ROW_OF.get(p.led) ?? []) {
      const g = LED_GEO.get(led)!;
      const d = Math.abs(g.ux - p.ux);
      // Keys nearest the press go out first, so the light retreats outward.
      const v = clamp01(1 - a / LIFE) * clamp01((d / 8) + 0.15 - a * 0.5 + 0.4);
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};
