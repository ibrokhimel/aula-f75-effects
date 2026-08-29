/**
 * Gesture effects — movement across the board, inferred from where
 * successive presses land.
 *
 * A press on its own carries no direction, so everything here reads the
 * vector *between* presses: which way you are travelling, how sharply you
 * are turning, whether you have come back on yourself. Type the same run
 * backwards and the board reverses with you.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_GEO, type Frame, type Press, type ReactiveFn,
  ROW_SCALE, addTo, age, blob, clamp01, hsv, latest, maxTo, newestFirst, segment,
} from './core';

/** A movement too short to have a direction — the same key hit twice. */
const MIN_TRAVEL = 0.4;

interface Travel {
  from: Press; to: Press;
  /** Unit direction, with vertical distance already row-scaled. */
  dx: number; dy: number;
  len: number; ang: number;
}

/** The latest movement, or null if there is not one yet. */
function travel(presses: readonly Press[]): Travel | null {
  const seq = newestFirst(presses);
  for (let i = 1; i < seq.length && i < 4; i++) {
    const to = seq[0], from = seq[i];
    const dx = to.ux - from.ux, dy = (to.uy - from.uy) * ROW_SCALE;
    const len = Math.hypot(dx, dy);
    if (len < MIN_TRAVEL) continue;
    return { from, to, dx: dx / len, dy: dy / len, len, ang: Math.atan2(dy, dx) };
  }
  return null;
}

/** Marks the latest press — a gesture effect still has to answer one key. */
function mark(f: Frame, presses: readonly Press[], t: number, hue: number) {
  const p = latest(presses);
  if (!p) return;
  const v = Math.exp(-age(p, t) * 4);
  if (v > 0.05) maxTo(f, p.led, hsv(hue, 0.6, Math.min(1, v)));
}

/** The direction you moved becomes a sweep across the whole board. */
export const swipe: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const m = travel(presses);
  if (!m) { mark(f, presses, t, 0.55); return f; }
  const a = age(m.to, t);
  if (a > 1.2) { mark(f, presses, t, 0.55); return f; }
  const env = 1 - a / 1.2;
  // Project every key onto the direction of travel; the band races along it.
  const head = -6 + a * 26;
  for (const [led, g] of LED_GEO) {
    const u = (g.ux - m.to.ux) * m.dx + (g.uy - m.to.uy) * ROW_SCALE * m.dy;
    const v = env * Math.exp(-((u - head) ** 2) / 5);
    if (v < 0.05) continue;
    addTo(f, led, hsv(0.55 + m.ang * 0.08, 0.85, Math.min(1, v)));
  }
  return f;
};

/** Three presses define an arc; it is drawn through all three. */
export const arc: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = newestFirst(presses).slice(0, 3);
  if (seq.length < 3) { mark(f, presses, t, 0.3); return f; }
  const [c, b, a] = seq; // a → b → c in time order
  const env = clamp01(1 - age(c, t) / 2);
  if (env < 0.04) { mark(f, presses, t, 0.3); return f; }
  // Sample a quadratic Bézier with the middle press pulled out as the
  // control point, which bows the curve through it rather than past it.
  const cx = 2 * b.ux - (a.ux + c.ux) / 2;
  const cy = 2 * b.uy - (a.uy + c.uy) / 2;
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, w = 1 - u;
    const x = w * w * a.ux + 2 * w * u * cx + u * u * c.ux;
    const y = w * w * a.uy + 2 * w * u * cy + u * u * c.uy;
    blob(f, x, y, 0.75, 0.3 + u * 0.25, env * 0.75);
  }
  return f;
};

/** Doubling back on yourself throws a bolt between the two ends. */
export const zigzag: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = newestFirst(presses).slice(0, 6);
  for (let i = 2; i < seq.length; i++) {
    const c = seq[i - 2], b = seq[i - 1], a = seq[i]; // a → b → c
    const d1 = b.ux - a.ux, d2 = c.ux - b.ux;
    // A reversal in horizontal travel, both legs long enough to count.
    if (d1 * d2 >= 0 || Math.abs(d1) < 1 || Math.abs(d2) < 1) continue;
    const v = clamp01(1 - age(c, t) / 1.6) * clamp01(1 - (i - 2) / 5);
    if (v < 0.05) continue;
    const flick = 0.55 + 0.45 * Math.sin(t * 40 + i);
    segment(f, a.ux, a.uy, b.ux, b.uy, 0.16, v * flick, 0.5);
    segment(f, b.ux, b.uy, c.ux, c.uy, 0.16, v * flick, 0.5);
  }
  mark(f, presses, t, 0.16);
  return f;
};

/** Move around the board in a loop and a ring closes as you come round. */
export const circle: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = newestFirst(presses).slice(0, 8).reverse();
  let turn = 0;
  for (let i = 2; i < seq.length; i++) {
    const a = seq[i - 2], b = seq[i - 1], c = seq[i];
    const ax = b.ux - a.ux, ay = (b.uy - a.uy) * ROW_SCALE;
    const bx = c.ux - b.ux, by = (c.uy - b.uy) * ROW_SCALE;
    if (Math.hypot(ax, ay) < MIN_TRAVEL || Math.hypot(bx, by) < MIN_TRAVEL) continue;
    // Signed angle between consecutive legs — accumulate to a full turn.
    turn += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  }
  const closed = clamp01(Math.abs(turn) / (Math.PI * 2));
  const cx = BOARD_W / 2, cy = (BOARD_H - 1) / 2;
  const dir = turn >= 0 ? 1 : -1;
  for (const [led, g] of LED_GEO) {
    const dx = g.ux - cx, dy = (g.uy - cy) * ROW_SCALE;
    const d = Math.hypot(dx, dy);
    const ring = Math.exp(-((d - 5) ** 2) / 4);
    // Only the swept fraction of the ring is lit, so it visibly closes.
    const ang = ((Math.atan2(dy, dx) * dir / (Math.PI * 2)) % 1 + 1) % 1;
    const v = ring * (ang <= closed ? 1 : 0.08);
    if (v < 0.04) continue;
    addTo(f, led, hsv(0.45 + closed * 0.35, 0.85, Math.min(1, v * (0.25 + closed * 0.75))));
  }
  mark(f, presses, t, 0.45);
  return f;
};

/** An arrow from the last press through the current one, and beyond. */
export const vector: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const m = travel(presses);
  if (!m) { mark(f, presses, t, 0.08); return f; }
  const env = clamp01(1 - age(m.to, t) / 1.8);
  if (env < 0.04) { mark(f, presses, t, 0.08); return f; }
  segment(f, m.from.ux, m.from.uy, m.to.ux, m.to.uy, 0.08, env * 0.8, 0.55);
  // The shaft continues past the key you actually hit, fading out.
  for (let i = 1; i <= 8; i++) {
    const k = i / 8;
    blob(f, m.to.ux + m.dx * i * 1.2, m.to.uy + (m.dy / ROW_SCALE) * i * 1.2,
      0.7, 0.08 + k * 0.08, env * (1 - k) * 0.7);
  }
  return f;
};

/** The path between the two presses smears, as if dragged. */
export const smear: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = newestFirst(presses).slice(0, 6);
  for (let i = 1; i < seq.length; i++) {
    const b = seq[i - 1], a = seq[i];
    const v = clamp01(1 - age(b, t) / 2.4) * clamp01(1 - i / 6);
    if (v < 0.05) continue;
    // Widening the stroke with age is what makes it read as a smear rather
    // than a clean line: the paint spreads as it fades.
    segment(f, a.ux, a.uy, b.ux, b.uy, b.hue, v * 0.85, 0.5 + age(b, t) * 1.2);
  }
  mark(f, presses, t, 0.5);
  return f;
};

/** A mote flung off in the direction you were moving, coasting to a stop. */
export const momentum: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const m = travel(presses);
  if (!m) { mark(f, presses, t, 0.75); return f; }
  const a = age(m.to, t);
  if (a > 2) { mark(f, presses, t, 0.75); return f; }
  // Exponential drag: quick at first, then coasting to a halt.
  const dist = (1 - Math.exp(-a * 1.8)) * m.len * 3.5;
  const x = m.to.ux + m.dx * dist;
  const y = m.to.uy + (m.dy / ROW_SCALE) * dist;
  blob(f, x, y, 1.1, 0.75, (1 - a / 2) * 0.95);
  segment(f, m.to.ux, m.to.uy, x, y, 0.75, (1 - a / 2) * 0.3, 0.5);
  return f;
};

/** The whole board tilts a gradient toward the way you are travelling. */
export const compass: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const m = travel(presses);
  const last = latest(presses);
  const env = last ? clamp01(1 - age(last, t) / 3) : 0;
  const dx = m ? m.dx : 0, dy = m ? m.dy : 0;
  const cx = BOARD_W / 2, cy = (BOARD_H - 1) / 2;
  for (const [led, g] of LED_GEO) {
    // How far along the travel direction this key sits, normalised.
    const u = clamp01(0.5 + ((g.ux - cx) * dx + (g.uy - cy) * ROW_SCALE * dy) / 20);
    f.set(led, hsv(0.6 - u * 0.55, 0.9, 0.04 + u * env * 0.75));
  }
  mark(f, presses, t, 0.1);
  return f;
};

/** The whole recent path drawn as one continuous stroke. */
export const scribble: ReactiveFn = (t, presses) => {
  const f: Frame = new Map();
  const seq = newestFirst(presses).slice(0, 10).reverse();
  if (seq.length < 2) { mark(f, presses, t, 0.62); return f; }
  for (const led of ALL_LEDS) f.set(led, [2, 2, 4]);
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    const v = clamp01(1 - age(b, t) / 4) * (0.35 + 0.65 * (i / (seq.length - 1)));
    if (v < 0.05) continue;
    segment(f, a.ux, a.uy, b.ux, b.uy, 0.62 - i * 0.02, v * 0.8, 0.45);
  }
  return f;
};
