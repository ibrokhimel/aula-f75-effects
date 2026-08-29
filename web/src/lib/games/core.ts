/**
 * Minigames on the keyboard.
 *
 * Unlike animations, which are pure functions of elapsed time, a game carries
 * state and consumes input — so it gets its own interface rather than being
 * bent into AnimationFn.
 *
 * Two ways to draw, because the board is a ragged grid:
 *
 *   - Continuous, via splat(): positions are floats in key units and get
 *     rendered by proximity, the same way the animations work. Right for
 *     anything with physics (Pong, Frogger) since it uses the whole board.
 *   - Cell grid, via playLed(): the largest solid rectangle on this board is
 *     5 rows x 10 columns (rows 0-4, cols 2-11). Right for Snake and anything
 *     that needs discrete, gap-free movement.
 *
 * Games that address real keys (Whack-a-mole, Simon, Typing) ignore both and
 * use ledAt/LED_BY_NAME directly — the ragged grid is irrelevant to them.
 */

import {
  ALL_LEDS, BOARD_H, BOARD_W, LED_BY_NAME, LED_GEO,
  type Frame, type RGB,
} from '../animations';

export { BOARD_H, BOARD_W, LED_BY_NAME, LED_GEO };
export type { Frame, RGB };

/** Key codes held down, and those that went down since the last tick. */
export interface Input {
  held: Set<string>;
  pressed: Set<string>;
}

export interface GameView {
  score: number;
  /** One short line shown under the board. */
  status: string;
  state: 'playing' | 'over';
}

export interface Game {
  reset(): void;
  step(dt: number, input: Input): void;
  render(): Frame;
  view(): GameView;
}

export interface GameDef {
  name: string;
  controls: string;
  blurb: string;
  create(seed: number): Game;
}

// ── Board addressing ────────────────────────────────────────────────────

const LED_SET = new Set(ALL_LEDS);

/** LED index for a matrix cell, or null where this board has no key. */
export function ledAt(col: number, row: number): number | null {
  const i = col * 6 + row;
  return LED_SET.has(i) ? i : null;
}

/** The largest gap-free rectangle available: 5 rows x 10 columns. */
export const PLAY = { c0: 2, c1: 11, r0: 0, r1: 4 } as const;
export const PLAY_W = PLAY.c1 - PLAY.c0 + 1;
export const PLAY_H = PLAY.r1 - PLAY.r0 + 1;

/** Playfield cell (0,0 = top-left) to LED index. */
export function playLed(x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= PLAY_W || y >= PLAY_H) return null;
  return ledAt(PLAY.c0 + x, PLAY.r0 + y);
}

/** Every LED on a physical row, ordered left to right. */
export function rowLeds(row: number): number[] {
  return [...LED_GEO.entries()]
    .filter(([, p]) => Math.round(p.uy) === row)
    .sort((a, b) => a[1].ux - b[1].ux)
    .map(([led]) => led);
}

// ── Drawing ─────────────────────────────────────────────────────────────

export function put(f: Frame, led: number | null, c: RGB) {
  if (led !== null) f.set(led, c);
}

/** Keep the brighter of two contributions, so overlaps never wash out. */
export function blend(f: Frame, led: number | null, c: RGB) {
  if (led === null) return;
  const prev = f.get(led);
  if (!prev || c[0] + c[1] + c[2] > prev[0] + prev[1] + prev[2]) f.set(led, c);
}

/**
 * Draw at a continuous position in key units, falling off over nearby keys.
 * `ry` is tighter than `rx` because rows are 1u apart while the board is 16u
 * wide — an isotropic splat would smear across three keys horizontally.
 */
export function splat(f: Frame, ux: number, uy: number, c: RGB, rx = 0.75, ry = 0.4) {
  for (const [led, p] of LED_GEO) {
    const v = Math.exp(-((p.ux - ux) ** 2) / rx - ((p.uy - uy) ** 2) / ry);
    if (v < 0.15) continue;
    const k = Math.min(1, v);
    blend(f, led, [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]);
  }
}

/** A vertical bar centred on (ux, uy) — paddles, walls. */
export function bar(f: Frame, ux: number, uy: number, halfHeight: number, c: RGB) {
  for (const [led, p] of LED_GEO) {
    if (Math.abs(p.ux - ux) > 1.0) continue;
    const dy = Math.abs(p.uy - uy);
    if (dy > halfHeight + 0.5) continue;
    const k = Math.min(1, 1.15 - Math.abs(p.ux - ux) * 0.5) * (dy <= halfHeight ? 1 : 0.35);
    blend(f, led, [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]);
  }
}

// ── Real keys ───────────────────────────────────────────────────────────
// For games where you press the key that lights up. Letters only: they are
// unambiguous (`KeyW`), spread across the three alpha rows, and none of them
// is a modifier the browser might swallow.

export interface PlayKey { label: string; led: number; code: string }

export const LETTER_KEYS: PlayKey[] = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
  .map((ch) => ({ label: ch, led: LED_BY_NAME.get(ch), code: `Key${ch}` }))
  .filter((k): k is PlayKey => k.led !== undefined);

// ── Determinism ─────────────────────────────────────────────────────────

/** xorshift32 — games are seeded so tests can drive them reproducibly. */
export function makeRng(seed: number) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0x100000000;
  };
}

// ── Shared input vocabulary ─────────────────────────────────────────────

export const UP = ['ArrowUp', 'KeyW'];
export const DOWN = ['ArrowDown', 'KeyS'];
export const LEFT = ['ArrowLeft', 'KeyA'];
export const RIGHT = ['ArrowRight', 'KeyD'];

export const anyHeld = (i: Input, codes: string[]) => codes.some((c) => i.held.has(c));
export const anyPressed = (i: Input, codes: string[]) => codes.some((c) => i.pressed.has(c));
