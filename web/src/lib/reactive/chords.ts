/**
 * Chord effects — these read the *set* of keys currently held, so they only
 * come alive when you hold more than one at once. Holding a single key gives a
 * degenerate but still sensible result in every case.
 */

import {
  ALL_LEDS, LED_GEO, NEIGHBOURS, type Frame, type Press, type ReactiveFn,
  addTo, charge, clamp01, heldFor, heldKeys, hsv, isHeld, maxTo, sinceUp,
} from './core';

const ROW = 2.4;

/** Distance from a key to the segment a-b, in scaled board units. */
function toSegment(gx: number, gy: number, a: Press, b: Press) {
  const vx = b.ux - a.ux, vy = (b.uy - a.uy) * ROW;
  const wx = gx - a.ux, wy = (gy - a.uy) * ROW;
  const len2 = vx * vx + vy * vy;
  const u = len2 > 0 ? clamp01((wx * vx + wy * vy) / len2) : 0;
  return Math.hypot(wx - vx * u, wy - vy * u);
}

/** Draws a line between every pair of held keys. */
export const chordLines: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  for (const p of held) maxTo(f, p.led, hsv(p.hue, 0.6, 1));
  for (let i = 0; i < held.length; i++) {
    for (let j = i + 1; j < held.length; j++) {
      const a = held[i], b = held[j];
      for (const [led, g] of LED_GEO) {
        const v = Math.exp(-(toSegment(g.ux, g.uy, a, b) ** 2) / 0.6);
        if (v < 0.05) continue;
        addTo(f, led, hsv((a.hue + b.hue) / 2, 0.85, Math.min(1, v * 0.8)));
      }
    }
  }
  return f;
};

/** Fills the area enclosed by the held keys rather than just its edges. */
export const chordFill: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  if (!held.length) return f;
  const cx = held.reduce((s, p) => s + p.ux, 0) / held.length;
  const cy = held.reduce((s, p) => s + p.uy, 0) / held.length;
  // Radius is the furthest held key from the centroid, so the shape grows as
  // the chord widens rather than being a fixed blob.
  const reach = Math.max(1.2, ...held.map((p) => Math.hypot(p.ux - cx, (p.uy - cy) * ROW)));
  const hue = held.reduce((s, p) => s + p.hue, 0) / held.length;
  for (const [led, g] of LED_GEO) {
    const d = Math.hypot(g.ux - cx, (g.uy - cy) * ROW);
    const v = clamp01(1 - d / (reach + 1.0)) ** 1.4;
    if (v < 0.05) continue;
    maxTo(f, led, hsv(hue, 0.8, Math.min(1, v)));
  }
  for (const p of held) maxTo(f, p.led, hsv(hue, 0.3, 1));
  return f;
};

/** The board is lit and drains into whatever you are holding. */
export const siphon: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  const pull = held.length ? Math.max(...held.map((p) => charge(p, t, 1.5))) : 0;
  for (const [led, g] of LED_GEO) {
    let nearest = 99;
    for (const p of held) {
      nearest = Math.min(nearest, Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW));
    }
    // Everything dims except a bright pool around the held keys.
    const base = 0.45 * (1 - pull * 0.85);
    const gather = held.length ? pull * Math.exp(-(nearest * nearest) / 6) : 0;
    const v = clamp01(base + gather);
    f.set(led, hsv(0.55 - gather * 0.5, 0.85, v));
  }
  return f;
};

/** Pushes a dark bubble outward for as long as you hold. */
export const repel: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, hsv(0.6 + t * 0.02, 0.7, 0.5));
  for (const p of presses) {
    const c = charge(p, t, 1.6);
    const out = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 3);
    if (out < 0.04) continue;
    const r = c * 9;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > r) continue;
      const cut = out * clamp01(1 - (d / (r + 0.01)) ** 3);
      const cur = f.get(led)!;
      f.set(led, [
        Math.round(cur[0] * (1 - cut)),
        Math.round(cur[1] * (1 - cut)),
        Math.round(cur[2] * (1 - cut)),
      ]);
    }
  }
  return f;
};

/** Tendrils creep outward across the key matrix while you hold. */
export const vine: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const STEP = 0.12;
  for (const p of presses) {
    const grow = heldFor(p, t);
    const out = isHeld(p, t) ? 1 : Math.exp(-sinceUp(p, t) * 1.6);
    if (out < 0.04) continue;
    const depth = Math.min(14, Math.floor(grow / STEP));
    let front = [p.led];
    const seen = new Set(front);
    for (let d = 0; d <= depth; d++) {
      const v = out * clamp01(1 - d / (depth + 2));
      if (v > 0.04) {
        for (const led of front) maxTo(f, led, hsv(0.28 + d * 0.012, 0.9, Math.min(1, v)));
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

/** Ice creeps out from the held key and lingers after release. */
export const freeze: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  for (const led of ALL_LEDS) f.set(led, [2, 4, 10]);
  for (const p of presses) {
    const c = charge(p, t, 2.4);
    // Melts back slowly rather than snapping off, so the frost has weight.
    const out = isHeld(p, t) ? 1 : clamp01(1 - sinceUp(p, t) / 2.5);
    if (out < 0.04) continue;
    const r = c * 10;
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d > r) continue;
      const edge = clamp01(1 - Math.abs(d - r) / 1.6);
      const body = clamp01(1 - d / (r + 0.01)) * 0.45;
      const v = out * clamp01(body + edge * 0.8);
      if (v < 0.05) continue;
      maxTo(f, led, [Math.round(150 * v), Math.round(215 * v), 255]);
    }
  }
  return f;
};

/** The whole board's gradient leans toward whatever is held. */
export const tug: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  let cx = 8, cy = 2.5, weight = 0;
  for (const p of held) {
    const w = charge(p, t, 1.0) + 0.2;
    cx += (p.ux - cx) * w; cy += (p.uy - cy) * w; weight = Math.max(weight, w);
  }
  for (const [led, g] of LED_GEO) {
    const d = Math.hypot(g.ux - cx, (g.uy - cy) * ROW);
    const v = 0.1 + 0.9 * clamp01(1 - d / 14) ** 1.6 * (0.3 + weight * 0.7);
    f.set(led, hsv(0.62 - v * 0.4 + t * 0.01, 0.85, v));
  }
  return f;
};

/** Every key takes the colour of the nearest held key. */
export const magnetise: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  if (!held.length) {
    for (const led of ALL_LEDS) f.set(led, [4, 4, 10]);
    return f;
  }
  for (const [led, g] of LED_GEO) {
    let best: Press = held[0], bestD = Infinity;
    for (const p of held) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW);
      if (d < bestD) { bestD = d; best = p; }
    }
    const v = 0.12 + 0.88 * clamp01(1 - bestD / 12);
    f.set(led, hsv(best.hue, 0.85, v));
  }
  return f;
};

/** A pulse shuttles back and forth between the two most recent held keys. */
export const bridge: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  if (held.length < 2) {
    for (const p of held) maxTo(f, p.led, hsv(p.hue, 0.8, 0.6));
    return f;
  }
  const a = held[held.length - 2], b = held[held.length - 1];
  const span = Math.max(heldFor(a, t), heldFor(b, t));
  // Triangle wave so the pulse reverses cleanly at each end.
  const u = Math.abs(((span * 1.1) % 2) - 1);
  const x = a.ux + (b.ux - a.ux) * u;
  const y = a.uy + (b.uy - a.uy) * u;
  for (const [led, g] of LED_GEO) {
    const rail = Math.exp(-(toSegment(g.ux, g.uy, a, b) ** 2) / 0.5) * 0.3;
    const pulse = Math.exp(-((g.ux - x) ** 2) / 0.5 - ((g.uy - y) ** 2) / 0.25);
    const v = clamp01(rail + pulse);
    if (v < 0.05) continue;
    maxTo(f, led, hsv(a.hue + (b.hue - a.hue) * u, 0.85, v));
  }
  return f;
};

/** Held keys behave like charges; brightness follows the summed field. */
export const fieldLines: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const held = heldKeys(presses, t);
  for (const [led, g] of LED_GEO) {
    let pot = 0;
    for (let i = 0; i < held.length; i++) {
      const p = held[i];
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * ROW) + 0.7;
      // Alternating sign, so an even chord makes visible null lines.
      pot += (i % 2 === 0 ? 1 : -1) / d;
    }
    if (!held.length) { f.set(led, [3, 3, 8]); continue; }
    const bands = 0.5 + 0.5 * Math.sin(pot * 22 - t * 2);
    const v = clamp01(bands * clamp01(Math.abs(pot) * 2.2));
    f.set(led, hsv(pot > 0 ? 0.02 : 0.58, 0.9, v));
  }
  return f;
};
