/**
 * Hold effects with a material quality — the key behaves like it is melting,
 * cracking, rusting or burning through, and the longer you hold the further
 * that process runs.
 *
 * These lean on slow, irreversible-looking change, so they read best on a
 * single deliberate hold rather than while typing.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_GEO, NEIGHBOURS,
  type Frame, type ReactiveFn,
  addTo, charge, clamp01, hash2Seq, heldFor, hsv, isHeld, maxTo, sinceUp,
} from './core';

const ROW = 2.4;
const out = (p: Parameters<typeof isHeld>[0], t: number, rate = 3) =>
  isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * rate);

/** Colour runs down the board from the key like wet paint. */
export const holdMelt: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const run = heldFor(p, t) * 2.6;
    const o = out(p, t, 1.5);
    if (o < 0.04) continue;
    maxTo(f, p.led, hsv(p.hue, 0.9, o));
    for (const [led, g] of LED_GEO) {
      const down = g.uy - p.uy;
      if (down <= 0 || down > run) continue;
      // Each column drips at its own rate, so the edge is ragged not flat.
      const lag = hash2Seq(p.seq, Math.round(g.ux)) * 1.6;
      if (down > run - lag) continue;
      const spread = Math.abs(g.ux - p.ux);
      if (spread > 1.4) continue;
      const v = o * clamp01(1 - down / (run + 1.5)) * clamp01(1 - spread / 1.6);
      if (v < 0.04) continue;
      maxTo(f, led, hsv(p.hue, 0.95, Math.min(1, v)));
    }
  }
  return f;
};

/** Fractures spread outward across the matrix and stay put. */
export const holdCrack: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [3, 3, 6]);
  for (const p of presses) {
    const o = out(p, t, 1.2);
    if (o < 0.04) continue;
    const depth = Math.min(12, Math.floor(heldFor(p, t) / 0.16));
    let front = [p.led];
    const seen = new Set(front);
    for (let d = 0; d <= depth; d++) {
      for (const led of front) {
        const v = o * clamp01(1 - d / (depth + 2));
        if (v > 0.04) maxTo(f, led, hsv(0.08, 0.25, Math.min(1, v)));
      }
      const next: number[] = [];
      for (const led of front) {
        for (const n of NEIGHBOURS.get(led) ?? []) {
          if (seen.has(n)) continue;
          // Cracks branch, they do not flood: most neighbours are skipped.
          if (hash2Seq(p.seq + d, n) > 0.45) continue;
          seen.add(n); next.push(n);
        }
      }
      front = next;
      if (!front.length) break;
    }
  }
  return f;
};

/** Colour corrodes away from the key, desaturating as it goes. */
export const holdRust: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  // The unoxidised base only exists while something is corroding it. A Hold
  // effect has to settle to nothing after release, so this cannot be an
  // unconditional wash the way a Field effect's idle layer can.
  let live = 0;
  for (const p of presses) live = Math.max(live, out(p, t, 1.0));
  if (live < 0.04) return f;
  for (const [led, g] of LED_GEO) {
    f.set(led, hsv(0.55, 0.7, live * (0.35 + 0.05 * Math.sin(g.ux * 0.4 + t))));
  }
  for (const p of presses) {
    const c = charge(p, t, 2.6);
    const o = out(p, t, 1.0);
    if (o < 0.04) continue;
    const r = c * 11;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > r) continue;
      const bite = o * clamp01(1 - d / (r + 0.01)) * (0.5 + 0.5 * hash2Seq(led, p.seq));
      if (bite < 0.05) continue;
      maxTo(f, led, hsv(0.07, 0.75, Math.min(1, 0.25 + bite * 0.5)));
    }
  }
  return f;
};

/** Petals open around the key as the hold lengthens. */
export const holdBloom: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.0);
    const o = out(p, t, 2);
    if (o < 0.04 || c < 0.02) continue;
    const petals = 5;
    const reach = 1 + c * 5.5;
    for (const [led, g] of LED_GEO) {
      const dx = g.ux - p.ux, dy = (g.uy - p.uy) * ROW;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const edge = reach * (0.55 + 0.45 * Math.cos(a * petals));
      const v = o * clamp01(1 - Math.abs(d - edge * 0.72) / 1.5) ** 1.4;
      if (v < 0.05) continue;
      maxTo(f, led, hsv(0.88 + c * 0.1, 0.75, Math.min(1, v)));
    }
    maxTo(f, p.led, hsv(0.14, 0.85, o));
  }
  return f;
};

/** A pool of magma widens under the key, crusting at its edge. */
export const holdMagma: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.4);
    const o = out(p, t, 0.9);
    if (o < 0.04) continue;
    const r = 0.8 + c * 8;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > r) continue;
      const churn = 0.75 + 0.25 * Math.sin(t * 3 + d * 1.5 + hash2Seq(led, p.seq) * 6);
      const core = clamp01(1 - d / (r + 0.01));
      const v = o * churn * clamp01(0.3 + core * 0.7);
      if (v < 0.05) continue;
      // Bright yellow core cooling to a dark red crust at the rim.
      maxTo(f, led, hsv(0.02 + core * 0.1, 1 - core * 0.55, Math.min(1, v)));
    }
  }
  return f;
};

/** Smoke climbs and fans out above the key. */
export const holdSmoke: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 2.4);
    const o = out(p, t, 1.1);
    if (o < 0.04) continue;
    const rise = 0.5 + c * 5;
    for (const [led, g] of LED_GEO) {
      const up = p.uy - g.uy;
      if (up < -0.5 || up > rise) continue;
      // Fans wider the higher it gets, and drifts on a slow sine.
      const fan = 0.5 + up * 0.9;
      const drift = Math.sin(t * 0.9 + up * 0.8) * up * 0.35;
      const off = Math.abs(g.ux - p.ux - drift);
      if (off > fan) continue;
      const v = o * clamp01(1 - up / (rise + 1)) * clamp01(1 - off / fan) * 0.8;
      if (v < 0.05) continue;
      const grey = Math.round(200 * v);
      addTo(f, led, [grey, grey, Math.round(grey * 1.05)]);
    }
  }
  return f;
};

/** A ring portal widens, with a dark interior and a bright rim. */
export const holdPortal: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.8);
    const o = out(p, t, 2.5);
    if (o < 0.04 || c < 0.03) continue;
    const r = c * 8;
    for (const [led, g] of LED_GEO) {
      const dx = g.ux - p.ux, dy = (g.uy - p.uy) * ROW;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      // Rim shimmer keeps the ring from looking like a flat stencil.
      const shimmer = 0.7 + 0.3 * Math.sin(a * 6 + t * 5);
      const rim = clamp01(1 - Math.abs(d - r) / 1.1) ** 1.5;
      const inner = d < r ? 0.12 * clamp01(1 - d / r) : 0;
      const v = o * (rim * shimmer + inner);
      if (v < 0.05) continue;
      maxTo(f, led, hsv(0.75 + c * 0.12, 0.85, Math.min(1, v)));
    }
  }
  return f;
};

/** The beam thickens while you charge, then fires across the board. */
export const holdBeamCharge: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.5);
    const dir = p.ux > BOARD_W / 2 ? -1 : 1;
    if (isHeld(p, t)) {
      const width = 0.15 + c * 0.5;
      for (const [led, g] of LED_GEO) {
        const along = (g.ux - p.ux) * dir;
        if (along < -0.3 || along > 1.5 + c * 2) continue;
        const v = c * Math.exp(-((g.uy - p.uy) ** 2) / width);
        if (v < 0.05) continue;
        addTo(f, led, hsv(0.5, 1 - c * 0.7, Math.min(1, v)));
      }
      continue;
    }
    const a = sinceUp(p, t);
    if (a > 0.6) continue;
    const env = c * (1 - a / 0.6);
    const reach = a * 60;
    for (const [led, g] of LED_GEO) {
      const along = (g.ux - p.ux) * dir;
      if (along < -0.3 || along > reach) continue;
      const v = env * Math.exp(-((g.uy - p.uy) ** 2) / (0.2 + c * 0.6));
      if (v < 0.05) continue;
      addTo(f, led, hsv(0.5, 0.3, Math.min(1, v)));
    }
  }
  return f;
};

/** A faceted bubble forms around the key and holds. */
export const holdShield: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const p of presses) {
    const c = charge(p, t, 1.6);
    const o = out(p, t, 2);
    if (o < 0.04 || c < 0.03) continue;
    const r = 1 + c * 5;
    for (const [led, g] of LED_GEO) {
      const dx = g.ux - p.ux, dy = (g.uy - p.uy) * ROW;
      const d = Math.hypot(dx, dy);
      if (d > r + 1) continue;
      const a = Math.atan2(dy, dx);
      // Six facets, each catching the light differently as it rotates.
      const facet = 0.55 + 0.45 * Math.abs(Math.cos(a * 3 - t * 1.2));
      const shell = clamp01(1 - Math.abs(d - r) / 1.3) ** 1.3;
      const fill = d < r ? 0.1 : 0;
      const v = o * (shell * facet + fill);
      if (v < 0.05) continue;
      maxTo(f, led, hsv(0.52, 0.7, Math.min(1, v)));
    }
  }
  return f;
};

/** The whole board's gradient bends further toward the key the longer you hold. */
export const holdWarp: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  let wx = BOARD_W / 2, wy = (BOARD_H - 1) / 2, pull = 0;
  for (const p of presses) {
    const c = charge(p, t, 2.2);
    const o = out(p, t, 1.2);
    const w = c * o;
    if (w <= pull) continue;
    pull = w; wx = p.ux; wy = p.uy;
  }
  for (const [led, g] of LED_GEO) {
    const dx = g.ux - wx, dy = (g.uy - wy) * ROW;
    const d = Math.hypot(dx, dy);
    // Space compresses near the well: the same stripe spacing bunches up.
    const warped = d / (1 + pull * 6 / (d + 1));
    const bands = 0.5 + 0.5 * Math.sin(warped * 1.2 - t * 2);
    const v = clamp01(0.08 + bands * (0.25 + pull * 0.65));
    f.set(led, hsv(0.62 - pull * 0.35, 0.85, v));
  }
  return f;
};
