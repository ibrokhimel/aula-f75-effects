/**
 * Hold effects that grow — the shape gets bigger, longer or fuller the longer
 * the key stays down, and unwinds when you let go.
 *
 * Every one scales its release decay off the charge it reached, so letting go
 * early gives a small, quick unwind rather than the same animation at a
 * different size.
 */

import {
  BOARD_H, BOARD_W, LED_GEO, type Frame, type ReactiveFn,
  addTo, charge, clamp01, heldFor, hsv, isHeld, maxTo, sinceUp,
} from './core';

const ROW = 2.4;
/** 1 while down, then decaying — the shared "unwind" term. */
const out = (p: Parameters<typeof isHeld>[0], t: number, rate = 3) =>
  isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * rate);

/** A square front that widens with the hold. */
export const growSquare: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const r = heldFor(p, t) * 5.5;
    const o = out(p, t);
    if (o < 0.04 || r > 24) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.max(Math.abs(g.ux - p.ux), Math.abs(g.uy - p.uy) * ROW);
      const v = Math.exp(-((d - r) ** 2) / 1.3) * o;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** The same, on a Manhattan metric — a diamond. */
export const growDiamond: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const r = heldFor(p, t) * 6;
    const o = out(p, t);
    if (o < 0.04 || r > 28) continue;
    for (const [led, g] of LED_GEO) {
      const d = Math.abs(g.ux - p.ux) + Math.abs(g.uy - p.uy) * ROW;
      const v = Math.exp(-((d - r) ** 2) / 1.6) * o;
      if (v < 0.04) continue;
      addTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** The key's column lights outward, one row at a time. */
export const growColumn: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const reach = heldFor(p, t) * 3.5;
    const o = out(p, t, 2.5);
    if (o < 0.04) continue;
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.ux - p.ux) > 0.9) continue;
      const d = Math.abs(g.uy - p.uy);
      if (d > reach) continue;
      const v = o * clamp01(1 - d / (reach + 0.6));
      if (v < 0.04) continue;
      maxTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** The key's row lights outward from the press. */
export const growRow: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const reach = heldFor(p, t) * 9;
    const o = out(p, t, 2.5);
    if (o < 0.04) continue;
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.uy - p.uy) > 0.45) continue;
      const d = Math.abs(g.ux - p.ux);
      if (d > reach) continue;
      const v = o * clamp01(1 - d / (reach + 1.5));
      if (v < 0.04) continue;
      maxTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** A spiral arm that unwinds further the longer you hold. */
export const growSpiral: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const turns = heldFor(p, t) * 2.4;
    const o = out(p, t);
    if (o < 0.04) continue;
    const steps = Math.min(90, Math.floor(turns * 26));
    for (let i = 0; i <= steps; i++) {
      const u = i / 26;
      const r = u * 2.6;
      if (r > 14) break;
      const x = p.ux + Math.cos(u * 6.283) * r;
      const y = p.uy + Math.sin(u * 6.283) * r * 0.42;
      for (const [led, g] of LED_GEO) {
        const v = o * 0.9 * Math.exp(-((g.ux - x) ** 2) / 0.4 - ((g.uy - y) ** 2) / 0.2);
        if (v < 0.06) continue;
        addTo(f, led, hsv(p.hue + u * 0.1, 0.85, Math.min(1, v)));
      }
    }
  }
  return f;
};

/** A wedge that opens wider the longer you hold. */
export const growCone: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.0);
    const o = out(p, t);
    if (o < 0.04) continue;
    const half = 0.15 + c * 1.4;              // half-angle, radians
    const reach = 3 + c * 14;
    const face = p.ux > BOARD_W / 2 ? Math.PI : 0;
    for (const [led, g] of LED_GEO) {
      const dx = g.ux - p.ux, dy = (g.uy - p.uy) * ROW;
      const d = Math.hypot(dx, dy);
      if (d > reach || d < 0.2) continue;
      let a = Math.atan2(dy, dx) - face;
      a = Math.atan2(Math.sin(a), Math.cos(a));  // wrap to -pi..pi
      if (Math.abs(a) > half) continue;
      const v = o * clamp01(1 - d / reach) * clamp01(1 - Math.abs(a) / half);
      if (v < 0.04) continue;
      maxTo(f, led, hsv(p.hue, 0.8, Math.min(1, v)));
    }
  }
  return f;
};

/** The column below the key fills from the bottom up. */
export const columnFill: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.6);
    const o = out(p, t, 2);
    if (o < 0.04) continue;
    const line = (BOARD_H - 1) - c * (BOARD_H - 1);
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.ux - p.ux) > 0.9) continue;
      if (g.uy < line - 0.5) continue;
      const edge = Math.abs(g.uy - line) < 0.7 ? 1 : 0.55;
      maxTo(f, led, hsv(0.33 - c * 0.33, 0.9, Math.min(1, o * edge)));
    }
  }
  return f;
};

/** The row fills outward symmetrically, like a level meter. */
export const rowFill: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.8);
    const o = out(p, t, 2);
    if (o < 0.04) continue;
    const reach = c * 9;
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.uy - p.uy) > 0.45) continue;
      const d = Math.abs(g.ux - p.ux);
      if (d > reach) continue;
      const edge = reach - d < 1.1 ? 1 : 0.5;
      maxTo(f, led, hsv(0.55 - c * 0.5, 0.9, Math.min(1, o * edge)));
    }
  }
  return f;
};

/** A solid disc that grows rather than a ring. */
export const radialFill: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.0);
    const o = out(p, t, 2.5);
    if (o < 0.04) continue;
    const r = c * 11;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > r) continue;
      // Bright rim, softer interior, so the growth stays legible when big.
      const rim = clamp01(1 - (r - d) / 1.6);
      const v = o * clamp01(0.35 + rim * 0.65);
      maxTo(f, led, hsv(p.hue, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** A clock hand sweeping round the key; a full turn is a full charge. */
export const clockFill: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.2);
    const o = out(p, t, 3);
    if (o < 0.04) continue;
    const sweep = c * Math.PI * 2;
    for (const [led, g] of LED_GEO) {
      const dx = g.ux - p.ux, dy = (g.uy - p.uy) * ROW;
      const d = Math.hypot(dx, dy);
      if (d > 4.5 || d < 0.3) continue;
      // Angle measured from straight up, clockwise.
      let a = Math.atan2(dx, -dy);
      if (a < 0) a += Math.PI * 2;
      if (a > sweep) continue;
      const lead = a > sweep - 0.5 ? 1 : 0.45;
      maxTo(f, led, hsv(p.hue, 0.85, Math.min(1, o * lead * clamp01(1 - d / 5.5))));
    }
  }
  return f;
};
