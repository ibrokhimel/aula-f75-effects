/**
 * Idle effects — the pause is the input.
 *
 * These key off `sinceLast`: how long the board has been waiting. Typing
 * resets them, and what is interesting happens in the silence afterwards.
 * The family's defining property: leave the board alone and it keeps
 * changing, where most effects would simply have decayed to nothing.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_GEO,
  type Frame, type Press, type ReactiveFn,
  addTo, age, blob, clamp01, hash2Seq, hsv, inOrder, latest, maxTo, sinceLast,
} from './core';

/** Idle time, with "never pressed anything" treated as a long wait. */
const idleFor = (presses: readonly Press[], t: number) => {
  const s = sinceLast(presses, t);
  return Number.isFinite(s) ? s : Math.max(0, t);
};

/** Marks the key you just hit — the wake-up event itself. */
function mark(f: Frame, presses: readonly Press[], t: number, hue: number) {
  const p = latest(presses);
  if (!p) return;
  const v = Math.exp(-age(p, t) * 3.5);
  if (v > 0.05) maxTo(f, p.led, hsv(hue, 0.4, Math.min(1, v)));
}

/** The board goes to sleep when you stop, and startles awake when you type. */
export const sleep: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  // Awake, drifting off, then asleep with a slow drift across the board.
  const awake = Math.exp(-idle / 2.5);
  const drift = 0.5 + 0.5 * Math.sin(t * 0.6);
  for (const [led, g] of LED_GEO) {
    const dim = 0.02 + 0.03 * (0.5 + 0.5 * Math.sin(g.ux * 0.4 + t * 0.5)) * drift;
    f.set(led, hsv(0.62 - awake * 0.15, 0.85, dim + awake * 0.55));
  }
  mark(f, presses, t, 0.5);
  return f;
};

/** Coming back after a real pause gets a sweep; carrying on does not. */
export const wake: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = inOrder(presses);
  // The most recent press that followed a genuine gap is the resumption.
  let resumed: Press | null = null;
  for (let i = 0; i < seq.length; i++) {
    const gap = i === 0 ? Infinity : seq[i].t - seq[i - 1].t;
    if (gap > 1.5) resumed = seq[i];
  }
  const idle = idleFor(presses, t);
  const base = 0.03 + 0.05 * Math.exp(-idle / 4);
  for (const led of ALL_LEDS) f.set(led, hsv(0.55, 0.8, base));
  if (resumed) {
    const a = age(resumed, t);
    if (a < 1.1) {
      const x = resumed.ux + (a / 1.1) * BOARD_W * 1.4 - BOARD_W * 0.2;
      const env = 1 - a / 1.1;
      for (const [led, g] of LED_GEO) {
        const v = env * Math.exp(-((g.ux - x) ** 2) / 3.5);
        if (v < 0.05) continue;
        addTo(f, led, hsv(0.13, 0.55, Math.min(1, v)));
      }
    }
  }
  mark(f, presses, t, 0.13);
  return f;
};

/** Dust settles while you sit still, and scatters the moment you type. */
export const settlingDust: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  const settled = clamp01(idle / 6);
  for (const [led, g] of LED_GEO) {
    // Each key gets its own mote, drifting until it comes to rest on the
    // bottom rows as the idle stretches on.
    const seed = hash2Seq(led, 3);
    const fall = (t * 0.25 * (1 - settled) + seed) % 1;
    const rest = (BOARD_H - 1) - seed * 1.5;
    const y = fall * (BOARD_H - 1) * (1 - settled) + rest * settled;
    const v = Math.exp(-((g.uy - y) ** 2) / 0.45) * (0.15 + settled * 0.5);
    f.set(led, v > 0.03 ? hsv(0.1, 0.35, Math.min(1, v)) : [2, 2, 3]);
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 3);
    if (v > 0.05) blob(f, p.ux, p.uy, 1.6, 0.1, v * 0.9, 0.2);
  }
  return f;
};

/** A long, slow breath that only gets going once you leave it alone. */
export const slowBreath: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  const depth = clamp01(idle / 5);
  // Deep and slow when idle; shallow and quick while you are still typing.
  const rateHz = 0.9 - depth * 0.65;
  const wave = 0.5 + 0.5 * Math.sin(t * rateHz * 6.28);
  const amp = 0.08 + depth * 0.5;
  for (const led of ALL_LEDS) {
    f.set(led, hsv(0.55 + depth * 0.15, 0.8, 0.03 + wave * amp));
  }
  mark(f, presses, t, 0.55);
  return f;
};

/** A bar that drains while you are idle and refills when you type. */
export const countdown: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  const left = clamp01(1 - idle / 8);
  for (const [led, g] of LED_GEO) {
    f.set(led, g.ux / BOARD_W <= left
      ? hsv(0.33 * left, 0.9, 0.18 + left * 0.6)
      : [3, 2, 2]);
  }
  // The leading edge blinks as the bar runs out, so the last stretch reads
  // as urgent rather than as a bar that is merely short.
  if (left > 0 && left < 0.3) {
    const blink = 0.5 + 0.5 * Math.sin(t * 12);
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.ux / BOARD_W - left) > 0.06) continue;
      addTo(f, led, hsv(0.0, 0.9, Math.min(1, blink * 0.8)));
    }
  }
  mark(f, presses, t, 0.33);
  return f;
};

/** Sand runs from the top of the board to the bottom while you wait. */
export const hourglass: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  const run = clamp01(idle / 10);
  for (const [led, g] of LED_GEO) {
    const row = g.uy / (BOARD_H - 1);
    // Grains leave the top half and pile up in the bottom half.
    const top = row < 0.5 ? clamp01(1 - run * 2 + row) : 0;
    const bottom = row >= 0.5 ? clamp01(run * 2 - (1 - row) * 2) : 0;
    const v = Math.max(top, bottom);
    f.set(led, v > 0.03 ? hsv(0.11, 0.85, 0.06 + v * 0.7) : [3, 2, 2]);
  }
  // The stream through the waist keeps moving for as long as sand is left.
  if (run < 1) {
    const mid = (BOARD_H - 1) / 2;
    for (const [led, g] of LED_GEO) {
      if (Math.abs(g.ux - BOARD_W / 2) > 1.2 || Math.abs(g.uy - mid) > 1.5) continue;
      const flow = 0.5 + 0.5 * Math.sin(t * 9 - g.uy * 3);
      addTo(f, led, hsv(0.13, 0.7, Math.min(1, flow * 0.55)));
    }
  }
  mark(f, presses, t, 0.11);
  return f;
};

/** Frost creeps across the board while it is idle, and a press melts it. */
export const frost: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  const cover = clamp01(idle / 7);
  for (const [led, g] of LED_GEO) {
    // Frost grows in from the edges, so the middle is the last to go.
    const edge = Math.min(g.ux, BOARD_W - g.ux) / (BOARD_W / 2);
    const grain = hash2Seq(led, 5);
    const frozen = clamp01((cover * 1.6 - edge) * 1.5) * (0.6 + grain * 0.4);
    f.set(led, hsv(0.55, 0.35 + (1 - frozen) * 0.4, 0.03 + frozen * 0.65));
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 1.6);
    if (v < 0.05) continue;
    // Melting removes light rather than adding it, so the hole is real.
    for (const [led, g] of LED_GEO) {
      const d = Math.hypot(g.ux - p.ux, (g.uy - p.uy) * 2.4);
      const melt = v * Math.exp(-(d * d) / 4);
      if (melt < 0.05) continue;
      const c = f.get(led) ?? [0, 0, 0];
      const k = 1 - Math.min(0.95, melt);
      f.set(led, [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]);
    }
    maxTo(f, p.led, hsv(0.08, 0.8, Math.min(1, v)));
  }
  return f;
};

/** A pulse that races while you type and settles to a resting rate. */
export const heartbeat: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const idle = idleFor(presses, t);
  const calm = clamp01(idle / 6);
  const bpm = 2.2 - calm * 1.4;
  const ph = (t * bpm) % 1;
  // Two thumps per beat — the second smaller, the way a heartbeat is.
  const thump = Math.exp(-ph * 22) + 0.55 * Math.exp(-Math.abs(ph - 0.18) * 26);
  const cx = BOARD_W / 2, cy = (BOARD_H - 1) / 2;
  for (const [led, g] of LED_GEO) {
    const d = Math.hypot(g.ux - cx, (g.uy - cy) * 2.4) / 11;
    const v = thump * Math.exp(-d * 1.6);
    f.set(led, hsv(0.98, 0.85, clamp01(0.03 + v * 0.85)));
  }
  mark(f, presses, t, 0.98);
  return f;
};
