/**
 * Rhythm effects — *when* you press, not where or in what order.
 *
 * Everything here is built on the gaps between presses: the beat you are
 * typing to, how steady it is, and whether you are pushing or dragging
 * against it. Type the same keys at a different cadence and the board
 * changes; that is the family's defining property.
 */

import {
  ALL_LEDS, BOARD_W, LED_GEO, type Frame, type Press, type ReactiveFn,
  addTo, age, clamp01, gaps, hsv, inOrder, latest, maxTo, rate, within,
} from './core';

/** Gaps worth calling a beat — faster than this is a fumble, slower a pause. */
const MIN_GAP = 0.04, MAX_GAP = 2;

/** The beat you are typing to: the median recent gap, or 0 if there is none. */
function period(presses: readonly Press[], t: number, span = 4): number {
  const g = gaps(within(presses, t, span)).filter((x) => x > MIN_GAP && x < MAX_GAP);
  if (!g.length) return 0;
  g.sort((a, b) => a - b);
  return g[g.length >> 1];
}

/**
 * How steady the beat is, 0..1. Mean absolute deviation from the median,
 * normalised — a metronome scores 1, random typing scores near 0.
 */
function steadiness(presses: readonly Press[], t: number, span = 4): number {
  const g = gaps(within(presses, t, span)).filter((x) => x > MIN_GAP && x < MAX_GAP);
  if (g.length < 2) return 0;
  const sorted = [...g].sort((a, b) => a - b);
  const med = sorted[sorted.length >> 1];
  if (med <= 0) return 0;
  const dev = g.reduce((s, x) => s + Math.abs(x - med), 0) / g.length;
  return clamp01(1 - dev / med);
}

/** Marks the keys you just hit, so a rhythm effect is never a dead board. */
function marks(f: Frame, presses: readonly Press[], t: number, hue: number, life = 6) {
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * life);
    if (v > 0.05) maxTo(f, p.led, hsv(hue, 0.6, Math.min(1, v)));
  }
}

/** A tick that swings across the board at whatever tempo you are typing. */
export const metronome: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const per = period(presses, t);
  const last = latest(presses);
  if (!per || !last) { marks(f, presses, t, 0.15); return f; }
  // Phase is measured from the last press, so the tick lands on your beat
  // rather than on some arbitrary clock the effect started with.
  const phase = ((t - last.t) / per) % 1;
  const x = (phase < 0.5 ? phase * 2 : 2 - phase * 2) * BOARD_W;
  for (const [led, g] of LED_GEO) {
    const v = Math.exp(-((g.ux - x) ** 2) / 1.6);
    if (v < 0.05) continue;
    addTo(f, led, hsv(0.15, 0.8, Math.min(1, v)));
  }
  marks(f, presses, t, 0.15);
  return f;
};

/** Presses crowded into a moment set off a flare; even typing does not. */
export const burst: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const recent = within(presses, t, 0.5);
  const load = clamp01(recent.length / 6);
  if (load > 0.05) {
    for (const led of ALL_LEDS) {
      addTo(f, led, hsv(0.06 + load * 0.1, 0.9 - load * 0.5,
        Math.min(1, load * load * 0.85)));
    }
  }
  for (const p of presses) {
    const v = Math.exp(-age(p, t) * 4) * (0.4 + load * 0.6);
    if (v > 0.05) maxTo(f, p.led, hsv(0.06, 0.85, Math.min(1, v)));
  }
  return f;
};

/** Long-short-long typing leans the board; even typing sits square. */
export const swing: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const g = gaps(within(presses, t, 4)).filter((x) => x > MIN_GAP && x < MAX_GAP);
  let lean = 0;
  for (let i = 1; i < g.length; i++) {
    // Each pair of gaps votes: longer-then-shorter leans one way, the
    // reverse leans the other. Averaging them gives the swing.
    const sum = g[i] + g[i - 1];
    if (sum > 0) lean += (g[i - 1] - g[i]) / sum;
  }
  lean = g.length > 1 ? clamp01(lean / (g.length - 1) * 0.5 + 0.5) : 0.5;
  for (const [led, gp] of LED_GEO) {
    const u = gp.ux / BOARD_W;
    const v = 0.05 + 0.5 * Math.exp(-((u - lean) ** 2) / 0.05);
    f.set(led, hsv(0.75 - lean * 0.3, 0.85, v));
  }
  marks(f, presses, t, 0.75 - lean * 0.3, 5);
  return f;
};

/** On-beat presses stay green; presses off the beat go red. */
export const beatGrid: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const per = period(presses, t);
  const seq = inOrder(presses);
  const anchor = seq.length ? seq[0].t : 0;
  for (const p of seq) {
    const v = clamp01(1 - age(p, t) / 3);
    if (v < 0.04) continue;
    if (!per) { maxTo(f, p.led, hsv(0.33, 0.8, Math.min(1, v))); continue; }
    // Distance to the nearest beat line, as a fraction of half a beat.
    const ph = ((p.t - anchor) / per) % 1;
    const off = Math.min(ph, 1 - ph) * 2;
    maxTo(f, p.led, hsv(0.33 * (1 - off), 0.9, Math.min(1, v * (1 - off * 0.4))));
  }
  return f;
};

/** A travelling wave whose frequency is however fast you are typing. */
export const pulseWave: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const r = clamp01(rate(presses, t, 2) / 8);
  const freq = 0.4 + r * 3.5;
  for (const [led, g] of LED_GEO) {
    const w = 0.5 + 0.5 * Math.sin((g.ux / BOARD_W) * 6.28 * freq - t * (1 + r * 6));
    f.set(led, hsv(0.6 - r * 0.5, 0.85, 0.05 + w * (0.12 + r * 0.7)));
  }
  marks(f, presses, t, 0.6 - r * 0.5, 6);
  return f;
};

/** The whole board flashes on your beat — and only if the beat is steady. */
export const strobe: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const per = period(presses, t);
  const lock = steadiness(presses, t);
  const last = latest(presses);
  if (per && last && lock > 0.15) {
    const phase = ((t - last.t) / per) % 1;
    // A short flash at the top of each beat, sharpened by how locked-in the
    // rhythm is: sloppy timing gives a soft throb, tight timing a hard strobe.
    const v = Math.exp(-phase * (6 + lock * 20)) * lock;
    if (v > 0.03) for (const led of ALL_LEDS) addTo(f, led, hsv(0.5, 0.35, Math.min(1, v)));
  }
  marks(f, presses, t, 0.5, 5);
  return f;
};

/** Builds toward the moment your next press is due, then resets. */
export const anticipate: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const per = period(presses, t);
  const last = latest(presses);
  if (!per || !last) { marks(f, presses, t, 0.85); return f; }
  const due = clamp01((t - last.t) / per);
  for (const [led, g] of LED_GEO) {
    // A ring closing in on the last key: it arrives as the next press is due.
    const d = Math.hypot(g.ux - last.ux, (g.uy - last.uy) * 2.4);
    const r = (1 - due) * 7;
    const v = Math.exp(-((d - r) ** 2) / 1.5) * (0.3 + due * 0.7);
    if (v < 0.05) continue;
    addTo(f, led, hsv(0.85 - due * 0.2, 0.85, Math.min(1, v)));
  }
  maxTo(f, last.led, hsv(0.85, 0.5, Math.min(1, 0.3 + due * 0.7)));
  return f;
};

/** The last few gaps drawn as bars — your cadence, read left to right. */
export const groove: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const g = gaps(within(presses, t, 5)).slice(-8);
  for (const led of ALL_LEDS) f.set(led, [2, 2, 5]);
  if (!g.length) { marks(f, presses, t, 0.45); return f; }
  const cols = g.length;
  for (const [led, gp] of LED_GEO) {
    const i = Math.min(cols - 1, Math.floor((gp.ux / BOARD_W) * cols));
    // Short gap means a tall, warm bar; a long gap is short and cool.
    const h = clamp01(1 - g[i] / 0.6);
    const u = 1 - gp.uy / 5;
    if (u <= h) f.set(led, hsv(0.33 - h * 0.33, 0.9, 0.15 + h * 0.7));
  }
  marks(f, presses, t, 0.45, 8);
  return f;
};

/** Each press lands in the column matching where it fell in the beat. */
export const drumline: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const per = period(presses, t) || 0.4;
  const seq = inOrder(presses);
  const anchor = seq.length ? seq[0].t : 0;
  for (const p of seq) {
    const v = clamp01(1 - age(p, t) / 2.5);
    if (v < 0.04) continue;
    const ph = (((p.t - anchor) / per) % 1 + 1) % 1;
    const x = ph * BOARD_W;
    for (const [led, g] of LED_GEO) {
      const s = v * Math.exp(-((g.ux - x) ** 2) / 0.9);
      if (s < 0.05) continue;
      addTo(f, led, hsv(0.05 + ph * 0.5, 0.9, Math.min(1, s)));
    }
  }
  return f;
};
