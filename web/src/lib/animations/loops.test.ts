import { describe, expect, it } from 'vitest';
import { ANIMATIONS, ALL_LEDS, type AnimationFn } from './index';

/**
 * Loop-quality checks.
 *
 * Every effect runs forever, so "looping" here means continuity: no frame-to-
 * frame jump far larger than the effect's own motion. A sawtooth (`frac`, `%`)
 * driving a position teleports it on wrap; a phase-switch that changes hue in
 * one step reads as a cut. Both show up as a `pop` far above 1.
 */

const FPS = 30;
const EARLY_SECONDS = 60;
const LATE_T = 100_000;

/** Effects whose hard cut IS the effect. Anything else must stay continuous. */
const INTENTIONAL_CUTS: Record<string, string> = {
  thunderstorm: 'lightning strike is a hard flash',
  boot: 'POST completion flash',
  loadingbar: 'the bar reaching 100% and resetting',
  terminal: 'the screen clearing, as a terminal does',
  tetris: 'the line-clear flash',
  heartbeat: 'the beat itself',
  arcade: 'attract-mode colour slams on the beat',
};

const POP_LIMIT = 8;

function frameVec(fn: AnimationFn, t: number): Float64Array {
  const v = new Float64Array(ALL_LEDS.length * 3);
  const f = fn(t);
  ALL_LEDS.forEach((led, i) => {
    const c = f.get(led);
    if (c) { v[i * 3] = c[0]; v[i * 3 + 1] = c[1]; v[i * 3 + 2] = c[2]; }
  });
  return v;
}

function scan(fn: AnimationFn, t0: number, seconds: number) {
  const n = Math.floor(seconds * FPS);
  const deltas: number[] = [];
  let prev = frameVec(fn, t0);
  let bright = 0, maxD = 0, maxAt = t0;
  for (let i = 1; i <= n; i++) {
    const t = t0 + i / FPS;
    const cur = frameVec(fn, t);
    let d = 0, b = 0;
    for (let j = 0; j < cur.length; j++) { d += Math.abs(cur[j] - prev[j]); b += cur[j]; }
    d /= cur.length; b /= cur.length;
    deltas.push(d);
    bright += b;
    if (d > maxD) { maxD = d; maxAt = t; }
    prev = cur;
  }
  const sorted = [...deltas].sort((a, b) => a - b);
  return {
    p95: sorted[Math.floor(sorted.length * 0.95)],
    maxD,
    maxAt,
    meanBright: bright / n,
  };
}

describe.each(Object.entries(ANIMATIONS))('%s', (key, anim) => {
  const early = scan(anim.fn, 0, EARLY_SECONDS);
  // Divisor floors at 0.5 so a nearly-still effect cannot produce a huge ratio
  // out of numerical noise.
  const pop = early.maxD / (early.p95 + 0.5);

  if (INTENTIONAL_CUTS[key]) {
    it(`is allowed a hard cut: ${INTENTIONAL_CUTS[key]}`, () => {
      expect(pop).toBeGreaterThan(0);
    });
  } else {
    it('loops without a visible cut', () => {
      expect(
        pop,
        `${key} jumps ${early.maxD.toFixed(1)}/255 at t=${early.maxAt.toFixed(2)}s, ` +
        `${pop.toFixed(1)}x its own p95 motion (${early.p95.toFixed(2)}). ` +
        'A sawtooth (frac/%) driving a position, or a phase switch that changes ' +
        'hue in one step, is the usual cause. If the cut is deliberate, add it ' +
        'to INTENTIONAL_CUTS with a reason.',
      ).toBeLessThan(POP_LIMIT);
    });
  }

  it('still runs correctly after a very long uptime', () => {
    const late = scan(anim.fn, LATE_T, 10);
    expect(Number.isFinite(late.meanBright)).toBe(true);
    // Catches an effect that fades out or blows up as float precision degrades.
    const ratio = late.meanBright / (early.meanBright + 0.01);
    expect(ratio, `${key} brightness drifted ${ratio.toFixed(2)}x by t=${LATE_T}`)
      .toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(4);
  });
});
