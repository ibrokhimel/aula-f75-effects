import { describe, it, expect } from 'vitest';
import { ANIMATIONS, ANIMATION_CATEGORIES, ALL_LEDS } from './index';

/**
 * Generators are pure functions of time, so a handful of sample points is
 * enough to catch the failure modes that matter: NaN leaking out of a hash,
 * channels running past 255, an effect that is black at every instant, or a
 * key index that does not exist on this board.
 */
const SAMPLES = [0, 0.037, 0.37, 1.1, 3.3, 7.7, 20.5, 61.3, 300.9];
const VALID_LEDS = new Set(ALL_LEDS);
const entries = Object.entries(ANIMATIONS);

describe('animation registry', () => {
  it('has a unique, non-empty display name per effect', () => {
    const names = entries.map(([, a]) => a.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.trim().length > 0)).toBe(true);
  });

  it('assigns every effect a known category', () => {
    for (const [key, a] of entries) {
      expect(ANIMATION_CATEGORIES, `${key} has category ${a.category}`)
        .toContain(a.category);
    }
  });
});

describe.each(entries)('%s', (key, anim) => {
  it('emits well-formed RGB for valid keys at every sample time', () => {
    for (const t of SAMPLES) {
      const frame = anim.fn(t);
      expect(frame, `${key} @ t=${t} did not return a Map`).toBeInstanceOf(Map);
      expect(frame.size, `${key} @ t=${t} lit more keys than exist`)
        .toBeLessThanOrEqual(ALL_LEDS.length);

      for (const [led, rgb] of frame) {
        expect(VALID_LEDS.has(led), `${key} @ t=${t} lit unknown LED ${led}`).toBe(true);
        expect(rgb.length, `${key} @ t=${t} LED ${led} is not a triple`).toBe(3);
        for (let c = 0; c < 3; c++) {
          const v = rgb[c];
          expect(Number.isFinite(v), `${key} @ t=${t} LED ${led} ch${c} = ${v}`).toBe(true);
          expect(Number.isInteger(v), `${key} @ t=${t} LED ${led} ch${c} = ${v}`).toBe(true);
          expect(v, `${key} @ t=${t} LED ${led} ch${c} out of range`).toBeGreaterThanOrEqual(0);
          expect(v, `${key} @ t=${t} LED ${led} ch${c} out of range`).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('lights something at some point (is not a permanently dark effect)', () => {
    const lit = SAMPLES.some((t) => {
      for (const rgb of anim.fn(t).values()) {
        if (rgb[0] + rgb[1] + rgb[2] > 8) return true;
      }
      return false;
    });
    expect(lit, `${key} never lights any key across the sample times`).toBe(true);
  });

  it('is deterministic — the same t yields the same frame', () => {
    const a = anim.fn(2.5), b = anim.fn(2.5);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});
