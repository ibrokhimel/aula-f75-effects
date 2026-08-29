import { describe, it, expect } from 'vitest';
import {
  ANIMATIONS, ANIMATION_CATEGORIES, ALL_LEDS,
  rgbToHsv, tint, tintFrame, tintFn, type RGB,
} from './index';

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

describe('recolouring', () => {
  const RED: RGB = [255, 0, 64];

  it('round-trips a colour through rgbToHsv', () => {
    for (const c of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [18, 90, 200]] as RGB[]) {
      const [h, sat, v] = rgbToHsv(c);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(sat).toBeLessThanOrEqual(1);
      expect(v).toBeCloseTo(Math.max(...c) / 255, 5);
    }
  });

  it('keeps the source brightness', () => {
    for (const v of [0, 30, 90, 160, 255]) {
      const out = tint([v, Math.round(v * 0.4), 0], RED);
      expect(Math.max(...out)).toBe(v);
    }
  });

  it('takes the target hue for saturated sources', () => {
    // A full-value rainbow sweep must all land on the target hue.
    const targetHue = rgbToHsv(RED)[0];
    for (const c of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]] as RGB[]) {
      expect(rgbToHsv(tint(c, RED))[0]).toBeCloseTo(targetHue, 2);
    }
  });

  it('colourises mid-grey, so greyscale effects are not left grey', () => {
    const out = tint([128, 128, 128], RED);
    expect(rgbToHsv(out)[1]).toBeGreaterThan(0.5);
    expect(rgbToHsv(out)[0]).toBeCloseTo(rgbToHsv(RED)[0], 2);
  });

  it('leaves highlights white — a flame tip stays hot, not flat', () => {
    expect(rgbToHsv(tint([255, 255, 255], RED))[1]).toBeLessThan(0.05);
    // ...but only at the very top: a dim white is still colour, not a highlight.
    expect(rgbToHsv(tint([160, 160, 160], RED))[1]).toBeGreaterThan(0.5);
  });

  it('passes the frame straight through in Colorful mode', () => {
    const f = new Map([[1, [10, 20, 30] as RGB]]);
    expect(tintFrame(f, null)).toBe(f);
    const fn = () => f;
    expect(tintFn(fn, null)).toBe(fn);
  });

  it('emits well-formed RGB for every effect it wraps', () => {
    for (const [key, anim] of entries) {
      for (const t of SAMPLES) {
        for (const [led, rgb] of tintFn(anim.fn, RED)(t)) {
          for (let c = 0; c < 3; c++) {
            expect(Number.isInteger(rgb[c]), `${key} @ t=${t} LED ${led} ch${c}`).toBe(true);
            expect(rgb[c], `${key} @ t=${t} LED ${led} ch${c}`).toBeGreaterThanOrEqual(0);
            expect(rgb[c], `${key} @ t=${t} LED ${led} ch${c}`).toBeLessThanOrEqual(255);
          }
        }
      }
    }
  });
});
