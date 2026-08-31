/**
 * The reactive-effect engine, free of any DOM dependency.
 *
 * Extracted from ReactivePanel so the same press-buffer semantics run in two
 * places: the browser panel (fed by window keydown/keyup) and the desktop
 * app's main process (fed by a global keyboard hook). Anything that differs
 * between those hosts — event sources, frame timing, HID transport — stays
 * with the host; everything that must never drift apart lives here.
 */

import { REACTIVE } from './index';
import {
  LED_FOR_CODE, makePress, windowFor,
  type Press, type ReactiveDef,
} from './core';
import { tintFrame, type Frame, type RGB } from '../animations';

/**
 * Hard ceiling on the press buffer. A Memory effect keeps a minute of
 * history, and a fast typist fills that with several hundred presses; the
 * cap stops a long session from growing the buffer without bound.
 */
export const MAX_PRESSES = 600;

export class ReactiveEngine {
  private presses: Press[] = [];
  private held = new Map<string, Press>();
  private seq = 0;
  private t0 = 0;
  private activeId: string | null = null;
  /** Total presses recorded since the current effect started. */
  hits = 0;

  /** `nowMs` is injectable so tests can drive a fake clock. */
  constructor(private readonly nowMs: () => number = () => Date.now()) {}

  get active(): string | null { return this.activeId; }
  get def(): ReactiveDef | null { return this.activeId ? REACTIVE[this.activeId] ?? null : null; }
  /** Presses currently buffered — after render()'s eviction, not before. */
  get pressCount(): number { return this.presses.length; }

  /** Seconds on the effect clock. */
  clock(): number { return (this.nowMs() - this.t0) / 1000; }

  /** Arm an effect. Returns false for an unknown id. */
  start(id: string): boolean {
    if (!REACTIVE[id]) return false;
    this.t0 = this.nowMs();
    this.seq = 0;
    this.hits = 0;
    this.presses = [];
    this.held.clear();
    this.activeId = id;
    return true;
  }

  stop(): void {
    this.activeId = null;
    this.presses = [];
    this.held.clear();
  }

  /**
   * Record a key going down. Auto-repeats must be filtered by the caller —
   * only the caller's event source knows what a repeat looks like. Returns
   * false when the code has no LED or no effect is armed.
   */
  keyDown(code: string, mods = 0): boolean {
    if (!this.activeId) return false;
    if (this.held.has(code)) return false; // repeat the source failed to flag
    const led = LED_FOR_CODE.get(code);
    if (led === undefined) return false;
    const p = makePress(led, this.clock(), this.seq++, code, mods);
    this.presses.push(p);
    this.held.set(code, p);
    this.hits++;
    return true;
  }

  keyUp(code: string): void {
    const p = this.held.get(code);
    if (p) { p.release = this.clock(); this.held.delete(code); }
  }

  /** A lost event source would otherwise leave keys stuck down forever. */
  releaseAll(): void {
    const now = this.clock();
    for (const p of this.held.values()) p.release = now;
    this.held.clear();
  }

  /**
   * Render the current frame, tinted toward `target` when one is set.
   * Expired presses are evicted here rather than on a timer: this runs every
   * frame anyway, and held keys must survive regardless of age. The horizon
   * is the running effect's own — Memory effects ask for a minute of history
   * where everything else needs six seconds.
   */
  render(target: RGB | null = null): Frame {
    const def = this.def;
    if (!def) return new Map();
    const t = this.clock();
    const horizon = windowFor(def);
    const buf = this.presses.filter(
      (p) => p.release === null || t - p.release < horizon,
    );
    // Over the cap, the oldest *released* presses go first — a key still
    // under a finger has to survive however long it has been down.
    this.presses = buf.length <= MAX_PRESSES ? buf
      : buf.filter((p, i) => p.release === null || i >= buf.length - MAX_PRESSES);
    return tintFrame(def.fn(t, this.presses), target);
  }
}
