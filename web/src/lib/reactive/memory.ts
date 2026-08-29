/**
 * Memory effects — the board remembers a minute of typing, not six seconds.
 *
 * These are the only effects that ask the panel for a longer history
 * (MEMORY_WINDOW), which is why they are registered with an explicit
 * `window`. They still hold no state of their own: everything is derived
 * from the buffer on each frame, so they stay pure and reproducible. The
 * family's defining property is that a minute of typing looks different
 * from a single press, in a way six seconds of typing cannot.
 *
 * With that much history the buffer can hold hundreds of presses, so every
 * effect here aggregates per key in one pass and then walks the board once.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_GEO, NEIGHBOURS8,
  type Frame, type Press, type ReactiveFn,
  addTo, age, clamp01, hsv, inOrder, latest, maxTo,
} from './core';

/** Decayed use per key. `life` sets how long the board's memory really is. */
function usage(presses: readonly Press[], t: number, life = 25) {
  const u = new Map<number, number>();
  let total = 0;
  for (const p of presses) {
    const w = Math.exp(-age(p, t) / life);
    u.set(p.led, (u.get(p.led) ?? 0) + w);
    total += w;
  }
  return { u, total };
}

/** Keys you lean on take on colour, the way brass does under a thumb. */
export const patina: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const { u } = usage(presses, t, 30);
  for (const led of ALL_LEDS) {
    const n = u.get(led) ?? 0;
    // Copper through to verdigris: a slow walk, so heavy use is a colour
    // you arrive at rather than a brightness you switch on.
    const k = clamp01(n / 6);
    f.set(led, hsv(0.06 + k * 0.36, 0.85 - k * 0.25, 0.06 + k * 0.6));
  }
  const last = latest(presses);
  if (last) {
    const v = Math.exp(-age(last, t) * 4);
    if (v > 0.05) maxTo(f, last.led, hsv(0.1, 0.3, Math.min(1, v)));
  }
  return f;
};

/** Everything starts bright; the keys you use most wear down first. */
export const erosion: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const { u } = usage(presses, t, 40);
  for (const led of ALL_LEDS) {
    const worn = clamp01((u.get(led) ?? 0) / 8);
    f.set(led, hsv(0.58, 0.35 + worn * 0.5, 0.7 * (1 - worn) + 0.04));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(0.02, 0.85, Math.min(1, v)));
  }
  return f;
};

/** A ring per stretch of activity, laid down from the middle outward. */
export const treeRings: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  const cx = BOARD_W / 2, cy = (BOARD_H - 1) / 2;
  if (!seq.length) { for (const led of ALL_LEDS) f.set(led, [3, 2, 2]); return f; }
  const span = t - seq[0].t;
  // One ring per eight seconds of history, thickest where you typed most.
  const rings = Math.max(1, Math.min(7, Math.ceil(span / 8)));
  const perRing = new Array(rings).fill(0);
  for (const p of seq) {
    const i = Math.min(rings - 1, Math.floor(((t - p.t) / (span || 1)) * rings));
    perRing[i] += 1;
  }
  const peak = Math.max(1, ...perRing);
  for (const [led, g] of LED_GEO) {
    const d = Math.hypot(g.ux - cx, (g.uy - cy) * 2.4) / 11;
    const i = Math.min(rings - 1, Math.floor(d * rings));
    const dense = perRing[i] / peak;
    // Sharp edges between rings read as growth lines rather than a gradient.
    const edge = 0.75 + 0.25 * Math.cos(d * rings * Math.PI * 2);
    f.set(led, hsv(0.08 + dense * 0.06, 0.8, 0.05 + dense * edge * 0.7));
  }
  return f;
};

/** Activity settles to the bottom of the board and stacks up in layers. */
export const sediment: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const { total } = usage(presses, t, 45);
  const level = clamp01(total / 45);
  for (const [led, g] of LED_GEO) {
    // Rows fill from the bottom up; the top of the pile is the brightest.
    const depth = 1 - g.uy / (BOARD_H - 1);
    const under = depth <= level;
    const near = clamp01(1 - Math.abs(depth - level) * 4);
    f.set(led, under
      ? hsv(0.1 - depth * 0.06, 0.85, 0.12 + (1 - depth) * 0.35 + near * 0.4)
      : [2, 2, 5]);
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 5);
    if (v > 0.05) maxTo(f, p.led, hsv(0.13, 0.3, Math.min(1, v)));
  }
  return f;
};

/** The board learns your hands: the keys you actually use stay lit. */
export const familiarity: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const { u, total } = usage(presses, t, 50);
  const ranked = [...u.entries()].sort((a, b) => b[1] - a[1]);
  const peak = ranked.length ? ranked[0][1] : 1;
  // How much the board has actually learned. Share alone is relative — one
  // press is 100% of one press — so absolute volume sets the confidence.
  const known = clamp01(total / 25);
  for (const led of ALL_LEDS) f.set(led, [2, 2, 6]);
  ranked.forEach(([led, n], i) => {
    const share = n / peak;
    // Rank picks the hue, share picks the brightness, so the top handful
    // are distinguishable from each other and not just "bright".
    if (share < 0.05) return;
    f.set(led, hsv(0.33 - Math.min(i, 12) * 0.027, 0.9,
      0.06 + share * (0.12 + known * 0.78)));
  });
  return f;
};

/** Heat that takes most of a minute to fade, not most of a second. */
export const emberField: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const heat = new Map<number, number>();
  // Spread once per press over its own neighbourhood rather than over the
  // whole board: with hundreds of presses the difference matters.
  for (const p of presses) {
    const w = Math.exp(-age(p, t) / 20);
    if (w < 0.02) continue;
    heat.set(p.led, (heat.get(p.led) ?? 0) + w);
    for (const n of NEIGHBOURS8.get(p.led) ?? []) {
      heat.set(n, (heat.get(n) ?? 0) + w * 0.35);
    }
  }
  for (const led of ALL_LEDS) {
    const h = clamp01((heat.get(led) ?? 0) / 4);
    f.set(led, h < 0.02 ? [3, 1, 0] : hsv(0.02 + h * 0.12, 1 - h * 0.7, 0.08 + h * 0.9));
  }
  return f;
};

/** What you typed a while ago replays as a faint ghost of itself. */
export const ghostTyping: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  if (!seq.length) return f;
  const span = Math.max(1, t - seq[0].t);
  // A playhead sweeping the whole remembered span, on a loop.
  const head = (t % span);
  for (const p of seq) {
    const back = t - p.t;
    const d = Math.abs(back - head);
    const ghost = clamp01(1 - d / 0.6) * clamp01(back / 3);
    const fresh = Math.exp(-back * 2.5);
    const v = Math.max(ghost * 0.55, fresh);
    if (v < 0.05) continue;
    maxTo(f, p.led, hsv(0.52, ghost > fresh ? 0.35 : 0.85, Math.min(1, v)));
  }
  return f;
};

/** Your keystrokes seed a pattern that then lives on without you. */
export const evolve: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const { u } = usage(presses, t, 30);
  const live0 = new Set<number>(ALL_LEDS.filter((led) => (u.get(led) ?? 0) > 0.15));
  // A key you have leant on all session seeds its neighbours too. Without
  // this a lone cell simply dies on the first generation, and a minute of
  // typing would evolve into exactly the same nothing as a single press.
  for (const [led, n] of u) {
    if (n > 3) for (const x of NEIGHBOURS8.get(led) ?? []) live0.add(x);
  }
  let live = live0;
  // One generation every couple of seconds, capped so a long session does
  // not turn a per-frame render into a long simulation.
  const gens = Math.min(8, Math.floor(t / 2));
  for (let g = 0; g < gens; g++) {
    const next = new Set<number>();
    for (const led of ALL_LEDS) {
      let n = 0;
      for (const x of NEIGHBOURS8.get(led) ?? []) if (live.has(x)) n++;
      if (live.has(led) ? n === 2 || n === 3 : n === 3) next.add(led);
    }
    live = next;
  }
  for (const led of ALL_LEDS) {
    // The pattern can and does die out — that is Life. Underneath it sits a
    // dim record of where the typing actually happened, so the board still
    // shows what it has learned once the cells are gone.
    const n = clamp01((u.get(led) ?? 0) / 6);
    f.set(led, live.has(led)
      ? hsv(0.35 + gens * 0.03, 0.85, 0.75)
      : hsv(0.55, 0.8, 0.02 + n * 0.28));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 4);
    if (v > 0.05) maxTo(f, p.led, hsv(0.15, 0.6, Math.min(1, v)));
  }
  return f;
};

/** Every key holds a charge: pressing spends it, and it comes back slowly. */
export const recharge: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const spent = new Map<number, number>();
  for (const p of presses) {
    // Each press digs the key's charge down; recovery is the exponential
    // back toward full, so a key hammered repeatedly stays flat.
    spent.set(p.led, (spent.get(p.led) ?? 0) + Math.exp(-age(p, t) / 9));
  }
  for (const led of ALL_LEDS) {
    const energy = clamp01(1 - (spent.get(led) ?? 0) * 0.55);
    f.set(led, hsv(0.33 * energy, 0.9, 0.08 + energy * 0.62));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 6);
    if (v > 0.05) addTo(f, p.led, hsv(0.0, 0.9, Math.min(1, v * 0.8)));
  }
  return f;
};
