/**
 * Reactive effects — lighting that responds to keypresses.
 *
 * The third shape in this codebase. Animations are pure functions of time;
 * games own mutable state and consume input. A reactive effect is in between:
 * a pure function of time *and* a rolling window of recent presses, so it
 * stays as testable and reproducible as an animation while still reacting.
 *
 *   (t, presses) => Frame
 *
 * The panel owns the press buffer and evicts anything older than WINDOW,
 * except keys still held down. Effects therefore never accumulate state and
 * can be swapped mid-typing without a reset.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_BY_NAME, LED_GEO,
  type Frame, type RGB,
  clamp01, frac, hsv,
} from '../animations';
import { CODE_LABEL } from '../layout-map';

export { ALL_LEDS, BOARD_H, BOARD_W, LED_BY_NAME, LED_GEO, clamp01, frac, hsv };
export type { Frame, RGB };

/** How long a released press stays in the buffer. Effects must decay inside this. */
export const WINDOW = 6;

export interface Press {
  led: number;
  ux: number;
  uy: number;
  /** Seconds on the effect clock when the key went down. */
  t: number;
  /** Seconds when it came up, or null while still held. */
  release: number | null;
  /** Monotonic counter — stable identity for hashing colour, order, etc. */
  seq: number;
  /** Deterministic hue for this press, so a key keeps its colour as it decays. */
  hue: number;
}

export type ReactiveFn = (t: number, presses: readonly Press[]) => Frame;

export interface ReactiveDef {
  name: string;
  category: ReactiveCategory;
  fn: ReactiveFn;
}

export const REACTIVE_CATEGORIES = [
  'Point', 'Ripple', 'Sweep', 'Particle', 'Field', 'Reveal', 'Chain', 'Spread',
] as const;
export type ReactiveCategory = (typeof REACTIVE_CATEGORIES)[number];

// ── Press helpers ───────────────────────────────────────────────────────

// All three clamp at 0. A render can legitimately be asked for a moment
// before a press was released — the frame is built from a snapshot of the
// buffer, and nothing guarantees the clock has passed every timestamp in it.
// Left unclamped, a negative age turns exp(-k*age) into a value above 1 and
// every channel derived from it overflows or goes negative.
export const age = (p: Press, t: number) => Math.max(0, t - p.t);
/**
 * Held *at time t* — not merely "never released". A frame can be rendered for
 * a moment before a press came up, and at that moment the key really was down.
 */
export const isHeld = (p: Press, t: number) => p.release === null || t < p.release;
/** Seconds since release, or 0 while still held. */
export const sinceUp = (p: Press, t: number) =>
  p.release === null ? 0 : Math.max(0, t - p.release);
/** How long the key was (or has been) down. */
export const heldFor = (p: Press, t: number) => Math.max(0, (p.release ?? t) - p.t);

/**
 * Standard envelope: full while held, then an exponential tail. `life` is the
 * release tail length in seconds.
 */
export function envelope(p: Press, t: number, life: number) {
  if (isHeld(p, t)) return 1;
  return Math.exp(-3 * (sinceUp(p, t) / life));
}

/** Physical distance from a press to a key, in key units. */
export function distTo(p: Press, ux: number, uy: number, rowScale = 1) {
  return Math.hypot(ux - p.ux, (uy - p.uy) * rowScale);
}

/** The most recent press, held or not. */
export function latest(presses: readonly Press[]): Press | null {
  let best: Press | null = null;
  for (const p of presses) if (!best || p.seq > best.seq) best = p;
  return best;
}

// ── Drawing ─────────────────────────────────────────────────────────────

export function addTo(f: Frame, led: number, c: RGB) {
  const prev = f.get(led);
  if (!prev) { f.set(led, c); return; }
  f.set(led, [
    prev[0] + c[0] > 255 ? 255 : prev[0] + c[0],
    prev[1] + c[1] > 255 ? 255 : prev[1] + c[1],
    prev[2] + c[2] > 255 ? 255 : prev[2] + c[2],
  ]);
}

export function maxTo(f: Frame, led: number, c: RGB) {
  const prev = f.get(led);
  if (!prev || c[0] + c[1] + c[2] > prev[0] + prev[1] + prev[2]) f.set(led, c);
}

export const dim = (c: RGB, k: number): RGB =>
  [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];

/** Paint every key, dimly — keeps an effect from reading as a dead board. */
export function floor(f: Frame, c: RGB) {
  for (const led of ALL_LEDS) maxTo(f, led, c);
}

// ── Matrix adjacency ────────────────────────────────────────────────────
// LED index encodes position as column * 6 + row, so neighbours are cheap.

const LED_SET = new Set(ALL_LEDS);
const at = (col: number, row: number) => {
  const i = col * 6 + row;
  return LED_SET.has(i) ? i : null;
};

/** Orthogonal matrix neighbours of each key. */
export const NEIGHBOURS = new Map<number, number[]>();
/** Orthogonal plus diagonal. */
export const NEIGHBOURS8 = new Map<number, number[]>();

for (const led of ALL_LEDS) {
  const col = Math.floor(led / 6), row = led % 6;
  const four: number[] = [], eight: number[] = [];
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (dc === 0 && dr === 0) continue;
      const n = at(col + dc, row + dr);
      if (n === null) continue;
      eight.push(n);
      if (dc === 0 || dr === 0) four.push(n);
    }
  }
  NEIGHBOURS.set(led, four);
  NEIGHBOURS8.set(led, eight);
}

/** LEDs sharing a physical row with `led`. */
export const ROW_OF = new Map<number, number[]>();
/** LEDs sharing a matrix column with `led`. */
export const COL_OF = new Map<number, number[]>();

for (const led of ALL_LEDS) {
  const row = led % 6, col = Math.floor(led / 6);
  ROW_OF.set(led, ALL_LEDS.filter((o) => o % 6 === row));
  COL_OF.set(led, ALL_LEDS.filter((o) => Math.floor(o / 6) === col));
}

// ── Physical key to LED ─────────────────────────────────────────────────
// KeyboardEvent.code identifies the physical key; CODE_LABEL maps it to the
// label KB_ROWS uses, which LED_BY_NAME turns into an index. Built once here
// so the panel does not have to know about any of that.

export const LED_FOR_CODE = new Map<string, number>();
for (const [code, label] of Object.entries(CODE_LABEL)) {
  const led = LED_BY_NAME.get(label);
  if (led !== undefined && !LED_FOR_CODE.has(code)) LED_FOR_CODE.set(code, led);
}
// The left/right pairs collapse to one label, so point them at the real keys.
for (const [code, label] of [
  ['ShiftLeft', 'LShift'], ['ShiftRight', 'RShift'],
  ['ControlLeft', 'LCtrl'], ['AltLeft', 'LAlt'], ['AltRight', 'RAlt'],
] as const) {
  const led = LED_BY_NAME.get(label);
  if (led !== undefined) LED_FOR_CODE.set(code, led);
}

// ── Determinism ─────────────────────────────────────────────────────────

export const hashSeq = (n: number) => frac(Math.sin(n * 127.1) * 43758.5453);
export const hash2Seq = (a: number, b: number) =>
  frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

/** Build a press record with its hue already fixed. */
export function makePress(led: number, t: number, seq: number): Press {
  const geo = LED_GEO.get(led);
  return {
    led,
    ux: geo?.ux ?? 0,
    uy: geo?.uy ?? 0,
    t,
    release: null,
    seq,
    hue: hashSeq(seq * 1.7 + 0.3),
  };
}
