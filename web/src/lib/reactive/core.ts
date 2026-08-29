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

/**
 * The horizon for effects that build genuinely long-lived state — wear,
 * familiarity, patina. The panel keeps this much history when the running
 * effect asks for it, so a Memory effect can see a minute of typing rather
 * than the six seconds everything else works from.
 */
export const MEMORY_WINDOW = 60;

/** Modifier bits carried on a press, as seen at the moment the key went down. */
export const MOD_SHIFT = 1;
export const MOD_CTRL = 2;
export const MOD_ALT = 4;

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
  /** KeyboardEvent.code — which physical key, for the Semantic family. */
  code: string;
  /** Bitmask of MOD_* that were down when this key was struck. */
  mods: number;
}

export type ReactiveFn = (t: number, presses: readonly Press[]) => Frame;

export interface ReactiveDef {
  name: string;
  category: ReactiveCategory;
  fn: ReactiveFn;
  /**
   * Seconds of press history this effect needs. Defaults to WINDOW; the
   * Memory family raises it. The panel evicts against this, and the effect
   * must have decayed by the time it elapses.
   */
  window?: number;
}

/** History horizon an effect wants, in seconds. */
export const windowFor = (def: ReactiveDef) => def.window ?? WINDOW;

export const REACTIVE_CATEGORIES = [
  'Point', 'Hold', 'Chord', 'Ripple', 'Sweep', 'Particle', 'Field', 'Reveal',
  'Chain', 'Spread', 'Sequence', 'Rhythm', 'Gesture', 'Release', 'Semantic',
  'Zones', 'Modifiers', 'Memory', 'Intensity', 'Idle',
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

/**
 * How charged a hold is, 0..1, saturating at `full` seconds. The building
 * block for the Hold family: it keeps rising while the key is down and then
 * freezes at whatever it reached, so release behaviour can scale off it.
 */
export const charge = (p: Press, t: number, full: number) =>
  clamp01(heldFor(p, t) / full);

/** Keys currently down at time t, newest last. */
export function heldKeys(presses: readonly Press[], t: number): Press[] {
  return presses.filter((p) => isHeld(p, t)).sort((a, b) => a.seq - b.seq);
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

/** Presses in strike order, oldest first. */
export const inOrder = (presses: readonly Press[]) =>
  [...presses].sort((a, b) => a.seq - b.seq);

/** Presses in strike order, newest first. */
export const newestFirst = (presses: readonly Press[]) =>
  [...presses].sort((a, b) => b.seq - a.seq);

/** Presses struck within the last `span` seconds, oldest first. */
export const within = (presses: readonly Press[], t: number, span: number) =>
  inOrder(presses.filter((p) => p.t <= t && t - p.t <= span));

/**
 * Seconds since the last key went down — the Idle family's clock. Held keys
 * count as ongoing activity, so leaning on a key is never "idle".
 */
export function sinceLast(presses: readonly Press[], t: number): number {
  let best = Infinity;
  for (const p of presses) {
    if (p.t > t) continue;
    best = Math.min(best, isHeld(p, t) ? 0 : t - p.t);
  }
  return best;
}

/** Gaps between consecutive presses, oldest first. One fewer than presses. */
export function gaps(presses: readonly Press[]): number[] {
  const seq = inOrder(presses);
  const out: number[] = [];
  for (let i = 1; i < seq.length; i++) out.push(seq[i].t - seq[i - 1].t);
  return out;
}

/**
 * Presses per second over the trailing `span`. The Intensity and Rhythm
 * families both key off this, so it lives here rather than in either.
 */
export const rate = (presses: readonly Press[], t: number, span = 2) =>
  within(presses, t, span).length / span;

/**
 * Change in typing rate: recent half against the half before it, in presses
 * per second per second. Positive means speeding up.
 */
export function accel(presses: readonly Press[], t: number, span = 3) {
  const half = span / 2;
  const now = within(presses, t, half).length / half;
  const before = presses.filter(
    (p) => t - p.t > half && t - p.t <= span,
  ).length / half;
  return (now - before) / half;
}

/** Whether a modifier bit was down for this press. */
export const hasMod = (p: Press, mod: number) => (p.mods & mod) !== 0;

/** Modifier bits down across every key still held at time t. */
export function activeMods(presses: readonly Press[], t: number): number {
  let bits = 0;
  for (const p of presses) if (isHeld(p, t)) bits |= p.mods;
  return bits;
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

/**
 * Rows are much further apart than columns in key units, so vertical
 * distance is scaled before it is compared with horizontal distance.
 * Without it every radial falloff comes out as a flat ellipse.
 */
export const ROW_SCALE = 2.4;

/** Distance from a key to a board position, in scaled key units. */
export const distToXY = (ux: number, uy: number, x: number, y: number) =>
  Math.hypot(ux - x, (uy - y) * ROW_SCALE);

/**
 * Paint the straight line between two board positions. Effects that show a
 * *relationship* between two keys — a bigram, a mirrored pair, a swipe —
 * all need this, so it lives here rather than in any one family.
 */
export function segment(
  f: Frame,
  ax: number, ay: number, bx: number, by: number,
  hue: number, amp: number, width = 0.7, sat = 0.85,
) {
  const vx = bx - ax, vy = (by - ay) * ROW_SCALE;
  const len2 = vx * vx + vy * vy;
  for (const [led, g] of LED_GEO) {
    const wx = g.ux - ax, wy = (g.uy - ay) * ROW_SCALE;
    // Project the key onto the segment, clamped to its ends, then measure
    // how far off the line it actually sits.
    const u = len2 > 0 ? clamp01((wx * vx + wy * vy) / len2) : 0;
    const d = Math.hypot(wx - vx * u, wy - vy * u);
    const v = amp * Math.exp(-(d * d) / width);
    if (v < 0.04) continue;
    addTo(f, led, hsv(hue, sat, Math.min(1, v)));
  }
}

/** A soft radial blob centred anywhere on the board, not just on a key. */
export function blob(
  f: Frame, x: number, y: number, radius: number,
  hue: number, amp: number, sat = 0.85,
) {
  for (const [led, g] of LED_GEO) {
    const d = distToXY(g.ux, g.uy, x, y);
    const v = amp * Math.exp(-(d * d) / (radius * radius));
    if (v < 0.04) continue;
    addTo(f, led, hsv(hue, sat, Math.min(1, v)));
  }
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

/**
 * The first code that maps to each LED. Lets a press built without a code —
 * a synthetic one in a test, say — still classify semantically, so Semantic
 * and Modifier effects behave the same whoever constructed the press.
 */
export const CODE_FOR_LED = new Map<number, string>();
for (const [code, led] of LED_FOR_CODE) {
  if (!CODE_FOR_LED.has(led)) CODE_FOR_LED.set(led, code);
}

// ── Key classes ─────────────────────────────────────────────────────────
// What a key *means*, as opposed to where it sits. The Semantic family reads
// this so that Backspace can undo, Enter can commit, and digits can behave
// unlike letters.

export type KeyClass =
  | 'letter' | 'digit' | 'punct' | 'nav' | 'enter' | 'back'
  | 'space' | 'mod' | 'fn' | 'other';

const PUNCT = new Set([
  'Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash',
  'Semicolon', 'Quote', 'Comma', 'Period', 'Slash',
]);
const NAV = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete',
]);

export function classOfCode(code: string): KeyClass {
  if (/^Key[A-Z]$/.test(code)) return 'letter';
  if (/^Digit[0-9]$/.test(code)) return 'digit';
  if (PUNCT.has(code)) return 'punct';
  if (NAV.has(code)) return 'nav';
  if (code === 'Enter' || code === 'NumpadEnter') return 'enter';
  if (code === 'Backspace') return 'back';
  if (code === 'Space') return 'space';
  if (/^(Shift|Control|Alt|Meta)(Left|Right)$/.test(code) || code === 'CapsLock'
    || code === 'Fn') return 'mod';
  if (/^F([1-9]|1[0-2])$/.test(code) || code === 'Escape') return 'fn';
  return 'other';
}

/** The semantic class of a press, falling back to its LED when code is bare. */
export const classOf = (p: Press): KeyClass =>
  classOfCode(p.code || CODE_FOR_LED.get(p.led) || '');

const VOWELS = new Set(['KeyA', 'KeyE', 'KeyI', 'KeyO', 'KeyU']);
export const isVowel = (p: Press) =>
  VOWELS.has(p.code || CODE_FOR_LED.get(p.led) || '');

// ── Zones ───────────────────────────────────────────────────────────────
// Named regions of the board. Every LED belongs to exactly one, so effects
// can talk about activity moving *between* regions rather than just spreading.
// WASD is deliberately carved out of the rows it overlaps: a gaming cluster
// behaves differently from the typing keys around it, which is the whole
// point of having it as a zone.

const byLabel = (...names: string[]) =>
  names.map((n) => LED_BY_NAME.get(n)).filter((n): n is number => n !== undefined);

/** In precedence order — the first zone containing an LED owns it. */
export const ZONES = {
  wasd: byLabel('W', 'A', 'S', 'D'),
  arrows: byLabel('↑', '↓', '←', '→'),
  edit: byLabel('Bksp', 'Del', 'PgUp', 'PgDn', 'End'),
  fnrow: byLabel('Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12'),
  numrow: byLabel('`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='),
  top: byLabel('Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'),
  home: byLabel('Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'),
  bottom: byLabel('LShift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'RShift'),
  mods: byLabel('LCtrl', 'Win', 'LAlt', 'Space', 'RAlt', 'Fn'),
} as const;

export type ZoneName = keyof typeof ZONES;
export const ZONE_NAMES = Object.keys(ZONES) as ZoneName[];

/** Which zone owns each LED. Every LED on the board has one. */
export const ZONE_OF = new Map<number, ZoneName>();
for (const name of ZONE_NAMES) {
  for (const led of ZONES[name]) if (!ZONE_OF.has(led)) ZONE_OF.set(led, name);
}

/** Geometric centre of each zone — where its light gathers, and flows from. */
export const ZONE_CENTRE = new Map<ZoneName, { ux: number; uy: number }>();
for (const name of ZONE_NAMES) {
  const members = ZONES[name].filter((led) => ZONE_OF.get(led) === name);
  let sx = 0, sy = 0, n = 0;
  for (const led of members) {
    const g = LED_GEO.get(led);
    if (!g) continue;
    sx += g.ux; sy += g.uy; n++;
  }
  ZONE_CENTRE.set(name, n ? { ux: sx / n, uy: sy / n } : { ux: 0, uy: 0 });
}

/** Every LED the given zone actually owns, after precedence is applied. */
export const zoneMembers = (name: ZoneName) =>
  ALL_LEDS.filter((led) => ZONE_OF.get(led) === name);

/** The zone a press landed in. */
export const zoneOf = (p: Press): ZoneName => ZONE_OF.get(p.led) ?? 'mods';

/** Hue assigned to each zone, so a zone keeps one identity across effects. */
export const ZONE_HUE = new Map<ZoneName, number>(
  ZONE_NAMES.map((n, i) => [n, i / ZONE_NAMES.length]),
);

// ── Determinism ─────────────────────────────────────────────────────────

export const hashSeq = (n: number) => frac(Math.sin(n * 127.1) * 43758.5453);
export const hash2Seq = (a: number, b: number) =>
  frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

/** Build a press record with its hue already fixed. */
export function makePress(
  led: number, t: number, seq: number, code?: string, mods = 0,
): Press {
  const geo = LED_GEO.get(led);
  return {
    led,
    ux: geo?.ux ?? 0,
    uy: geo?.uy ?? 0,
    t,
    release: null,
    seq,
    hue: hashSeq(seq * 1.7 + 0.3),
    code: code ?? CODE_FOR_LED.get(led) ?? '',
    mods,
  };
}
