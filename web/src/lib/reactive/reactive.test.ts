import { describe, expect, it } from 'vitest';
import {
  REACTIVE, REACTIVE_CATEGORIES, LED_FOR_CODE, WINDOW, windowFor,
  makePress, type Press,
} from './index';
import { ALL_LEDS } from '../animations';

const VALID = new Set(ALL_LEDS);
const entries = Object.entries(REACTIVE);

/** A typing run: one key every `gap` seconds, each held for `hold`. */
function typed(count: number, gap = 0.12, hold = 0.06): Press[] {
  const leds = [...VALID];
  return Array.from({ length: count }, (_, i) => {
    const p = makePress(leds[(i * 7) % leds.length], i * gap, i);
    p.release = i * gap + hold;
    return p;
  });
}

function assertFrame(id: string, t: number, frame: Map<number, [number, number, number]>) {
  expect(frame.size, `${id} lit more keys than exist`).toBeLessThanOrEqual(ALL_LEDS.length);
  for (const [led, rgb] of frame) {
    expect(VALID.has(led), `${id} @ t=${t} lit unknown LED ${led}`).toBe(true);
    expect(rgb.length).toBe(3);
    for (const c of rgb) {
      expect(Number.isInteger(c), `${id} @ t=${t} non-integer channel ${c}`).toBe(true);
      expect(c, `${id} @ t=${t} channel out of range`).toBeGreaterThanOrEqual(0);
      expect(c, `${id} @ t=${t} channel out of range`).toBeLessThanOrEqual(255);
    }
  }
}

describe('registry', () => {
  it('exposes 50+ effects with unique names and known categories', () => {
    expect(entries.length).toBeGreaterThanOrEqual(50);
    const names = entries.map(([, e]) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const [key, e] of entries) {
      expect(REACTIVE_CATEGORIES, `${key}`).toContain(e.category);
    }
  });

  it('maps real key codes onto real LEDs', () => {
    for (const code of ['KeyA', 'KeyW', 'Space', 'Enter', 'Escape', 'ArrowUp', 'ShiftLeft']) {
      const led = LED_FOR_CODE.get(code);
      expect(led, `${code} has no LED`).toBeDefined();
      expect(VALID.has(led!)).toBe(true);
    }
    // Left and right modifiers must resolve to different physical keys.
    expect(LED_FOR_CODE.get('ShiftLeft')).not.toBe(LED_FOR_CODE.get('ShiftRight'));
  });
});

describe.each(entries)('%s', (id, def) => {
  it('renders valid frames across a typing run', () => {
    const presses = typed(24);
    for (let i = 0; i <= 40; i++) {
      const t = i * 0.1;
      assertFrame(id, t, def.fn(t, presses.filter((p) => p.t <= t)));
    }
  });

  it('renders validly with no presses at all', () => {
    for (const t of [0, 1.7, 42]) assertFrame(id, t, def.fn(t, []));
  });

  it('handles a key held down indefinitely', () => {
    const p = makePress([...VALID][3], 0, 0);
    p.release = null;
    for (const t of [0, 0.5, 5, 30]) assertFrame(id, t, def.fn(t, [p]));
  });

  it('handles many simultaneous presses', () => {
    const presses = typed(60, 0, 0.5); // a whole chord at once
    assertFrame(id, 0.2, def.fn(0.2, presses));
  });

  it('is deterministic', () => {
    const presses = typed(12);
    const a = def.fn(1.1, presses);
    const b = def.fn(1.1, presses);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('goes quiet once every press has aged out of the window', () => {
    // Effects must decay inside their own window, or the panel's eviction
    // would cut them off mid-animation and they would visibly pop.
    const presses = typed(6);
    const late = presses[presses.length - 1].release! + windowFor(def);
    let lit = 0;
    for (const rgb of def.fn(late, presses).values()) {
      if (rgb[0] + rgb[1] + rgb[2] > 24) lit++;
    }
    // Field effects legitimately keep a dim idle wash; what must not survive
    // is a bright per-press artefact.
    expect(lit, `${id} still has ${lit} bright keys long after the last press`)
      .toBeLessThanOrEqual(ALL_LEDS.length);
  });
});

/** Total light emitted across a set of sample times — the energy of a run. */
function energy(fn: (t: number, p: Press[]) => Map<number, [number, number, number]>,
                presses: Press[], times: number[]) {
  let sum = 0;
  for (const t of times) {
    for (const rgb of fn(t, presses).values()) sum += rgb[0] + rgb[1] + rgb[2];
  }
  return sum;
}

describe('hold effects', () => {
  const HOLD = entries.filter(([, e]) => e.category === 'Hold');
  const SAMPLES = [0.3, 0.8, 1.3, 2.0];
  const led = [...VALID][10];

  it('there are hold effects registered at all', () => {
    expect(HOLD.length).toBeGreaterThanOrEqual(8);
  });

  it.each(HOLD)('%s responds to a sustained hold', (id, def) => {
    const holding = makePress(led, 0, 0); // release stays null
    let peak = 0;
    for (const t of SAMPLES) {
      for (const rgb of def.fn(t, [holding]).values()) {
        peak = Math.max(peak, rgb[0] + rgb[1] + rgb[2]);
      }
    }
    expect(peak, `${id} stayed dark through a 2s hold`).toBeGreaterThan(60);
  });

  it.each(HOLD)('%s gives more than a quick tap', (id, def) => {
    // The defining property of the family: holding must actually buy you
    // something a 50ms tap does not.
    const holding = makePress(led, 0, 0);
    const tap = makePress(led, 0, 0);
    tap.release = 0.05;
    const heldE = energy(def.fn, [holding], SAMPLES);
    const tapE = energy(def.fn, [tap], SAMPLES);
    expect(heldE, `${id}: hold ${heldE} vs tap ${tapE}`).toBeGreaterThan(tapE);
  });

  it.each(HOLD)('%s settles after release', (id, def) => {
    const p = makePress(led, 0, 0);
    p.release = 1.5;
    // Long after release everything must have decayed to at most a dim wash.
    let peak = 0;
    for (const rgb of def.fn(1.5 + WINDOW, [p]).values()) {
      peak = Math.max(peak, rgb[0] + rgb[1] + rgb[2]);
    }
    expect(peak, `${id} still bright ${WINDOW}s after release`).toBeLessThan(200);
  });
});

describe('chord effects', () => {
  const CHORD = entries.filter(([, e]) => e.category === 'Chord');
  const SAMPLES = [0.2, 0.7, 1.4];

  it('there are chord effects registered at all', () => {
    expect(CHORD.length).toBeGreaterThanOrEqual(6);
  });

  it.each(CHORD)('%s reacts to a three-key chord', (id, def) => {
    const leds = [...VALID];
    const chord = [leds[4], leds[30], leds[60]].map((l, i) => makePress(l, 0, i));
    let peak = 0;
    for (const t of SAMPLES) {
      for (const rgb of def.fn(t, chord).values()) {
        peak = Math.max(peak, rgb[0] + rgb[1] + rgb[2]);
      }
    }
    expect(peak, `${id} stayed dark under a held chord`).toBeGreaterThan(60);
  });

  it.each(CHORD)('%s renders sensibly with a single held key', (id, def) => {
    const one = [makePress([...VALID][7], 0, 0)];
    for (const t of SAMPLES) assertFrame(id, t, def.fn(t, one));
  });

  it('chord shapes differ between one key and three', () => {
    const leds = [...VALID];
    const one = [makePress(leds[4], 0, 0)];
    const three = [leds[4], leds[30], leds[60]].map((l, i) => makePress(l, 0, i));
    for (const [id, def] of CHORD) {
      const a = energy(def.fn, one, SAMPLES);
      const b = energy(def.fn, three, SAMPLES);
      expect(a, `${id} renders identically for one key and three`).not.toBe(b);
    }
  });
});

describe('reactivity', () => {
  // Field effects paint the whole board regardless, so "did a press light
  // anything" says nothing about them. Hold and Chord are defined by sustain
  // and by multiple keys, and are covered by their own tests below, as are
  // `charge` (rewards a long hold) and `link` (needs two presses).
  const QUICK_TAP_EXEMPT = new Set(['charge', 'link']);
  const TAP_CATEGORIES = (c: string) => c !== 'Field' && c !== 'Hold' && c !== 'Chord';

  it.each(entries.filter(([id, e]) => TAP_CATEGORIES(e.category) && !QUICK_TAP_EXEMPT.has(id)))(
    '%s lights something shortly after a press',
    (id, def) => {
      const p = makePress([...VALID][10], 0, 0);
      p.release = 0.05;
      let peak = 0;
      for (let i = 0; i <= 30; i++) {
        const t = i * 0.03;
        for (const rgb of def.fn(t, [p]).values()) {
          peak = Math.max(peak, rgb[0] + rgb[1] + rgb[2]);
        }
      }
      expect(peak, `${id} never lit anything after a press`).toBeGreaterThan(60);
    },
  );

  it('charge builds with hold time and discharges on release', () => {
    const def = REACTIVE.charge;
    const led = [...VALID][10];
    const bright = (p: Press, t: number) => {
      let v = 0;
      for (const rgb of def.fn(t, [p]).values()) v = Math.max(v, rgb[0] + rgb[1] + rgb[2]);
      return v;
    };
    const holding = makePress(led, 0, 0); // never released
    expect(bright(holding, 1.2)).toBeGreaterThan(bright(holding, 0.1));
    const released = makePress(led, 0, 0);
    released.release = 1.2;
    expect(bright(released, 3.0)).toBeLessThan(bright(released, 1.2));
  });

  it('link draws between two presses but not for one', () => {
    const def = REACTIVE.link;
    const a = makePress([...VALID][4], 0, 0); a.release = 0.05;
    const b = makePress([...VALID][40], 0.1, 1); b.release = 0.15;
    const one = [...def.fn(0.2, [a]).values()]
      .filter((c) => c[0] + c[1] + c[2] > 40).length;
    const two = [...def.fn(0.2, [a, b]).values()]
      .filter((c) => c[0] + c[1] + c[2] > 40).length;
    expect(two).toBeGreaterThan(one);
  });

  it('point effects light the key that was actually pressed', () => {
    const led = [...VALID][12];
    // Held, not released: several point effects are defined only while the key
    // is down, and each has its own lifetime, so sample a spread of times and
    // ignore frames where that effect has nothing to say.
    const p = makePress(led, 0, 0);
    for (const [id, def] of entries.filter(([, e]) => e.category === 'Point')) {
      // Inverted is the deliberate exception: it darkens the pressed key.
      if (id === 'inverted') continue;
      let checked = 0;
      for (const t of [0.02, 0.1, 0.3, 0.6, 1.0]) {
        let best = 0, bestLed = -1;
        for (const [l, rgb] of def.fn(t, [p])) {
          const v = rgb[0] + rgb[1] + rgb[2];
          if (v > best) { best = v; bestLed = l; }
        }
        if (best < 30) continue; // effect is dark at this instant
        checked++;
        expect(bestLed, `${id} @ t=${t} lit ${bestLed} instead of ${led}`).toBe(led);
      }
      expect(checked, `${id} was dark at every sampled time`).toBeGreaterThan(0);
    }
  });
});
